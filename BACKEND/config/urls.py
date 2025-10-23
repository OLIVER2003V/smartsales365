# config/urls.py
from django.contrib import admin
from django.urls import path, include

# Importamos la vista de autenticación de tokens de DRF
from rest_framework.authtoken import views # <-- ¡Cambiamos la importación!
urlpatterns = [
    path('admin/', admin.site.urls),

    # ------------------ ENDPOINTS DE SEGURIDAD (TOKEN SIMPLE) ------------------
    # 1. Iniciar Sesión (Obtener Token): POST a /auth/login/
    path('auth/login/', views.obtain_auth_token, name='token_obtain_pair'),
    
    # El Cierre de Sesión (Logout) lo manejaremos con una vista personalizada,
    path('auth/logout/', include('usuario.urls')), # <-- Lo manejamos en la app 'usuario'
    
    # Incluye las URLs de la aplicación de usuario (Registro, Logout)
    path('api/', include('usuario.urls')), 
    
]