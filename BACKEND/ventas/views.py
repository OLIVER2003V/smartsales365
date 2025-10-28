# ventas/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework import status, permissions
from rest_framework.response import Response
from .models import Venta, DetalleVenta, Producto
from .serializers import VentaSerializer
# Importa los permisos (ajusta la ruta si es necesario)
from usuario.permissions import IsAdminOrVendedor
import stripe
from django.conf import settings
# =========================================================
# VISTAS DE VENTAS
# =========================================================


class VentaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la creación y visualización de Ventas.
    - Creación (POST): Permite a CUALQUIER usuario autenticado registrar una venta.
                      El serializador maneja la lógica de stock y totales.
    - Listado (GET): Permite a Admins/Vendedores ver todas las ventas.
                      Clientes autenticados ven solo sus propias ventas.
    - Detalles (GET /<id>/): Permite ver una venta específica (según permisos).
    """
    serializer_class = VentaSerializer
    # queryset se define dinámicamente en get_queryset

    def get_queryset(self):
        """
        Filtra las ventas visibles según el rol del usuario.
        """
        user = self.request.user
        if not user.is_authenticated:
            return Venta.objects.none() # No logueado, no ve nada

        if user.rol == 'ADM' or user.rol == 'VEN':
            # Admins y Vendedores ven todas las ventas.
            # prefetch_related optimiza la carga de datos relacionados.
            return Venta.objects.all().prefetch_related('detalles__producto', 'cliente__user')
        elif user.rol == 'CLI':
            # Clientes ven solo sus ventas asociadas a su perfil Cliente.
            cliente_profile = getattr(user, 'cliente_profile', None)
            if cliente_profile:
                return Venta.objects.filter(cliente=cliente_profile).prefetch_related('detalles__producto', 'cliente__user')
            else:
                return Venta.objects.none() # Cliente sin perfil no tiene ventas asociadas
        else:
            return Venta.objects.none() # Otros roles no ven nada

    def get_permissions(self):
        """
        Define permisos específicos para cada acción del ViewSet.
        """
        if self.action == 'create':
            # --- CORRECCIÓN ---
            # CUALQUIER usuario autenticado puede crear una venta.
            # El serializador se encargará de asignar cliente/vendedor si es necesario.
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['list', 'retrieve']:
            # CUALQUIER usuario autenticado puede listar/ver (el queryset ya filtra).
            permission_classes = [permissions.IsAuthenticated]
        else:
            # Deshabilitar update, partial_update, destroy por defecto.
            # Solo un superusuario (admin de Django) podría hacerlo.
            permission_classes = [permissions.IsAdminUser]
        # Retorna instancias de las clases de permiso.
        return [permission() for permission in permission_classes]

class CreatePaymentIntentView(APIView):
    permission_classes = [permissions.IsAuthenticated] # Solo usuarios logueados

    def post(self, request, *args, **kwargs):
        try:
            # --- FORMA 1: Recibir monto del frontend (menos seguro) ---
            # amount = request.data.get('amount')
            # if not amount:
            #     return Response({"error": "Amount is required"}, status=status.HTTP_400_BAD_REQUEST)
            # amount_in_cents = int(float(amount) * 100) # Stripe usa centavos/subunidades

            # --- FORMA 2: Calcular monto en el backend (MÁS SEGURO) ---
            # Aquí deberías tener la lógica para recalcular el total del carrito
            # basado en los IDs de producto y cantidades enviados por el frontend,
            # para evitar que el cliente manipule el precio.
            # Por simplicidad, usaremos un monto fijo de prueba o el recibido.
            # EJEMPLO SIMPLIFICADO: Recibe IDs y cantidades
            cart_items_data = request.data.get('items', []) # ej: [{ 'id': 1, 'quantity': 2 }, ...]
            if not cart_items_data:
                 return Response({"error": "No items provided"}, status=status.HTTP_400_BAD_REQUEST)

            # Lógica para calcular el total REAL en el backend
            amount_in_cents = self.calculate_order_amount(cart_items_data)
            if amount_in_cents is None:
                 return Response({"error": "Invalid items or calculation failed"}, status=status.HTTP_400_BAD_REQUEST)

            # Crea el PaymentIntent en Stripe
            intent = stripe.PaymentIntent.create(
                amount=amount_in_cents,
                currency='bob', # O la moneda que configures en Stripe (ej. 'usd')
                automatic_payment_methods={"enabled": True},
                # Puedes añadir metadata útil aquí, como el ID del usuario
                # metadata={'user_id': request.user.id}
            )
            # Devuelve el client_secret al frontend
            return Response({'clientSecret': intent.client_secret}, status=status.HTTP_200_OK)

        except stripe.error.StripeError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def calculate_order_amount(self, items_data):
        # --- LÓGICA DE CÁLCULO REAL ---
        # Busca los productos en tu BD por ID, obtén sus precios REALES,
        # multiplica por la cantidad y suma todo.
        # Devuelve el total en centavos (o la subunidad menor de tu moneda).
        try:
            total = 0
            for item_data in items_data:
                product = Producto.objects.get(pk=item_data['id'])
                quantity = int(item_data['quantity'])
                if quantity <= 0 or quantity > product.stock: # Validación básica
                    return None
                total += product.precio * quantity

            return int(total * 100) # Convertir a centavos (o ajustar para BOB)
        except (Producto.DoesNotExist, KeyError, ValueError, TypeError):
            return None # Error en los datos o cálculo
