# usuario/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class Rol(models.TextChoices):
    ADMINISTRADOR = 'ADM', 'Administrador'
    VENDEDOR = 'VEN', 'Vendedor' 
    CLIENTE = 'CLI', 'Cliente'

class Usuario(AbstractUser):
    # Campo personalizado para el rol
    rol = models.CharField(
        max_length=3,
        choices=Rol.choices,
        default=Rol.CLIENTE,
        help_text="Rol del usuario en el sistema SmartSales365."
    )
    # Si quieres usar email como campo único de login:
    email = models.EmailField(unique=True, null=False, blank=False)
    edad = models.PositiveIntegerField(
        null=True,  
        blank=True,
        help_text="Edad del usuario. Opcional en el registro."
    )
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    # Puedes omitir el username si usas email como login, pero lo dejamos por simplicidad
    # en este inicio.