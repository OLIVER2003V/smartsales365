// lib/utils/format_price.dart

/// Formatea un número como precio en Bs.
/// Acepta int o double (num).
String formatPrice(num value) {
  final double v = value.toDouble();
  return '${v.toStringAsFixed(2)} Bs';
}
