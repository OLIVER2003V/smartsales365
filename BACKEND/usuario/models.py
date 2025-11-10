# usuario/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
from .promocion_utils import get_precio_final
# --- (Modelo Rol y Usuario van primero, sin cambios) ---
class Rol(models.TextChoices):
    ADMINISTRADOR = 'ADM', 'Administrador'
    VENDEDOR = 'VEN', 'Vendedor' 
    CLIENTE = 'CLI', 'Cliente'

class Usuario(AbstractUser):
    rol = models.CharField(
        max_length=3,
        choices=Rol.choices,
        default=Rol.CLIENTE,
        help_text="Rol del usuario en el sistema SmartSales365."
    )
    email = models.EmailField(unique=True, null=False, blank=False)
    edad = models.PositiveIntegerField(
        null=True,  
        blank=True,
        help_text="Edad del usuario. Opcional en el registro."
    )
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

class Categoria(models.Model):
    nombre = models.CharField(
        max_length=100, 
        unique=True, 
        help_text="Nombre único de la categoría"
    )
    descripcion = models.TextField(
        blank=True, 
        null=True, 
        help_text="Descripción opcional de la categoría"
    )

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['nombre']
# --- ESTE ES EL MODELO 'Producto' CORRECTO PARA ESTE PASO ---
class Producto(models.Model):
    # --- Identificación y Clasificación ---
    nombre = models.CharField(max_length=100, help_text="Nombre corto del producto (Ej: Refrigerador)")
    marca = models.CharField(max_length=50, help_text="Fabricante (Ej: Samsung, LG)")
    modelo = models.CharField(max_length=50, blank=True, null=True, help_text="Modelo específico del fabricante")
    
    # --- ¡CAMBIO IMPORTANTE! ---
    # Renombramos 'categoria' a 'categoria_antigua'.
    # ¡ESO ES TODO!
    
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='productos', 
        help_text="Categoría del producto"
    )
    # --- FIN DE CAMBIO ---
    
    # --- Inventario y Finanzas ---
    precio = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio de venta actual")
    stock = models.IntegerField(default=0, help_text="Unidades disponibles en inventario")
    
    # --- (Resto del modelo sin cambios) ---
    garantia_meses = models.IntegerField(default=12, help_text="Meses de garantía estándar (Ej: 12, 24)")
    imagen_url = models.URLField(max_length=500, blank=True, null=True, help_text="URL de la imagen alojada en la nube (e.g., Cloudinary).")
    calificacion_promedio = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=0.00,
        help_text="Calificación promedio (de 1 a 5), calculada automáticamente."
    )
    total_resenas = models.PositiveIntegerField(
        default=0,
        help_text="Número total de reseñas, calculado automáticamente."
    )
    def __str__(self):
        return f"{self.nombre} ({self.marca} - {self.modelo})"
    
    class Meta:
        verbose_name = 'Electrodoméstico'
        verbose_name_plural = 'Electrodomésticos'

# --- (Modelo Cliente sin cambios) ---
class Cliente(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cliente_profile',
        limit_choices_to={'rol': Rol.CLIENTE},
        null=True, blank=True
    )
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(unique=True, help_text="Correo único del cliente")
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True, help_text="Dirección de envío o facturación")
    nit_ci = models.CharField(max_length=20, blank=True, null=True, unique=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.email})"

    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        
class Carrito(models.Model):
    """
    Representa el carrito de compras de un usuario.
    Usamos OneToOneField para asegurar un solo carrito por usuario.
    """
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='carrito'
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Carrito de {self.usuario.username}"

    @property
    def subtotal(self):
        """Calcula el subtotal del carrito."""
        return sum(item.precio_total for item in self.items.all())

    @property
    def total_items(self):
        """Calcula la cantidad total de items."""
        return sum(item.cantidad for item in self.items.all())
    
    class Meta:
        verbose_name = 'Carrito de Compras'
        verbose_name_plural = 'Carritos de Compras'


class ItemCarrito(models.Model):
    """
    Representa un producto específico dentro de un carrito.
    """
    carrito = models.ForeignKey(
        Carrito,
        on_delete=models.CASCADE,
        related_name='items' 
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='items_en_carrito'
    )
    cantidad = models.PositiveIntegerField(
        default=1,
        help_text="Cantidad del producto en el carrito"
    )

    class Meta:
        unique_together = ('carrito', 'producto')
        verbose_name = 'Ítem del Carrito'
        verbose_name_plural = 'Ítems del Carrito'
        ordering = ['producto__nombre']

    @property
    def precio_final_unitario(self):
        """ 
        Helper para obtener el precio de UNA unidad con descuento.
        """
        precio_final, _ = get_precio_final(self.producto)
        return precio_final

    @property
    def precio_total(self):
        """
        Calcula el precio total para este item USANDO EL PRECIO CON DESCUENTO.
        """
        # --- ¡CAMBIO CLAVE! ---
        # Usa el precio final calculado en lugar del precio base.
        return self.precio_final_unitario * self.cantidad
        # --- FIN DEL CAMBIO ---

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} (en {self.carrito.usuario.username})"
    
class Promocion(models.Model):
    """
    Define una promoción que puede aplicarse a productos o categorías.
    """
    class TipoDescuento(models.TextChoices):
        PORCENTAJE = 'PCT', 'Porcentaje'
        MONTO_FIJO = 'FIJ', 'Monto Fijo (Bs)'

    nombre = models.CharField(max_length=255, help_text="Nombre de la promoción (Ej: 'Venta Flash de Verano')")
    tipo_descuento = models.CharField(
        max_length=3,
        choices=TipoDescuento.choices,
        help_text="Si el descuento es un % o un monto fijo."
    )
    valor_descuento = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="El valor (ej: '15' para 15% o '50' para 50 Bs)"
    )
    
    # Rango de fechas para la promoción
    fecha_inicio = models.DateTimeField(default=timezone.now, help_text="Cuándo empieza la promoción.")
    fecha_fin = models.DateTimeField(help_text="Cuándo termina la promoción.")
    
    activo = models.BooleanField(default=True, help_text="Activa o desactiva la promoción globalmente.")

    # --- Alcance de la Promoción ---
    # Puedes aplicar la promoción a productos específicos O a categorías enteras.
    
    productos = models.ManyToManyField(
        Producto,
        related_name='promociones',
        blank=True,
        help_text="Aplica esta promoción solo a estos productos."
    )
    categorias = models.ManyToManyField(
        Categoria,
        related_name='promociones',
        blank=True,
        help_text="Aplica esta promoción a todos los productos de estas categorías."
    )

    def __str__(self):
        if self.tipo_descuento == self.TipoDescuento.PORCENTAJE:
            return f"{self.nombre} (-{self.valor_descuento}%)"
        return f"{self.nombre} (-Bs {self.valor_descuento})"

    class Meta:
        verbose_name = 'Promoción'
        verbose_name_plural = 'Promociones'
        ordering = ['-fecha_fin']
        
class Resena(models.Model):
    """
    Representa una reseña y calificación dejada por un usuario para un producto.
    """
    # --- Relaciones ---
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='resenas' # producto.resenas.all()
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE, # Si se borra el usuario, se borra su reseña
        related_name='resenas' # usuario.resenas.all()
    )
    
    # --- Contenido de la Reseña ---
    calificacion = models.PositiveIntegerField(
        help_text="Calificación del 1 al 5.",
        # Opcional: añadir validadores para asegurar 1-5
    )
    titulo = models.CharField(max_length=200, help_text="Título de la reseña (ej: 'Excelente producto')")
    comentario = models.TextField(help_text="Cuerpo de la reseña.")
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reseña de {self.usuario.username} para {self.producto.nombre} ({self.calificacion} estrellas)"

    class Meta:
        verbose_name = 'Reseña'
        verbose_name_plural = 'Reseñas'
        ordering = ['-fecha_creacion']
        # Un usuario solo puede dejar una reseña por producto
        unique_together = ('producto', 'usuario')
        
        
class Favorito(models.Model):
    """
    Registra un producto que un usuario ha marcado como favorito.
    """
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favoritos' # Permite usuario.favoritos.all()
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='favoritado_por' # Permite producto.favoritado_por.all()
    )
    fecha_agregado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.usuario.username} marcó como favorito a {self.producto.nombre}"

    class Meta:
        verbose_name = 'Favorito'
        verbose_name_plural = 'Favoritos'
        # Un usuario solo puede marcar como favorito un producto una vez
        unique_together = ('usuario', 'producto')
        ordering = ['-fecha_agregado']