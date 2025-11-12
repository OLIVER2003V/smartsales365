# analitica/views.py
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from usuario.permissions import IsAdminOrVendedor
import traceback
from django.utils import timezone
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncMonth, TruncDay, Coalesce
from datetime import datetime, timedelta

# Importa tus modelos
from ventas.models import Venta, DetalleVenta
from usuario.models import Producto

# Importa las funciones del servicio de ML (si existen)
try:
    from .ml_service import get_sales_prediction, train_sales_model
except ImportError:
    # Si ml_service no existe, crea funciones dummy para que no se rompa
    def get_sales_prediction(dias_a_predecir=30): 
        print("[WARN] ml_service.py no encontrado. Usando predicción dummy.")
        return []
    def train_sales_model(): 
        print("[WARN] ml_service.py no encontrado. Saltando entrenamiento.")
        return False

# Importa el nuevo Serializer (si no lo tienes, créalo)
try:
    from .serializers import ProductoBajaRotacionSerializer
except ImportError:
    # Si el serializer no existe, la app no se romperá
    print("[WARN] analitica/serializers.py no encontrado o sin ProductoBajaRotacionSerializer.")
    ProductoBajaRotacionSerializer = None


# =========================================================
# VISTA DE PREDICCIÓN (IA) 
# =========================================================
@api_view(['GET'])
@permission_classes([IsAdminOrVendedor])
def get_sales_predictions(request):
    try:
        dias = int(request.query_params.get('dias', 30)) 
        if not (1 <= dias <= 1095): 
             return Response({"error": "El número de días debe estar entre 1 y 1095."}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError:
        return Response({"error": "El parámetro 'dias' debe ser un número entero."}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # --- CAMBIO IMPORTANTE ---
        # Ahora recibimos 'predictions' y un dict 'metadata'
        predictions, metadata = get_sales_prediction(dias_a_predecir=dias) 
        
        # Comprobamos 'metadata' en lugar de 'predictions'
        if metadata is None:
            print("[API] Modelo no encontrado o inválido, intentando re-entrenamiento...")
            training_success = train_sales_model()
            
            if not training_success:
                 return Response({"error": "No hay suficientes datos para entrenar el modelo."}, status=status.HTTP_404_NOT_FOUND)
            
            predictions, metadata = get_sales_prediction(dias_a_predecir=dias)
            
            if metadata is None:
                 return Response({"error": "Error al cargar modelo post-entrenamiento."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # --- ¡CAMBIO EN LA RESPUESTA! ---
        # Añadimos la interpretación estática al dict de metadata
        # antes de enviarlo todo al frontend.
        
        error_promedio = round(metadata.get('rmse', 0), 2)
        
        metadata['interpretacion'] = (
            f"Estos pronósticos tienen un margen de error promedio de +/- {error_promedio} Bs. "
            "Se basan solo en fechas pasadas (día de la semana, mes) y no consideran "
            "tendencias de crecimiento, productos específicos o promociones."
        )
        
        # El frontend recibirá un objeto con 'predicciones' y 'metadata'
        # 'metadata' ahora contiene: rmse, fecha, interpretacion, e insights
        response_data = {
            'predicciones': predictions,
            'metadata': metadata
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        # --- FIN DEL CAMBIO ---

    except Exception as e:
       print(f"[ERROR API Predicciones] {e}")
       traceback.print_exc()
       return Response({"error": f"Error interno al generar predicciones: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# =========================================================
# VISTA DE ENTRENAMIENTO (IA)
# =========================================================
@api_view(['POST'])
@permission_classes([IsAdminOrVendedor])
def retrain_sales_model(request):
    print("[API] Solicitud de re-entrenamiento manual recibida...")
    try:
        success = train_sales_model()
        if success:
            return Response({"message": "Entrenamiento completado exitosamente."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "No se pudo entrenar el modelo, no hay suficientes datos."}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"[ERROR API Entrenamiento] {e}")
        traceback.print_exc()
        return Response({"error": f"Error interno durante el entrenamiento: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# =========================================================
# VISTA DE TARJETAS KPI (Dashboard) - ¡CORREGIDA!
# =========================================================
@api_view(['GET'])
@permission_classes([IsAdminOrVendedor])
def get_dashboard_kpis(request):
    try:
        today = timezone.now().date()
        
        # --- ¡CORRECCIÓN DE ERROR 500! ---
        # 'COMPLETADA' ya no existe. Usamos 'ENTREGADO' (cuyo código es 'OK')
        # O podemos excluir 'CANCELADO'
        ventas_validas = Venta.objects.exclude(estado=Venta.EstadoVenta.CANCELADO)
        # --- FIN DE CORRECCIÓN ---
        
        total_data = ventas_validas.aggregate(total_historico=Sum('total'))
        total_historico = total_data['total_historico'] or 0
        
        ventas_hoy_data = ventas_validas.filter(fecha_venta__date=today).aggregate(total_hoy=Sum('total'))
        total_hoy = ventas_hoy_data['total_hoy'] or 0
        
        total_productos = Producto.objects.filter(stock__gt=0).count()
        # Contamos órdenes entregadas como "completadas"
        total_ordenes = Venta.objects.filter(estado=Venta.EstadoVenta.ENTREGADO).count()
        
        kpis = {
            'total_historico_bs': round(total_historico, 2),
            'total_hoy_bs': round(total_hoy, 2),
            'total_productos': total_productos,
            'total_ordenes': total_ordenes
        }
        return Response(kpis, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[ERROR API KPIs] {e}")
        traceback.print_exc()
        return Response({"error": f"Error interno al obtener KPIs: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

# =========================================================
# VISTA PARA GRÁFICO DE VENTAS HISTÓRICAS - ¡CORREGIDA!
# =========================================================
@api_view(['GET'])
@permission_classes([IsAdminOrVendedor])
def get_historical_sales_summary(request):
    try:
        fecha_inicio_str = request.query_params.get('fecha_inicio')
        fecha_fin_str = request.query_params.get('fecha_fin')
        producto_id = request.query_params.get('producto_id')
        categoria_id_str = request.query_params.get('categoria') # Tu frontend envía 'categoria' (que es el ID)

        # --- ¡CORRECCIÓN DE ERROR 500! ---
        # El Queryset base ahora filtra por 'ENTREGADO' (OK)
        qs = Venta.objects.filter(estado=Venta.EstadoVenta.ENTREGADO)
        # --- FIN DE CORRECCIÓN ---

        fecha_inicio = None
        fecha_fin = None

        if fecha_inicio_str:
            fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
            qs = qs.filter(fecha_venta__date__gte=fecha_inicio)
        
        if fecha_fin_str:
            fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
            qs = qs.filter(fecha_venta__date__lte=fecha_fin)

        if producto_id:
            qs = qs.filter(detalles__producto_id=producto_id)
        
        if categoria_id_str:
            # Tu frontend envía el ID de categoría en el param 'categoria'
            qs = qs.filter(detalles__producto__categoria_id=categoria_id_str)
        
        qs = qs.distinct()

        # Decidir agrupación (Día vs Mes)
        group_by_day = False
        if fecha_inicio and fecha_fin:
            rango_dias = (fecha_fin - fecha_inicio).days
            if rango_dias <= 90: 
                group_by_day = True
        elif not fecha_inicio and not fecha_fin:
            hoy = timezone.now()
            hace_un_ano = hoy - timedelta(days=365)
            qs = qs.filter(fecha_venta__gte=hace_un_ano)

        if group_by_day:
            trunc_func = TruncDay('fecha_venta')
            date_format = '%Y-%m-%d'
        else:
            trunc_func = TruncMonth('fecha_venta')
            date_format = '%Y-%m'

        ventas_agrupadas = qs.annotate(
            periodo_trunc=trunc_func
        ).values(
            'periodo_trunc'
        ).annotate(
            total_ventas=Sum('total'),
            numero_ventas=Count('id')
        ).order_by('periodo_trunc')

        data_para_grafico = [
            {
                'periodo': item['periodo_trunc'].strftime(date_format), 
                'Total_Vendido': item['total_ventas'],
                'Numero_de_Ventas': item['numero_ventas']
            } 
            for item in ventas_agrupadas
        ]
        
        return Response(data_para_grafico, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[ERROR API Historial Ventas] {e}")
        traceback.print_exc()
        return Response({"error": f"Error interno al generar historial: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# =========================================================
# --- VISTA BAJA ROTACIÓN (Añadida) ---
# =========================================================
@api_view(['GET'])
@permission_classes([IsAdminOrVendedor])
def get_productos_baja_rotacion(request):
    """
    Devuelve una lista de productos con baja rotación (menos vendidos).
    """
    try:
        limite = int(request.query_params.get('limite', 10))
        periodo_dias = int(request.query_params.get('periodo', 90))

        filtro_ventas = Q() 
        if periodo_dias > 0:
            fecha_inicio = timezone.now() - timedelta(days=periodo_dias)
            filtro_ventas &= Q(detalles_venta__venta__fecha_venta__gte=fecha_inicio)
        
        # Solo contar ventas que no estén canceladas
        filtro_ventas &= ~Q(detalles_venta__venta__estado=Venta.EstadoVenta.CANCELADO)

        productos_annotados = Producto.objects.annotate(
            total_vendido=Coalesce(
                Sum('detalles_venta__cantidad', filter=filtro_ventas), 
                0
            )
        )
        productos_baja_rotacion = productos_annotados.order_by('total_vendido', 'stock')[:limite]

        # Asegúrate de que analitica/serializers.py existe y tiene ProductoBajaRotacionSerializer
        serializer = ProductoBajaRotacionSerializer(productos_baja_rotacion, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[ERROR API Baja Rotación] {e}")
        traceback.print_exc()
        return Response({"error": f"Error al generar reporte: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)