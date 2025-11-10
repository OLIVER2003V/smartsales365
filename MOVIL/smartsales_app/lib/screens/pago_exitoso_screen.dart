// lib/screens/pago_exitoso_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart'; // Usamos lucide_icons
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_file/open_file.dart';
import 'dart:io';

import 'package:smartsales_app/models/venta_model.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/services/venta_service.dart';
import 'package:smartsales_app/utils/formatters.dart'; // ✅ CORREGIDO: Usar formatters.dart
// Si no quieres compartir widgets, debes definir _InfoRow y _EstadoBadge aquí.

class PagoExitosoScreen extends StatefulWidget {
  final int ventaId;
  // Eliminamos isSuccessPage del constructor
  const PagoExitosoScreen({
    super.key, 
    required this.ventaId,
  });

  @override
  State<PagoExitosoScreen> createState() => _PagoExitosoScreenState();
}

class _PagoExitosoScreenState extends State<PagoExitosoScreen> {
  final _ventaService = VentaService();
  Venta? _venta;
  bool _isLoading = true;
  bool _isDownloading = false;

  @override
  void initState() {
    super.initState();
    // Uso de addPostFrameCallback para asegurar que el BuildContext sea válido
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchVenta();
    });
  }

  Future<void> _fetchVenta() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    
    try {
      final venta = await _ventaService.getVentaById(token, widget.ventaId);
      setState(() {
        _venta = venta;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al cargar la venta: $e'), backgroundColor: Colors.red),
      );
    }
  }

  String _formatDate(DateTime date) {
    // ✅ CORREGIDO: Usamos el DateFormat del archivo utils/formatters.dart
    return DateFormat('d \'de\' MMMM, yyyy, HH:mm', 'es_ES').format(date);
  }

  Future<void> _downloadPdf() async {
    if (_isDownloading) return;
    setState(() => _isDownloading = true);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    try {
      final token = context.read<AuthProvider>().token!;
      final bytes = await _ventaService.descargarComprobante(token, widget.ventaId);
      
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/comprobante_venta_#${widget.ventaId}.pdf');
      await file.writeAsBytes(bytes, flush: true);

      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('Descarga completada.'), backgroundColor: Colors.green),
      );
      
      await OpenFile.open(file.path);

    } catch (e) {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Error al descargar PDF: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if(mounted) {
        setState(() => _isDownloading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      // Usamos un Scaffold sin AppBar para evitar un doble AppBar
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    
    if (_venta == null) {
      return const Scaffold(body: Center(child: Text('No se pudo cargar la venta.')));
    }

    final venta = _venta!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pago Exitoso'), // Título fijo
        automaticallyImplyLeading: false, // Siempre oculta "atrás"
        actions: [
            // Botón para ir al detalle (MyPurchaseDetailsScreen)
            IconButton(
                icon: const Icon(LucideIcons.list),
                onPressed: () {
                    // Navega al detalle de compra (que tiene las reseñas)
                    Navigator.of(context).pushReplacementNamed(
                        '/mis-compras/${venta.id}'
                    );
                },
                tooltip: 'Ver detalle y reseñas',
            )
        ],
      ),
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // --- Tarjeta de Éxito (Siempre visible) ---
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    const Icon(LucideIcons.circleCheck, color: Colors.green, size: 64),
                    const SizedBox(height: 16),
                    Text('¡Pago Exitoso!', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(
                      'Gracias por tu compra, ${venta.clienteInfo.nombre}.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text('Pedido ID: #${venta.id}', style: const TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            ),
            
            // --- Resumen del Comprobante (Parte inferior) ---
            Card(
              elevation: 1,
              margin: const EdgeInsets.only(top: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Resumen de la Compra', style: Theme.of(context).textTheme.headlineSmall),
                    const Divider(height: 24),

                    // Info Cliente
                    _InfoRow(label: 'Cliente', value: '${venta.clienteInfo.nombre} ${venta.clienteInfo.apellido}'),
                    _InfoRow(label: 'Email', value: venta.clienteInfo.telefono),
                    _InfoRow(label: 'Fecha', value: _formatDate(venta.fechaVenta)),
                    _InfoRow(label: 'Estado', child: _EstadoBadge(estado: venta.estado, estadoDisplay: venta.estadoDisplay)),
                    
                    const Divider(height: 24),

                    // Items (Productos)
                    ...venta.detalles.map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.nombreProducto, style: const TextStyle(fontWeight: FontWeight.bold)),
                                Text('${item.cantidad} x ${formatPrice(item.precioUnitario)}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                          ),
                          Text(formatPrice(item.subtotal), style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    )),

                    const Divider(height: 24),

                    // Total
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Total Pagado:', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                        Text(
                          formatPrice(venta.total),
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            // --- Acciones ---
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  FilledButton.icon(
                    icon: const Icon(LucideIcons.arrowLeft, size: 20),
                    label: const Text('Seguir Comprando'),
                    onPressed: () => Navigator.of(context).pushNamedAndRemoveUntil('/shell', (route) => false),
                    style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    icon: _isDownloading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(LucideIcons.download, size: 20),
                    label: Text(_isDownloading ? 'Generando...' : 'Descargar PDF'),
                    onPressed: _downloadPdf,
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- Widgets Auxiliares (Deben ser compartidos o movidos aquí) ---
class _InfoRow extends StatelessWidget {
  // ... (código auxiliar) ...
  final String label;
  final String? value;
  final Widget? child;
  const _InfoRow({required this.label, this.value, this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          child ?? Text(value ?? 'N/A', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _EstadoBadge extends StatelessWidget {
  // ... (código auxiliar) ...
  final String estado;
  final String estadoDisplay;
  const _EstadoBadge({required this.estado, required this.estadoDisplay});

  @override
  Widget build(BuildContext context) {
    Map<String, Color> colors = {
      'PAG': Colors.blue, 'ENT': Colors.orange, 'OK': Colors.green, 'CAN': Colors.red,
    };
    Map<String, IconData> icons = {
      'PAG': LucideIcons.receipt, 'ENT': LucideIcons.truck, 'OK': LucideIcons.check, 'CAN': LucideIcons.circleX,
    };
    
    final color = colors[estado] ?? Colors.grey;
    final icon = icons[estado] ?? LucideIcons.shieldQuestionMark;
    
    return Chip(
      avatar: Icon(icon, size: 16, color: color),
      label: Text(estadoDisplay, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
      backgroundColor: color.withOpacity(0.1),
      side: BorderSide(color: color.withOpacity(0.2)),
    );
  }
}