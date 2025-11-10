# usuario/permissions.py
from rest_framework import permissions
from .models import Rol # Importa tu modelo Rol

class IsAdminOrVendedor(permissions.BasePermission):
    """
    Permiso personalizado para permitir acceso solo a Administradores y Vendedores.
    """
    def has_permission(self, request, view):
        # Asegúrate que el usuario esté autenticado antes de chequear el rol
        if not request.user or not request.user.is_authenticated:
            return False
        # Permite acceso si el rol es ADM o VEN
        return request.user.rol == Rol.ADMINISTRADOR or request.user.rol == Rol.VENDEDOR

# --- INICIO DE NUEVO CÓDIGO (CU6) ---

class IsAdminUser(permissions.BasePermission):
    """
    Permiso personalizado para permitir acceso SOLO a Administradores.
    (CU6: GESTIONAR USUARIO)
    """
    def has_permission(self, request, view):
        # El usuario debe estar autenticado Y tener el rol de Administrador
        return request.user and \
               request.user.is_authenticated and \
               request.user.rol == Rol.ADMINISTRADOR

# --- FIN DE NUEVO CÓDIGO ---

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permiso para el dueño del objeto o un Admin/Staff.
    """
    def has_object_permission(self, request, view, obj):
        # Permisos de Admin/Staff
        if request.user.is_staff or (hasattr(request.user, 'rol') and request.user.rol == 'ADM'):
            return True
        
        # Permiso del dueño (asume que el objeto 'obj' tiene un campo 'usuario')
        return obj.usuario == request.user