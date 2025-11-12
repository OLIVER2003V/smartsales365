import random
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

# Importamos modelos necesarios
from usuario.models import Producto, Cliente, Usuario, Rol
from ventas.models import Venta, DetalleVenta

def seed_ventas_ia(cantidad_a_crear=365):
    """
    Genera ventas sintéticas con DetalleVenta para IA (últimos 2 años).
    Solo requiere Productos y Clientes.
    """
    
    # 1. Obtener recursos necesarios (Ya no buscamos Vendedores)
    productos = list(Producto.objects.filter(stock__gt=0))
    clientes = list(Cliente.objects.all())

    # --- VERIFICACIÓN SIMPLIFICADA ---
    if not productos:
        raise Exception("Faltan recursos: ¡No hay PRODUCTOS con stock en la base de datos! Carga el excel primero.")
    if not clientes:
        raise Exception("Faltan recursos: ¡No hay CLIENTES en la base de datos! Crea un usuario cliente.")
    # --- FIN DE VERIFICACIÓN ---
    
    created_count = 0
    now = timezone.now()

    with transaction.atomic():
        
        # Paso de Limpieza CRUCIAL
        Venta.objects.filter(estado=Venta.EstadoVenta.ENTREGADO).delete()
        
        for i in range(cantidad_a_crear):
            
            # 2. Seleccionar Cliente aleatorio
            cliente_aleatorio = random.choice(clientes)
            # Vendedor_aleatorio es implícitamente None

            # Simular fechas aleatorias en los últimos 2 años (730 días)
            dias_atras = random.randint(1, 730)
            fecha_venta_simulada = now - timedelta(days=dias_atras)
            
            # 3. Crear la cabecera de la Venta
            venta = Venta.objects.create(
                cliente=cliente_aleatorio,
                vendedor=None, # <-- Forzamos a NONE, ya que no existe un vendedor.
                estado=Venta.EstadoVenta.ENTREGADO, 
                total=Decimal('0.00') 
            )
            
            # Forzar la fecha
            venta.fecha_venta = fecha_venta_simulada
            venta.save(update_fields=['fecha_venta'])

            # 4. Crear Detalles de Venta (1 a 5 productos por venta)
            num_items = random.randint(1, 5)
            venta_total_calculado = Decimal('0.00')
            productos_usados = set() 

            # Usamos un bucle protegido para la creación de detalles
            for _ in range(num_items):
                try: 
                    producto_aleatorio = random.choice(productos)
                    if producto_aleatorio.id in productos_usados:
                        continue 
                        
                    cantidad_comprada = random.randint(1, 3) 
                    
                    if producto_aleatorio.stock < cantidad_comprada:
                        continue 

                    precio_en_venta = producto_aleatorio.precio 
                    
                    detalle = DetalleVenta.objects.create(
                        venta=venta,
                        producto=producto_aleatorio,
                        cantidad=cantidad_comprada,
                        precio_unitario=precio_en_venta
                    )
                    
                    venta_total_calculado += detalle.subtotal
                    productos_usados.add(producto_aleatorio.id)
                    
                    # 5. Actualizar Stock
                    producto_aleatorio.stock -= cantidad_comprada
                    producto_aleatorio.save(update_fields=['stock']) 
                
                except Exception as detail_error:
                    # Captura errores internos del detalle (raro, pero seguro)
                    print(f"Error interno en detalle de venta para venta #{venta.id}: {detail_error}")
                    continue 
                    
            # 6. Actualizar el Total de la Venta
            if venta_total_calculado > 0:
                venta.total = venta_total_calculado
                venta.save(update_fields=['total'])
                created_count += 1
            else:
                # Si la venta quedó vacía, la borramos
                venta.delete()
                    
    return created_count