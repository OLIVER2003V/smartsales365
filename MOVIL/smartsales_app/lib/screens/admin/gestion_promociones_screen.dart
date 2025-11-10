// lib/screens/admin/gestion_promociones_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/models/promocion_model.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/services/promocion_service.dart';
import 'package:smartsales_app/theme/app_theme.dart';
import 'package:smartsales_app/widgets/admin/promocion_modal.dart';
import 'package:smartsales_app/utils/formatters.dart'; // Import correcto
import 'package:intl/intl.dart'; // ❗️ 1. IMPORTAR INTL

class GestionPromocionesScreen extends StatefulWidget {
  const GestionPromocionesScreen({super.key});

  @override
  State<GestionPromocionesScreen> createState() => _GestionPromocionesScreenState();
}

class _GestionPromocionesScreenState extends State<GestionPromocionesScreen> {
  final PromocionService _service = PromocionService();
  List<Promocion> _promociones = [];
  bool _isLoading = true;
  String _searchTerm = '';

  @override
  void initState() {
    super.initState();
    _checkRoleAndFetch();
  }

  Future<void> _checkRoleAndFetch() async {
    final user = context.read<AuthProvider>().user;
    if (user?.rol != 'ADM' && user?.rol != 'VEN') {
      Navigator.of(context).pop(); 
      return;
    }
    _fetchPromociones();
  }

  Future<void> _fetchPromociones() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() => _isLoading = true);
    try {
      final data = await _service.getPromociones(token);
      setState(() {
        _promociones = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al cargar promociones: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _handleOpenCreate() {
    _showPromocionModal(null);
  }

  void _handleOpenEdit(Promocion promo) {
    _showPromocionModal(promo);
  }

  void _handleOpenDelete(Promocion promo) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar Eliminación'),
        content: Text('¿Seguro que deseas eliminar la promoción "${promo.nombre}"? Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
            child: const Text('Cancelar'),
            onPressed: () => Navigator.of(ctx).pop(),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.dangerColor),
            child: const Text('Eliminar'),
            onPressed: () {
              Navigator.of(ctx).pop();
              _deletePromocion(promo.id);
            },
          ),
        ],
      ),
    );
  }

  void _deletePromocion(int id) async {
    final token = context.read<AuthProvider>().token!;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Eliminando...'), duration: Duration(seconds: 1)),
    );

    try {
      await _service.deletePromocion(token, id);
      _fetchPromociones();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Promoción eliminada'), backgroundColor: Colors.green),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al eliminar: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _showPromocionModal(Promocion? promocion) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => PromocionModal(
        promocionToEdit: promocion,
        onSuccess: () {
          _fetchPromociones();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredList = _promociones.where((p) {
      return p.nombre.toLowerCase().contains(_searchTerm.toLowerCase());
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Gestión de Promociones')),
      floatingActionButton: FloatingActionButton(
        onPressed: _handleOpenCreate,
        child: const Icon(LucideIcons.plus),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchPromociones,
              child: Column(
                children: [
                  _buildSearchField(),
                  if (_promociones.isEmpty)
                    _EmptyState(onActionClick: _handleOpenCreate),
                  if (_promociones.isNotEmpty && filteredList.isEmpty)
                    _EmptyState(isSearch: true),
                  if (filteredList.isNotEmpty)
                    Expanded(
                      child: ListView.builder(
                        itemCount: filteredList.length,
                        itemBuilder: (ctx, index) {
                          final promo = filteredList[index];
                          return _PromocionCard(
                            promo: promo,
                            onEdit: () => _handleOpenEdit(promo),
                            onDelete: () => _handleOpenDelete(promo),
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildSearchField() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: TextField(
        decoration: InputDecoration(
          labelText: 'Buscar por nombre...',
          prefixIcon: const Icon(LucideIcons.search),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onChanged: (value) => setState(() => _searchTerm = value),
      ),
    );
  }
}

// (React: EmptyState)
class _EmptyState extends StatelessWidget {
  final VoidCallback? onActionClick;
  final bool isSearch;
  
  const _EmptyState({this.onActionClick, this.isSearch = false});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isSearch ? LucideIcons.searchX : LucideIcons.ticketPercent, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              isSearch ? 'Sin resultados' : 'No hay promociones',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            Text(
              isSearch ? 'Intenta con otro término de búsqueda.' : 'Aún no se ha creado ninguna promoción.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
            if (onActionClick != null) ...[
              const SizedBox(height: 16),
              ElevatedButton.icon(
                // ❗️ Icono corregido para consistencia
                icon: const Icon(LucideIcons.circlePlus, size: 18), 
                label: const Text('Crear Primera Promoción'),
                onPressed: onActionClick,
              ),
            ]
          ],
        ),
      ),
    );
  }
}

// (React: Fila de la Tabla)
class _PromocionCard extends StatelessWidget {
  final Promocion promo;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _PromocionCard({
    required this.promo,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final String descuento = promo.tipoDescuento == 'PCT'
        ? '${promo.valorDescuento.toStringAsFixed(0)}%'
        : formatPrice(promo.valorDescuento);

    // ❗️ 2. CORRECCIÓN DEL ERROR DE FECHA
    // Usamos 'DateFormat' directamente sobre los objetos 'DateTime'
    final format = DateFormat('dd/MM/yy HH:mm');
    final String vigencia = '${format.format(promo.fechaInicio)} - ${format.format(promo.fechaFin)}';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
          child: Text(descuento, style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold, fontSize: 12)),
        ),
        title: Text(promo.nombre, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(vigencia, style: const TextStyle(fontSize: 12)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _EstadoBadge(activo: promo.activo),
            // ❗️ Icono corregido para consistencia
            IconButton(icon: const Icon(LucideIcons.pencil, size: 18), onPressed: onEdit, tooltip: 'Editar'), 
            IconButton(icon: Icon(LucideIcons.trash2, size: 18, color: Colors.red.shade700), onPressed: onDelete, tooltip: 'Eliminar'),
          ],
        ),
      ),
    );
  }
}

// (React: EstadoBadge)
class _EstadoBadge extends StatelessWidget {
  final bool activo;
  const _EstadoBadge({required this.activo});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: activo ? Colors.green.shade50 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: activo ? Colors.green.shade200 : Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: activo ? Colors.green.shade500 : Colors.grey.shade500,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            activo ? 'Activa' : 'Inactiva',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: activo ? Colors.green.shade800 : Colors.grey.shade800,
            ),
          ),
        ],
      ),
    );
  }
}