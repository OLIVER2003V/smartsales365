class KpiModel {
  final double totalHistoricoBs;
  final double totalHoyBs;
  final int totalProductos;
  final int totalOrdenes;

  KpiModel({
    required this.totalHistoricoBs,
    required this.totalHoyBs,
    required this.totalProductos,
    required this.totalOrdenes,
  });

  factory KpiModel.fromJson(Map<String, dynamic> json) {
    double safeParseDouble(dynamic val) {
      if (val is num) return val.toDouble();
      if (val is String) return double.tryParse(val) ?? 0.0;
      return 0.0;
    }

    return KpiModel(
      totalHistoricoBs: safeParseDouble(json['total_historico_bs']),
      totalHoyBs: safeParseDouble(json['total_hoy_bs']),
      totalProductos: json['total_productos'] ?? 0,
      totalOrdenes: json['total_ordenes'] ?? 0,
    );
  }
}