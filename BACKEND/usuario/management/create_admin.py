import os
from django.core.management.base import BaseCommand
from django.conf import settings # Es mejor que importar os directamente

# Importa tus modelos de usuario
try:
    from usuario.models import Usuario, Rol
except ImportError:
    # Si este comando se corre antes de que 'usuario' esté listo,
    # usamos el User de Django por defecto
    from django.contrib.auth import get_user_model
    Usuario = get_user_model()
    # Definimos 'Rol' temporalmente si el import falla
    class Rol:
        ADMINISTRADOR = 'ADM'


class Command(BaseCommand):
    help = "Crea un superusuario/admin si no existe, usando variables de entorno."

    def handle(self, *args, **options):
        # Lee las variables de entorno que ya tienes en Render
        username = os.environ.get('DJANGO_ADMIN_USERNAME')
        email = os.environ.get('DJANGO_ADMIN_EMAIL')
        password = os.environ.get('DJANGO_ADMIN_PASSWORD')

        if not all([username, email, password]):
            self.stdout.write(self.style.ERROR('Faltan variables de entorno (DJANGO_ADMIN_USERNAME, DJANGO_ADMIN_EMAIL, DJANGO_ADMIN_PASSWORD)'))
            return

        if not Usuario.objects.filter(username=username).exists():
            self.stdout.write(self.style.SUCCESS(f'Creando cuenta de admin para {username} ({email})'))
            
            # Asignamos el ROL de admin
            Usuario.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                rol=Rol.ADMINISTRADOR # ¡Importante! Asignar el rol
            )
        else:
            self.stdout.write(self.style.WARNING(f'El usuario admin {username} ya existe.'))


