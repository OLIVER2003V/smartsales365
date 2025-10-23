import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  _ForgotPasswordScreenState createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _authService = AuthService();
  String _message = '';
  bool _isLoading = false;

  void _requestReset() async {
    setState(() { _isLoading = true; _message = ''; });
    try {
      final data = await _authService.requestPasswordReset(_emailController.text);
      if (data['uid'] != null && data['token'] != null) {
        // Navegamos a la siguiente pantalla pasando los códigos como argumentos
        Navigator.pushNamed(context, '/reset-password', arguments: data);
      } else {
        setState(() => _message = '✅ Solicitud procesada.');
      }
    } catch (e) {
      setState(() => _message = '❌ Error al solicitar reseteo.');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recuperar Contraseña')),
      body: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Ingresa tu email para continuar'),
            if (_message.isNotEmpty) ...[const SizedBox(height: 20), Text(_message, style: TextStyle(color: _message.startsWith('✅') ? Colors.green : Colors.red))],
            const SizedBox(height: 20),
            TextField(controller: _emailController, decoration: const InputDecoration(labelText: 'Correo Electrónico'), keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _requestReset,
                child: _isLoading ? const CircularProgressIndicator() : const Text('Solicitar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}