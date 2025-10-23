// lib/main.dart
import 'package:flutter/material.dart';
import 'package:smartsales_app/screens/login_screen.dart'; // Crearemos estos archivos ahora
import 'package:smartsales_app/screens/register_screen.dart';
import 'package:smartsales_app/screens/forgot_password_screen.dart';
import 'package:smartsales_app/screens/reset_password_screen.dart';
import 'package:smartsales_app/screens/profile_screen.dart';


void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartSales365',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      // Definimos la ruta inicial y el resto de las rutas de la app
      initialRoute: '/',
      routes: {
        '/': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
        '/forgot-password': (context) => const ForgotPasswordScreen(),
        '/reset-password': (context) => const ResetPasswordScreen(),
        '/profile':(context) => const ProfileScreen(),
      },
    );
  }
}