// lib/models/promocion_model.dart
import 'dart:convert';
import 'package:smartsales_app/utils/formatters.dart'; // Importa el helper de fechas
import 'package:intl/intl.dart';
class Promocion {
  final int id;
  final String nombre;
  final String tipoDescuento; // 'PCT' o 'FIJ'
  final double valorDescuento;
  final DateTime fechaInicio;
  final DateTime fechaFin;
  final bool activo;
  final List<int> productos; // Lista de IDs
  final List<int> categorias; // Lista de IDs

  Promocion({
    required this.id,
    required this.nombre,
    required this.tipoDescuento,
    required this.valorDescuento,
    required this.fechaInicio,
    required this.fechaFin,
    required this.activo,
    required this.productos,
    required this.categorias,
  });

  factory Promocion.fromJson(Map<String, dynamic> json) {
    
    // --- ❗️❗️ INICIO DE LA CORRECCIÓN ❗️❗️ ---
    
    // 1. Añadimos la misma función 'safe' que usas en 'product_model.dart'
    double safeParseDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      if (val is String) {
        return double.tryParse(val) ?? 0.0;
      }
      return 0.0;
    }

    // Helper robusto para parsear fechas
    DateTime parseDate(String? dateStr) {
      if (dateStr == null || dateStr.isEmpty) return DateTime.now();
      try {
        // Tu API envía fechas ISO 8601 con zona horaria,
        // así que DateTime.parse() es perfecto.
        return DateTime.parse(dateStr);
      } catch (e) {
        return DateTime.now();
      }
    }

    return Promocion(
      id: json['id'],
      nombre: json['nombre'],
      tipoDescuento: json['tipo_descuento'],
      
      // 2. Usamos 'safeParseDouble' para el campo que falla
      valorDescuento: safeParseDouble(json['valor_descuento']), 
      
      fechaInicio: parseDate(json['fecha_inicio']),
      fechaFin: parseDate(json['fecha_fin']),
      activo: json['activo'] ?? false,
      productos: List<int>.from(json['productos'] ?? []),
      categorias: List<int>.from(json['categorias'] ?? []),
    );
    // --- ❗️❗️ FIN DE LA CORRECCIÓN ❗️❗️ ---
  }

  // Helper para convertir fechas a 'YYYY-MM-DDTHH:mm' para el input
  static String formatDateForInput(DateTime date) {
    return DateFormat("yyyy-MM-dd'T'HH:mm").format(date);
  }
}