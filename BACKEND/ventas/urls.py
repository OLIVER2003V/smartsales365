# ventas/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VentaViewSet, CreatePaymentIntentView, DescargarComprobanteView, ConsultarGarantiaView, IniciarReclamoGarantiaView, GestionarGarantiaView, GarantiaViewSet, RunPopulateView

router = DefaultRouter()
# Registra el ViewSet. Crea /api/ventas/ y /api/ventas/{pk}/
router.register(r'ventas', VentaViewSet, basename='venta')
router.register(r'garantias', GarantiaViewSet, basename='garantia')

urlpatterns = [
    path('', include(router.urls)),
    path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('ventas/<int:venta_id>/comprobante/', DescargarComprobanteView.as_view(), name='descargar-comprobante'),
    path('consultar-garantia/', ConsultarGarantiaView.as_view(), name='consultar-garantia'),
    path('garantias/<int:garantia_id>/reclamar/', IniciarReclamoGarantiaView.as_view(), name='iniciar-reclamo-garantia'),
    
    # 3. Gestionar Reclamo (Admin)
    path('garantias/<int:garantia_id>/gestionar/', GestionarGarantiaView.as_view(), name='gestionar-reclamo-garantia'),
    path('run-populate/', RunPopulateView.as_view(), name='populate-ventas'),

]