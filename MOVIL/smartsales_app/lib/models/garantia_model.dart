// lib/models/garantia_model.dart

// Modelo para el producto anidado
class GarantiaProducto {
  final String nombre;
  final String marca;
  final String? modelo;
  final String? imagenUrl;

  GarantiaProducto({
    required this.nombre,
    required this.marca,
    this.modelo,
    this.imagenUrl,
  });

  factory GarantiaProducto.fromJson(Map<String, dynamic> json) {
    return GarantiaProducto(
      nombre: json['nombre'] ?? 'N/A',
      marca: json['marca'] ?? 'N/A',
      modelo: json['modelo'],
      imagenUrl: json['imagen_url'],
    );
  }
}

// Modelo para la venta anidada
class GarantiaVenta {
  final int id;
  final String fechaCompra;
  final String cliente;

  GarantiaVenta({
    required this.id,
    required this.fechaCompra,
    required this.cliente,
  });

  factory GarantiaVenta.fromJson(Map<String, dynamic> json) {
    return GarantiaVenta(
      id: json['id'] ?? 0,
      fechaCompra: json['fecha_compra'] ?? '',
      cliente: json['cliente'] ?? 'N/A',
    );
  }
}

// Modelo principal de la respuesta
class GarantiaResultado {
  final String estado;
  final String fechaVencimiento;
  final GarantiaVenta venta;
  final GarantiaProducto producto;

  GarantiaResultado({
    required this.estado,
    required this.fechaVencimiento,
    required this.venta,
    required this.producto,
  });

  factory GarantiaResultado.fromJson(Map<String, dynamic> json) {
    return GarantiaResultado(
      estado: json['estado'] ?? 'Desconocido',
      fechaVencimiento: json['fecha_vencimiento'] ?? '',
      venta: GarantiaVenta.fromJson(json['venta']),
      producto: GarantiaProducto.fromJson(json['producto']),
    );
  }
}