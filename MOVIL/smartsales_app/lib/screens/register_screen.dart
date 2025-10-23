import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _edadController = TextEditingController();
  final _authService = AuthService();
  String _message = '';
  bool _isLoading = false;

  void _register() async {
    if (_formKey.currentState!.validate()) {
      setState(() { _isLoading = true; _message = ''; });
      try {
        await _authService.register(
          username: _usernameController.text,
          email: _emailController.text,
          password: _passwordController.text,
          firstName: _firstNameController.text,
          lastName: _lastNameController.text,
          edad: _edadController.text,
        );
        setState(() { _message = '✅ ¡Registro exitoso! Redirigiendo...'; });
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) Navigator.pop(context);
        });
      } catch (e) {
        setState(() { _message = e.toString().replaceAll('Exception: ', ''); });
      } finally {
        setState(() { _isLoading = false; });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Crear Cuenta')),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            children: [
              if (_message.isNotEmpty) ...[
                Text(_message, style: TextStyle(color: _message.startsWith('✅') ? Colors.green : Colors.red)),
                const SizedBox(height: 20),
              ],
              TextFormField(controller: _usernameController, decoration: const InputDecoration(labelText: 'Nombre de Usuario'), validator: (v) => v!.isEmpty ? 'Campo requerido' : null),
              TextFormField(controller: _emailController, decoration: const InputDecoration(labelText: 'Correo Electrónico'), keyboardType: TextInputType.emailAddress, validator: (v) => v!.isEmpty ? 'Campo requerido' : null),
              TextFormField(controller: _passwordController, decoration: const InputDecoration(labelText: 'Contraseña'), obscureText: true, validator: (v) => v!.isEmpty ? 'Campo requerido' : null),
              TextFormField(controller: _firstNameController, decoration: const InputDecoration(labelText: 'Nombre')),
              TextFormField(controller: _lastNameController, decoration: const InputDecoration(labelText: 'Apellido')),
              TextFormField(controller: _edadController, decoration: const InputDecoration(labelText: 'Edad'), keyboardType: TextInputType.number, validator: (v) => v!.isEmpty ? 'Campo requerido' : null),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _register,
                  child: _isLoading ? const CircularProgressIndicator() : const Text('Registrarse'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}