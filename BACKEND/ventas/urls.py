# ventas/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VentaViewSet, CreatePaymentIntentView

router = DefaultRouter()
# Registra el ViewSet. Crea /api/ventas/ y /api/ventas/{pk}/
router.register(r'ventas', VentaViewSet, basename='venta')

urlpatterns = [
    path('', include(router.urls)),
    path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
]