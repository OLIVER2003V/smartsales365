# ventas/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import  GenerarReporteView # <-- Importa la nueva vista

router = DefaultRouter()


urlpatterns = [
    path('', include(router.urls)),
    # --- NUEVA RUTA PARA REPORTES ---
    path('reportes/generar/', GenerarReporteView.as_view(), name='generar-reporte'),
]
urlpatterns += router.urls