# ventas/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Venta, DetalleVenta, Producto, Garantia
from .serializers import VentaSerializer
from usuario.permissions import IsAdminOrVendedor
import stripe
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .pdf_utils import generar_comprobante_pdf
from django.core.exceptions import ValidationError # <-- 1. Importar ValidationError
from usuario.promocion_utils import get_precio_final 
from decimal import Decimal
# =========================================================
# VISTAS DE VENTAS
# =========================================================

class VentaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la creación, visualización y gestión de Ventas/Pedidos.
    """
    serializer_class = VentaSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Venta.objects.none() 
        
        prefetch_fields = ('detalles__producto', 'cliente__user', 'detalles__garantias')

        if user.rol == 'ADM' or user.rol == 'VEN':
            return Venta.objects.all().prefetch_related(*prefetch_fields)
        elif user.rol == 'CLI':
            cliente_profile = getattr(user, 'cliente_profile', None)
            if cliente_profile:
                return Venta.objects.filter(cliente=cliente_profile).prefetch_related(*prefetch_fields)
            else:
                return Venta.objects.none()
        else:
            return Venta.objects.none()

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'actualizar_estado':
            permission_classes = [IsAdminOrVendedor] 
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['patch'], url_path='actualizar-estado')
    def actualizar_estado(self, request, pk=None):
        """ (CU18) Permite a un Admin/Vendedor actualizar el estado de un pedido. """
        venta = self.get_object()
        nuevo_estado = request.data.get('estado')
        if not nuevo_estado:
            return Response({"error": "Se requiere el campo 'estado'."}, status=status.HTTP_400_BAD_REQUEST)
        valid_states = [choice[0] for choice in Venta.EstadoVenta.choices]
        if nuevo_estado not in valid_states:
            return Response({"error": f"Estado '{nuevo_estado}' no es válido."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            venta.estado = nuevo_estado
            venta.save(update_fields=['estado'])
            serializer = self.get_serializer(venta)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Error al actualizar: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreatePaymentIntentView(APIView):
    """ Vista para crear un intento de pago con Stripe. (CU16) """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            cart_items_data = request.data.get('items', []) 
            if not cart_items_data:
                 return Response({"error": "No items provided"}, status=status.HTTP_400_BAD_REQUEST)

            amount_in_cents = self.calculate_order_amount(cart_items_data)
            if amount_in_cents is None:
                 return Response({"error": "Invalid items or calculation failed"}, status=status.HTTP_400_BAD_REQUEST)

            intent = stripe.PaymentIntent.create(
                amount=amount_in_cents,
                currency='bob', 
                automatic_payment_methods={"enabled": True},
                metadata={'user_id': request.user.id}
            )
            return Response({'clientSecret': intent.client_secret}, status=status.HTTP_200_OK)
        except stripe.error.StripeError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def calculate_order_amount(self, items_data):
        """
        Calcula el total REAL del pedido usando los precios finales
        con promociones activas.
        """
        try:
            total_decimal = Decimal('0.00') # Usar Decimal para dinero
            for item_data in items_data:
                product = Producto.objects.get(pk=item_data['id'])
                quantity = int(item_data['quantity'])
                if quantity <= 0 or quantity > product.stock: 
                    return None
                
                # ¡USA EL PRECIO FINAL CON DESCUENTO!
                precio_final_unitario, _ = get_precio_final(product)
                
                total_decimal += (precio_final_unitario * quantity)

            # Convertir a centavos (para Stripe)
            total_en_centavos = int(total_decimal * 100)
            return total_en_centavos
        
        except (Producto.DoesNotExist, KeyError, ValueError, TypeError) as e:
            print(f"[ERROR] calculate_order_amount failed: {e}")
            return None

class DescargarComprobanteView(APIView):
    """ Vista para descargar un comprobante de Venta en PDF. """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, venta_id):
        user = request.user
        try:
            venta = Venta.objects.prefetch_related(
                'detalles__producto', 
                'cliente',
                'detalles__garantias' 
            ).get(id=venta_id)
        except Venta.DoesNotExist:
            return Response({"error": "Venta no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        is_owner = (user.rol == 'CLI' and hasattr(user, 'cliente_profile') and venta.cliente == user.cliente_profile)
        is_staff = (user.rol == 'ADM' or user.rol == 'VEN')
        
        if not (is_owner or is_staff):
            return Response({"error": "Acceso denegado."}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            buffer = generar_comprobante_pdf(venta)
            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="comprobante_venta_#{venta.id}.pdf"'
            return response
        except Exception as e:
            print(f"Error generando PDF para Venta {venta.id}: {e}")
            return Response({"error": f"Error al generar el PDF: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- ¡VISTA CORREGIDA (CU17: Consultar Garantía)! ---
class ConsultarGarantiaView(APIView):
    """
    Permite a CUALQUIER persona consultar el estado de una garantía
    usando un código UUID corto (prefijo).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        codigo_uuid = request.query_params.get('codigo', None)
        if not codigo_uuid:
            return Response({"error": "Se requiere un 'codigo' de garantía."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # --- ¡CAMBIO CLAVE! ---
            # 1. Limpiar el código (quitar los "..." que el usuario pueda copiar)
            codigo_limpio = codigo_uuid.replace('...', '').strip()
            
            # 2. Validar que el prefijo sea razonable (ej. 8 caracteres como en el PDF)
            if not (8 <= len(codigo_limpio) <= 36):
                 raise ValidationError("El formato del código es incorrecto.")

            # 3. Buscar la garantía usando 'startswith' (prefijo)
            garantia_encontrada = Garantia.objects.select_related(
                'detalle_venta__producto', 
                'detalle_venta__venta__cliente'
            ).filter(codigo_garantia__startswith=codigo_limpio).first()
            
            # 4. Si no se encuentra, lanzar la excepción
            if not garantia_encontrada:
                raise Garantia.DoesNotExist
            
            garantia = garantia_encontrada
            # --- FIN DEL CAMBIO ---
            
            detalle = garantia.detalle_venta
            venta = detalle.venta
            producto = detalle.producto
            
            # (Opcional) Actualizar estado si está expirada
            if garantia.estado == 'ACT' and garantia.fecha_vencimiento < timezone.now().date():
                garantia.estado = Garantia.EstadoGarantia.EXPIRADA
                garantia.save(update_fields=['estado'])

            # Preparar la respuesta
            data = {
                'codigo_garantia': str(garantia.codigo_garantia)[:8] + "...", # Mostrar el mismo formato corto
                'estado': garantia.get_estado_display(), # 'Activa', 'Expirada', 'Reclamada'
                'fecha_vencimiento': garantia.fecha_vencimiento.strftime('%d/%m/%Y'),
                'producto': {
                    'nombre': producto.nombre,
                    'marca': producto.marca,
                    'modelo': producto.modelo,
                    'imagen_url': producto.imagen_url,
                },
                'venta': {
                    'id': venta.id,
                    'fecha_compra': venta.fecha_venta.strftime('%d/%m/%Y'),
                    'cliente': venta.cliente.nombre if venta.cliente else "N/A"
                }
            }
            return Response(data, status=status.HTTP_200_OK)
            
        except (Garantia.DoesNotExist, ValidationError):
            return Response({"error": "Código de garantía no encontrado o inválido."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"Error inesperado: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
