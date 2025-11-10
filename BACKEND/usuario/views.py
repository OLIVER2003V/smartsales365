# usuario/views.py
from rest_framework import generics, permissions, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, filters
from .models import Usuario, Rol, Producto, Cliente, Categoria, Carrito, ItemCarrito, Promocion, Resena, Favorito
from .serializers import UsuarioCreateSerializer, ProductoSerializer, ClienteSerializer, UsuarioProfileSerializer, PasswordChangeSerializer, UsuarioAdminSerializer, CategoriaSerializer, CarritoSerializer, PromocionSerializer, ResenaSerializer, FavoritoSerializer
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from django.utils.encoding import force_str
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
import openpyxl
from .permissions import IsAdminOrVendedor, IsAdminUser, IsOwnerOrAdmin
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound, ValidationError
from .command_parser import parsear_comando_carrito, buscar_producto_por_terminos

# Vista para permitir el registro de nuevos usuarios (por defecto, Clientes)
class UsuarioRegisterView(generics.CreateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioCreateSerializer
    # Permitir acceso a cualquiera (incluso sin token) para crear una cuenta
    permission_classes = [permissions.AllowAny]
    
class UserLogoutView(APIView):
    # Solo usuarios autenticados pueden usar esta vista
    permission_classes = [IsAuthenticated] 

    def post(self, request):
        # request.auth contiene la instancia del Token que el usuario usó para autenticarse.
        # Simplemente eliminamos ese token de la base de datos para cerrarle la sesión.
        try:
            request.user.auth_token.delete()
            return Response({"detail": "Sesión cerrada exitosamente."}, status=status.HTTP_200_OK)
        except Exception:
            # Si el token ya fue eliminado o no existe por alguna razón.
            return Response({"detail": "Token no encontrado o ya inválido."}, status=status.HTTP_400_BAD_REQUEST)


# ----------------------------------------------------
# VISTA: Perfil (Protegida) - Dejamos para prueba
# ----------------------------------------------------
class UserProfileView(APIView):
    """
    Permite a cualquier usuario autenticado (ADM, VEN, CLI) 
    consultar (GET) y actualizar (PUT/PATCH) su propio perfil.
    """
    permission_classes = [permissions.IsAuthenticated] 
    # Añadir parser para que acepte JSON en PUT/PATCH
    parser_classes = [JSONParser]

    def get(self, request):
        """CU4: Consultar Perfil"""
        # Usamos el serializer para mostrar la info del usuario
        serializer = UsuarioProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        """CU4: Actualizar/Modificar Perfil (Completo)"""
        user = request.user
        # Pasamos 'instance=user' para que el serializer sepa que estamos actualizando
        serializer = UsuarioProfileSerializer(instance=user, data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        """CU4: Actualizar/Modificar Perfil (Parcial)"""
        user = request.user
        # 'partial=True' permite actualizar solo algunos campos
        serializer = UsuarioProfileSerializer(instance=user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        

        
class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        
        if not email:
            return Response({'error': 'El email es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Buscamos al usuario por su email
            user = Usuario.objects.get(email=email)
            
            # Generamos el UID y el Token para ese usuario
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            # Devolvemos los datos directamente en la respuesta
            return Response({
                'detail': 'Token de reseteo generado para desarrollo.',
                'uid': uid,
                'token': token
            }, status=status.HTTP_200_OK)

        except Usuario.DoesNotExist:
            # Por seguridad, incluso si el usuario no existe, no lo revelamos.
            # Devolvemos una respuesta exitosa genérica para no dar pistas.
            return Response({
                'detail': 'Petición procesada.',
            }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # --- PASO 1: Extraer datos del request ---
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        password = request.data.get('new_password1')
        password2 = request.data.get('new_password2')

        # --- Validación básica de los datos ---
        if not all([uidb64, token, password, password2]):
            return Response(
                {'detail': 'Todos los campos (uid, token, new_password1, new_password2) son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if password != password2:
            return Response(
                {'new_password2': ['Las contraseñas no coinciden.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- PASO 2: Encontrar al usuario ---
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            # Si el UID es inválido o el usuario no existe, marcamos el usuario como nulo.
            user = None

        # --- PASO 3: Verificar el token y el usuario ---
        if user is not None and default_token_generator.check_token(user, token):
            # Si el token es válido, procedemos a cambiar la contraseña.
            try:
                # --- PASO 4: Validar la fortaleza de la contraseña ---
                password_validation.validate_password(password, user)
            except ValidationError as e:
                # Si la contraseña no es segura, devolvemos los errores.
                return Response({'new_password1': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

            # --- PASO 5: Guardar la nueva contraseña ---
            user.set_password(password)
            user.save()
            return Response(
                {'detail': 'Contraseña restablecida exitosamente.'},
                status=status.HTTP_200_OK
            )
        else:
            # Si el usuario no existe o el token es inválido, devolvemos un error.
            # Esto previene que alguien sepa si un usuario existe o no.
            return Response(
                {'detail': 'El enlace de reseteo es inválido o ha expirado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
class PasswordChangeView(generics.GenericAPIView):
    """
    Vista para que un usuario autenticado cambie su propia contraseña.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request, *args, **kwargs):
        # Pasamos el 'request' al contexto del serializer
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Contraseña actualizada exitosamente."},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
   
   
class UsuarioAdminViewSet(viewsets.ModelViewSet):
    """
    ViewSet para que el Administrador gestione (CRUD) a todos los usuarios.
    (CU6: GESTIONAR USUARIO)
    """
    queryset = Usuario.objects.all().order_by('username')
    serializer_class = UsuarioAdminSerializer
    # (CU6) Permiso: Solo Administradores
    permission_classes = [IsAdminUser] 
    
    # (CU6) Habilitar Búsqueda y Filtro (Paso 2 del Flujo de Sucesos)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'rol', 'is_active']   
   
            
class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all().order_by('nombre')
    serializer_class = ProductoSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        # ... (Sin cambios) ...
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'toggle_favorito':
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsAdminOrVendedor]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['post'])
    def upload_masivo(self, request):
        file_obj = request.data.get('file')
        if not file_obj:
            return Response({"error": "No se adjuntó ningún archivo."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            workbook = openpyxl.load_workbook(file_obj)
            sheet = workbook.active
            created_count = 0

            for row in sheet.iter_rows(min_row=2, values_only=True):
                try:
                    if len(row) < 7: continue
                    (nombre, marca, modelo, categoria_nombre, precio, stock, garantia_meses) = row[:7] # Renombrado a 'categoria_nombre'

                    if not nombre or not marca or not categoria_nombre: # Validar 'categoria_nombre'
                        print(f"Skipping row: Missing required data - {row[:7]}")
                        continue
                    
                    # --- ¡CAMBIO IMPORTANTE AQUÍ! ---
                    # 1. Buscamos o creamos la Categoría
                    categoria_obj, created = Categoria.objects.get_or_create(
                        nombre=str(categoria_nombre).strip()
                    )
                    if created:
                        print(f"Nueva categoría creada: {categoria_obj.nombre}")
                    # --- FIN DE CAMBIO ---

                    try:
                        precio_val = float(precio) if precio is not None else 0.0
                        stock_val = int(stock) if stock is not None else 0
                        garantia_val = int(garantia_meses) if garantia_meses is not None else 12
                    except (ValueError, TypeError):
                        print(f"Skipping row due to conversion error: {row[:7]}")
                        continue

                    modelo_val = str(modelo) if modelo is not None else None

                    # --- ¡CAMBIO IMPORTANTE AQUÍ! ---
                    # 2. Asignamos el objeto 'categoria_obj' al campo 'categoria'
                    producto_obj = Producto.objects.create(
                        nombre=str(nombre), 
                        marca=str(marca), 
                        modelo=modelo_val, 
                        categoria=categoria_obj, # <-- CAMBIO
                        precio=precio_val, 
                        stock=stock_val, 
                        garantia_meses=garantia_val
                    )
                    # --- FIN DE CAMBIO ---
                    
                    print(f"✅ CREATED Product: ID={producto_obj.id}, Nombre={producto_obj.nombre}")
                    created_count += 1

                except Exception as e:
                    print(f"⚠️ Skipping row due to unexpected error: {row[:7]} - Error: {e}")
                    continue

            print(f"📊 Total products created: {created_count}")
            return Response(
                {"detail": f"Carga masiva procesada. {created_count} productos agregados."},
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            print(f"❌ General error during mass upload: {e}")
            return Response({"error": f"Error general: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['post'], url_path='toggle-favorito')
    def toggle_favorito(self, request, pk=None):
        """
        Añade o quita un producto de la lista de favoritos del usuario.
        """
        try:
            producto = self.get_object()
            usuario = request.user

            # Intenta encontrar la relación
            favorito, created = Favorito.objects.get_or_create(
                usuario=usuario, 
                producto=producto
            )

            if created:
                # Se acaba de crear, así que se añadió
                return Response({
                    'status': 'agregado a favoritos',
                    'es_favorito': True
                }, status=status.HTTP_201_CREATED)
            else:
                # Ya existía, así que lo borramos
                favorito.delete()
                return Response({
                    'status': 'quitado de favoritos',
                    'es_favorito': False
                }, status=status.HTTP_200_OK)

        except Producto.DoesNotExist:
            return Response({"error": "Producto no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class ClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Crear, Leer, Actualizar y Eliminar Clientes.
    Accesible solo para Administradores y Vendedores.
    """
    queryset = Cliente.objects.all().order_by('apellido', 'nombre') # Ordenar alfabéticamente
    serializer_class = ClienteSerializer
    permission_classes = [IsAdminOrVendedor]
    
    
class CategoriaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el CRUD de Categorías.
    Accesible para Administradores y Vendedores.
    """
    queryset = Categoria.objects.all().order_by('nombre')
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrVendedor]
    
class CarritoViewSet(viewsets.ViewSet):
    """
    ViewSet para gestionar el carrito de compras del usuario autenticado.
    """
    permission_classes = [IsAuthenticated] 
    parser_classes = [JSONParser] # Asegura que acepte JSON

    def get_carrito(self, usuario):
        carrito, created = Carrito.objects.get_or_create(usuario=usuario)
        return carrito

    def list(self, request):
        """ (GET /api/carrito/) - Muestra el carrito actual """
        carrito = self.get_carrito(request.user)
        serializer = CarritoSerializer(carrito)
        return Response(serializer.data, status=status.HTTP_200_OK)

    
    # --- LÓGICA DEL "CEREBRO" (VOZ/TEXTO) ---
    
    @action(detail=False, methods=['post'], url_path='command')
    def command_interface(self, request):
        """
        (POST /api/carrito/command/)
        Procesa un comando de lenguaje natural (texto o voz transcrita).
        """
        comando_texto = request.data.get('comando')

        if not comando_texto:
            return Response({"error": "El campo 'comando' es requerido."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Usamos el "Cerebro" para parsear el comando
        datos_comando = parsear_comando_carrito(comando_texto)
        
        if 'error' in datos_comando:
            return Response(datos_comando, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. Buscamos el producto en la base de datos
        producto_encontrado = buscar_producto_por_terminos(datos_comando['terminos_busqueda'])

        if not producto_encontrado:
            return Response({
                "error": "No pude encontrar un producto que coincida con tu descripción.",
                "busqueda_realizada": ' '.join(datos_comando['terminos_busqueda'])
            }, status=status.HTTP_404_NOT_FOUND)

        # 3. Obtenemos el carrito del usuario
        carrito = self.get_carrito(request.user)
        mensaje_confirmacion = ""

        # 4. Ejecutamos la acción
        if datos_comando['accion'] == 'agregar':
            cantidad_a_agregar = datos_comando['cantidad']
            item_existente = ItemCarrito.objects.filter(carrito=carrito, producto=producto_encontrado).first()
            cantidad_actual = item_existente.cantidad if item_existente else 0
            nueva_cantidad_total = cantidad_actual + cantidad_a_agregar

            if producto_encontrado.stock < nueva_cantidad_total:
                return Response(
                   {"error": f"Stock insuficiente para {producto_encontrado.nombre}. Disponible: {producto_encontrado.stock}, (tienes {cantidad_actual} + quieres {cantidad_a_agregar})."},
                   status=status.HTTP_400_BAD_REQUEST
                )

            item, created = ItemCarrito.objects.get_or_create(
                carrito=carrito,
                producto=producto_encontrado,
                defaults={'cantidad': cantidad_a_agregar}
            )
            
            if not created:
                item.cantidad = nueva_cantidad_total
                item.save()
            
            mensaje_confirmacion = f"¡Hecho! Se agregaron {cantidad_a_agregar} x {producto_encontrado.nombre} al carrito."

        elif datos_comando['accion'] == 'quitar':
            try:
                item = ItemCarrito.objects.get(carrito=carrito, producto=producto_encontrado)
                cantidad_a_quitar = datos_comando['cantidad']
                item.cantidad -= cantidad_a_quitar
                
                if item.cantidad <= 0:
                    item.delete()
                    mensaje_confirmacion = f"Se eliminó {producto_encontrado.nombre} del carrito."
                else:
                    item.save()
                    mensaje_confirmacion = f"Se quitaron {cantidad_a_quitar} de {producto_encontrado.nombre}. Quedan {item.cantidad}."
            
            except ItemCarrito.DoesNotExist:
                 return Response({"error": f"No tienes '{producto_encontrado.nombre}' en tu carrito para quitar."}, status=status.HTTP_404_NOT_FOUND)

        # 5. Devolvemos el estado actualizado del carrito
        serializer = CarritoSerializer(carrito)
        response_data = serializer.data
        response_data['mensaje_confirmacion'] = mensaje_confirmacion # Añadimos el feedback
        
        return Response(response_data, status=status.HTTP_200_OK)

        
    # --- ACCIONES PARA BOTONES (MANUAL) ---

    @action(detail=False, methods=['post'], url_path='add-item')
    def add_item(self, request):
        """ (POST /api/carrito/add-item/) """
        producto_id = request.data.get('producto_id')
        
        # --- MEJORA DE ROBUSTEZ ---
        try:
            cantidad = int(request.data.get('cantidad', 1))
        except (ValueError, TypeError):
             raise ValidationError({"error": "La cantidad debe ser un número entero."})
        # --- FIN MEJORA ---

        if not producto_id:
            raise ValidationError({"error": "Se requiere 'producto_id'."})
        if cantidad <= 0:
            raise ValidationError({"error": "La cantidad debe ser positiva."})

        producto = get_object_or_404(Producto, id=producto_id)
        carrito = self.get_carrito(request.user)
        
        # Validar stock (antes de get_or_create)
        item_existente = ItemCarrito.objects.filter(carrito=carrito, producto=producto).first()
        cantidad_actual = item_existente.cantidad if item_existente else 0
        nueva_cantidad_total = cantidad_actual + cantidad

        if producto.stock < nueva_cantidad_total:
             return Response(
                 {"error": f"Stock insuficiente. Tienes {cantidad_actual} y quieres añadir {cantidad}. Disponible: {producto.stock}"},
                 status=status.HTTP_400_BAD_REQUEST
             )

        item, created = ItemCarrito.objects.get_or_create(
            carrito=carrito,
            producto=producto,
            defaults={'cantidad': cantidad}
        )

        if not created:
            item.cantidad = nueva_cantidad_total # Usamos la cantidad ya calculada
            item.save()
        
        serializer = CarritoSerializer(carrito)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='update-quantity')
    def update_quantity(self, request):
        """ (POST /api/carrito/update-quantity/) """
        producto_id = request.data.get('producto_id')

        # --- MEJORA DE ROBUSTEZ ---
        try:
            cantidad = int(request.data.get('cantidad', 1))
        except (ValueError, TypeError):
             raise ValidationError({"error": "La cantidad debe ser un número entero."})
        # --- FIN MEJORA ---

        if not producto_id:
            raise ValidationError({"error": "Se requiere 'producto_id'."})
        
        carrito = self.get_carrito(request.user)
        item = get_object_or_404(ItemCarrito, carrito=carrito, producto_id=producto_id)
        
        if cantidad <= 0:
            item.delete()
        else:
            # Validar stock
            if item.producto.stock < cantidad:
                 return Response(
                    {"error": f"Stock insuficiente para {item.producto.nombre}. Disponible: {item.producto.stock}"},
                    status=status.HTTP_400_BAD_REQUEST
                 )
            item.cantidad = cantidad
            item.save()

        serializer = CarritoSerializer(carrito)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='remove-item')
    def remove_item(self, request):
        """ (POST /api/carrito/remove-item/) """
        producto_id = request.data.get('producto_id')
        if not producto_id:
            raise ValidationError({"error": "Se requiere 'producto_id'."})
        
        carrito = self.get_carrito(request.user)
        item = get_object_or_404(ItemCarrito, carrito=carrito, producto_id=producto_id)
        item.delete()
        
        serializer = CarritoSerializer(carrito)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='clear')
    def clear_cart(self, request):
        """ (POST /api/carrito/clear/) """
        carrito = self.get_carrito(request.user)
        carrito.items.all().delete()
        
        serializer = CarritoSerializer(carrito)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class PromocionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para que el Administrador/Vendedor gestione (CRUD) 
    las promociones y ofertas.
    """
    queryset = Promocion.objects.all().order_by('-activo', '-fecha_fin')
    serializer_class = PromocionSerializer
    permission_classes = [IsAdminOrVendedor] # Solo Admins y Vendedores
    
    # Opcional: añadir filtros
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']
    
class ResenaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar (CRUD) las Reseñas.
    """
    serializer_class = ResenaSerializer
    
    def get_queryset(self):
        user = self.request.user
        producto_id = self.request.query_params.get('producto_id')
        
        if producto_id:
            return Resena.objects.filter(producto_id=producto_id).select_related('usuario')
            
        if user.is_authenticated and (user.rol == 'ADM' or user.rol == 'VEN'):
            return Resena.objects.all().select_related('usuario', 'producto')

        if user.is_authenticated:
            return Resena.objects.filter(usuario=user).select_related('usuario', 'producto')

        return Resena.objects.none()

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsOwnerOrAdmin]
        else:
            permission_classes = [permissions.IsAdminUser]
            
        return [permission() for permission in permission_classes]
    
class FavoritoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de solo lectura para listar los productos favoritos
    del usuario actualmente autenticado.
    """
    serializer_class = FavoritoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtra el queryset para devolver solo los favoritos
        del usuario que hace la petición.
        """
        return Favorito.objects.filter(usuario=self.request.user).select_related('producto')