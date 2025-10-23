import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});
  @override
  _ResetPasswordScreenState createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _authService = AuthService();
  String _message = '';
  bool _isLoading = false;

  void _confirmReset() async {
    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _message = '❌ Las contraseñas no coinciden.');
      return;
    }

    // Obtenemos los argumentos (uid y token) pasados desde la pantalla anterior
    final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    final uid = args['uid'];
    final token = args['token'];

    setState(() { _isLoading = true; _message = ''; });
    try {
      await _authService.confirmPasswordReset(
        uid: uid,
        token: token,
        newPassword: _passwordController.text,
      );
      setState(() => _message = '✅ Contraseña actualizada. Redirigiendo...');
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
      });
    } catch (e) {
      setState(() => _message = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Establecer Nueva Contraseña')),
      body: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
             if (_message.isNotEmpty) ...[Text(_message, style: TextStyle(color: _message.startsWith('✅') ? Colors.green : Colors.red)), const SizedBox(height: 20)],
            TextField(controller: _passwordController, decoration: const InputDecoration(labelText: 'Nueva Contraseña'), obscureText: true),
            TextField(controller: _confirmPasswordController, decoration: const InputDecoration(labelText: 'Confirmar Contraseña'), obscureText: true),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _confirmReset,
                child: _isLoading ? const CircularProgressIndicator() : const Text('Guardar Contraseña'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}