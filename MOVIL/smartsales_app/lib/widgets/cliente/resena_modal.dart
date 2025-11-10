// lib/widgets/cliente/resena_modal.dart
import 'package:flutter/material.dart';
import 'package:lucide_flutter/lucide_flutter.dart'; // Usando lucide_icons para LucideIcons
import 'package:provider/provider.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/services/resena_service.dart';

// El objeto Producto que se pasa debe ser simple, solo con ID y nombre
class ProductoAResenar {
  final int id;
  final String nombre;
  ProductoAResenar({required this.id, required this.nombre});
}

// --- Componente de Estrellas Interactivas (StarInput) ---
class StarInput extends StatelessWidget {
  final int rating;
  final ValueChanged<int> onRatingChanged;

  const StarInput({
    super.key,
    required this.rating,
    required this.onRatingChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        final star = index + 1;
        final isSelected = star <= rating;
        return IconButton(
          icon: Icon(
            LucideIcons.star,
            size: 30,
            color: isSelected ? Colors.yellow.shade700 : Colors.grey.shade400,
          ),
          onPressed: () => onRatingChanged(star),
          tooltip: 'Calificar con $star ${star > 1 ? 'estrellas' : 'estrella'}',
        );
      }),
    );
  }
}

// --- Componente Principal del Modal ---
class ResenaModal extends StatefulWidget {
  final ProductoAResenar producto;
  final VoidCallback onSuccess;

  const ResenaModal({
    super.key,
    required this.producto,
    required this.onSuccess,
  });

  @override
  State<ResenaModal> createState() => _ResenaModalState();
}

class _ResenaModalState extends State<ResenaModal> {
  final _formKey = GlobalKey<FormState>();
  final ResenaService _resenaService = ResenaService();

  int _calificacion = 0;
  String _titulo = '';
  String _comentario = '';
  bool _isSaving = false;

  void _handleClose() {
    if (_isSaving) return;
    Navigator.of(context).pop();
  }
  
  // --- Función Helper para mostrar SnackBar ---
  void _showSnackbar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade700 : Colors.green.shade700,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    
    // 1. Validación manual de calificación (reemplaza ToastManager.error)
    if (_calificacion == 0) {
      _showSnackbar('Por favor, selecciona una calificación (1-5 estrellas).', isError: true);
      return;
    }

    _formKey.currentState!.save();

    setState(() => _isSaving = true);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    final resenaData = ResenaData(
      productoId: widget.producto.id,
      calificacion: _calificacion,
      titulo: _titulo,
      comentario: _comentario,
    );

    try {
      await _resenaService.createResena(authProvider.token!, resenaData);
      
      // 2. Mensaje de éxito (reemplaza ToastManager.success)
      _showSnackbar('¡Gracias por tu reseña!');
      widget.onSuccess(); 
      
      // Nota: widget.onSuccess() debe manejar el cierre del modal.
      // Si el onSuccess no cierra el modal, añade: Navigator.of(context).pop();
      
    } catch (e) {
      // 3. Mensaje de error (reemplaza ToastManager.error)
      final errorMessage = e.toString().replaceAll('Exception: ', '');
      _showSnackbar(errorMessage, isError: true);
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Usamos ShowDialog o ModalBarrier, pero para un control total, usamos Dialog/AlertDialog
    return AlertDialog(
      titlePadding: EdgeInsets.zero,
      contentPadding: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Escribe tu reseña', style: Theme.of(context).textTheme.headlineSmall),
            IconButton(
              icon: const Icon(LucideIcons.x),
              onPressed: _isSaving ? null : _handleClose,
              splashRadius: 20,
            ),
          ],
        ),
      ),
      content: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '¿Qué opinas de ${widget.producto.nombre}?',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                ),
                const SizedBox(height: 16),
                
                // Calificación
                _buildInputGroup(
                  label: 'Tu Calificación *',
                  child: StarInput(
                    rating: _calificacion,
                    onRatingChanged: (newRating) => setState(() => _calificacion = newRating),
                  ),
                ),
                const SizedBox(height: 16),

                // Título
                _buildInputGroup(
                  label: 'Título de tu reseña *',
                  child: TextFormField(
                    onSaved: (value) => _titulo = value ?? '',
                    validator: (value) => value!.trim().isEmpty ? 'El título es requerido.' : null,
                    decoration: const InputDecoration(
                      hintText: 'Ej: ¡El mejor refrigerador!',
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Comentario
                _buildInputGroup(
                  label: 'Tu reseña *',
                  child: TextFormField(
                    onSaved: (value) => _comentario = value ?? '',
                    validator: (value) => value!.trim().isEmpty ? 'El comentario es requerido.' : null,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText: 'Describe tu experiencia con el producto...',
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      actions: [
        TextButton(
          onPressed: _isSaving ? null : _handleClose,
          child: const Text('Cancelar'),
        ),
        ElevatedButton.icon(
          onPressed: _isSaving ? null : _handleSubmit,
          icon: _isSaving
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Icon(LucideIcons.save, size: 18),
          label: Text(_isSaving ? 'Enviando...' : 'Enviar Reseña'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Theme.of(context).primaryColor,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildInputGroup({required String label, required Widget child}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}