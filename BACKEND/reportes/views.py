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
from usuario.models import Producto, Cliente, Rol

# --- Librería opcional para parsear fechas ---
try:
    from dateutil.parser import parse as dateutil_parse
    dateutil_parse('2023-01-01') # Prueba simple
    print("[INFO] dateutil.parser loaded successfully.")
except ImportError:
    dateutil_parse = None
    print("[WARN] dateutil.parser not found. Date parsing will be basic (YYYY-MM-DD). Run: pip install python-dateutil")
except Exception as dateutil_err:
    dateutil_parse = None
    print(f"[WARN] dateutil.parser loaded but failed test parse: {dateutil_err}. Date parsing will be basic.")


# --- Configuración de Gemini ---
GEMINI_CONFIGURED = False
if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        # Listar modelos disponibles (opcional, útil para debug inicial)
        # print("\n--- Modelos Gemini Disponibles (soportan generateContent) ---")
        # for m in genai.list_models():
        #     if 'generateContent' in m.supported_generation_methods:
        #         print(f"  * {m.name}")
        # print("--- Fin Lista Modelos ---\n")
        GEMINI_CONFIGURED = True
    except Exception as e:
        print(f"[ERROR] Failed to configure Gemini or list models: {e}")
else:
    print("[WARN] GEMINI_API_KEY no encontrada. Reportes con IA deshabilitados.")

# --- Constantes ---
# Usa el modelo que te funcionó
GEMINI_MODEL_NAME = 'models/gemini-2.5-pro' # O el 'gemini-2.5-flash...'
DJANGO_LOOKUP_OPERATORS = ['exact','iexact','contains','icontains','in','gt','gte','lt','lte','isnull','range','year','month','day','week_day','startswith','istartswith','endswith','iendswith']
ALLOWED_AGGREGATIONS = {'Sum': Sum, 'Count': Count}


# --- Vista para Generar Reportes (MEJORADA Y CORREGIDA) ---
class GenerarReporteView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def _call_gemini_api(self, user_prompt):
        """Llama a la API de Gemini y parsea la respuesta JSON de forma robusta."""
        if not GEMINI_CONFIGURED:
            return {"error": "Servicio de IA no configurado en el servidor."}

        now = timezone.now()
        current_date_str = now.strftime('%Y-%m-%d')
        current_year_str = now.strftime('%Y')

        # Definición explícita del esquema para el LLM
        schema_definition = """
Esquema de Modelos y Relaciones (Usa estos campos y `related_names`):
- Venta: id, cliente (-> Cliente, related_name='ventas'), vendedor (-> Usuario, related_name='ventas_registradas'), fecha_venta (DateTimeField), total (DecimalField), estado (PEN, COM, CAN).
- DetalleVenta: id, venta (-> Venta, related_name='detalles'), producto (-> Producto, related_name='detalles_venta'), cantidad (IntegerField), precio_unitario (DecimalField), subtotal (DecimalField).
- Producto: id, nombre, marca, modelo, categoria (CharField), precio (DecimalField), stock (IntegerField), garantia_meses (IntegerField), imagen_url (URLField).
- Cliente: id, user (-> Usuario, related_name='cliente_profile'), nombre, apellido, email, telefono, direccion, nit_ci.
"""

        system_instruction = f"""
Eres un asistente experto en bases de datos para SmartSales365, un sistema de ventas de electrodomésticos en Bolivia (Moneda: BOB). Fecha actual: {current_date_str}.
Tu única tarea es analizar la SOLICITUD DEL USUARIO y DEVOLVER **ÚNICAMENTE** un objeto JSON válido con la siguiente estructura exacta, sin explicaciones, comentarios ni markdown:
{{
  "tipo_reporte": "string", // OBLIGATORIO: uno de ['ventas', 'productos', 'clientes']
  "formato": "string",      // OBLIGATORIO: uno de ['pdf', 'excel', 'pantalla'] (default: 'pantalla')
  "filtros": {{}},            // OBLIGATORIO: Objeto de filtros (puede estar vacío {{}})
                             // Claves: Lookups Django válidos (ej: 'fecha_venta__gte', 'total__exact', 'cliente__nombre__icontains', 'detalles_venta__venta__fecha_venta__month').
                             // Valores: Tipo correcto (string para fechas 'YYYY-MM-DD', number para números, boolean, o lista de 2 strings 'YYYY-MM-DD' para range).
  "agrupacion": ["string"], // OBLIGATORIO: Lista de campos para agrupar (puede estar vacía [])
  "calculos": {{}},           // OBLIGATORIO: Objeto de cálculos para agregación (puede estar vacío {{}})
                             // Ej: {{"total_vendido": "Sum('total')", "num_ventas": "Count('id')"}}
  "orden": ["string"],      // OPCIONAL: Lista de campos para ordenar (ej: ['-total_vendido'])
  "error": null | "string"  // OBLIGATORIO: null si éxito, string con descripción si hay error/ambigüedad.
}}

{schema_definition}

Reglas Clave:
- Año por Defecto: Si no se especifica año en fechas (ej: 'septiembre'), usa {current_year_str}.
- Fechas: SIEMPRE formato 'YYYY-MM-DD'. Interpreta 'mes pasado', 'ayer', 'últimos X días'. Si solo se da mes/año, aplica filtro __month/__year. Si es rango usa __range=["YYYY-MM-DD", "YYYY-MM-DD"].
- Texto: Usa 'icontains' por defecto si no se pide exactitud.
- Relaciones Inversas: Usa 'detalles_venta' (desde Producto), 'detalles' (desde Venta), 'ventas' (desde Cliente).
- Errores: Si es ambiguo o inválido, pon descripción en "error" y deja los otros campos vacíos o null.
- Salida: SOLO el JSON.
"""
        # --- Fin Instrucción ---

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
                # Limpieza robusta
                cleaned_json_text = raw_response_text.removeprefix("```json").removesuffix("```").strip()
                if not cleaned_json_text.startswith('{') or not cleaned_json_text.endswith('}'):
                     json_start = cleaned_json_text.find('{')
                     json_end = cleaned_json_text.rfind('}')
                     if json_start != -1 and json_end != -1:
                          cleaned_json_text = cleaned_json_text[json_start:json_end+1]
                          print(f"[Gemini] Extracted JSON block:\n{cleaned_json_text}")
                     else:
                          raise json.JSONDecodeError("No JSON object found in response.", cleaned_json_text, 0)
                          
                interpretacion = json.loads(cleaned_json_text)
            except ValueError as e: # Error de contenido bloqueado
                print(f"[ERROR] Gemini API content blocked or unexpected structure: {e}")
                feedback = getattr(response, 'prompt_feedback', 'N/A')
                candidates = getattr(response, 'candidates', [])
                finish_reason = "N/A"; safety_ratings = "N/A"
                if candidates and hasattr(candidates[0], 'finish_reason'): finish_reason = candidates[0].finish_reason
                if candidates and hasattr(candidates[0], 'safety_ratings'): safety_ratings = candidates[0].safety_ratings
                print(f"       Prompt Feedback: {feedback}\n       Finish Reason: {finish_reason}\n       Safety Ratings: {safety_ratings}")
                return {"error": f"Error de IA: Respuesta bloqueada ({finish_reason}) o inválida."}
            except json.JSONDecodeError as json_err: # Error de parseo JSON
                print(f"[ERROR] Gemini response was not valid JSON: {json_err}\nRaw response:\n{raw_response_text}")
                return {"error": "La respuesta de la IA no tiene el formato JSON esperado."}

            required_keys = ["tipo_reporte", "formato", "filtros", "agrupacion", "calculos", "error"]
            if not isinstance(interpretacion, dict) or not all(key in interpretacion for key in required_keys):
                 raise ValueError("La respuesta JSON de la IA no tiene la estructura requerida.")
            if interpretacion.get("error"):
                 print(f"[WARN] Gemini returned an error in JSON: {interpretacion['error']}")
                 return {"error": f"IA detectó un problema: {interpretacion['error']}"}

            print("[Gemini] JSON parsed and validated successfully.")
            return interpretacion
        except Exception as e:
            print(f"[ERROR] Failed to call or process Gemini API: {e}")
            error_msg = f"Error comunicándose con servicio IA: {e}"
            if hasattr(e, 'message'): error_msg = f"Error comunicándose con servicio IA: {e.message}"
            traceback.print_exc()
            return {"error": error_msg}


    def _parse_date_value(self, value):
        """Convierte un string de fecha (o None) a un objeto date/datetime."""
        if value is None:
            return None
        if dateutil_parse and isinstance(value, str):
            try:
                return dateutil_parse(value) # Devuelve datetime
            except ValueError:
                raise ValueError(f"Formato de fecha inválido: {value}")
        elif isinstance(value, str): # Fallback simple
            try: return datetime.strptime(value, '%Y-%m-%d').date()
            except ValueError: return datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
        return value # Devuelve si ya es un tipo correcto (o si falla todo)

    def _validate_and_convert_value(self, model_class, lookup, value):
        """Valida el lookup completo y convierte el valor al tipo de campo Django."""
        current_model = model_class
        field_instance = None
        parts = lookup.split('__')
        
        try:
            field_name_for_validation = None
            # Navega por las relaciones para encontrar el campo final
            for i, part in enumerate(parts):
                if i == len(parts) - 1 and part in DJANGO_LOOKUP_OPERATORS:
                    if field_instance is None and i > 0: raise FieldDoesNotExist(f"Campo base no encontrado antes del operador '{part}'")
                    break # 'part' es el operador

                try:
                    field_instance = current_model._meta.get_field(part)
                    field_name_for_validation = part # Guardamos el nombre del campo real
                    if hasattr(field_instance, 'related_model') and field_instance.related_model:
                        current_model = field_instance.related_model
                    elif i < len(parts) - 1:
                         is_next_part_operator = (i + 1 < len(parts)) and parts[i+1] in DJANGO_LOOKUP_OPERATORS
                         if not is_next_part_operator:
                              raise FieldDoesNotExist(f"'{part}' no es una relación válida en {current_model.__name__}")
                except FieldDoesNotExist:
                     # Permite lookups transformadores (year, month) o campos anotados
                     if i >= len(parts) - 2: # Si es el penúltimo (ej. fecha_venta__year) o último
                          print(f"[DB Validate] Field/Relation '{part}' not found on {current_model.__name__}. Assuming transform/annotation.")
                          field_instance = None # No podemos validar tipo
                          field_name_for_validation = part # Asumir que es un campo
                          break
                     else:
                          raise FieldDoesNotExist(f"Campo intermedio '{part}' no encontrado en {current_model.__name__} para '{lookup}'.")

            # --- Conversión de Valor ---
            # Si value es None, no necesita conversión (excepto para isnull)
            if value is None:
                 if parts[-1] == 'isnull': return bool(value) # Convertir None a False para isnull=None? Ojo.
                 print(f"[DB Validate] Value is None for {lookup}. Skipping conversion.")
                 return None

            converted_value = value
            lookup_operator = parts[-1] if parts[-1] in DJANGO_LOOKUP_OPERATORS else 'exact'

            print(f"[DB Validate] Field '{field_name_for_validation}' (Op: {lookup_operator}) for lookup '{lookup}'. Converting value: {repr(value)}")

            # Casos especiales de Operador
            if lookup_operator == 'isnull':
                converted_value = bool(value) if not isinstance(value, bool) else value
            elif lookup_operator == 'in':
                if not isinstance(value, list): raise ValueError("Valor para 'in' debe ser una lista.")
                # No convertimos elementos de la lista aquí, Django ORM puede manejarlo si son tipos simples
                converted_value = value
            elif lookup_operator == 'range':
                 if not isinstance(value, list) or len(value) != 2: raise ValueError("Valor para 'range' debe ser una lista de dos elementos.")
                 # Convertir ambas fechas en el rango
                 converted_value = [self._parse_date_value(value[0]), self._parse_date_value(value[1])]
            
            # Casos de Tipo de Campo (si se encontró)
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
            
            # Casos de Operador de Fecha (sin campo explícito)
            elif parts[-1] in ['year', 'month', 'day', 'week_day']:
                 print(f"[DB Validate] Assuming integer for date part lookup '{parts[-1]}'.")
                 converted_value = int(value)
            else:
                 print(f"[DB Validate] No specific field type found for '{lookup}'. Using original value.")

            print(f"[DB Validate] Converted value: {repr(converted_value)} (Type: {type(converted_value).__name__})")
            return converted_value

        except FieldDoesNotExist as e: raise FieldDoesNotExist(f"Campo/relación inválido en '{lookup}': {e}")
        except (ValueError, TypeError) as e: raise ValueError(f"Valor '{value}' inválido para filtro '{lookup}': {e}")


    def _build_queryset(self, interpretacion):
        """Construye queryset de Django (VALIDACIÓN MEJORADA Y ROBUSTA)."""
        tipo = interpretacion.get("tipo_reporte")
        filtros_dict = interpretacion.get("filtros", {})
        agrupacion_list = interpretacion.get("agrupacion", [])
        calculos_dict = interpretacion.get("calculos", {})
        orden_list = interpretacion.get("orden", [])
        ModelClass = None
        base_queryset = None

        print(f"\n--- [DB Build] Building Queryset ---")
        print(f"[DB Build] Interpretation: {interpretacion}")

        related_name_producto_a_detalle = 'detalles_venta'
        related_name_venta_a_detalle = 'detalles'

        if tipo == "ventas": ModelClass = Venta; base_queryset = Venta.objects.select_related('cliente', 'vendedor').prefetch_related(f'{related_name_venta_a_detalle}__producto')
        elif tipo == "productos": ModelClass = Producto; base_queryset = Producto.objects.all()
        elif tipo == "clientes": ModelClass = Cliente; base_queryset = Cliente.objects.select_related('user')
        else: raise ValueError(f"Tipo de reporte '{tipo}' no soportado.")

        # Corregir prefijos de filtros si el tipo es Producto
        if tipo == "productos":
             filtros_corregidos = {}
             for k, v in filtros_dict.items():
                  if k.startswith(f'{related_name_venta_a_detalle}__'): nuevo_k = k.replace(f'{related_name_venta_a_detalle}__', f'{related_name_producto_a_detalle}__', 1); filtros_corregidos[nuevo_k] = v
                  else: filtros_corregidos[k] = v
             filtros_dict = filtros_corregidos

        # Aplicar Filtros (con validación robusta)
        q_filtros = Q()
        for lookup, value in filtros_dict.items():
            try:
                converted_value = self._validate_and_convert_value(ModelClass, lookup, value)
                q_filtros &= Q(**{lookup: converted_value})
                print(f"[DB Build] Filter added: {lookup}={repr(converted_value)}")
            except (FieldDoesNotExist, ValueError, TypeError) as e:
                 print(f"[WARN] Skipping invalid filter from LLM: {lookup}={repr(value)}. Reason: {e}")
                 continue

        queryset = base_queryset.filter(q_filtros)
        needs_distinct = False
        if tipo == "productos" and any(k.startswith(f'{related_name_producto_a_detalle}__') for k in filtros_dict): needs_distinct = True
        elif tipo == "clientes" and any(k.startswith('ventas__') for k in filtros_dict): needs_distinct = True
        elif tipo == "ventas" and any(k.startswith(f'{related_name_venta_a_detalle}__') for k in filtros_dict): needs_distinct = True
        if needs_distinct: queryset = queryset.distinct(); print("[DB Build] Applied .distinct()")

        print(f"[DB Build] Queryset count after filters: {queryset.count()}")

        # Aplicar Agrupación y Cálculos
        hubo_agrupacion = False
        valid_agrupacion = []
        if agrupacion_list:
            hubo_agrupacion = True
            for field_path in agrupacion_list:
                 try: self._validate_and_convert_value(ModelClass, field_path, None); valid_agrupacion.append(field_path)
                 except (FieldDoesNotExist, ValueError): print(f"[WARN] Invalid grouping field skipped: {field_path}")
            if not valid_agrupacion: raise ValueError("Ningún campo de agrupación válido.")
            print(f"[DB Build] Applying grouping by: {valid_agrupacion}")
            queryset = queryset.values(*valid_agrupacion)

            if calculos_dict:
                 print(f"[DB Build] Applying calculations: {calculos_dict}")
                 aggregations = {}
                 for name, expr_str in calculos_dict.items():
                     parts = expr_str.replace(")", "").split("(")
                     if len(parts) == 2:
                          agg_func_name, field_in_agg_raw = parts
                          field_in_agg = field_in_agg_raw.strip("'\" ")
                          if agg_func_name in ALLOWED_AGGREGATIONS and field_in_agg:
                               AggFunc = ALLOWED_AGGREGATIONS[agg_func_name]
                               try:
                                    # CORRECCIÓN: Validar el campo de agregación
                                    self._validate_and_convert_value(ModelClass, field_in_agg, None) # Solo valida el path
                                    aggregations[name] = AggFunc(field_in_agg)
                               except (FieldDoesNotExist, ValueError, TypeError): # Captura TypeError también
                                     print(f"[WARN] Invalid field in aggregation skipped: {field_in_agg}")
                          else: print(f"[WARN] Invalid aggregation function skipped: {agg_func_name}")
                     else: print(f"[WARN] Could not parse aggregation: {expr_str}")
                 if aggregations:
                      print(f"[DB Build] Annotating with: {aggregations}")
                      queryset = queryset.annotate(**aggregations)
            
            if not orden_list: orden_list = valid_agrupacion # Ordenar por agrupación por defecto
            
        # Aplicar Orden
        final_orden_fields = []
        if orden_list:
             print(f"[DB Build] Applying order by: {orden_list}")
             for field_order in orden_list:
                  field_name = field_order.lstrip('-')
                  # Validar si es campo de agrupación, cálculo, o campo de modelo (si no hay agrupación)
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
             print(f"[DB Build] Final ordering: {final_orden_fields}")
             queryset = queryset.order_by(*final_orden_fields)
        elif not hubo_agrupacion: # Orden por defecto si NO hubo agrupación NI orden especificado
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

            # Si hubo agrupación, queryset ya es lista de dicts
            if hubo_agrupacion:
                data_para_reporte = list(queryset)
            # Si NO hubo agrupación, convertir queryset de objetos a lista de dicts
            else:
                fields_to_select = []
                ModelClass = None
                if tipo_reporte == "ventas":
                    ModelClass = Venta
                    fields_to_select = ['id', 'cliente__nombre', 'cliente__apellido', 'vendedor__username', 'fecha_venta', 'total', 'estado']
                elif tipo_reporte == "productos":
                    ModelClass = Producto
                    fields_to_select = ['id', 'nombre', 'marca', 'modelo', 'categoria', 'precio', 'stock', 'garantia_meses', 'imagen_url']
                elif tipo_reporte == "clientes":
                    ModelClass = Cliente
                    fields_to_select = ['id', 'nombre', 'apellido', 'email', 'telefono', 'direccion', 'user__username']
                
                if ModelClass:
                    # Validar campos de .values()
                    valid_fields = [f for f in fields_to_select if '__' in f or hasattr(ModelClass, f.split('__')[0])]
                    data_para_reporte = list(queryset.values(*valid_fields))
                else:
                    data_para_reporte = list(queryset.values()) # Fallback

            print(f"[DataPrep] Data prepared. Rows: {len(data_para_reporte)}")
            if data_para_reporte: print(f"          Sample row: {data_para_reporte[0]}")

        except Exception as e:
            print(f"[ERROR] Exception during data preparation: {e}")
            traceback.print_exc()
            return Response({"error": "Error al preparar los datos del reporte."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # --- CORRECCIÓN 404 ---
        # Si la consulta fue válida pero no arrojó resultados, devolver 200 OK con lista vacía
        if not data_para_reporte:
             print("[INFO] No data found for the query. Returning 200 OK with empty list.")
             return Response([], status=status.HTTP_200_OK) # Devolver 200 OK, no 404

        # 4. Generar Respuesta
        formato = interpretacion.get("formato", "pantalla")
        print(f"[Report] Generating report. Format: {formato}")

        # Función de ayuda para serializar tipos no-JSON (Decimal, Date, etc.)
        def json_converter(o):
            if isinstance(o, (datetime, date)):
                return o.isoformat()
            if isinstance(o, Decimal):
                return f"{o:.2f}" # Formatear como string con 2 decimales
            raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")

        if formato == "pdf":
            # (Aquí iría tu lógica real de 'generar_pdf')
            pdf_data_sample = json.dumps(data_para_reporte[:10], indent=2, default=json_converter)
            response = HttpResponse(f"PDF Placeholder:\n{pdf_data_sample}", content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="reporte.pdf"'
            return response
        elif formato == "excel":
            # (Aquí iría tu lógica real de 'generar_excel')
            excel_data_sample = json.dumps(data_para_reporte[:10], indent=2, default=json_converter)
            response = HttpResponse(f"Excel Placeholder:\n{excel_data_sample}", content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="reporte.xlsx"'
            return response
        else: # Formato "pantalla" (JSON)
            # DRF's Response puede manejar Decimal/Date/Time, pero si falla, usamos json.dumps
            try:
                 # Intenta la serialización estándar de DRF primero
                 return Response(data_para_reporte, status=status.HTTP_200_OK)
            except TypeError:
                 # Si DRF falla, usa json.dumps con el conversor
                 print("[WARN] DRF Response failed serializing. Falling back to manual json.dumps.")
                 json_output = json.dumps(data_para_reporte, default=json_converter)
                 return HttpResponse(json_output, content_type='application/json', status=status.HTTP_200_OK)

# --- Funciones Generadoras de Reportes (Placeholders - Implementar por separado) ---
# def generar_pdf(data, interpretacion):
#     import io
#     from reportlab.pdfgen import canvas
#     buffer = io.BytesIO()
#     p = canvas.Canvas(buffer)
#     p.drawString(100, 750, f"Reporte: {interpretacion.get('tipo_reporte')}")
#     # ... (Lógica de ReportLab para dibujar tabla con 'data') ...
#     p.showPage()
#     p.save()
#     buffer.seek(0)
#     return buffer
#
# def generar_excel(data, interpretacion):
#     import io
#     import openpyxl
#     workbook = openpyxl.Workbook()
#     sheet = workbook.active
#     # ... (Lógica de OpenPyXL para escribir 'data' en 'sheet') ...
#     buffer = io.BytesIO()
#     workbook.save(buffer)
#     buffer.seek(0)
#     return buffer