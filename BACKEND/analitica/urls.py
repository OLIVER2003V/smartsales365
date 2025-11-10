# analitica/urls.py
from django.urls import path
from .views import (
    get_sales_predictions,
    retrain_sales_model,
    get_dashboard_kpis,
    get_historical_sales_summary,
    get_productos_baja_rotacion 
)

urlpatterns = [
    # URLs de tu 'api/analitica.js'
    path('kpis/', get_dashboard_kpis, name='api-kpis'),
    path('predicciones/ventas/', get_sales_predictions, name='api-predicciones-ventas'),
    path('predicciones/entrenar/', retrain_sales_model, name='api-entrenamiento'),
    path('historial/resumen/', get_historical_sales_summary, name='api-historial-resumen'),
    
    # Nueva URL
    path('reportes/baja-rotacion/', get_productos_baja_rotacion, name='reporte-baja-rotacion'),
]