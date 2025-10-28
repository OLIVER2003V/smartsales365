# ventas/serializers.py
from rest_framework import serializers
from .models import Venta, DetalleVenta
from usuario.models import Producto, Cliente, Usuario, Rol # Importar modelos relacionados
from usuario.serializers import ClienteSerializer # Reutilizar serializador de cliente si es necesario
from django.db import transaction
# =========================================================
# Serializador para DetalleVenta (Usado dentro de VentaSerializer)
# =========================================================
class DetalleVentaSerializer(serializers.ModelSerializer):
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    nombre_producto = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = DetalleVenta
        fields = ['id', 'producto', 'nombre_producto', 'cantidad', 'precio_unitario', 'subtotal']
        # --- CORRECCIÓN AQUÍ ---
        # Añade precio_unitario a los campos que se calculan/asignan en el backend
        read_only_fields = ['subtotal', 'nombre_producto', 'precio_unitario']

# =========================================================
# Serializador para Venta (Creación y Lectura)
# =========================================================
class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True)
    # Usamos SerializerMethodField para control total sobre qué mostrar del cliente
    cliente_info = serializers.SerializerMethodField(read_only=True)
    vendedor_username = serializers.CharField(source='vendedor.username', read_only=True, allow_null=True)
    # --- NUEVO: Campo para recibir datos del cliente nuevo (solo escritura) ---
    cliente_nuevo = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = Venta
        fields = [
            'id', 'cliente', 'vendedor', 'fecha_venta', 'total', 'estado',
            'detalles', 'cliente_nuevo', # Añadido para la creación
            'cliente_info', 'vendedor_username'
        ]
        read_only_fields = ['fecha_venta', 'total', 'estado', 'vendedor', 'cliente_info', 'vendedor_username']
        # 'cliente' es escribible si lo envía un Vendedor/Admin

    # Método para formatear la información del cliente en la respuesta
    def get_cliente_info(self, obj):
        if obj.cliente:
            return {
                'id': obj.cliente.id,
                'nombre': obj.cliente.nombre,
                'apellido': obj.cliente.apellido,
                'email': obj.cliente.email,
                'telefono': obj.cliente.telefono,
            }
        return None

    # Método CREATE con transacción y creación automática de Cliente
    @transaction.atomic # Asegura que toda la operación sea atómica
    def create(self, validated_data):
        print("\n--- [DEBUG] VentaSerializer create initiated ---")
        print("[DEBUG] Raw Validated Data (before pop):", validated_data)

        # 1. Extraer datos clave
        detalles_data = validated_data.pop('detalles')
        cliente_nuevo_data = validated_data.pop('cliente_nuevo', None)
        cliente_existente_id = validated_data.get('cliente') # ID de cliente enviado (ej. por Vendedor)

        if not detalles_data: raise serializers.ValidationError({"detalles": "Lista de detalles vacía."})
        print("[DEBUG] Detalles Data received:", detalles_data)
        if cliente_nuevo_data: print("[DEBUG] Cliente Nuevo Data received:", cliente_nuevo_data)
        if cliente_existente_id: print("[DEBUG] Cliente Existente ID received:", cliente_existente_id)

        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None
        cliente_final_para_venta = None # El objeto Cliente que se asociará a la Venta

        # 2. Determinar/Crear el Cliente para la Venta
        if user and user.is_authenticated:
            if user.rol == 'VEN' or user.rol == 'ADM':
                validated_data['vendedor'] = user
                print(f"[DEBUG] Vendedor asignado: {user.username}")
                # Vendedor debe haber seleccionado un cliente existente
                if not cliente_existente_id: raise serializers.ValidationError({"cliente": "Vendedor debe seleccionar un cliente existente."})
                try:
                    cliente_final_para_venta = Cliente.objects.get(pk=cliente_existente_id.id)
                except Cliente.DoesNotExist:
                    raise serializers.ValidationError({"cliente": "El cliente seleccionado no existe."})

            elif user.rol == 'CLI':
                # Intentar obtener el perfil Cliente vinculado al Usuario logueado
                cliente_profile = getattr(user, 'cliente_profile', None)
                if cliente_profile:
                    cliente_final_para_venta = cliente_profile
                    print(f"[DEBUG] Cliente existente (profile) asignado: {cliente_profile}")
                elif cliente_nuevo_data:
                    # Crear NUEVO Cliente con datos del formulario de checkout
                    print(f"[INFO] No existing Cliente profile for user {user.username}. Creating one from checkout data...")
                    try:
                        # Validar email único antes de crear
                        email_nuevo = cliente_nuevo_data.get('email')
                        if not email_nuevo: raise serializers.ValidationError({"cliente_nuevo": "El email es requerido para crear el perfil."})
                        if Cliente.objects.filter(email=email_nuevo).exists():
                            raise serializers.ValidationError({"cliente_nuevo": {"email": f"El email '{email_nuevo}' ya está registrado por otro cliente."}})

                        cliente_final_para_venta = Cliente.objects.create(
                            user=user, # Vincula al usuario actual
                            nombre=cliente_nuevo_data.get('nombre', user.first_name or user.username),
                            apellido=cliente_nuevo_data.get('apellido', user.last_name or ''),
                            email=email_nuevo,
                            telefono=cliente_nuevo_data.get('telefono'),
                            direccion=cliente_nuevo_data.get('direccion'),
                            nit_ci=cliente_nuevo_data.get('nit_ci')
                        )
                        print(f"[DEBUG] Nuevo Cliente creado desde checkout y asignado: {cliente_final_para_venta}")
                    except Exception as e:
                        print(f"[ERROR] Failed to auto-create Cliente profile: {e}")
                        raise serializers.ValidationError({"cliente_nuevo": f"Error al crear perfil: {e}"})
                else:
                    # Cliente sin perfil Y sin enviar datos nuevos -> Error
                    raise serializers.ValidationError({"cliente": "Faltan datos del cliente para completar la compra."})
        else:
             # Ni usuario logueado, ni cliente ID enviado explícitamente?
             raise serializers.ValidationError({"cliente": "Se requiere un cliente o un usuario autenticado para la venta."})

        # Asigna el cliente final a los datos validados para crear la Venta
        validated_data['cliente'] = cliente_final_para_venta

        # 3. Crear la Venta (con estado PENDIENTE inicialmente)
        print("[DEBUG] Creating Venta instance with final client:", validated_data)
        # Quitamos cliente de validated_data si ya lo asignamos para evitar conflicto
        cliente_obj = validated_data.pop('cliente')
        venta = Venta.objects.create(cliente=cliente_obj, **validated_data, estado=Venta.EstadoVenta.PENDIENTE)
        print(f"[DEBUG] Venta instance created (ID: {venta.id}), state: PENDIENTE")

        venta_total = 0
        productos_para_actualizar_stock = [] # Lista para actualizar stock al final

        # 4. Procesar Detalles y Validar Stock
        print("\n--- [DEBUG] Processing Detalles ---")
        for i, detalle_info in enumerate(detalles_data):
            # ... (Lógica de validación de stock y cálculo de total - igual que antes) ...
             try:
                producto_id = detalle_info['producto'].id # El serializador anidado nos da el objeto
                producto_obj = Producto.objects.select_for_update().get(pk=producto_id) # Bloquea la fila para actualizar stock
                cantidad = detalle_info['cantidad']
                if not isinstance(cantidad, int) or cantidad <= 0: raise ValueError("Cantidad inválida.")
                print(f"[DEBUG]  - Item {i}: {producto_obj.nombre}, Qty: {cantidad}, Stock: {producto_obj.stock}")
                if producto_obj.stock < cantidad: raise ValueError(f"Stock insuficiente para {producto_obj.nombre} ({producto_obj.stock} disp.)")
                productos_para_actualizar_stock.append({'producto': producto_obj, 'cantidad_vendida': cantidad})
                venta_total += (cantidad * producto_obj.precio)
             except (Producto.DoesNotExist, KeyError, ValueError, Exception) as e:
                  # Si falla CUALQUIER detalle, la transacción hará rollback
                  print(f"[ERROR] Failed processing detail {i}: {e}. Rolling back transaction.")
                  raise serializers.ValidationError({f"detalles[{i}]": f"Error procesando item: {e}"})

        print(f"\n[DEBUG] Finished processing details. Calculated Total: {venta_total}")

        # 5. Crear Detalles y Actualizar Stock (Dentro de la transacción)
        print("[DEBUG] Creating DetalleVenta objects and updating stock...")
        for item in productos_para_actualizar_stock:
            producto_a_actualizar = item['producto']
            cantidad_vendida = item['cantidad_vendida']
            # Crear el detalle
            DetalleVenta.objects.create(
                venta=venta,
                producto=producto_a_actualizar,
                cantidad=cantidad_vendida,
                precio_unitario=producto_a_actualizar.precio
            )
            # Actualizar stock
            producto_a_actualizar.stock -= cantidad_vendida
            producto_a_actualizar.save(update_fields=['stock'])
            print(f"[DEBUG]  - Stock for {producto_a_actualizar.nombre} updated to: {producto_a_actualizar.stock}")

        # 6. Finalizar la Venta
        venta.total = venta_total
        venta.estado = Venta.EstadoVenta.COMPLETADA
        venta.save(update_fields=['total', 'estado'])
        print(f"[DEBUG] Venta (ID: {venta.id}) finalized. Total: {venta.total}, Estado: {venta.estado}")

        print("--- [DEBUG] Venta Creation Complete ---")
        return venta