# ventas/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Venta, DetalleVenta, Producto, Garantia
from .serializers import VentaSerializer, GarantiaSerializer
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
from fcm_django.models import FCMDevice
from firebase_admin.messaging import Message, Notification

from django.core.management import call_command
from django.http import JsonResponse

from rest_framework.permissions import AllowAny
from django.db import transaction
import uuid
from random import choice
from usuario.models import Cliente

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
        
        # 1. Guarda el estado
        try:
            venta.estado = nuevo_estado
            venta.save(update_fields=['estado'])
        
        # ------ 🚀 INICIO DE LA LÓGICA DE NOTIFICACIÓN ------
        
            estados_notificables = ['ENT', 'OK', 'CAN'] 
            
            if nuevo_estado in estados_notificables:
                try:
                    if venta.cliente and venta.cliente.user:
                        user = venta.cliente.user
                        devices = FCMDevice.objects.filter(user=user, active=True)
                        
                        # ❗️ 2. CONSTRUYE LOS OBJETOS DE MENSAJE Y NOTIFICACIÓN
                        title = "Tu pedido se actualizó"
                        body = f"Tu pedido #{venta.id} ahora está: {venta.get_estado_display()}" 
                        data_message = {
                            "screen": f"/mis-compras/{venta.id}"
                        }

                        # Crea el objeto de notificación (lo que ve el usuario)
                        notif_obj = Notification(title=title, body=body)

                        # Crea el mensaje completo (notificación + datos)
                        msg = Message(
                            notification=notif_obj,
                            data=data_message
                        )
                        
                        # ❗️ 3. ENVÍA EL OBJETO 'msg'
                        # (La función se llama 'send_message', y le pasamos 'msg')
                        devices.send_message(msg) 
                        
                        print(f"Notificación enviada a {user.email} por Venta {venta.id}")

                except Exception as e:
                    print(f"ERROR al enviar notificación FCM: {str(e)}")
        
        # ------ FIN DE LA LÓGICA DE NOTIFICACIÓN --------

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
        
class IniciarReclamoGarantiaView(APIView):
    """
    (Cliente) POST /api/garantias/<id_garantia>/reclamar/
    Permite a un cliente iniciar un reclamo sobre una garantía que le pertenece.
    """
    permission_classes = [permissions.IsAuthenticated] # Asumimos IsCliente

    def post(self, request, garantia_id):
        try:
            garantia = Garantia.objects.get(
                pk=garantia_id, 
                detalle_venta__venta__cliente=request.user.cliente_profile
            )
        except (Garantia.DoesNotExist, AttributeError):
            return Response({"error": "Garantía no encontrada o no le pertenece."}, status=status.HTTP_404_NOT_FOUND)

        motivo = request.data.get('motivo_reclamo', '')
        if not motivo:
            return Response({"error": "Debe proporcionar un motivo del reclamo."}, status=status.HTTP_400_BAD_REQUEST)

        # Validar estado
        if garantia.estado != Garantia.EstadoGarantia.ACTIVA:
            return Response({"error": f"Esta garantía no está activa (Estado: {garantia.get_estado_display()})."}, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar
        garantia.estado = Garantia.EstadoGarantia.EN_RECLAMO
        garantia.motivo_reclamo = motivo
        garantia.save()
        
        # (Aquí podrías notificar al admin)
        
        return Response({"status": "Reclamo iniciado con éxito"}, status=status.HTTP_200_OK)

class GarantiaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para que el Admin/Vendedor pueda VER la lista de garantías
    y consultar reclamos.
    (Provee /api/garantias/ y /api/garantias/<pk>/)
    """
    serializer_class = GarantiaSerializer
    permission_classes = [IsAdminOrVendedor] # Solo admin/vendedor pueden ver la lista

    def get_queryset(self):
        """
        Optimiza la consulta para incluir los datos anidados
        que el serializer (y el frontend) necesita.
        """
        return Garantia.objects.all().select_related(
            'detalle_venta__producto',
            'detalle_venta__venta__cliente',
            'detalle_venta__venta__cliente__user' # Asegura que el email esté
        ).order_by('-detalle_venta__venta__fecha_venta') # Más recientes primero


class GestionarGarantiaView(APIView):
    """
    (Admin) PATCH /api/garantias/<id_garantia>/gestionar/
    Permite a un Admin/Vendedor actualizar el estado de un reclamo.
    """
    permission_classes = [IsAdminOrVendedor]

    def patch(self, request, garantia_id):
        try:
            # Usamos select_related para optimizar la consulta
            garantia = Garantia.objects.select_related(
                'detalle_venta__venta__cliente__user',
                'detalle_venta__producto'
            ).get(pk=garantia_id)
        except Garantia.DoesNotExist:
            return Response({"error": "Garantía no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        nuevo_estado = request.data.get('estado')
        observacion = request.data.get('observacion_admin', None)

        # --- ✨ CORRECCIÓN AQUÍ ---
        # Validamos contra los valores reales del enum (los códigos cortos)
        # El frontend envía: 'REC', 'REV', 'APR', 'RZD'.
        estados_validos_admin = [
            Garantia.EstadoGarantia.EN_RECLAMO,  # 'REC'
            Garantia.EstadoGarantia.EN_REVISION, # 'REV'
            Garantia.EstadoGarantia.APROBADA,    # 'APR'
            Garantia.EstadoGarantia.RECHAZADA    # 'RZD'
        ]
        
        # Ahora comparamos 'REV' (del request) contra ['REC', 'REV', 'APR', 'RZD']
        if nuevo_estado not in estados_validos_admin:
            return Response({"error": "Estado no válido para esta acción."}, status=status.HTTP_400_BAD_REQUEST)
        # --- FIN DE LA CORRECCIÓN ---

        # Esta validación ya era correcta (compara 'RZD' == 'RZD')
        if nuevo_estado == Garantia.EstadoGarantia.RECHAZADA and not observacion:
            return Response({"error": "Se requiere una observación para rechazar la garantía."}, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar
        garantia.estado = nuevo_estado
        if observacion:
            garantia.observacion_admin = observacion
        garantia.save()
        
        # ------ 🚀 INICIO DE LA LÓGICA DE NOTIFICACIÓN (AÑADIDA) ------
        try:
            # 1. Encontrar al usuario dueño de la garantía
            cliente = garantia.detalle_venta.venta.cliente
            if cliente and cliente.user:
                user = cliente.user
                devices = FCMDevice.objects.filter(user=user, active=True)
                
                # 2. Preparar el mensaje
                title = "Actualización de tu Garantía"
                body = f"Tu reclamo ({garantia.detalle_venta.producto.nombre}) ahora está: {garantia.get_estado_display()}"
                
                msg = Message(
                    notification=Notification(title=title, body=body),
                    data={
                        "screen": "/mis-garantias", # O la ruta en la app móvil
                        "garantia_id": str(garantia.id)
                    }
                )
                
                # 3. Enviar
                devices.send_message(msg)
                print(f"Notificación de garantía enviada a {user.email}")
                
        except Exception as e:
            print(f"ERROR al enviar notificación FCM de garantía: {str(e)}")
        # ------ FIN DE LA LÓGICA DE NOTIFICACIÓN --------
        
        return Response({"status": f"Garantía actualizada a: {garantia.get_estado_display()}"}, status=status.HTTP_200_OK)
    
class RunPopulateView(APIView):
    """
    Permite poblar la base de datos remotamente con datos falsos.
    Ejemplo:
      GET /api/ventas/run-populate/?key=d4c0a8b1-ventas-populate-20253&cantidad=500
    """
    permission_classes = [AllowAny]  # 👈 Permitir acceso sin autenticación

    def get(self, request, *args, **kwargs):
        # 1️⃣ Validar clave secreta
        key = request.query_params.get("key")
        expected_key = "d4c0a8b1-ventas-populate-20253"  # Cambia por la tuya

        if key != expected_key:
            return Response(
                {"error": "No autorizado. Clave incorrecta."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # 2️⃣ Cantidad de ventas
        cantidad = int(request.query_params.get("cantidad", 10))

        clientes = list(Cliente.objects.all())
        productos = list(Producto.objects.all())

        if not clientes or not productos:
            return Response(
                {"error": "No hay clientes o productos en la base de datos."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3️⃣ Crear datos falsos
        ventas_creadas = 0
        with transaction.atomic():
            for _ in range(cantidad):
                cliente = choice(clientes)
                venta = Venta.objects.create(
                    cliente=cliente,
                    fecha_venta=timezone.now(),
                    total=0
                )

                total = 0
                for _ in range(3):
                    prod = choice(productos)
                    detalle = DetalleVenta.objects.create(
                        venta=venta,
                        producto=prod,
                        cantidad=1,
                        precio_unitario=prod.precio
                    )
                    total += prod.precio

                venta.total = total
                venta.save()
                ventas_creadas += 1

        return Response(
            {"mensaje": f"Se generaron {ventas_creadas} ventas exitosamente."},
            status=status.HTTP_200_OK
        )