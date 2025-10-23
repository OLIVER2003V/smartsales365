# usuario/views.py
from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Usuario, Rol
from .serializers import UsuarioCreateSerializer
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from django.utils.encoding import force_str

# Vista para permitir el registro de nuevos usuarios (por defecto, Clientes)
class UsuarioRegisterView(generics.CreateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioCreateSerializer
    # Permitir acceso a cualquiera (incluso sin token) para crear una cuenta
    permission_classes = [permissions.AllowAny]
    
class UserLogoutView(APIView):
    # Solo usuarios autenticados pueden usar esta vista
    permission_classes = [IsAuthenticated] 

    def post(self, request):
        # request.auth contiene la instancia del Token que el usuario usó para autenticarse.
        # Simplemente eliminamos ese token de la base de datos para cerrarle la sesión.
        try:
            request.user.auth_token.delete()
            return Response({"detail": "Sesión cerrada exitosamente."}, status=status.HTTP_200_OK)
        except Exception:
            # Si el token ya fue eliminado o no existe por alguna razón.
            return Response({"detail": "Token no encontrado o ya inválido."}, status=status.HTTP_400_BAD_REQUEST)


# ----------------------------------------------------
# VISTA: Perfil (Protegida) - Dejamos para prueba
# ----------------------------------------------------
class UserProfileView(APIView):
    # Cualquiera autenticado (ADM, VEN, CLI) puede ver su propio perfil
    permission_classes = [permissions.IsAuthenticated] 

    def get(self, request):
        return Response({
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "rol": request.user.rol, # <-- Enviamos el rol
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "edad": request.user.edad,
        })
        
        
class IsAdminOrVendedor(permissions.BasePermission):
    """
    Permiso personalizado para permitir acceso solo a Administradores y Vendedores.
    """
    def has_permission(self, request, view):
        # Permite acceso si el usuario está autenticado Y su rol es ADM o VEN
        return request.user.is_authenticated and (
            request.user.rol == Rol.ADMINISTRADOR or 
            request.user.rol == Rol.VENDEDOR
        )
        
class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        
        if not email:
            return Response({'error': 'El email es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Buscamos al usuario por su email
            user = Usuario.objects.get(email=email)
            
            # Generamos el UID y el Token para ese usuario
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            # Devolvemos los datos directamente en la respuesta
            return Response({
                'detail': 'Token de reseteo generado para desarrollo.',
                'uid': uid,
                'token': token
            }, status=status.HTTP_200_OK)

        except Usuario.DoesNotExist:
            # Por seguridad, incluso si el usuario no existe, no lo revelamos.
            # Devolvemos una respuesta exitosa genérica para no dar pistas.
            return Response({
                'detail': 'Petición procesada.',
            }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # --- PASO 1: Extraer datos del request ---
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        password = request.data.get('new_password1')
        password2 = request.data.get('new_password2')

        # --- Validación básica de los datos ---
        if not all([uidb64, token, password, password2]):
            return Response(
                {'detail': 'Todos los campos (uid, token, new_password1, new_password2) son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if password != password2:
            return Response(
                {'new_password2': ['Las contraseñas no coinciden.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- PASO 2: Encontrar al usuario ---
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            # Si el UID es inválido o el usuario no existe, marcamos el usuario como nulo.
            user = None

        # --- PASO 3: Verificar el token y el usuario ---
        if user is not None and default_token_generator.check_token(user, token):
            # Si el token es válido, procedemos a cambiar la contraseña.
            try:
                # --- PASO 4: Validar la fortaleza de la contraseña ---
                password_validation.validate_password(password, user)
            except ValidationError as e:
                # Si la contraseña no es segura, devolvemos los errores.
                return Response({'new_password1': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

            # --- PASO 5: Guardar la nueva contraseña ---
            user.set_password(password)
            user.save()
            return Response(
                {'detail': 'Contraseña restablecida exitosamente.'},
                status=status.HTTP_200_OK
            )
        else:
            # Si el usuario no existe o el token es inválido, devolvemos un error.
            # Esto previene que alguien sepa si un usuario existe o no.
            return Response(
                {'detail': 'El enlace de reseteo es inválido o ha expirado.'},
                status=status.HTTP_400_BAD_REQUEST
            )