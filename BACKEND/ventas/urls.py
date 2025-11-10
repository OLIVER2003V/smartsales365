# ventas/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VentaViewSet, CreatePaymentIntentView, DescargarComprobanteView, ConsultarGarantiaView

router = DefaultRouter()
# Registra el ViewSet. Crea /api/ventas/ y /api/ventas/{pk}/
router.register(r'ventas', VentaViewSet, basename='venta')

urlpatterns = [
    path('', include(router.urls)),
    path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('ventas/<int:venta_id>/comprobante/', DescargarComprobanteView.as_view(), name='descargar-comprobante'),
    path('consultar-garantia/', ConsultarGarantiaView.as_view(), name='consultar-garantia'),
]