import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

# Importa tus modelos
from usuario.models import Producto, Usuario, Rol
from ventas.models import Venta, DetalleVenta


class Command(BaseCommand):
    help = 'Genera ventas sintéticas (históricas) para poblar la base de datos para la IA.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cantidad',
            type=int,
            default=200,
            help='Número de ventas a crear (default: 200)'
        )

    @transaction.atomic
    def handle(self, *args, **options):
        cantidad_a_crear = options['cantidad']
        self.stdout.write(self.style.NOTICE(f'Iniciando generación de {cantidad_a_crear} ventas sintéticas...'))

        # 1️⃣ Obtener recursos necesarios
        productos = list(Producto.objects.filter(stock__gt=0))
        clientes = list(Usuario.objects.filter(rol=Rol.CLIENTE))
        vendedores = list(Usuario.objects.filter(rol=Rol.VENDEDOR))

        if not productos:
            self.stdout.write(self.style.ERROR('❌ No hay productos con stock en la BD. Abortando.'))
            return
        if not clientes:
            self.stdout.write(self.style.ERROR('❌ No hay usuarios con rol CLIENTE en la BD. Abortando.'))
            return

        self.stdout.write(self.style.NOTICE(f'Usando {len(productos)} productos, {len(clientes)} clientes y {len(vendedores)} vendedores.'))
        
        created_count = 0
        now = timezone.now()

        for i in range(cantidad_a_crear):
            try:
                # 2️⃣ Elegir cliente y vendedor
                cliente_aleatorio = random.choice(clientes)
                vendedor_aleatorio = random.choice(vendedores) if vendedores else None

                # 3️⃣ Crear fecha de venta (últimos 2 años)
                dias_atras = random.randint(1, 730)
                fecha_venta_simulada = now - timedelta(days=dias_atras)

                # 4️⃣ Crear venta
                venta = Venta.objects.create(
                    cliente=cliente_aleatorio,
                    vendedor=vendedor_aleatorio,
                    estado=Venta.EstadoVenta.COMPLETADA,
                    total=Decimal('0.00'),
                    fecha_venta=fecha_venta_simulada
                )

                # 5️⃣ Agregar detalles (1–5 productos)
                num_items = random.randint(1, 5)
                venta_total = Decimal('0.00')

                for _ in range(num_items):
                    producto = random.choice(productos)
                    cantidad = random.randint(1, 3)

                    if producto.stock < cantidad:
                        continue

                    precio_unitario = producto.precio

                    detalle = DetalleVenta.objects.create(
                        venta=venta,
                        producto=producto,
                        cantidad=cantidad,
                        precio_unitario=precio_unitario
                    )

                    venta_total += detalle.subtotal

                    producto.stock -= cantidad
                    producto.save(update_fields=['stock'])

                # 6️⃣ Actualizar total o eliminar si está vacía
                if venta_total > 0:
                    venta.total = venta_total
                    venta.save(update_fields=['total'])
                    created_count += 1
                else:
                    venta.delete()

            except Exception as e:
                self.stdout.write(self.style.WARNING(f'⚠️ Error creando venta {i + 1}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'✅ ¡Proceso completado! Se crearon {created_count} ventas sintéticas.'))
