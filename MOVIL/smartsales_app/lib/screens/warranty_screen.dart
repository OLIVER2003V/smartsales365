// lib/screens/warranty_screen.dart
import 'package:flutter/material.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/models/garantia_model.dart';
import 'package:smartsales_app/services/garantia_service.dart';
import 'package:smartsales_app/theme/app_theme.dart';
import 'package:smartsales_app/utils/formatters.dart'; // Importa el helper

class WarrantyScreen extends StatefulWidget {
  const WarrantyScreen({super.key});

  @override
  State<WarrantyScreen> createState() => _WarrantyScreenState();
}

class _WarrantyScreenState extends State<WarrantyScreen> {
  final _codigoController = TextEditingController();
  final _garantiaService = GarantiaService();

  // Estados
  bool _isLoading = false;
  GarantiaResultado? _resultado;
  String? _error;

  Future<void> _handleSubmit() async {
    final codigo = _codigoController.text.trim();
    if (codigo.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, ingresa un código.'), backgroundColor: Colors.orange),
      );
      return;
    }

    FocusScope.of(context).unfocus(); // Ocultar teclado
    setState(() {
      _isLoading = true;
      _resultado = null;
      _error = null;
    });

    try {
      final data = await _garantiaService.consultarGarantia(codigo);
      setState(() {
        _resultado = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _codigoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // El AppBar es provisto por AppShellScreen
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // --- Formulario de Búsqueda ---
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(LucideIcons.qrCode, color: Theme.of(context).primaryColor, size: 30),
                        const SizedBox(width: 8),
                        Text('Consultar Garantía', style: Theme.of(context).textTheme.headlineSmall),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Ingresa el código único de tu producto para verificar su estado. Lo encontrarás en tu comprobante de compra.',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _codigoController,
                      decoration: InputDecoration(
                        labelText: 'Ingresa tu código de garantía...',
                        border: const OutlineInputBorder(),
                        suffixIcon: IconButton(
                          icon: _isLoading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(LucideIcons.search),
                          onPressed: _isLoading ? null : _handleSubmit,
                        ),
                      ),
                      onSubmitted: (_) => _handleSubmit(),
                    ),
                    const SizedBox(height: 8),
                    Center(
                      child: TextButton(
                        onPressed: () {
                          // Navega a la nueva pantalla de reglas
                          Navigator.of(context).pushNamed('/reglas-garantia');
                        },
                        child: const Text('Revisa las reglas de garantía'),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // --- Resultados ---
            const SizedBox(height: 24),
            if (_isLoading)
              const Center(child: CircularProgressIndicator()),
            
            if (_error != null)
              _ErrorState(message: _error!),

            if (_resultado != null)
              _ResultadoWidget(resultado: _resultado!),

          ],
        ),
      ),
    );
  }
}

// --- (React: ErrorState) ---
class _ErrorState extends StatelessWidget {
  final String message;
  const _ErrorState({required this.message});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: Colors.red.shade50,
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const Icon(LucideIcons.triangleAlert, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Garantía no encontrada', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.red.shade700)),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black87)),
          ],
        ),
      ),
    );
  }
}

// --- (React: Resultado Exitoso) ---
class _ResultadoWidget extends StatelessWidget {
  final GarantiaResultado resultado;
  const _ResultadoWidget({required this.resultado});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Producto
            Container(
              height: 150,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: (resultado.producto.imagenUrl != null && resultado.producto.imagenUrl!.isNotEmpty)
                    ? Image.network(
                        resultado.producto.imagenUrl!,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Icon(LucideIcons.package, color: Colors.grey, size: 48),
                      )
                    : const Icon(LucideIcons.package, color: Colors.grey, size: 48),
              ),
            ),
            const SizedBox(height: 12),
            Text(resultado.producto.nombre, style: Theme.of(context).textTheme.headlineSmall),
            Text('${resultado.producto.marca} ${resultado.producto.modelo ?? ''}', style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 16),
            
            // Estado
            _EstadoBadge(estado: resultado.estado),
            
            const Divider(height: 32),
            
            // Detalles
            _InfoRow(label: 'Fecha de Compra:', value: formatDate(resultado.venta.fechaCompra)),
            _InfoRow(
              label: 'Vencimiento de Garantía:', 
              value: formatDate(resultado.fechaVencimiento),
              isHighlight: resultado.estado != 'Activa',
            ),
            _InfoRow(label: 'Comprado por:', value: resultado.venta.cliente),
            _InfoRow(label: 'Comprobante de Venta:', value: '#${resultado.venta.id}'),
          ],
        ),
      ),
    );
  }
}

// --- (React: EstadoBadge) ---
class _EstadoBadge extends StatelessWidget {
  final String estado;
  const _EstadoBadge({required this.estado});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;
    String text;

    switch (estado) {
      case 'Activa':
        icon = LucideIcons.shieldCheck;
        color = Colors.green;
        text = "Garantía Activa";
        break;
      case 'Expirada':
        icon = LucideIcons.calendarX;
        color = Colors.orange;
        text = "Garantía Expirada";
        break;
      case 'Reclamada':
        icon = LucideIcons.shieldOff;
        color = Colors.red;
        text = "Garantía Reclamada";
        break;
      default:
        icon = LucideIcons.triangleAlert;
        color = Colors.grey;
        text = "Desconocido";
    }

    return Chip(
      avatar: Icon(icon, size: 20, color: color),
      label: Text(text, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
      backgroundColor: color.withOpacity(0.1),
      side: BorderSide(color: color.withOpacity(0.2)),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    );
  }
}

// --- (React: InfoRow) ---
class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isHighlight;

  const _InfoRow({
    required this.label,
    required this.value,
    this.isHighlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isHighlight ? Colors.red.shade700 : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}