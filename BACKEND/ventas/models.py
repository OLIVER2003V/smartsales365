# ventas/models.py
from django.db import models
from django.conf import settings # Para referenciar al Usuario
# Importa los modelos Cliente y Producto desde la app 'usuario'
from usuario.models import Cliente, Producto

# =========================================================
# Modelo: Venta (Cabecera de la transacción)
# =========================================================
class Venta(models.Model):
    # --- Estado de la Venta (Opcional, pero útil) ---
    class EstadoVenta(models.TextChoices):
        PENDIENTE = 'PEN', 'Pendiente' # Ej: Carrito abandonado o pago no confirmado
        COMPLETADA = 'COM', 'Completada' # Pago confirmado, stock descontado
        CANCELADA = 'CAN', 'Cancelada' # Venta anulada

    # --- Relaciones ---
    # Vincula a un Cliente (puede ser nulo si es venta anónima, aunque no recomendado)
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.SET_NULL, # Si se borra el cliente, la venta no se borra, solo pierde la ref.
        related_name='ventas',
        null=True, # Permite ventas sin cliente registrado (ej. invitado)
        blank=True
    )
    # Vincula al Vendedor que registró la venta (si aplica)
    vendedor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, # Si se borra el vendedor, la venta no se borra
        related_name='ventas_registradas',
        limit_choices_to={'rol': 'VEN'}, # Solo usuarios con rol Vendedor
        null=True,
        blank=True
    )

    # --- Información de la Venta ---
    fecha_venta = models.DateTimeField(auto_now_add=True, help_text="Fecha y hora en que se creó la venta")
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Monto total de la venta")
    estado = models.CharField(
        max_length=3,
        choices=EstadoVenta.choices,
        default=EstadoVenta.PENDIENTE,
        help_text="Estado actual de la transacción"
    )
    # Puedes añadir campos como método de pago, referencia de pago (Stripe/PayPal), etc.
    # metodo_pago = models.CharField(max_length=50, blank=True, null=True)
    # referencia_pago = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        cliente_str = self.cliente.nombre if self.cliente else "Invitado"
        return f"Venta #{self.id} - {cliente_str} - {self.fecha_venta.strftime('%Y-%m-%d')}"

    class Meta:
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'
        ordering = ['-fecha_venta'] # Ordenar por fecha descendente por defecto

# =========================================================
# Modelo: DetalleVenta (Ítems dentro de una Venta)
# =========================================================
class DetalleVenta(models.Model):
    # --- Relaciones ---
    # Vincula este detalle a una Venta específica
    venta = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE, # Si se borra la Venta, se borran sus detalles
        related_name='detalles' # Cómo acceder a los detalles desde una Venta (venta.detalles.all())
    )
    # Vincula este detalle a un Producto específico
    producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT, # NO permite borrar un Producto si está en una venta (importante para historial)
        related_name='detalles_venta'
    )

    # --- Información del Ítem ---
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio del producto al momento de la venta")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        # Calcula el subtotal automáticamente antes de guardar
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} (Venta #{self.venta.id})"

    class Meta:
        verbose_name = 'Detalle de Venta'
        verbose_name_plural = 'Detalles de Venta'
        # unique_together = ('venta', 'producto') # Opcional: Evita añadir el mismo producto dos veces en la misma venta