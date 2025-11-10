class HistorialResumen {
  final String periodo;
  final double totalVendido;
  final int numeroDeVentas;

  HistorialResumen({
    required this.periodo,
    required this.totalVendido,
    required this.numeroDeVentas,
  });

  factory HistorialResumen.fromJson(Map<String, dynamic> json) {
    return HistorialResumen(
      periodo: json['periodo'],
      totalVendido: (json['Total_Vendido'] as num).toDouble(),
      numeroDeVentas: json['Numero_de_Ventas'],
    );
  }
}