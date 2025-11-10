class PrediccionVenta {
  final String fecha;
  final double prediccionTotalBs;

  PrediccionVenta({required this.fecha, required this.prediccionTotalBs});

  factory PrediccionVenta.fromJson(Map<String, dynamic> json) {
    return PrediccionVenta(
      fecha: json['fecha'],
      prediccionTotalBs: (json['prediccion_total_bs'] as num).toDouble(),
    );
  }
}