# ventas/serializers.py
from rest_framework import serializers
from .models import Venta, DetalleVenta
from usuario.models import Producto, Cliente, Usuario, Rol
from usuario.serializers import ClienteSerializer 
from django.db import transaction

# =========================================================
# Serializador para DetalleVenta (Sin cambios)
# =========================================================
class DetalleVentaSerializer(serializers.ModelSerializer):
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    nombre_producto = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = DetalleVenta
        fields = ['id', 'producto', 'nombre_producto', 'cantidad', 'precio_unitario', 'subtotal']
        read_only_fields = ['subtotal', 'nombre_producto', 'precio_unitario']

# =========================================================
# Serializador para Venta (Creación y Lectura)
# =========================================================
class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True)
    cliente_info = serializers.SerializerMethodField(read_only=True)
    vendedor_username = serializers.CharField(source='vendedor.username', read_only=True, allow_null=True)
    cliente_nuevo = serializers.JSONField(write_only=True, required=False)
    
    # --- ¡CAMBIO AQUÍ! ---
    # Añadimos get_estado_display para mostrar el texto legible del estado
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = Venta
        fields = [
            'id', 'cliente', 'vendedor', 'fecha_venta', 'total', 'estado',
            'estado_display', # <-- Añadido
            'detalles', 'cliente_nuevo', 
            'cliente_info', 'vendedor_username'
        ]
        read_only_fields = ['fecha_venta', 'total', 'estado', 'vendedor', 'cliente_info', 'vendedor_username', 'estado_display']
        # 'cliente' es escribible si lo envía un Vendedor/Admin

    def get_cliente_info(self, obj):
        if obj.cliente:
            return {
                'id': obj.cliente.id,
                'nombre': obj.cliente.nombre,
                'apellido': obj.cliente.apellido,
                'email': obj.cliente.email,
                'telefono': obj.cliente.telefono,
                # --- ¡CAMBIO AQUÍ! ---
                # Añadimos nit_ci y direccion para el comprobante
                'nit_ci': obj.cliente.nit_ci,
                'direccion': obj.cliente.direccion,
            }
        return None

    @transaction.atomic 
    def create(self, validated_data):
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

        # 3. Crear la Venta (El estado por defecto es PAGADO)
        cliente_obj = validated_data.pop('cliente')
        # --- ¡CAMBIO AQUÍ! ---
        # El estado por defecto del modelo (PAGADO) se usará automáticamente
        venta = Venta.objects.create(cliente=cliente_obj, **validated_data) 
        # Ya no se pone PENDIENTE primero

        venta_total = 0
        productos_para_actualizar_stock = [] 

        for i, detalle_info in enumerate(detalles_data):
             try:
                producto_id = detalle_info['producto'].id
                producto_obj = Producto.objects.select_for_update().get(pk=producto_id)
                cantidad = detalle_info['cantidad']
                if not isinstance(cantidad, int) or cantidad <= 0: raise ValueError("Cantidad inválida.")
                if producto_obj.stock < cantidad: raise ValueError(f"Stock insuficiente para {producto_obj.nombre} ({producto_obj.stock} disp.)")
                
                productos_para_actualizar_stock.append({'producto': producto_obj, 'cantidad_vendida': cantidad})
                venta_total += (cantidad * producto_obj.precio)
             except (Producto.DoesNotExist, KeyError, ValueError, Exception) as e:
                 raise serializers.ValidationError({f"detalles[{i}]": f"Error procesando item: {e}"})

        for item in productos_para_actualizar_stock:
            producto_a_actualizar = item['producto']
            cantidad_vendida = item['cantidad_vendida']
            DetalleVenta.objects.create(
                venta=venta,
                producto=producto_a_actualizar,
                cantidad=cantidad_vendida,
                precio_unitario=producto_a_actualizar.precio
            )
            producto_a_actualizar.stock -= cantidad_vendida
            producto_a_actualizar.save(update_fields=['stock'])

        # 6. Finalizar la Venta
        venta.total = venta_total
        # --- ¡CAMBIO AQUÍ! ---
        # El estado ya está en PAGADO (default), solo guardamos el total.
        venta.save(update_fields=['total']) 

        return venta
    
