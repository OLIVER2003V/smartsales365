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