// lib/screens/cliente/my_purchase_details_screen.dart
import 'package:flutter/material.dart';
import 'package:lucide_flutter/lucide_flutter.dart';// ✅ CORREGIDO: Usar lucide_icons para LucideIcons
import 'package:provider/provider.dart';
// ✅ CORREGIDO: Importar los modelos con los nombres de clase correctos (Product, Venta, DetalleVenta)
import 'package:smartsales_app/models/product_model.dart'; 
import 'package:smartsales_app/models/venta_model.dart'; 
import 'package:smartsales_app/providers/auth_provider.dart';
// ✅ CORREGIDO: Usar el nombre del servicio importado (ProductService)
import 'package:smartsales_app/services/product_service.dart'; 
import 'package:smartsales_app/services/resena_service.dart';
import 'package:smartsales_app/services/venta_service.dart';
import 'package:smartsales_app/utils/formatters.dart'; 
import 'package:smartsales_app/widgets/cliente/resena_modal.dart'; 

class MyPurchaseDetailsScreen extends StatefulWidget {
  final String ventaId;
  const MyPurchaseDetailsScreen({super.key, required this.ventaId});

  @override
  State<MyPurchaseDetailsScreen> createState() => _MyPurchaseDetailsScreenState();
}

class _MyPurchaseDetailsScreenState extends State<MyPurchaseDetailsScreen> {
  
  final VentaService _ventaService = VentaService();
  final ProductService _productoService = ProductService(); 
  final ResenaService _resenaService = ResenaService();

  // ✅ CORREGIDO: Usar el tipo de dato Venta (del archivo venta_model.dart)
  Venta? _venta;
  List<Map<String, dynamic>> _resenasUsuario = [];
  // ✅ CORREGIDO: Usar el tipo de dato Product (del archivo product_model.dart)
  Map<int, Product> _productMap = {}; 
  bool _isLoading = true;

  ProductoAResenar? _productoAResenar;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadDatos();
    });
  }
  
  // --- Función Helper para mostrar SnackBar ---
  void _showSnackbar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade700 : Colors.green.shade700,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  Future<void> _loadDatos() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false); 
    
    if (authProvider.token == null) {
      Navigator.of(context).pop(); 
      return;
    }

    setState(() => _isLoading = true);
    try {
      final token = authProvider.token!;
      final futures = await Future.wait([
        _ventaService.getVentaById(token, int.parse(widget.ventaId)), // ✅ CORREGIDO: Pasar ventaId como int
        _resenaService.getResenasDelUsuario(token), 
        _productoService.getProducts(token), 
      ]);

      // ✅ CORREGIDO: Usar los tipos de dato Venta y Product para los casts
      final Venta dataVenta = futures[0] as Venta;
      final List<Map<String, dynamic>> dataResenas = futures[1] as List<Map<String, dynamic>>;
      final List<Product> dataProductos = futures[2] as List<Product>; // Product en lugar de ProductoModel

      final Map<int, Product> map = {};
      for (var prod in dataProductos) {
        if (prod.id != null) { 
          map[prod.id] = prod; // ✅ CORREGIDO: Usar prod.id (que es int y non-nullable en el modelo Product)
        }
      }

      setState(() {
        _venta = dataVenta;
        _resenasUsuario = dataResenas;
        _productMap = map;
      });
    } catch (e) {
      final errorMessage = e.toString().replaceAll('Exception: ', '');
      _showSnackbar('Error: $errorMessage', isError: true);
      
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) Navigator.of(context).pop(); 
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
  
  void _handleOpenModal(ProductoAResenar producto) {
    setState(() => _productoAResenar = producto);
    showDialog(
      context: context,
      builder: (context) => ResenaModal(
        producto: producto,
        onSuccess: () {
          Navigator.of(context).pop(); 
          _loadDatos(); 
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_venta == null) return const Scaffold(body: Center(child: Text('Venta no encontrada.')));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalle del Pedido'),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- Encabezado del Pedido ---
            Text('Pedido #${_venta!.id}', style: Theme.of(context).textTheme.headlineMedium),
            Text('Comprado el: ${formatDate(_venta!.fechaVenta)}', style: TextStyle(color: Colors.grey.shade600)), // ✅ CORREGIDO: fechaVenta es DateTime (no String?)
            Text('Total: ${formatPrice(_venta!.total)}', style: Theme.of(context).textTheme.headlineSmall), // ✅ CORREGIDO: total es double (no String?)
            const Divider(height: 32),

            // --- Lista de Productos ---
            Text('Productos en este pedido', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            ..._venta!.detalles.map((detalle) => Padding(
              padding: const EdgeInsets.only(bottom: 16.0),
              child: _ProductRow(
                detalle: detalle,
                productMap: _productMap,
                resenasUsuario: _resenasUsuario,
                ventaEstado: _venta!.estado,
                onResenaClick: _handleOpenModal,
              ),
            )).toList(),
          ],
        ),
      ),
    );
  }
}


// --- Componente de Fila de Producto (Sustituye a ProductRow.jsx) ---
class _ProductRow extends StatelessWidget {
  // ✅ CORREGIDO: Usar el tipo de dato DetalleVenta (del archivo venta_model.dart)
  final DetalleVenta detalle; 
  // ✅ CORREGIDO: Usar el tipo de dato Product (del archivo product_model.dart)
  final Map<int, Product> productMap;
  final List<Map<String, dynamic>> resenasUsuario;
  final String ventaEstado;
  final ValueChanged<ProductoAResenar> onResenaClick;

  const _ProductRow({
    required this.detalle,
    required this.productMap,
    required this.resenasUsuario,
    required this.ventaEstado,
    required this.onResenaClick,
  });

  @override
  Widget build(BuildContext context) {
    final productoId = detalle.producto; // Asumo que el campo de enlace de producto es 'id' o 'producto' en DetalleVenta.
    final productoCompleto = productMap[productoId];
    // Asegúrate que los nombres de los campos coinciden con tus modelos
    // ✅ CORREGIDO: nombreProducto es String? en el modelo, usamos nombre del modelo Producto si está disponible.
    final productoNombre = detalle.nombreProducto ?? productoCompleto?.nombre ?? "Producto Desconocido"; 
    final productoImagen = productoCompleto?.imagenUrl; // ✅ CORREGIDO: usar imagenUrl

    
    // El ID en la reseña del usuario es el ID del producto
    final yaResenado = resenasUsuario.any((r) => r['producto'] == productoId);
    final puedeResenar = ventaEstado == 'OK' && !yaResenado;

    return Card(
      elevation: 1,
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Imagen
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: Colors.grey.shade50,
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: productoImagen != null && productoImagen.isNotEmpty
                  ? Image.network(
                      productoImagen, 
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => const Icon(LucideIcons.package, size: 32, color: Colors.grey),
                    )
                  : const Icon(LucideIcons.package, size: 32, color: Colors.grey),
            ),
            const SizedBox(width: 12),

            // Detalles del Producto
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    productoNombre, 
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${detalle.cantidad} unidades x ${formatPrice(detalle.precioUnitario)}',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Subtotal: ${formatPrice(detalle.subtotal)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.black87),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),

            // Botón/Estado de Reseña
            SizedBox(
              width: 150,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (ventaEstado != 'OK')
                    Text(
                      'Podrás dejar tu reseña cuando el pedido sea entregado.',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                      textAlign: TextAlign.end,
                    ),
                  if (yaResenado)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.green.shade100,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.star, size: 16, color: Colors.green.shade700),
                          const SizedBox(width: 4),
                          Text('Reseña enviada', style: TextStyle(color: Colors.green.shade700, fontSize: 13)),
                        ],
                      ),
                    ),
                  if (puedeResenar)
                    ElevatedButton.icon(
                      onPressed: () => onResenaClick(
                        ProductoAResenar(id: productoId, nombre: productoNombre),
                      ),
                      icon: const Icon(LucideIcons.pencil, size: 16),
                      label: const Text('Dejar Reseña'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}