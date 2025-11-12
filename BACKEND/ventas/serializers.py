from rest_framework import serializers
from django.db import transaction
from decimal import Decimal # <-- ✨ 1. IMPORTACIÓN AÑADIDA
from .models import Venta, DetalleVenta, Garantia
from usuario.models import Producto, Cliente, Usuario, Rol
from usuario.serializers import ClienteSerializer 
from usuario.promocion_utils import get_precio_final # <-- ✨ 2. IMPORTACIÓN AÑADIDA

# =========================================================
# Serializers de Garantía (NECESARIOS PRIMERO)
# =========================================================
class ProductoSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ['nombre', 'marca', 'modelo']

class ClienteSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ['email', 'nombre', 'apellido']

class VentaSimpleSerializer(serializers.ModelSerializer):
    cliente = ClienteSimpleSerializer(read_only=True)
    class Meta:
        model = Venta
        fields = ['id', 'cliente']

class DetalleVentaSimpleSerializer(serializers.ModelSerializer):
    producto = ProductoSimpleSerializer(read_only=True)
    venta = VentaSimpleSerializer(read_only=True)
    class Meta:
        model = DetalleVenta
        fields = ['id', 'producto', 'venta']

class GarantiaSerializer(serializers.ModelSerializer):
    """
    Serializer para el admin (GestionGarantias) y para el cliente (DetalleCompra).
    Incluye los datos anidados que el frontend necesita para mostrar la info.
    """
    detalle_venta = DetalleVentaSimpleSerializer(read_only=True)
    
    detalle_venta_producto_nombre = serializers.CharField(source='detalle_venta.producto.nombre', read_only=True)

    class Meta:
        model = Garantia
        fields = [
            'id', 
            'detalle_venta', 
            'codigo_garantia', 
            'fecha_vencimiento', 
            'estado', 
            'get_estado_display', # <-- Dejarlo aquí es suficiente
            'motivo_reclamo', 
            'observacion_admin',
            'detalle_venta_producto_nombre' 
        ]

# =========================================================
# Serializador para DetalleVenta (¡CORREGIDO!)
# =========================================================
class DetalleVentaSerializer(serializers.ModelSerializer):
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    nombre_producto = serializers.CharField(source='producto.nombre', read_only=True)
    
    # --- ✨ AÑADIDO ---
    # Esto anidará la lista de garantías dentro de cada detalle
    garantias = GarantiaSerializer(many=True, read_only=True)

    class Meta:
        model = DetalleVenta
        # --- ✨ AÑADIDO ---
        fields = [
            'id', 'producto', 'nombre_producto', 'cantidad', 
            'precio_unitario', 'subtotal', 'garantias' # <-- AÑADIDO
        ]
        read_only_fields = ['subtotal', 'nombre_producto', 'precio_unitario', 'garantias']


# =========================================================
# Serializador para Venta (CON EL MÉTODO CREATE CORREGIDO)
# =========================================================
class VentaSerializer(serializers.ModelSerializer):
    # Esta línea AHORA usará el DetalleVentaSerializer corregido
    detalles = DetalleVentaSerializer(many=True) 
    
    cliente_info = serializers.SerializerMethodField(read_only=True)
    vendedor_username = serializers.CharField(source='vendedor.username', read_only=True, allow_null=True)
    cliente_nuevo = serializers.JSONField(write_only=True, required=False)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = Venta
        fields = [
            'id', 'cliente', 'vendedor', 'fecha_venta', 'total', 'estado',
            'estado_display', 
            'detalles', # <-- Este 'detalles' ahora contendrá las garantías
            'cliente_nuevo', 
            'cliente_info', 'vendedor_username'
        ]
        read_only_fields = ['fecha_venta', 'total', 'estado', 'vendedor', 'cliente_info', 'vendedor_username', 'estado_display']

    def get_cliente_info(self, obj):
        if obj.cliente:
            return {
                'id': obj.cliente.id,
                'nombre': obj.cliente.nombre,
                'apellido': obj.cliente.apellido,
                'email': obj.cliente.email,
                'telefono': obj.cliente.telefono,
                'nit_ci': obj.cliente.nit_ci,
                'direccion': obj.cliente.direccion,
            }
        return None

    @transaction.atomic 
    def create(self, validated_data):
        # ... (Tu lógica de validación de cliente y vendedor) ...
        
        detalles_data = validated_data.pop('detalles')
        cliente_nuevo_data = validated_data.pop('cliente_nuevo', None)
        cliente_existente_id = validated_data.get('cliente') 

        if not detalles_data: raise serializers.ValidationError({"detalles": "Lista de detalles vacía."})

        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None
        cliente_final_para_venta = None 

        if user and user.is_authenticated:
            if user.rol == 'VEN' or user.rol == 'ADM':
                validated_data['vendedor'] = user
                if not cliente_existente_id: raise serializers.ValidationError({"cliente": "Vendedor debe seleccionar un cliente existente."})
                try:
                    cliente_final_para_venta = Cliente.objects.get(pk=cliente_existente_id.id)
                except Cliente.DoesNotExist:
                    raise serializers.ValidationError({"cliente": "El cliente seleccionado no existe."})

            elif user.rol == 'CLI':
                cliente_profile = getattr(user, 'cliente_profile', None)
                if cliente_profile:
                    cliente_final_para_venta = cliente_profile
                elif cliente_nuevo_data:
                    try:
                        email_nuevo = cliente_nuevo_data.get('email')
                        if not email_nuevo: raise serializers.ValidationError({"cliente_nuevo": "El email es requerido."})
                        if Cliente.objects.filter(email=email_nuevo).exists():
                                raise serializers.ValidationError({"cliente_nuevo": {"email": f"El email '{email_nuevo}' ya está registrado."}})

                        cliente_final_para_venta = Cliente.objects.create(
                            user=user, 
                            nombre=cliente_nuevo_data.get('nombre', user.first_name or user.username),
                            apellido=cliente_nuevo_data.get('apellido', user.last_name or ''),
                            email=email_nuevo,
                            telefono=cliente_nuevo_data.get('telefono'),
                            direccion=cliente_nuevo_data.get('direccion'),
                            nit_ci=cliente_nuevo_data.get('nit_ci')
                        )
                    except Exception as e:
                        raise serializers.ValidationError({"cliente_nuevo": f"Error al crear perfil: {e}"})
                else:
                    raise serializers.ValidationError({"cliente": "Faltan datos del cliente."})
        else:
            raise serializers.ValidationError({"cliente": "Se requiere un cliente o usuario autenticado."})

        validated_data['cliente'] = cliente_final_para_venta
        cliente_obj = validated_data.pop('cliente')
        venta = Venta.objects.create(cliente=cliente_obj, **validated_data) 
        
        # --- ✨ INICIO DE LA CORRECCIÓN LÓGICA ---

        venta_total = Decimal('0.00') # Usar Decimal para el total
        productos_para_actualizar_stock = [] 

        for i, detalle_info in enumerate(detalles_data):
            try:
                producto_id = detalle_info['producto'].id
                producto_obj = Producto.objects.select_for_update().get(pk=producto_id)
                cantidad = detalle_info['cantidad']
                if not isinstance(cantidad, int) or cantidad <= 0: raise ValueError("Cantidad inválida.")
                if producto_obj.stock < cantidad: raise ValueError(f"Stock insuficiente para {producto_obj.nombre} ({producto_obj.stock} disp.)")
                
                # ¡CAMBIO CLAVE! Obtenemos el precio con descuento
                precio_final_unitario, _ = get_precio_final(producto_obj)
                
                productos_para_actualizar_stock.append({
                    'producto': producto_obj, 
                    'cantidad_vendida': cantidad,
                    'precio_a_guardar': precio_final_unitario # Guardamos el precio correcto
                })
                
                # Usamos el precio final para sumar al total
                venta_total += (cantidad * precio_final_unitario) 
            
            except (Producto.DoesNotExist, KeyError, ValueError, Exception) as e:
                raise serializers.ValidationError({f"detalles[{i}]": f"Error procesando item: {e}"})

        # Segundo bucle para crear detalles y actualizar stock
        for item in productos_para_actualizar_stock:
            producto_a_actualizar = item['producto']
            cantidad_vendida = item['cantidad_vendida']
            # ¡CAMBIO CLAVE! Usamos el precio correcto guardado
            precio_unitario_correcto = item['precio_a_guardar']
            
            DetalleVenta.objects.create(
                venta=venta,
                producto=producto_a_actualizar,
                cantidad=cantidad_vendida,
                precio_unitario=precio_unitario_correcto # <-- Se guarda el precio con descuento
            )
            # Actualizar stock
            producto_a_actualizar.stock -= cantidad_vendida
            producto_a_actualizar.save(update_fields=['stock'])

        # Finalmente, actualizamos el total de la Venta
        venta.total = venta_total
        venta.save(update_fields=['total']) 

        # --- ✨ FIN DE LA CORRECCIÓN LÓGICA ---

        return venta