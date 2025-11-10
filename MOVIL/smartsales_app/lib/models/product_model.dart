class Product {
  final int id;
  final String nombre;
  final String marca;
  final String? modelo;
  final String? categoria;
  final String? imagenUrl;
  final double precio;
  final double precioFinal;
  final bool promocionAplicada;
  final int stock;
  final double calificacionPromedio;
  final int totalResenas;

  Product({
    required this.id,
    required this.nombre,
    required this.marca,
    this.modelo,
    this.categoria,
    this.imagenUrl,
    required this.precio,
    required this.precioFinal,
    required this.promocionAplicada,
    required this.stock,
    required this.calificacionPromedio,
    required this.totalResenas,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    double safeParseDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      if (val is String) return double.tryParse(val) ?? 0.0;
      return 0.0;
    }

    int safeParseInt(dynamic val) {
      if (val == null) return 0;
      if (val is int) return val;
      if (val is String) return int.tryParse(val) ?? 0;
      if (val is num) return val.toInt();
      return 0;
    }

    bool safeParseBool(dynamic val) {
      if (val == null) return false;
      if (val is bool) return val;
      if (val is String) return val.toLowerCase() == 'true';
      if (val is num) return val != 0;
      return false;
    }

    return Product(
      id: safeParseInt(json['id']),
      nombre: json['nombre'] as String? ?? 'Producto Sin Nombre',
      marca: json['marca'] as String? ?? 'Sin Marca',
      modelo: json['modelo'] as String?,
      categoria: json['categoria'] as String?,
      imagenUrl: json['imagen_url'] as String?,
      promocionAplicada: safeParseBool(json['promocion_aplicada']),
      precio: safeParseDouble(json['precio']),
      precioFinal: safeParseDouble(json['precio_final']),
      stock: safeParseInt(json['stock']),
      calificacionPromedio: safeParseDouble(json['calificacion_promedio']),
      totalResenas: safeParseInt(json['total_resenas']),
    );
  }

  // ✅ IMPORTANTE: Igualdad y hashCode para DropdownSearch
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Product && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  // Opcional: muestra bonito en DropdownSearch
  @override
  String toString() => '$nombre ($marca)';
}
