import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
// 1. Ya no necesitas AuthService aquí, el Provider se encarga
// import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  // 2. Ya no necesitas _authService aquí
  String _message = '';
  bool _isLoading = false;

  void _login() async {
    setState(() {
      _isLoading = true;
      _message = '';
    });

    try {
      // 3. ❗️ Llama al método login del provider
      // (Esto ya lo tenías correcto de la vez pasada)
      await Provider.of<AuthProvider>(context, listen: false).login(
        _usernameController.text,
        _passwordController.text,
      );

      // 4. ❗️❗️ LA CORRECCIÓN ESTÁ AQUÍ ❗️❗️
      // Navegamos al SHELL (la nueva pantalla principal), no al catálogo.
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/shell');
      }

    } catch (e) {
      setState(() {
        _message = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // ... tu build method (no necesita cambios) ...
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Iniciar Sesión', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Bienvenido a SmartSales365', style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 40),
              if (_message.isNotEmpty) ...[
                Text(_message, style: const TextStyle(color: Colors.red)),
                const SizedBox(height: 20),
              ],
              TextField(
                controller: _usernameController,
                decoration: const InputDecoration(labelText: 'Nombre de Usuario', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Contraseña', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 20),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.pushNamed(context, '/forgot-password'),
                  child: const Text('¿Olvidaste tu contraseña?'),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _login,
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('Iniciar Sesión'),
                ),
              ),
              const SizedBox(height: 20),
              TextButton(
                onPressed: () => Navigator.pushNamed(context, '/register'),
                child: const Text('¿No tienes cuenta? Registrarme'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}