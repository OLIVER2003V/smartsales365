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
    Usa TODOS los usuarios con Rol 'Cliente' y crea sus perfiles si no existen.
    """
    
    # 1. Obtener recursos necesarios
    productos = list(Producto.objects.filter(stock__gt=0))
    usuarios_clientes = list(Usuario.objects.filter(rol=Rol.CLIENTE))
    
    if not usuarios_clientes:
         raise Exception("Faltan recursos: ¡No hay USUARIOS con rol CLIENTE en la base de datos!")
    if not productos:
         raise Exception("Faltan recursos: ¡No hay PRODUCTOS con stock en la base de datos! Carga el excel primero.")
    
    # 2. Convertimos esos USUARIOS en perfiles de CLIENTE
    clientes_reales = []
    for user in usuarios_clientes:
        cliente_profile, created = Cliente.objects.get_or_create(
            user=user,
            defaults={
                'nombre': user.first_name or user.username,
                'apellido': user.last_name or '',
                'email': user.email,
            }
        )
        clientes_reales.append(cliente_profile)
    
    if not clientes_reales:
         raise Exception("No se pudieron encontrar o crear perfiles de Cliente a partir de los Usuarios.")
    
    print(f"Usando {len(productos)} productos y {len(clientes_reales)} perfiles de cliente.")
    
    created_count = 0
    now = timezone.now()

    with transaction.atomic():
        
        # Paso de Limpieza CRUCIAL
        Venta.objects.filter(estado=Venta.EstadoVenta.ENTREGADO).delete()
        
        for i in range(cantidad_a_crear):
            try:
                cliente_aleatorio = random.choice(clientes_reales)
                vendedor_aleatorio = None # No usas vendedores

                dias_atras = random.randint(1, 730)
                fecha_venta_simulada = now - timedelta(days=dias_atras)
                
                venta = Venta.objects.create(
                    cliente=cliente_aleatorio, 
                    vendedor=vendedor_aleatorio,
                    estado=Venta.EstadoVenta.ENTREGADO, # <-- Estado correcto
                    total=Decimal('0.00') 
                )
                
                # Forzar la fecha (para saltar auto_now_add)
                venta.fecha_venta = fecha_venta_simulada
                venta.save(update_fields=['fecha_venta'])

                num_items = random.randint(1, 5)
                venta_total_calculado = Decimal('0.00')
                productos_usados = set() 

                for _ in range(num_items):
                    producto_aleatorio = random.choice(productos)
                    if producto_aleatorio.id in productos_usados:
                        continue 
                        
                    cantidad_comprada = random.randint(1, 3) 
                    
                    if producto_aleatorio.stock < cantidad_comprada:
                        productos.remove(producto_aleatorio) # Lo quitamos para no volver a intentarlo
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
                    
                    # (Opcional) Descontar stock
                    #producto_aleatorio.stock -= cantidad_comprada
                    
                    #producto_aleatorio.save(update_fields=['stock']) 
                
                if venta_total_calculado > 0:
                    venta.total = venta_total_calculado
                    venta.save(update_fields=['total'])
                    created_count += 1
                else:
                    venta.delete()
            
            except Exception as e:
                print(f'Error creando venta {i}: {e}')
                    
    return created_count