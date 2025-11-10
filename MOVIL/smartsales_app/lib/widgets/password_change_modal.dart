// lib/widgets/password_change_modal.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/services/auth_service.dart';

class PasswordChangeModal extends StatefulWidget {
  const PasswordChangeModal({super.key});

  @override
  State<PasswordChangeModal> createState() => _PasswordChangeModalState();
}

class _PasswordChangeModalState extends State<PasswordChangeModal> {
  final _formKey = GlobalKey<FormState>();
  final _authService = AuthService(); // Llama al servicio directamente

  final _oldPasswordController = TextEditingController();
  final _newPassword1Controller = TextEditingController();
  final _newPassword2Controller = TextEditingController();

  bool _isLoading = false;
  bool _oldPassObscure = true;
  bool _newPass1Obscure = true;
  bool _newPass2Obscure = true;

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPassword1Controller.dispose();
    _newPassword2Controller.dispose();
    super.dispose();
  }

  Future<void> _submitChangePassword() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    
    final token = context.read<AuthProvider>().token;
    if (token == null) {
      Navigator.of(context).pop();
      return;
    }

    final data = {
      'old_password': _oldPasswordController.text,
      'new_password1': _newPassword1Controller.text,
      'new_password2': _newPassword2Controller.text,
    };

    try {
      await _authService.changePassword(token, data);

      if (mounted) {
        Navigator.of(context).pop(); // Cierra el modal
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Contraseña actualizada exitosamente.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 24,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Cambiar Contraseña', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 24),

            TextFormField(
              controller: _oldPasswordController,
              obscureText: _oldPassObscure,
              decoration: InputDecoration(
                labelText: 'Contraseña Actual',
                prefixIcon: const Icon(LucideIcons.lock),
                suffixIcon: IconButton(
                  icon: Icon(_oldPassObscure ? LucideIcons.eyeOff : LucideIcons.eye),
                  onPressed: () => setState(() => _oldPassObscure = !_oldPassObscure),
                ),
                border: const OutlineInputBorder(),
              ),
              validator: (val) => (val == null || val.isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _newPassword1Controller,
              obscureText: _newPass1Obscure,
              decoration: InputDecoration(
                labelText: 'Contraseña Nueva',
                prefixIcon: const Icon(LucideIcons.lock),
                suffixIcon: IconButton(
                  icon: Icon(_newPass1Obscure ? LucideIcons.eyeOff : LucideIcons.eye),
                  onPressed: () => setState(() => _newPass1Obscure = !_newPass1Obscure),
                ),
                border: const OutlineInputBorder(),
              ),
              validator: (val) => (val == null || val.length < 6) ? 'Mínimo 6 caracteres' : null,
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _newPassword2Controller,
              obscureText: _newPass2Obscure,
              decoration: InputDecoration(
                labelText: 'Confirmar Contraseña Nueva',
                prefixIcon: const Icon(LucideIcons.lock),
                suffixIcon: IconButton(
                  icon: Icon(_newPass2Obscure ? LucideIcons.eyeOff : LucideIcons.eye),
                  onPressed: () => setState(() => _newPass2Obscure = !_newPass2Obscure),
                ),
                border: const OutlineInputBorder(),
              ),
              validator: (val) {
                if (val != _newPassword1Controller.text) {
                  return 'Las contraseñas no coinciden';
                }
                return null;
              },
            ),
            const SizedBox(height: 24),

            FilledButton.icon(
              icon: _isLoading 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(LucideIcons.save),
              label: Text(_isLoading ? 'Guardando...' : 'Guardar Cambios'),
              onPressed: _isLoading ? null : _submitChangePassword,
              style: FilledButton.styleFrom(minimumSize: const Size(double.infinity, 48)),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}