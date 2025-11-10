# ventas/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import DetalleVenta, Garantia
from dateutil.relativedelta import relativedelta

@receiver(post_save, sender=DetalleVenta)
def crear_garantias_para_detalle(sender, instance, created, **kwargs):
    """
    Signal: Se dispara DESPUÉS de que se guarda un DetalleVenta.
    Si es un nuevo detalle (created=True), crea los registros de Garantia.
    """
    if created:
        # 'instance' es el objeto DetalleVenta que se acaba de crear
        detalle = instance
        
        # 1. Obtener los datos necesarios
        producto = detalle.producto
        cantidad = detalle.cantidad
        meses_garantia = producto.garantia_meses
        
        # Si no tiene garantía (0 meses), no hacer nada
        if not meses_garantia or meses_garantia <= 0:
            return

        # 2. Calcular la fecha de vencimiento
        fecha_venta = detalle.venta.fecha_venta
        fecha_vencimiento = fecha_venta.date() + relativedelta(months=meses_garantia)

        # 3. Crear un registro de Garantia por CADA unidad vendida
        # Usamos bulk_create para eficiencia
        garantias_a_crear = [
            Garantia(
                detalle_venta=detalle,
                fecha_vencimiento=fecha_vencimiento,
                estado=Garantia.EstadoGarantia.ACTIVA
            )
            for _ in range(cantidad) # Bucle N veces por la cantidad
        ]
        
        if garantias_a_crear:
            Garantia.objects.bulk_create(garantias_a_crear)
            print(f"[Signal] Creadas {len(garantias_a_crear)} garantías para DetalleVenta #{detalle.id}")