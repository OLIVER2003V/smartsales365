# usuario/promocion_utils.py
from django.utils import timezone
from django.db.models import Q
from decimal import Decimal

def get_precio_final(producto):
    """
    Calcula el precio final de un producto aplicando la mejor promoción activa.
    
    Devuelve: (precio_final, promocion_activa)
    'promocion_activa' es el objeto Promocion o None.
    """
    precio_base = producto.precio
    mejor_precio = precio_base
    mejor_promocion = None
    
    now = timezone.now()
    
    # 1. Crear el filtro base para promociones activas
    base_q = Q(activo=True) & Q(fecha_inicio__lte=now) & Q(fecha_fin__gte=now)
    
    # 2. Buscar promociones por producto Y por categoría
    # (Usamos 'id' para construir el Q object)
    filtro_producto = Q(productos__id=producto.id)
    filtro_categoria = Q()
    if producto.categoria:
        filtro_categoria = Q(categorias__id=producto.categoria.id)

    # 3. Obtener todas las promociones relevantes en una sola consulta
    # (Evita el problema N+1)
    promociones_posibles = producto.promociones.model.objects.filter(
        base_q & (filtro_producto | filtro_categoria)
    ).distinct().order_by('id') # 'order_by' para consistencia
    
    if not promociones_posibles.exists():
        return precio_base, None # No hay promociones, devuelve el precio normal

    # 4. Iterar y encontrar el mejor precio
    for promo in promociones_posibles:
        precio_calculado = precio_base
        
        if promo.tipo_descuento == promo.TipoDescuento.PORCENTAJE:
            descuento = precio_base * (promo.valor_descuento / Decimal('100.0'))
            precio_calculado = precio_base - descuento
        
        elif promo.tipo_descuento == promo.TipoDescuento.MONTO_FIJO:
            precio_calculado = precio_base - promo.valor_descuento
        
        # Redondear a 2 decimales
        precio_calculado = round(precio_calculado, 2)

        if precio_calculado < mejor_precio:
            mejor_precio = precio_calculado
            mejor_promocion = promo

    # Asegurarse de que el precio no sea negativo
    if mejor_precio < 0:
        mejor_precio = Decimal('0.00')

    return mejor_precio, mejor_promocion