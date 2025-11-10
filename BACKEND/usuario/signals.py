# usuario/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from .models import Resena, Producto

@receiver([post_save, post_delete], sender=Resena)
def actualizar_calificacion_producto(sender, instance, **kwargs):
    """
    Signal: Se dispara DESPUÉS de que se guarda o borra una Reseña.
    Recalcula la calificación promedio y el total de reseñas
    para el producto asociado.
    """
    producto = instance.producto

    # Realizar la agregación en la base de datos
    agregado = Resena.objects.filter(producto=producto).aggregate(
        promedio=Avg('calificacion'),
        total=Count('id')
    )

    # Actualizar el objeto Producto
    producto.calificacion_promedio = agregado['promedio'] or 0.00
    producto.total_resenas = agregado['total'] or 0
    
    producto.save(update_fields=['calificacion_promedio', 'total_resenas'])
    print(f"[Signal] Calificación actualizada para '{producto.nombre}': {producto.calificacion_promedio} estrellas, {producto.total_resenas} reseñas.")