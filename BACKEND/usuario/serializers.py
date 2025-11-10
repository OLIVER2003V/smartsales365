# usuario/serializers.py
from rest_framework import serializers
from .models import Usuario, Rol, Producto, Cliente, Categoria, Carrito, ItemCarrito, Promocion, Resena, Favorito
import cloudinary.uploader
import uuid
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from .promocion_utils import get_precio_final
from ventas.models import Venta
from django.db import transaction
class UsuarioCreateSerializer(serializers.ModelSerializer):
    rol = serializers.ChoiceField(choices=Rol.choices, required=False, default=Rol.CLIENTE)
    edad = serializers.IntegerField(
        required=False, # O true, si lo quieres obligatorio
        min_value=10,   # Ejemplo de validación para edad mínima
        max_value=120,
    )
    class Meta:
        model = Usuario
        # Campos que el usuario puede enviar para registrarse
        fields = ('username', 'email', 'password', 'rol', 'first_name', 'last_name','edad') 
        extra_kwargs = {'password': {'write_only': True}} # La contraseña se envía, pero no se recupera

    def create(self, validated_data):
        # Usamos create_user para que la contraseña se guarde hasheada
        user = Usuario.objects.create_user(**validated_data)
        return user

class ProductoSerializer(serializers.ModelSerializer):
    imagen_file = serializers.ImageField(write_only=True, required=False) 
    categoria = serializers.StringRelatedField(read_only=True)
    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(), 
        source='categoria',
        write_only=True,
        allow_null=True,
        required=False
    )
    precio_final = serializers.SerializerMethodField()
    promocion_aplicada = serializers.SerializerMethodField()
    es_favorito = serializers.SerializerMethodField()
    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'marca', 'modelo', 
            'categoria', 'categoria_id', 
            'precio', 
            'precio_final',
            'promocion_aplicada',
            'stock', 'garantia_meses', 
            'imagen_url', 'imagen_file',
            # --- ¡AÑADIR ESTOS CAMPOS! (CU17) ---
            'calificacion_promedio',
            'total_resenas', 'es_favorito'
        ]
        read_only_fields = ['imagen_url']

    def get_precio_final(self, producto):
        precio_final, promo_obj = get_precio_final(producto)
        self.context[f'promo_{producto.id}'] = promo_obj
        return precio_final

    def get_promocion_aplicada(self, producto):
        promo_obj = self.context.get(f'promo_{producto.id}')
        if promo_obj:
            return promo_obj.nombre
        return None
    def get_es_favorito(self, producto):
        """
        Verifica si el usuario actual (desde el contexto)
        ha marcado este producto como favorito.
        """
        user = self.context.get('request').user
        if user and user.is_authenticated:
            # Comprueba si existe una entrada en el modelo Favorito
            return Favorito.objects.filter(usuario=user, producto=producto).exists()
        return False
    
    def process_image_upload(self, instance, validated_data):
        """Lógica para subir y actualizar la URL de la imagen."""
        imagen_file = validated_data.pop('imagen_file', None)

        if imagen_file:
            try:
                # 🚨 LÓGICA DE CLOUDINARY REAL 🚨
                uploaded_result = cloudinary.uploader.upload(
                    imagen_file, 
                    folder="smartsales_productos", # Carpeta para organizar en Cloudinary
                    public_id=f"producto_{instance.id if instance else validated_data['nombre']}_{uuid.uuid4().hex[:8]}"
                ) 
                validated_data['imagen_url'] = uploaded_result['secure_url']
                
            except Exception as e:
                raise serializers.ValidationError({"imagen_file": f"Error al subir a Cloudinary: {e}"})
                
        # Importar UUID para generar IDs únicos

        return validated_data
        
    def create(self, validated_data):
        # 1. Procesa la imagen (sube a la nube y obtiene la URL)
        validated_data = self.process_image_upload(None, validated_data)
        
        # 2. Crea la instancia del producto
        return Producto.objects.create(**validated_data)

    def update(self, instance, validated_data):
        # 1. Procesa la imagen (sube a la nube, la URL se guarda en validated_data)
        validated_data = self.process_image_upload(instance, validated_data)
        
        # 2. Actualiza los campos de la instancia
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
    
class CategoriaSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Categoria (CRUD).
    """
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'descripcion']
        
class ClienteSerializer(serializers.ModelSerializer):
    # Opcional: Mostrar info del usuario vinculado si existe
    username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)

    class Meta:
        model = Cliente
        # Incluimos todos los campos del modelo Cliente
        fields = ['id', 'user', 'nombre', 'apellido', 'email', 'telefono', 'direccion', 'username', 'user_email']
        # 'user' es writeable para permitir vincular un Usuario existente al crear/editar Cliente
        # read_only_fields = ['username', 'user_email'] # Quitamos user de aquí si queremos poder asignarlo

    # Validación Opcional: Asegurar que el email del cliente sea único
    def validate_email(self, value):
        # Excluir el email del cliente actual si estamos editando
        instance = self.instance
        if Cliente.objects.filter(email=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("Este correo electrónico ya está registrado por otro cliente.")
        return value

class UsuarioProfileSerializer(serializers.ModelSerializer):
    """
    Serializador para ver y actualizar el perfil del usuario autenticado.
    No permite cambiar el 'rol' ni la 'password' (para eso hay vistas dedicadas).
    """
    class Meta:
        model = Usuario
        # Campos que el usuario PUEDE editar de sí mismo
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'edad', 'rol')
        # Campos que solo se pueden leer (no editar) en esta vista
        read_only_fields = ('id', 'username', 'rol') 

    def validate_email(self, value):
        """
        Validar que el email sea único, excluyendo al propio usuario.
        """
        user = self.instance
        if Usuario.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Este correo electrónico ya está en uso por otro usuario.")
        return value

    def update(self, instance, validated_data):
        # Actualiza los campos que vienen en validated_data
        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.edad = validated_data.get('edad', instance.edad)
        instance.save()
        return instance

class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializador para el cambio de contraseña de un usuario autenticado.
    """
    old_password = serializers.CharField(required=True, write_only=True)
    new_password1 = serializers.CharField(required=True, write_only=True)
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        """
        Valida que la contraseña antigua sea correcta.
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña antigua no es correcta.")
        return value

    def validate(self, data):
        """
        Valida que las contraseñas nuevas coincidan y cumplan las reglas.
        """
        if data['new_password1'] != data['new_password2']:
            raise serializers.ValidationError({"new_password2": "Las contraseñas nuevas no coinciden."})
        
        # Validar la fortaleza de la nueva contraseña
        try:
            user = self.context['request'].user
            password_validation.validate_password(data['new_password1'], user)
        except ValidationError as e:
            raise serializers.ValidationError({'new_password1': list(e.messages)})

        return data

    def save(self):
        """
        Guarda la nueva contraseña.
        """
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password1'])
        user.save()
        
        
class UsuarioAdminSerializer(serializers.ModelSerializer):
    """
    Serializador para que el Administrador gestione (CRUD) a OTROS usuarios.
    Permite modificar 'rol' y 'is_active'.
    (CU6: GESTIONAR USUARIO)
    """
    class Meta:
        model = Usuario
        # Campos que el Admin puede gestionar
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 
            'rol', 'is_active', 'edad', 'password'
        )
        read_only_fields = ('id',)
        extra_kwargs = {
            'password': {
                'write_only': True,
                'required': False, # No es requerido en PATCH/PUT
                'allow_blank': True,
                'help_text': 'Dejar en blanco para no cambiar la contraseña. Requerido al crear.'
            }
        }

    def create(self, validated_data):
        """
        CU6: Crear Usuario (por Admin).
        La contraseña es requerida al crear.
        """
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es requerida al crear un usuario.'})
        
        # create_user maneja el hasheo
        user = Usuario.objects.create_user(**validated_data, password=password)
        return user

    def update(self, instance, validated_data):
        """
        CU6: Actualizar Usuario (por Admin).
        Actualiza la contraseña solo si se proporciona una nueva.
        """
        password = validated_data.pop('password', None)

        # Llama al update() del padre para los campos normales
        # (esto actualiza email, first_name, rol, is_active, etc.)
        instance = super().update(instance, validated_data)

        # Si se incluyó 'password' en el PATCH/PUT, la actualizamos
        if password:
            instance.set_password(password)
            instance.save()
            
        return instance
    

class ProductoEnCarritoSerializer(serializers.ModelSerializer):
    """Serializer simplificado para mostrar info del producto dentro del carrito."""
    
    # Añadimos los campos de promoción
    precio_final = serializers.SerializerMethodField()
    promocion_aplicada = serializers.SerializerMethodField()
    
    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'marca', 'precio', # precio original
            'precio_final', 'promocion_aplicada', # precio con descuento
            'imagen_url', 'stock' # Stock es necesario para el frontend
        ]

    def get_precio_final(self, producto):
        precio_final, promo_obj = get_precio_final(producto)
        self.context[f'cart_promo_{producto.id}'] = promo_obj
        return precio_final

    def get_promocion_aplicada(self, producto):
        promo_obj = self.context.get(f'cart_promo_{producto.id}')
        if promo_obj:
            return promo_obj.nombre
        return None

# --- CAMBIO EN ESTE SERIALIZER ---
class ItemCarritoSerializer(serializers.ModelSerializer):
    """Serializer para los items del carrito (Lectura)."""
    
    # --- CAMBIO ---
    # Usamos el nuevo serializer de producto que incluye el precio final
    producto = ProductoEnCarritoSerializer(read_only=True)
    # 'precio_total' se calcula automáticamente desde el @property del modelo
    precio_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ItemCarrito
        fields = ['id', 'producto', 'cantidad', 'precio_total']


class CarritoSerializer(serializers.ModelSerializer):
    """Serializer principal para el Carrito (Lectura)."""
    # Anidamos los items para que se vean dentro del carrito
    items = ItemCarritoSerializer(many=True, read_only=True)
    
    # Usamos los @property del modelo
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    
    # Mostramos el username para claridad
    username = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = Carrito
        fields = ['id', 'usuario', 'username', 'items', 'subtotal', 'total_items', 'actualizado']
        
        
class PromocionSerializer(serializers.ModelSerializer):
    """
    Serializer para el CRUD de Promociones por el Administrador.
    """
    # Muestra los nombres de productos/categorías al leer (GET)
    productos_nombres = serializers.StringRelatedField(source='productos', many=True, read_only=True)
    categorias_nombres = serializers.StringRelatedField(source='categorias', many=True, read_only=True)
    
    # Recibe IDs al escribir (POST/PATCH)
    productos = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all(), many=True, required=False)
    categorias = serializers.PrimaryKeyRelatedField(queryset=Categoria.objects.all(), many=True, required=False)

    class Meta:
        model = Promocion
        fields = [
            'id', 'nombre', 'tipo_descuento', 'valor_descuento', 
            'fecha_inicio', 'fecha_fin', 'activo',
            'productos', 'categorias', # Para Escribir (IDs)
            'productos_nombres', 'categorias_nombres' # Para Leer
        ]
        
class ResenaSerializer(serializers.ModelSerializer):
    """
    Serializer para crear y listar reseñas.
    """
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)

    class Meta:
        model = Resena
        fields = [
            'id', 
            'producto',             
            'usuario',              
            'usuario_username',     
            'calificacion',         
            'titulo',               
            'comentario',           
            'fecha_creacion'        
        ]
        read_only_fields = ['usuario', 'fecha_creacion', 'usuario_username']

    def validate_calificacion(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("La calificación debe estar entre 1 y 5.")
        return value

    def create(self, validated_data):
        # El usuario viene del ViewSet (que lo añade al contexto)
        usuario = self.context['request'].user
        producto = validated_data['producto']
        
        # Asignar el usuario automáticamente
        validated_data['usuario'] = usuario
        
        # --- ¡VALIDACIÓN MEJORADA! ---
        if usuario.rol != 'CLI':
            raise serializers.ValidationError("Solo los Clientes pueden dejar reseñas.")
            
        if not hasattr(usuario, 'cliente_profile'):
             raise serializers.ValidationError("Tu cuenta de usuario no tiene un perfil de cliente asociado.")
        
        cliente = usuario.cliente_profile
        # --- FIN VALIDACIÓN MEJORADA ---
        
        # Verificar que el cliente ha comprado y RECIBIDO el producto
        ha_comprado = Venta.objects.filter(
            cliente=cliente,
            detalles__producto=producto,
            estado=Venta.EstadoVenta.ENTREGADO # Solo puede valorar pedidos ENTREGADOS
        ).exists()
        
        if not ha_comprado:
            raise serializers.ValidationError("Debes haber comprado y recibido este producto para dejar una reseña.")

        # Verificar que no haya dejado otra reseña
        if Resena.objects.filter(producto=producto, usuario=usuario).exists():
            raise serializers.ValidationError("Ya has enviado una reseña para este producto.")
        
        return super().create(validated_data)
    
class FavoritoSerializer(serializers.ModelSerializer):
    """
    Serializer para listar los favoritos de un usuario.
    Anida el ProductoSerializer para mostrar los detalles del producto.
    """
    # Usamos el ProductoSerializer para mostrar el producto completo
    # Ojo: 'read_only=True' porque solo listamos, no creamos favoritos desde aquí
    producto = ProductoSerializer(read_only=True) 

    class Meta:
        model = Favorito
        fields = [
            'id', # Este es el ID de la *relación* de favorito
            'producto',
            'fecha_agregado'
        ]