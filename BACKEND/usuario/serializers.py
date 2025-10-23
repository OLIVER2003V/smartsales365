# usuario/serializers.py
from rest_framework import serializers
from .models import Usuario, Rol

class UsuarioCreateSerializer(serializers.ModelSerializer):
    rol = serializers.ChoiceField(choices=Rol.choices, required=False, default=Rol.CLIENTE)
    edad = serializers.IntegerField(
        required=False, # O true, si lo quieres obligatorio
        min_value=10,   # Ejemplo de validación para edad mínima
        max_value=120,
    )
    class Meta:
        model = Usuario
        # Campos que el usuario puede enviar para registrarse
        fields = ('username', 'email', 'password', 'rol', 'first_name', 'last_name','edad') 
        extra_kwargs = {'password': {'write_only': True}} # La contraseña se envía, pero no se recupera

    def create(self, validated_data):
        # Usamos create_user para que la contraseña se guarde hasheada
        user = Usuario.objects.create_user(**validated_data)
        return user