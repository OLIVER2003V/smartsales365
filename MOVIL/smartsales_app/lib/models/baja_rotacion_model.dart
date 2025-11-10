// lib/models/baja_rotacion_model.dart

class BajaRotacionProducto {
  final String nombre;
  final String marca;
  final String? imagenUrl;
  final int stock;
  final int totalVendido;
  // ❗️ 1. AÑADIR LOS CAMPOS FALTANTES
  final String? categoria;
  final String? ultimaVenta; // La API lo envía como String

  BajaRotacionProducto({
    required this.nombre,
    required this.marca,
    this.imagenUrl,
    required this.stock,
    required this.totalVendido,
    this.categoria, // <-- Añadido
    this.ultimaVenta, // <-- Añadido
  });

  factory BajaRotacionProducto.fromJson(Map<String, dynamic> json) {
    return BajaRotacionProducto(
      nombre: json['nombre'] ?? 'N/A',
      marca: json['marca'] ?? 'N/A',
      imagenUrl: json['imagen_url'],
      stock: json['stock'] ?? 0,
      totalVendido: json['total_vendido'] ?? 0,
      // ❗️ 2. LEER LOS NUEVOS CAMPOS
      categoria: json['categoria'] ?? 'Sin Categoría',
      ultimaVenta: json['ultima_venta'], // Puede ser null
    );
  }
}