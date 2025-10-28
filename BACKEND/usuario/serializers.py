# usuario/serializers.py
from rest_framework import serializers
from .models import Usuario, Rol, Producto, Cliente
import cloudinary.uploader
import uuid

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
    # Campo temporal para recibir el archivo de imagen del frontend
    imagen_file = serializers.ImageField(write_only=True, required=False) 

    class Meta:
        model = Producto
        # Incluimos todos los campos del modelo MÁS el campo de subida temporal
        fields = ['id', 'nombre', 'marca', 'modelo', 'categoria', 'precio', 'stock', 'garantia_meses', 'imagen_url', 'imagen_file']
        # La URL de la imagen se genera al subir, no se permite editar directamente
        read_only_fields = ['imagen_url'] 

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