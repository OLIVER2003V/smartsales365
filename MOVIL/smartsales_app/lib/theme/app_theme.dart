import 'package:flutter/material.dart';

class AppTheme {
  // Colores constantes
  static const Color primaryColor = Color(0xFF4F46E5); // Indigo-600
  static const Color primaryLight = Color(0xFF818CF8); // Indigo-400
  static const Color secondaryColor = Color(0xFF10B981); // Emerald-500
  static const Color dangerColor = Color(0xFFEF4444); // Red-500

  // Mapa de MaterialColor para primaryColor (necesario para fromSwatch)
  static const MaterialColor primaryMaterialColor = MaterialColor(0xFF4F46E5, {
    50: Color(0xFFEEF2FF),
    100: Color(0xFFE0E7FF),
    200: Color(0xFFC7D2FE),
    300: Color(0xFFA5B3FB),
    400: Color(0xFF818CF8),
    500: Color(0xFF6366F1),
    600: primaryColor,
    700: Color(0xFF4338CA),
    800: Color(0xFF3730A3),
    900: Color(0xFF312E81),
  });

  static final ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    fontFamily: 'Inter',

    colorScheme: ColorScheme.fromSwatch(
      primarySwatch: primaryMaterialColor,
    ).copyWith(
      secondary: secondaryColor,
      error: dangerColor,
      background: const Color(0xFFF1F5F9), // Slate-100
    ),

    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
      titleTextStyle: TextStyle(
        color: Color(0xFF0F172A),
        fontSize: 20,
        fontWeight: FontWeight.bold,
      ),
    ),

    // 👇 CAMBIO IMPORTANTE AQUÍ
    cardTheme: CardThemeData(
      elevation: 4, // Sombra sutil
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 16,
        ),
      ),
    ),
  );
}
