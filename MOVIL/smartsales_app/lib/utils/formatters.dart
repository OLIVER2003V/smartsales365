// lib/utils/formatters.dart
import 'package:intl/intl.dart';

String formatPrice(double price) {
  final format = NumberFormat.currency(
    locale: 'es_BO',
    symbol: 'Bs',
    decimalDigits: 2,
  );
  return format.format(price);
}

/// Acepta DateTime o String (ISO, dd/MM/yyyy, dd-MM-yyyy, yyyy-MM-dd, etc.)
String formatDate(dynamic dateInput) {
  if (dateInput == null) return 'N/A';

  // Si ya es DateTime -> formatear directamente
  if (dateInput is DateTime) {
    return DateFormat("d 'de' MMMM, yyyy", 'es').format(dateInput);
  }

  // Si es String -> intentar parsear
  final String input = (dateInput as String).trim();
  if (input.isEmpty) return 'N/A';

  // Intento rápido con DateTime.parse (ISO y variantes)
  try {
    String maybeIso = input;
    if (RegExp(r'^\d{4}-\d{2}-\d{2} ').hasMatch(input)) {
      maybeIso = input.replaceFirst(' ', 'T');
    }
    final dt = DateTime.parse(maybeIso);
    return DateFormat("d 'de' MMMM, yyyy", 'es').format(dt);
  } catch (_) {}

  // Patrones comunes
  final patterns = <String>[
    'dd/MM/yyyy',
    'd/M/yyyy',
    'dd-MM-yyyy',
    'd-M-yyyy',
    'yyyy-MM-dd',
    'yyyy/MM/dd',
  ];

  for (final p in patterns) {
    try {
      final df = DateFormat(p);
      final dt = df.parseStrict(input);
      return DateFormat("d 'de' MMMM, yyyy", 'es').format(dt);
    } catch (_) {}
  }

  // Heurística split dd/mm/yyyy o yyyy-mm-dd
  try {
    final parts = input.split(RegExp(r'[\/\-]'));
    if (parts.length == 3) {
      if (parts[0].length == 4) {
        final y = int.tryParse(parts[0]);
        final m = int.tryParse(parts[1]);
        final d = int.tryParse(parts[2]);
        if (y != null && m != null && d != null) {
          return DateFormat("d 'de' MMMM, yyyy", 'es').format(DateTime(y, m, d));
        }
      } else {
        final d = int.tryParse(parts[0]);
        final m = int.tryParse(parts[1]);
        final y = int.tryParse(parts[2]);
        if (d != null && m != null && y != null) {
          return DateFormat("d 'de' MMMM, yyyy", 'es').format(DateTime(y, m, d));
        }
      }
    }
  } catch (_) {}

  return 'Fecha Inválida';
}
