# reportes/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.http import HttpResponse
from django.conf import settings
import google.generativeai as genai
import json
from decimal import Decimal
from datetime import datetime, date
import traceback # Para imprimir tracebacks completos

# --- Imports de Django ---
from django.db import models
from django.db.models import Sum, Count, Q, F
from django.core.exceptions import FieldDoesNotExist, ValidationError
from django.db.models.fields.related import RelatedField
from django.utils import timezone # Para obtener fecha actual

# --- Imports de tus apps ---
from usuario.permissions import IsAdminOrVendedor
from ventas.models import Venta, DetalleVenta
from usuario.models import Producto, Cliente, Rol, Categoria 
from .generators import generar_reporte_pdf, generar_reporte_excel
# --- Librería opcional para parsear fechas ---
try:
    from dateutil.parser import parse as dateutil_parse
    dateutil_parse('2023-01-01') # Prueba simple
    print("[INFO] dateutil.parser loaded successfully.")
except ImportError:
    dateutil_parse = None
    print("[WARN] dateutil.parser not found. Date parsing will be basic (YYYY-MM-DD).")
except Exception as dateutil_err:
    dateutil_parse = None
    print(f"[WARN] dateutil.parser loaded but failed test parse: {dateutil_err}. Date parsing will be basic.")


# --- (Configuración de Gemini, Constantes... sin cambios) ---
GEMINI_CONFIGURED = False
if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        GEMINI_CONFIGURED = True
    except Exception as e:
        print(f"[ERROR] Failed to configure Gemini or list models: {e}")
else:
    print("[WARN] GEMINI_API_KEY no encontrada. Reportes con IA deshabilitados.")

GEMINI_MODEL_NAME = 'models/gemini-2.5-pro' 
DJANGO_LOOKUP_OPERATORS = ['exact','iexact','contains','icontains','in','gt','gte','lt','lte','isnull','range','year','month','day','week_day','startswith','istartswith','endswith','iendswith']
ALLOWED_AGGREGATIONS = {'Sum': Sum, 'Count': Count}


# ===================================================================
# --- VISTA #1: GenerarReporteView (SOLO GENERA JSON USANDO IA) ---
# ===================================================================
class GenerarReporteView(APIView):
    permission_classes = [IsAdminOrVendedor]

    # --- (Función _call_gemini_api: Pega tu función corregida aquí) ---
    def _call_gemini_api(self, user_prompt):
        if not GEMINI_CONFIGURED:
            return {"error": "Servicio de IA no configurado en el servidor."}
        now = timezone.now()
        current_date_str = now.strftime('%Y-%m-%d')
        current_year_str = now.strftime('%Y')
        schema_definition = """
Esquema de Modelos y Relaciones (Usa estos campos y `related_names`):
- Venta: id, cliente (-> Cliente, related_name='ventas'), vendedor (-> Usuario, related_name='ventas_registradas'), fecha_venta (DateTimeField), total (DecimalField), estado (PEN, COM, CAN).
- DetalleVenta: id, venta (-> Venta, related_name='detalles'), producto (-> Producto, related_name='detalles_venta'), cantidad (IntegerField), precio_unitario (DecimalField), subtotal (DecimalField).
- Producto: id, nombre, marca, modelo, categoria (-> Categoria, related_name='productos'), precio (DecimalField), stock (IntegerField), garantia_meses (IntegerField).
- Cliente: id, user (-> Usuario, related_name='cliente_profile'), nombre, apellido, email, telefono, direccion, nit_ci.
- Categoria: id, nombre (StringField), descripcion (TextField).

Regla de Filtrado de Categoría: Para filtrar productos por categoría (ej: "lavado"), usa el campo 'nombre' de la categoría: 'categoria__nombre__icontains': 'lavado'.

--- ¡NUEVAS REGLAS! ---
Regla de Agrupación por Relación: Cuando agrupes por 'cliente', 'producto' o 'vendedor', DEBES usar sus campos de texto (ej: 'cliente__nombre', 'producto__nombre', 'vendedor__username'), NUNCA sus IDs.
Regla de Agregación: Si el usuario pide "total de", "cantidad de", "conteo de", o "promedio de", DEBES añadir un cálculo en la sección "calculos".
--- FIN NUEVAS REGLAS ---
"""
        system_instruction = f"""
Eres un asistente experto en bases de datos para SmartSales365, un sistema de ventas de electrodomésticos en Bolivia (Moneda: BOB). Fecha actual: {current_date_str}.
Tu única tarea es analizar la SOLICITUD DEL USUARIO y DEVOLVER **ÚNICAMENTE** un objeto JSON válido con la siguiente estructura exacta, sin explicaciones, comentarios ni markdown:
{{
  "tipo_reporte": "string", 
  "formato": "string", 
  "filtros": {{}},
  "agrupacion": ["string"], 
  "calculos": {{}}, 
  "orden": ["string"], 
  "error": null | "string"
}}
{schema_definition}
Reglas Clave:
- IGNORA cualquier solicitud de 'formato' (pdf, excel) en el prompt del usuario. SIEMPRE pon "formato": "pantalla".
- Año por Defecto: Si no se especifica año en fechas (ej: 'septiembre'), usa {current_year_str}.
- Fechas: SIEMPRE formato 'YYYY-MM-DD'.
- Texto: Usa 'icontains' por defecto si no se pide exactitud.
- Errores: Si es ambiguo o inválido, pon descripción en "error".
- Salida: SOLO el JSON.
"""
        try:
            print(f"\n[Gemini] Using model: {GEMINI_MODEL_NAME}")
            print(f"[Gemini] Sending prompt:\nUser Prompt: {user_prompt}")
            model = genai.GenerativeModel(GEMINI_MODEL_NAME)
            generation_config = genai.types.GenerationConfig(response_mime_type="application/json")
            response = model.generate_content(
                [system_instruction, user_prompt],
                generation_config=generation_config
            )
            try:
                raw_response_text = response.text.strip()
                print(f"[Gemini] Raw JSON response received:\n{raw_response_text}")
                cleaned_json_text = raw_response_text.removeprefix("```json").removesuffix("```").strip()
                if not cleaned_json_text.startswith('{') or not cleaned_json_text.endswith('}'):
                    json_start = cleaned_json_text.find('{')
                    json_end = cleaned_json_text.rfind('}')
                    if json_start != -1 and json_end != -1:
                        cleaned_json_text = cleaned_json_text[json_start:json_end+1]
                    else:
                        raise json.JSONDecodeError("No JSON object found in response.", cleaned_json_text, 0)
                interpretacion = json.loads(cleaned_json_text)
            except ValueError as e: 
                print(f"[ERROR] Gemini API content blocked or unexpected structure: {e}")
                feedback = getattr(response, 'prompt_feedback', 'N/A')
                candidates = getattr(response, 'candidates', [])
                finish_reason = "N/A"; safety_ratings = "N/A"
                if candidates and hasattr(candidates[0], 'finish_reason'): finish_reason = candidates[0].finish_reason
                if candidates and hasattr(candidates[0], 'safety_ratings'): safety_ratings = candidates[0].safety_ratings
                return {"error": f"Error de IA: Respuesta bloqueada ({finish_reason}) o inválida."}
            except json.JSONDecodeError as json_err:
                print(f"[ERROR] Gemini response was not valid JSON: {json_err}\nRaw response:\n{raw_response_text}")
                return {"error": "La respuesta de la IA no tiene el formato JSON esperado."}
            required_keys = ["tipo_reporte", "formato", "filtros", "agrupacion", "calculos", "error"]
            if not isinstance(interpretacion, dict) or not all(key in interpretacion for key in required_keys):
                raise ValueError("La respuesta JSON de la IA no tiene la estructura requerida.")
            if interpretacion.get("error"):
                return {"error": f"IA detectó un problema: {interpretacion['error']}"}
            print("[Gemini] JSON parsed and validated successfully.")
            return interpretacion
        except Exception as e:
            print(f"[ERROR] Failed to call or process Gemini API: {e}")
            error_msg = f"Error comunicándose con servicio IA: {e}"
            if hasattr(e, 'message'): error_msg = f"Error comunicándose con servicio IA: {e.message}"
            traceback.print_exc()
            return {"error": error_msg}

    # --- (Función _parse_date_value: Pega tu función aquí) ---
    def _parse_date_value(self, value):
        if value is None: return None
        if dateutil_parse and isinstance(value, str):
            try: return dateutil_parse(value)
            except ValueError: raise ValueError(f"Formato de fecha inválido: {value}")
        elif isinstance(value, str):
            try: return datetime.strptime(value, '%Y-%m-%d').date()
            except ValueError: return datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
        return value

    # --- (Función _validate_and_convert_value: Pega tu función aquí) ---
    def _validate_and_convert_value(self, model_class, lookup, value):
        current_model = model_class
        field_instance = None
        parts = lookup.split('__')
        try:
            field_name_for_validation = None
            for i, part in enumerate(parts):
                if i == len(parts) - 1 and part in DJANGO_LOOKUP_OPERATORS:
                    if field_instance is None and i > 0: raise FieldDoesNotExist(f"Campo base no encontrado antes del operador '{part}'")
                    break 
                try:
                    field_instance = current_model._meta.get_field(part)
                    field_name_for_validation = part
                    if hasattr(field_instance, 'related_model') and field_instance.related_model:
                        current_model = field_instance.related_model
                    elif i < len(parts) - 1:
                        is_next_part_operator = (i + 1 < len(parts)) and parts[i+1] in DJANGO_LOOKUP_OPERATORS
                        if not is_next_part_operator:
                            raise FieldDoesNotExist(f"'{part}' no es una relación válida en {current_model.__name__}")
                except FieldDoesNotExist:
                    if i >= len(parts) - 2: 
                        print(f"[DB Validate] Field/Relation '{part}' not found on {current_model.__name__}. Assuming transform/annotation.")
                        field_instance = None
                        field_name_for_validation = part
                        break
                    else:
                        raise FieldDoesNotExist(f"Campo intermedio '{part}' no encontrado en {current_model.__name__} para '{lookup}'.")
            if value is None:
                if parts[-1] == 'isnull': return bool(value)
                return None
            converted_value = value
            lookup_operator = parts[-1] if parts[-1] in DJANGO_LOOKUP_OPERATORS else 'exact'
            if lookup_operator == 'isnull':
                converted_value = bool(value) if not isinstance(value, bool) else value
            elif lookup_operator == 'in':
                if not isinstance(value, list): raise ValueError("Valor para 'in' debe ser una lista.")
                converted_value = value
            elif lookup_operator == 'range':
                if not isinstance(value, list) or len(value) != 2: raise ValueError("Valor para 'range' debe ser una lista de dos elementos.")
                converted_value = [self._parse_date_value(value[0]), self._parse_date_value(value[1])]
            elif field_instance:
                target_type = type(field_instance)
                if target_type in (models.DecimalField, models.FloatField): converted_value = Decimal(value)
                elif target_type == models.IntegerField: converted_value = int(value)
                elif target_type in (models.DateTimeField, models.DateField): converted_value = self._parse_date_value(value)
                elif target_type == models.BooleanField:
                    if isinstance(value, str):
                        if value.lower() == 'true': converted_value = True
                        elif value.lower() == 'false': converted_value = False
                        else: raise ValueError("Boolean string debe ser 'true'/'false'")
                    else: converted_value = bool(value)
                elif target_type == models.CharField and not isinstance(value, str):
                    converted_value = str(value)
            elif parts[-1] in ['year', 'month', 'day', 'week_day']:
                converted_value = int(value)
            return converted_value
        except FieldDoesNotExist as e: raise FieldDoesNotExist(f"Campo/relación inválido en '{lookup}': {e}")
        except (ValueError, TypeError) as e: raise ValueError(f"Valor '{value}' inválido para filtro '{lookup}': {e}")

    # --- (Función _build_queryset: Pega tu función corregida aquí) ---
    def _build_queryset(self, interpretacion):
        tipo = interpretacion.get("tipo_reporte")
        filtros_dict = interpretacion.get("filtros", {})
        agrupacion_list = interpretacion.get("agrupacion", [])
        calculos_dict = interpretacion.get("calculos", {})
        orden_list = interpretacion.get("orden", [])
        ModelClass = None
        base_queryset = None
        related_name_producto_a_detalle = 'detalles_venta'
        related_name_venta_a_detalle = 'detalles'
        if tipo == "ventas": ModelClass = Venta; base_queryset = Venta.objects.select_related('cliente', 'vendedor').prefetch_related(f'{related_name_venta_a_detalle}__producto')
        elif tipo == "productos": ModelClass = Producto; base_queryset = Producto.objects.select_related('categoria').all()
        elif tipo == "clientes": ModelClass = Cliente; base_queryset = Cliente.objects.select_related('user')
        else: raise ValueError(f"Tipo de reporte '{tipo}' no soportado.")
        if tipo == "productos":
            filtros_corregidos = {}
            for k, v in filtros_dict.items():
                if k.startswith(f'{related_name_venta_a_detalle}__'): nuevo_k = k.replace(f'{related_name_venta_a_detalle}__', f'{related_name_producto_a_detalle}__', 1); filtros_corregidos[nuevo_k] = v
                else: filtros_corregidos[k] = v
            filtros_dict = filtros_corregidos
        q_filtros = Q()
        for lookup, value in filtros_dict.items():
            try:
                converted_value = self._validate_and_convert_value(ModelClass, lookup, value)
                q_filtros &= Q(**{lookup: converted_value})
            except (FieldDoesNotExist, ValueError, TypeError) as e:
                print(f"[WARN] Skipping invalid filter from LLM: {lookup}={repr(value)}. Reason: {e}")
                continue
        queryset = base_queryset.filter(q_filtros)
        needs_distinct = False
        if tipo == "productos" and any(k.startswith(f'{related_name_producto_a_detalle}__') for k in filtros_dict): needs_distinct = True
        elif tipo == "clientes" and any(k.startswith('ventas__') for k in filtros_dict): needs_distinct = True
        elif tipo == "ventas" and any(k.startswith(f'{related_name_venta_a_detalle}__') for k in filtros_dict): needs_distinct = True
        if needs_distinct: queryset = queryset.distinct()
        hubo_agrupacion = False
        valid_agrupacion = []
        if agrupacion_list:
            hubo_agrupacion = True
            for field_path in agrupacion_list:
                try: self._validate_and_convert_value(ModelClass, field_path, None); valid_agrupacion.append(field_path)
                except (FieldDoesNotExist, ValueError): print(f"[WARN] Invalid grouping field skipped: {field_path}")
            if not valid_agrupacion: raise ValueError("Ningún campo de agrupación válido.")
            queryset = queryset.values(*valid_agrupacion)
            
            # --- ¡INICIO DE LA CORRECCIÓN! ---
            if calculos_dict:
                print(f"[DB Build] Applying calculations: {calculos_dict}")
                aggregations = {}
                for name, expr in calculos_dict.items(): # Renombrado a 'expr'
                    agg_func_name = None
                    field_in_agg_raw = None

                    # Caso 1: Formato String (ej: "Sum('total')")
                    if isinstance(expr, str):
                        parts = expr.replace(")", "").split("(")
                        if len(parts) == 2:
                            agg_func_name, field_in_agg_raw = parts
                    
                    # Caso 2: Formato Dict (ej: {"funcion": "Sum", "campo": "total"})
                    elif isinstance(expr, dict):
                        agg_func_name = expr.get("funcion")
                        field_in_agg_raw = expr.get("campo")

                    else:
                        print(f"[WARN] Valor de cálculo desconocido: {expr}")
                        continue
                    
                    # --- Continuación de la lógica (ahora funciona con ambos formatos) ---
                    if agg_func_name and field_in_agg_raw:
                        field_in_agg = field_in_agg_raw.strip("'\" ")
                        if agg_func_name in ALLOWED_AGGREGATIONS and field_in_agg:
                            AggFunc = ALLOWED_AGGREGATIONS[agg_func_name]
                            try:
                                self._validate_and_convert_value(ModelClass, field_in_agg, None)
                                aggregations[name] = AggFunc(field_in_agg)
                            except (FieldDoesNotExist, ValueError, TypeError):
                                print(f"[WARN] Invalid field in aggregation skipped: {field_in_agg}")
                        else: 
                            print(f"[WARN] Invalid aggregation function skipped: {agg_func_name}")
                    else: 
                        print(f"[WARN] Could not parse aggregation: {expr}")
                
                if aggregations:
                    print(f"[DB Build] Annotating with: {aggregations}")
                    queryset = queryset.annotate(**aggregations)
            # --- FIN DE LA CORRECCIÓN! ---
            
            if not orden_list: orden_list = valid_agrupacion
        final_orden_fields = []
        if orden_list:
            for field_order in orden_list:
                field_name = field_order.lstrip('-')
                is_group_field = field_name in valid_agrupacion
                is_calc_field = field_name in calculos_dict
                is_model_field = not hubo_agrupacion
                if is_model_field:
                    try: self._validate_and_convert_value(ModelClass, field_name, None);
                    except (FieldDoesNotExist, ValueError): is_model_field = False
                if is_group_field or is_calc_field or is_model_field:
                    final_orden_fields.append(field_order)
                else:
                    print(f"[WARN] Invalid ordering field skipped: {field_order}")
        if final_orden_fields:
            queryset = queryset.order_by(*final_orden_fields)
        elif not hubo_agrupacion: 
            if tipo == "ventas": queryset = queryset.order_by('-fecha_venta')
            elif tipo == "productos": queryset = queryset.order_by('nombre')
            elif tipo == "clientes": queryset = queryset.order_by('apellido', 'nombre')
        return queryset, hubo_agrupacion
        
    def post(self, request, *args, **kwargs):
        prompt = request.data.get('prompt')
        if not prompt: return Response({"error": "Prompt requerido."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Interpretar con Gemini
        interpretacion = self._call_gemini_api(prompt)
        if interpretacion.get("error"): return Response({"error": interpretacion["error"]}, status=status.HTTP_400_BAD_REQUEST)
        
        # Guardamos el prompt para el exportador
        interpretacion['prompt'] = prompt

        # 2. Construir Queryset
        try:
            queryset, hubo_agrupacion = self._build_queryset(interpretacion)
        except ValueError as e: return Response({"error": f"Error al procesar solicitud: {e}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"[ERROR] Unexpected error building queryset: {e}")
            traceback.print_exc()
            return Response({"error": "Error interno al procesar."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 3. Preparar Datos
        data_para_reporte = []
        try:
            tipo_reporte = interpretacion.get("tipo_reporte")
            if hubo_agrupacion:
                data_para_reporte = list(queryset)
            else:
                fields_to_select = []
                ModelClass = None
                if tipo_reporte == "ventas":
                    ModelClass = Venta
                    fields_to_select = ['id', 'cliente__nombre', 'cliente__apellido', 'vendedor__username', 'fecha_venta', 'total', 'estado']
                elif tipo_reporte == "productos":
                    ModelClass = Producto
                    fields_to_select = ['id', 'nombre', 'marca', 'modelo', 'categoria__nombre', 'precio', 'stock', 'garantia_meses']
                elif tipo_reporte == "clientes":
                    ModelClass = Cliente
                    fields_to_select = ['id', 'nombre', 'apellido', 'email', 'telefono', 'direccion', 'user__username']
                
                if ModelClass:
                    valid_fields = [f for f in fields_to_select if '__' in f or hasattr(ModelClass, f.split('__')[0])]
                    data_para_reporte = list(queryset.values(*valid_fields))
                    if tipo_reporte == "productos" and data_para_reporte:
                        data_para_reporte = [
                            {**{k: v for k, v in row.items() if k != 'categoria__nombre'}, 
                             'categoria': row.get('categoria__nombre')}
                            for row in data_para_reporte
                        ]
                else:
                    data_para_reporte = list(queryset.values())
            
            if not data_para_reporte:
                return Response([], status=status.HTTP_200_OK) # Devuelve lista vacía

        except Exception as e:
            print(f"[ERROR] Exception during data preparation: {e}")
            traceback.print_exc()
            return Response({"error": "Error al preparar los datos del reporte."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 4. Generar Respuesta (SIEMPRE JSON)
        def json_converter(o):
            if isinstance(o, (datetime, date)): return o.isoformat()
            if isinstance(o, Decimal): return f"{o:.2f}"
            raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")
        try:
            return Response(data_para_reporte, status=status.HTTP_200_OK)
        except TypeError:
            json_output = json.dumps(data_para_reporte, default=json_converter)
            return HttpResponse(json_output, content_type='application/json', status=status.HTTP_200_OK)


# ===================================================================
# --- VISTA #2: ExportarDatosView (NO USA IA, GENERA ARCHIVOS) ---
# ===================================================================
class ExportarDatosView(APIView):
    """
    Recibe datos JSON y un formato, y devuelve el archivo (PDF o Excel).
    NO llama a Gemini. Ahorra créditos.
    """
    permission_classes = [IsAdminOrVendedor]

    def post(self, request, *args, **kwargs):
        # 1. Obtener los datos que envía el frontend
        data = request.data.get('data') # Esta es la lista de diccionarios (el JSON)
        formato = request.data.get('formato') # 'pdf' o 'excel'
        prompt = request.data.get('prompt', 'Reporte') # El prompt original para el título
        
        if not data or not isinstance(data, list):
            return Response({"error": "No se proporcionaron datos válidos para exportar."}, status=status.HTTP_400_BAD_REQUEST)
        if not formato in ['pdf', 'excel']:
            return Response({"error": "Formato no válido. Debe ser 'pdf' o 'excel'."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Crear una 'interpretacion' simple para los generadores
        # (Los generadores usan esto para el título)
        interpretacion = {
            'prompt': prompt,
            'formato': formato
        }

        print(f"[Export] Solicitud de exportación recibida. Formato: {formato}. Filas: {len(data)}")

        # 3. Llamar al generador correspondiente
        try:
            if formato == "pdf":
                print("[Export] Llamando a generar_reporte_pdf...")
                return generar_reporte_pdf(data, interpretacion)
            
            elif formato == "excel":
                print("[Export] Llamando a generar_reporte_excel...")
                return generar_reporte_excel(data, interpretacion)
                
        except Exception as e:
            print(f"[ERROR] Falló la generación del archivo: {e}")
            traceback.print_exc()
            return Response({"error": "Error interno al generar el archivo."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({"error": "Error desconocido."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)