# ventas/models.py
from django.db import models
from django.conf import settings 
from usuario.models import Cliente, Producto
import uuid
# =========================================================
# Modelo: Venta (Ahora también actúa como Pedido)
# =========================================================
class Venta(models.Model):
    # --- ¡CAMBIO AQUÍ! ---
    # Añadimos los estados de cumplimiento del pedido
    class EstadoVenta(models.TextChoices):
        PAGADO = 'PAG', 'Pagado' # El cliente pagó, pendiente de envío (CU18)
        EN_TRANSITO = 'ENT', 'En Tránsito' # El admin lo marcó como enviado
        ENTREGADO = 'OK', 'Entregado' # El admin lo marcó como completado
        CANCELADO = 'CAN', 'Cancelado' # El admin (o sistema) lo canceló

    # --- Relaciones (Sin cambios) ---
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.SET_NULL, 
        related_name='ventas',
        null=True, 
        blank=True
    )
    vendedor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, 
        related_name='ventas_registradas',
        limit_choices_to={'rol': 'VEN'}, 
        null=True,
        blank=True
    )

    # --- Información de la Venta (Cambio en 'estado') ---
    fecha_venta = models.DateTimeField(auto_now_add=True, help_text="Fecha y hora en que se creó la venta")
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Monto total de la venta")
    
    # --- ¡CAMBIO AQUÍ! ---
    # El estado por defecto ahora es PAGADO (después del checkout)
    estado = models.CharField(
        max_length=3,
        choices=EstadoVenta.choices,
        default=EstadoVenta.PAGADO, # Cambiamos PENDIENTE por PAGADO
        help_text="Estado actual de la transacción y envío"
    )

    def __str__(self):
        cliente_str = self.cliente.nombre if self.cliente else "Invitado"
        return f"Venta #{self.id} - {cliente_str} - {self.get_estado_display()}" # Muestra el estado

    class Meta:
        verbose_name = 'Venta/Pedido'
        verbose_name_plural = 'Ventas/Pedidos'
        ordering = ['-fecha_venta'] 

# =========================================================
# Modelo: DetalleVenta (Sin cambios)
# =========================================================
class DetalleVenta(models.Model):
    venta = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE, 
        related_name='detalles' 
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT, 
        related_name='detalles_venta'
    )
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, help_text="Precio del producto al momento de la venta")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} (Venta #{self.venta.id})"

    class Meta:
        verbose_name = 'Detalle de Venta'
        verbose_name_plural = 'Detalles de Venta'
        
class Garantia(models.Model):
    """
    Registra una garantía única para una UNIDAD de un producto vendido.
    Si un DetalleVenta tiene cantidad=5, se crearán 5 de estos objetos.
    Ahora incluye campos para el proceso de reclamo.
    """
    
    # --- ¡CAMBIO AQUÍ! (Estados ampliados) ---
    class EstadoGarantia(models.TextChoices):
        ACTIVA = 'ACT', 'Activa'
        EN_RECLAMO = 'REC', 'Reclamo Iniciado' # Cliente inició el reclamo
        EN_REVISION = 'REV', 'En Revisión'     # Admin recibió/recepcionó el producto
        APROBADA = 'APR', 'Aprobada'        # Admin aprobó (reparación/reemplazo)
        RECHAZADA = 'RZD', 'Rechazada'      # Admin rechazó el reclamo
        EXPIRADA = 'EXP', 'Expirada'

    # Vincula a la línea de pedido específica (Sin cambios)
    detalle_venta = models.ForeignKey(
        DetalleVenta,
        on_delete=models.CASCADE,
        related_name='garantias'
    )
    # Código único para que el cliente consulte (Sin cambios)
    codigo_garantia = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True
    )
    fecha_vencimiento = models.DateField()
    
    # Estado (ahora usa los nuevos choices)
    estado = models.CharField(
        max_length=3,
        choices=EstadoGarantia.choices,
        default=EstadoGarantia.ACTIVA
    )
    
    # --- ¡NUEVOS CAMPOS! ---
    # Para que el cliente explique el problema al reclamar
    motivo_reclamo = models.TextField(
        blank=True, 
        null=True, 
        help_text="Descripción del cliente sobre la falla"
    )
    # Para que el admin justifique su decisión (aceptar, recepcionar, rechazar)
    observacion_admin = models.TextField(
        blank=True, 
        null=True, 
        help_text="Notas del administrador sobre la revisión o rechazo"
    )
    
    # --- ¡CAMBIO AQUÍ! (String mejorado) ---
    def __str__(self):
        # Muestra el estado actual, que es más útil
        return f"Garantía {str(self.codigo_garantia)[:8]}... ({self.get_estado_display()})"
    
    class Meta:
        verbose_name = 'Garantía de Producto'
        verbose_name_plural = 'Garantías de Producto'
        ordering = ['-fecha_vencimiento']