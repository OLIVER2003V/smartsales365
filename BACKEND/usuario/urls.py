# usuario/urls.py
from django.urls import path
from .views import UsuarioRegisterView, UserLogoutView, UserProfileView, PasswordResetRequestView, PasswordResetConfirmView, ProductoViewSet, ClienteViewSet, PasswordChangeView, UsuarioAdminViewSet, CategoriaViewSet, CarritoViewSet, PromocionViewSet, ResenaViewSet, FavoritoViewSet, register_fcm_device, InitializeIADataView 
from rest_framework.routers import DefaultRouter
# Crea un router
router = DefaultRouter()
# Registra el ViewSet. Esto crea: /api/productos/ y /api/productos/{pk}/
router.register(r'admin/usuarios', UsuarioAdminViewSet, basename='admin-usuario')
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'carrito', CarritoViewSet, basename='carrito')
router.register(r'admin/promociones', PromocionViewSet, basename='admin-promocion')
router.register(r'resenas', ResenaViewSet, basename='resena')
router.register(r'favoritos', FavoritoViewSet, basename='favorito')
urlpatterns = [
    # Endpoint de Registro: POST a /api/auth/register/
    path('auth/register/', UsuarioRegisterView.as_view(), name='user_register'),
    
    # Endpoint de Cierre de Sesión: POST a /api/auth/logout/
    path('auth/logout/', UserLogoutView.as_view(), name='user_logout'), # <-- Nueva ruta de logout
    
    # Ruta Protegida para prueba
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    
    path('auth/password/change/', PasswordChangeView.as_view(), name='password_change'),
    # RECUPERACIÓN DE CONTRASEÑA (API Pura)
    # ----------------------------------------------------
    # Paso 1: Solicitud de Email
    path('auth/password/reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    
    # Paso 2: Confirmación (Este endpoint se llamará desde el link del correo)
    path('auth/password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('register-fcm-device/', register_fcm_device, name='register-fcm-device'),
    path('init-ia-data/', InitializeIADataView.as_view(), name='init-ia-data'),
]

urlpatterns += router.urls