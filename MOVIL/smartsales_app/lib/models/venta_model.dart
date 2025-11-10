import 'package:smartsales_app/models/user_model.dart'; // Reutilizamos ClienteProfile

class DetalleVenta {
  final int id;
  final int producto; // <--- ✅ CAMPO AÑADIDO: El ID del Producto
  final String nombreProducto;
  final int cantidad;
  final double precioUnitario;
  final double subtotal;

  DetalleVenta({
    required this.id,
    required this.producto, // <--- ✅ CAMPO AÑADIDO
    required this.nombreProducto,
    required this.cantidad,
    required this.precioUnitario,
    required this.subtotal,
  });

  factory DetalleVenta.fromJson(Map<String, dynamic> json) {
    return DetalleVenta(
      id: json['id'],
      
      // ❗ CLAVE: Capturar el ID del producto que el backend envía
      producto: json['producto'] as int, 
      
      nombreProducto: json['nombre_producto'],
      cantidad: json['cantidad'],
      precioUnitario: double.tryParse(json['precio_unitario'].toString()) ?? 0.0,
      subtotal: double.tryParse(json['subtotal'].toString()) ?? 0.0,
    );
  }
}

class Venta {
// ... (Este modelo no necesita cambios, ya que detallesList ya usará la nueva versión de DetalleVenta)
  final int id;
  final DateTime fechaVenta;
  final double total;
  final String estado;
  final String estadoDisplay;
  final ClienteProfile clienteInfo;
  final List<DetalleVenta> detalles;

  Venta({
    required this.id,
    required this.fechaVenta,
    required this.total,
    required this.estado,
    required this.estadoDisplay,
    required this.clienteInfo,
    required this.detalles,
  });

  factory Venta.fromJson(Map<String, dynamic> json) {
    var detallesList = (json['detalles'] as List)
        .map((i) => DetalleVenta.fromJson(i))
        .toList();
    
    return Venta(
      id: json['id'],
      fechaVenta: DateTime.parse(json['fecha_venta']),
      total: double.tryParse(json['total'].toString()) ?? 0.0,
      estado: json['estado'],
      estadoDisplay: json['estado_display'],
      clienteInfo: ClienteProfile.fromJson(json['cliente_info']),
      detalles: detallesList,
    );
  }
}