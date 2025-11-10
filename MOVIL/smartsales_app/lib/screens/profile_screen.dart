// lib/screens/profile_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart'; // ❗️ IMPORTA LUCIDE
import 'package:smartsales_app/models/user_model.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/theme/app_theme.dart';
import 'package:smartsales_app/widgets/password_change_modal.dart'; // ❗️ Lo creamos en el paso 7

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isEditing = false;
  bool _isSaving = false;

  late TextEditingController _emailController;
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _edadController;
  
  late User _user; // Copia local para "Cancelar"

  @override
  void initState() {
    super.initState();
    // Lee la copia inicial del usuario
    _user = context.read<AuthProvider>().user!;
    _initControllers();
  }
  
  void _initControllers() {
    // Inicializa los controllers con la data de _user
    _emailController = TextEditingController(text: _user.email);
    _firstNameController = TextEditingController(text: _user.firstName);
    _lastNameController = TextEditingController(text: _user.lastName);
    _edadController = TextEditingController(text: _user.edad?.toString() ?? '');
  }

  @override
  void dispose() {
    _emailController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _edadController.dispose();
    super.dispose();
  }

  void _cancelEdit() {
    setState(() {
      _isEditing = false;
      // Restaura valores originales
      _initControllers(); 
    });
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSaving = true);
    final authProvider = context.read<AuthProvider>();
    
    final Map<String, dynamic> data = {
      'email': _emailController.text,
      'first_name': _firstNameController.text,
      'last_name': _lastNameController.text,
      'edad': int.tryParse(_edadController.text),
    };

    try {
      // Llama al provider, que actualiza la API y el estado local
      await authProvider.updateProfile(data);

      // Actualiza la copia local con la nueva data del provider
      _user = authProvider.user!; 

      setState(() => _isEditing = false);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Perfil actualizado exitosamente.'),
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
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _logout() async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Cerrar Sesión?'),
        content: const Text('¿Seguro que deseas cerrar sesión?'),
        actions: [
          TextButton(
            child: const Text('Cancelar'),
            onPressed: () => Navigator.of(context).pop(false),
          ),
          FilledButton(
            child: const Text('Sí, Cerrar Sesión'),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.dangerColor),
            onPressed: () => Navigator.of(context).pop(true),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await context.read<AuthProvider>().logout();
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
      }
    }
  }

  void _showPasswordModal() {
    showModalBottomSheet(
      context: context,
      builder: (_) => const PasswordChangeModal(), // Definido en el siguiente archivo
      isScrollControlled: true,
      backgroundColor: Theme.of(context).cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, child) {
        // Si el usuario se actualiza (ej. updateProfile), esto se reconstruye
        final user = auth.user;
        if (user == null) {
          // Esto puede pasar brevemente si el provider se está actualizando
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        
        final clienteProfile = user.clienteProfile;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Mi Perfil'),
            actions: [
              if (_isEditing)
                IconButton(
                  icon: const Icon(LucideIcons.x),
                  tooltip: 'Cancelar',
                  onPressed: _isSaving ? null : _cancelEdit,
                ),
              IconButton(
                icon: _isSaving 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Icon(_isEditing ? LucideIcons.save : LucideIcons.pencil),
                tooltip: _isEditing ? 'Guardar' : 'Editar',
                onPressed: _isSaving ? null : (_isEditing ? _saveProfile : () => setState(() => _isEditing = true)),
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Column(
                      children: [
                        Icon(LucideIcons.circleUser, size: 64, color: Theme.of(context).primaryColor),
                        const SizedBox(height: 8),
                        Text(
                          user.firstName.isNotEmpty ? user.firstName : user.username,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        Text(
                          'Bienvenido',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 32),

                  Text('Información de Cuenta', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 16),
                  _ReadOnlyField(icon: LucideIcons.user, label: 'Username', value: user.username),
                  _ReadOnlyField(icon: LucideIcons.shieldCheck, label: 'Rol', value: user.getRolDisplay()),
                  _EditableField(
                    controller: _emailController,
                    label: 'Email',
                    icon: LucideIcons.mail,
                    isEditing: _isEditing,
                    validator: (val) => (val == null || !val.contains('@')) ? 'Email no válido' : null,
                  ),
                  _EditableField(
                    controller: _firstNameController,
                    label: 'Nombre',
                    icon: LucideIcons.user,
                    isEditing: _isEditing,
                  ),
                  _EditableField(
                    controller: _lastNameController,
                    label: 'Apellido',
                    icon: LucideIcons.user,
                    isEditing: _isEditing,
                  ),
                  _EditableField(
                    controller: _edadController,
                    label: 'Edad',
                    icon: LucideIcons.hash,
                    isEditing: _isEditing,
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 24),

                  if (clienteProfile != null) ...[
                    Text('Información de Cliente', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 16),
                    _ReadOnlyField(icon: LucideIcons.building, label: 'Nombre Cliente', value: clienteProfile.nombre),
                    _ReadOnlyField(icon: LucideIcons.user, label: 'Apellido Cliente', value: clienteProfile.apellido),
                    _ReadOnlyField(icon: LucideIcons.phone, label: 'Teléfono', value: clienteProfile.telefono),
                    _ReadOnlyField(icon: LucideIcons.hash, label: 'NIT/CI', value: clienteProfile.nitCi),
                    _ReadOnlyField(icon: LucideIcons.mapPin, label: 'Dirección', value: clienteProfile.direccion),
                    const SizedBox(height: 24),
                  ],

                  Text('Seguridad', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    icon: const Icon(LucideIcons.lock),
                    label: const Text('Cambiar Contraseña'),
                    onPressed: _showPasswordModal,
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    icon: const Icon(LucideIcons.logOut, color: AppTheme.dangerColor),
                    label: const Text('Cerrar Sesión', style: TextStyle(color: AppTheme.dangerColor)),
                    onPressed: _logout,
                    style: OutlinedButton.styleFrom(side: const BorderSide(color: AppTheme.dangerColor)),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

// --- WIDGETS AUXILIARES ---

class _ReadOnlyField extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _ReadOnlyField({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade600),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
                Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EditableField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool isEditing;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;

  const _EditableField({
    required this.controller,
    required this.label,
    required this.icon,
    required this.isEditing,
    this.validator,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: TextFormField(
        controller: controller,
        enabled: isEditing,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          prefixIcon: Icon(icon, size: 20),
          labelText: label,
          border: const OutlineInputBorder(),
          disabledBorder: OutlineInputBorder(
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          filled: !isEditing,
          fillColor: !isEditing ? Colors.grey.shade100 : Colors.transparent,
        ),
        validator: validator,
      ),
    );
  }
}