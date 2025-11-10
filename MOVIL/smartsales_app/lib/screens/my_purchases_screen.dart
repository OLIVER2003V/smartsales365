// lib/screens/my_purchases_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';// Usamos lucide_icons
import 'package:intl/intl.dart';

import 'package:smartsales_app/models/venta_model.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/services/venta_service.dart';
import 'package:smartsales_app/utils/formatters.dart'; // ✅ CORREGIDO: Usar formatters.dart para formatPrice y formatDate
import 'package:smartsales_app/theme/app_theme.dart';
// import 'package:smartsales_app/screens/pago_exitoso_screen.dart'; // ❌ ELIMINADO

// --- WIDGETS AUXILIARES (MOVIDOS AQUÍ O A UN ARCHIVO COMPARTIDO) ---
// Nota: Para simplificar, los mantendremos aquí temporalmente.
class _EstadoBadge extends StatelessWidget {
    // ... (El contenido de _EstadoBadge es idéntico al que enviaste)
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
// -------------------------------------------------------------------


class MyPurchasesScreen extends StatefulWidget {
  const MyPurchasesScreen({super.key});

  @override
  State<MyPurchasesScreen> createState() => _MyPurchasesScreenState();
}

class _MyPurchasesScreenState extends State<MyPurchasesScreen> {
  final _ventaService = VentaService();
  List<Venta>? _ventas;
  bool _isLoading = true;
  String _sortOrder = 'fecha_desc'; 

  @override
  void initState() {
    super.initState();
    _loadVentas();
  }

  Future<void> _loadVentas() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    
    setState(() => _isLoading = true);
    try {
      final data = await _ventaService.getVentas(token);
      setState(() {
        _ventas = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al cargar historial: ${e.toString().replaceAll('Exception: ', '')}'), backgroundColor: Colors.red),
      );
    }
  }
  
  String _formatDate(DateTime date) {
    return DateFormat('dd/MM/yyyy HH:mm').format(date);
  }

  List<Venta> get _sortedVentas {
    if (_ventas == null) return [];
    
    List<Venta> sortedList = List.from(_ventas!);
    
    sortedList.sort((a, b) {
      switch (_sortOrder) {
        case 'fecha_asc':
          return a.fechaVenta.compareTo(b.fechaVenta);
        case 'total_desc':
          return b.total.compareTo(a.total);
        case 'total_asc':
          return a.total.compareTo(b.total);
        case 'fecha_desc':
        default:
          return b.fechaVenta.compareTo(a.fechaVenta);
      }
    });
    return sortedList;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: _buildBody(),
    );
  }
  
  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_ventas == null || _ventas!.isEmpty) {
      return const _EmptyState();
    }
    
    final ventas = _sortedVentas;

    return RefreshIndicator(
      onRefresh: _loadVentas,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSortSelector(),
          const SizedBox(height: 16),
          
          ...ventas.map((venta) => _VentaCard(
            venta: venta, 
            formatDate: _formatDate
          )),
        ],
      ),
    );
  }

  Widget _buildSortSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _sortOrder,
          isExpanded: true,
          icon: const Icon(LucideIcons.arrowUpDown, size: 18),
          onChanged: (value) {
            if (value != null) {
              setState(() => _sortOrder = value);
            }
          },
          items: const [
            DropdownMenuItem(value: 'fecha_desc', child: Text('Más Recientes')),
            DropdownMenuItem(value: 'fecha_asc', child: Text('Más Antiguos')),
            DropdownMenuItem(value: 'total_desc', child: Text('Mayor Monto')),
            DropdownMenuItem(value: 'total_asc', child: Text('Menor Monto')),
          ],
        ),
      ),
    );
  }
}

// Card para cada Venta
class _VentaCard extends StatelessWidget {
  final Venta venta;
  final String Function(DateTime) formatDate;

  const _VentaCard({required this.venta, required this.formatDate});

  @override
  Widget build(BuildContext context) {
    final int itemCount = venta.detalles.fold(0, (sum, item) => sum + item.cantidad);
    
    return Card(
      elevation: 1,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () {
          // ✅ CORRECCIÓN CLAVE: Navegar a la ruta dinámica para el detalle de compra.
          // Esta ruta ahora será manejada por MyPurchaseDetailsScreen en main.dart.
          Navigator.of(context).pushNamed('/mis-compras/${venta.id}');
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Pedido #${venta.id}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  _EstadoBadge(estado: venta.estado, estadoDisplay: venta.estadoDisplay),
                ],
              ),
              const SizedBox(height: 8),
              Text(formatDate(venta.fechaVenta), style: const TextStyle(color: Colors.grey, fontSize: 13)),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Pagado:', style: TextStyle(color: Colors.grey)),
                      // ✅ CORREGIDO: Usar el formatPrice de formatters.dart
                      Text(formatPrice(venta.total), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)), 
                    ],
                  ),
                  Chip(
                    avatar: const Icon(LucideIcons.package, size: 16),
                    label: Text('$itemCount Items'),
                    backgroundColor: Colors.indigo.withOpacity(0.1),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// (El resto de _EmptyState es idéntico y no requiere cambios)
class _EmptyState extends StatelessWidget {
// ... (código anterior)
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(LucideIcons.inbox, size: 64, color: Color(0xFF94A3B8)),
            const SizedBox(height: 16),
            Text(
              'No tienes compras',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Aquí aparecerán todas tus compras completadas.',
              style: TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => Navigator.of(context).pushNamedAndRemoveUntil('/shell', (route) => false),
              icon: const Icon(LucideIcons.shoppingBag, size: 18),
              label: const Text('Empezar a Comprar'),
            ),
          ],
        ),
      ),
    );
  }
}