# usuario/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

class Rol(models.TextChoices):
    ADMINISTRADOR = 'ADM', 'Administrador'
    VENDEDOR = 'VEN', 'Vendedor' 
    CLIENTE = 'CLI', 'Cliente'
# ES EL QUE INGRESA A LA APP/WEB
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
class Producto(models.Model):
    # --- Identificación y Clasificación ---
    nombre = models.CharField(max_length=100, help_text="Nombre corto del producto (Ej: Refrigerador)")
    marca = models.CharField(max_length=50, help_text="Fabricante (Ej: Samsung, LG)")
    modelo = models.CharField(max_length=50, blank=True, null=True, help_text="Modelo específico del fabricante")
    
    # Campo para la clasificación general (Importante para los reportes de IA)
    categoria = models.CharField(max_length=50, help_text="Ej: Refrigeración, Cocción, Lavado, Audio/TV")
    
    # --- Inventario y Finanzas ---
    precio = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio de venta actual")
    stock = models.IntegerField(default=0, help_text="Unidades disponibles en inventario")
    
    # --- Requisito Específico de Electrodomésticos (Garantía) ---
    garantia_meses = models.IntegerField(default=12, help_text="Meses de garantía estándar (Ej: 12, 24)")
    imagen_url = models.URLField(max_length=500, blank=True, null=True, help_text="URL de la imagen alojada en la nube (e.g., Cloudinary).")
    def __str__(self):
        return f"{self.nombre} ({self.marca} - {self.modelo})"
    
    class Meta:
        verbose_name = 'Electrodoméstico'
        verbose_name_plural = 'Electrodomésticos'
# ES CON QUIEN HACEMOS EL NEGOCIO        
class Cliente(models.Model):
    # Vincula al modelo de usuario. Clave para clientes registrados online.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, # Referencia dinámica al modelo Usuario
        on_delete=models.CASCADE, # Si se borra el usuario, se borra el cliente
        related_name='cliente_profile', # Cómo acceder al cliente desde el usuario (user.cliente_profile)
        limit_choices_to={'rol': Rol.CLIENTE}, # Solo permite vincular usuarios con rol Cliente
        null=True, blank=True # IMPORTANTE: Permite crear Clientes sin cuenta de Usuario (ej. registro en tienda)
    )

    # Campos comerciales (pueden ser redundantes si user existe, pero útiles si no)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    # Email único para el cliente (puede ser diferente al del usuario si existe)
    email = models.EmailField(unique=True, help_text="Correo único del cliente")
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True, help_text="Dirección de envío o facturación")
    # Puedes añadir NIT/CI aquí si es necesario para facturas
    nit_ci = models.CharField(max_length=20, blank=True, null=True, unique=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.email})"

    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'