# ventas/management/commands/populate_ventas.py
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

# Importa todos tus modelos necesarios
from usuario.models import Producto, Cliente, Usuario, Rol
from ventas.models import Venta, DetalleVenta

class Command(BaseCommand):
    help = 'Genera ventas sintéticas (históricas) para poblar la base de datos para la IA.'

    def add_arguments(self, parser):
        # Define un argumento opcional para especificar cuántas ventas crear
        parser.add_argument(
            '--cantidad',
            type=int,
            help='Número de ventas a crear (default: 200)',
            default=200
        )

    @transaction.atomic # Asegura que toda la operación se complete o falle junta
    def handle(self, *args, **options):
        cantidad_a_crear = options['cantidad']
        self.stdout.write(self.style.NOTICE(f'Iniciando generación de {cantidad_a_crear} ventas sintéticas...'))

        # 1. Obtener recursos necesarios (Productos, Clientes, Vendedores)
        productos = list(Producto.objects.filter(stock__gt=0)) # Solo productos con stock
        clientes = list(Cliente.objects.all())
        vendedores = list(Usuario.objects.filter(rol=Rol.VENDEDOR))

        if not productos:
            self.stdout.write(self.style.ERROR('No hay productos con stock en la BD. Abortando.'))
            return
        if not clientes:
            self.stdout.write(self.style.ERROR('No hay clientes en la BD. Abortando.'))
            return

        print(f"Usando {len(productos)} productos y {len(clientes)} clientes...")
        
        created_count = 0
        now = timezone.now()

        for i in range(cantidad_a_crear):
            try:
                # 2. Seleccionar Cliente y Vendedor aleatorio
                cliente_aleatorio = random.choice(clientes)
                vendedor_aleatorio = random.choice(vendedores) if vendedores else None

                # 3. Crear la cabecera de la Venta (Venta)
                # Simular fechas pasadas (ej. en los últimos 2 años)
                dias_atras = random.randint(1, 730)
                fecha_venta_simulada = now - timedelta(days=dias_atras)
                
                venta = Venta.objects.create(
                    cliente=cliente_aleatorio,
                    vendedor=vendedor_aleatorio,
                    estado=Venta.EstadoVenta.COMPLETADA,
                    # Dejamos 'total' en 0 por ahora, se calculará
                )
                # Forzamos la fecha de creación (auto_now_add=True la establece, debemos sobrescribirla)
                venta.fecha_venta = fecha_venta_simulada
                venta.save(update_fields=['fecha_venta'])

                # 4. Crear Detalles de Venta (1 a 5 productos por venta)
                num_items = random.randint(1, 5)
                venta_total_calculado = Decimal('0.00')

                for _ in range(num_items):
                    producto_aleatorio = random.choice(productos)
                    cantidad_comprada = random.randint(1, 3) # Cantidad aleatoria
                    
                    # Asegurarse de no "vender" más del stock disponible (para realismo)
                    if producto_aleatorio.stock < cantidad_comprada:
                        continue # Salta este item si no hay stock suficiente

                    precio_en_venta = producto_aleatorio.precio # Usar precio actual
                    
                    detalle = DetalleVenta.objects.create(
                        venta=venta,
                        producto=producto_aleatorio,
                        cantidad=cantidad_comprada,
                        precio_unitario=precio_en_venta
                        # subtotal se calcula automáticamente en el save() de DetalleVenta
                    )
                    
                    venta_total_calculado += detalle.subtotal
                    
                    # 5. Actualizar Stock del Producto
                    # (En un script real, deberíamos manejar esto con F() para evitar race conditions)
                    producto_aleatorio.stock -= cantidad_comprada
                    producto_aleatorio.save(update_fields=['stock'])

                # 6. Actualizar el Total de la Venta
                if venta_total_calculado > 0:
                    venta.total = venta_total_calculado
                    venta.save(update_fields=['total'])
                    created_count += 1
                else:
                    # Si la venta quedó vacía (ej. por falta de stock), la borramos
                    venta.delete()

            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error creando venta {i}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'¡Proceso completado! Se crearon {created_count} ventas sintéticas.'))