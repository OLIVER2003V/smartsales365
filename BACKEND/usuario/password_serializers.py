# usuario/password_serializers.py
from django.contrib.auth import password_validation
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from rest_framework import serializers
from django.contrib.auth.tokens import default_token_generator
class PasswordResetEmailSerializer(serializers.Serializer):
    """Serializador para recibir el correo y enviar el enlace de restablecimiento."""
    email = serializers.EmailField(required=True)
    
    # Campo para indicar la URL base del frontend, CRUCIAL para el enlace
    frontend_url = serializers.CharField(required=True) 

    def validate_email(self, value):
        # Asegura que el correo existe y es un usuario activo
        if not PasswordResetForm(data={'email': value}).is_valid():
            raise serializers.ValidationError("El correo proporcionado no está registrado en el sistema.")
        return value

    def save(self):
        request = self.context.get('request')
        form = PasswordResetForm(data={'email': self.validated_data['email']})
        
        if form.is_valid():
            # AHORA USAMOS LOS NOMBRES DE PLANTILLA QUE ESTABLECIMOS
            opts = {
                'use_https': request.is_secure(),
                'from_email': None,
                # ESTO LE DICE A DJANGO QUÉ ARCHIVO USAR:
                'email_template_name': 'registration/password_reset_email.html', 
                'subject_template_name': 'registration/password_reset_subject.txt',
                'request': request,
                # PASAMOS EL CONTEXTO DEL FRONTEND:
                'extra_email_context': {
                    'frontend_url': self.validated_data['frontend_url']
                },
                # LA CLAVE: Desactivar el uso interno de reverse_lazy ('password_reset_confirm')
                'html_email_template_name': None,
                'token_generator': default_token_generator,
                'domain_override': 'placeholder.com' # Un dominio placeholder
            }
            
            form.save(**opts)

