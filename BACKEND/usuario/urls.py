# usuario/urls.py
from django.urls import path
from .views import UsuarioRegisterView, UserLogoutView, UserProfileView, PasswordResetRequestView, PasswordResetConfirmView

urlpatterns = [
    # Endpoint de Registro: POST a /api/auth/register/
    path('auth/register/', UsuarioRegisterView.as_view(), name='user_register'),
    
    # Endpoint de Cierre de Sesión: POST a /api/auth/logout/
    path('auth/logout/', UserLogoutView.as_view(), name='user_logout'), # <-- Nueva ruta de logout
    
    # Ruta Protegida para prueba
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    
    # RECUPERACIÓN DE CONTRASEÑA (API Pura)
    # ----------------------------------------------------
    # Paso 1: Solicitud de Email
    path('auth/password/reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    
    # Paso 2: Confirmación (Este endpoint se llamará desde el link del correo)
    path('auth/password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]