// lib/widgets/admin/dashboard/vista_historico.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/models/kpi_model.dart';
import 'package:smartsales_app/models/baja_rotacion_model.dart';
import 'package:smartsales_app/models/historial_model.dart';
import 'package:smartsales_app/models/product_model.dart';
import 'package:smartsales_app/models/categoria_model.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/services/analitica_service.dart';
import 'package:smartsales_app/services/product_service.dart';
import 'package:smartsales_app/services/category_service.dart';
import 'package:smartsales_app/utils/formatters.dart';
import 'alert_message.dart';

class VistaHistorico extends StatefulWidget {
  final KpiModel? kpis;
  final List<BajaRotacionProducto>? bajaRotacionData;
  final bool bajaRotacionLoading;

  const VistaHistorico({
    super.key,
    required this.kpis,
    required this.bajaRotacionData,
    required this.bajaRotacionLoading,
  });

  @override
  State<VistaHistorico> createState() => _VistaHistoricoState();
}

class _VistaHistoricoState extends State<VistaHistorico> {
  final AnaliticaService _service = AnaliticaService();
  final ProductService _productService = ProductService();
  final CategoryService _categoryService = CategoryService();

  List<HistorialResumen> _historial = [];
  bool _isLoading = true;
  bool _isLoadingFilters = true;
  String _message = '';
  
  // Filtros
  bool _showFilters = false;
  Map<String, String> _filtros = {
    'fecha_inicio': '', 'fecha_fin': '', 'producto': '', 'categoria': '',
  };
  List<Product> _allProducts = [];
  List<Categoria> _allCategories = [];

  @override
  void initState() {
    super.initState();
    _loadHistory({});
    _loadFilterData();
  }

  Future<void> _loadHistory(Map<String, String> filters) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    
    setState(() => _isLoading = true);
    try {
      final data = await _service.getHistorialResumen(token, filters);
      setState(() => _historial = data);
    } catch (e) {
      setState(() => _message = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadFilterData() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    
    setState(() => _isLoadingFilters = true);
    try {
      final productsFuture = _productService.getProducts(token);
      final categoriesFuture = _categoryService.getCategorias(token);
      final results = await Future.wait([productsFuture, categoriesFuture]);
      setState(() {
        _allProducts = results[0] as List<Product>;
        _allCategories = results[1] as List<Categoria>;
      });
    } catch (e) {
      // no es un error crítico
    } finally {
      setState(() => _isLoadingFilters = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // --- Controles y Botones ---
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Ventas Históricas', style: Theme.of(context).textTheme.headlineSmall),
            Row(
              children: [
                TextButton.icon(
                  icon: Icon(_showFilters ? LucideIcons.x : LucideIcons.slidersHorizontal, size: 18),
                  label: Text(_showFilters ? 'Ocultar' : 'Filtros'),
                  onPressed: () => setState(() => _showFilters = !_showFilters),
                ),
                // TODO: Botón de PDF
              ],
            ),
          ],
        ),
        
        // --- Panel de Filtros ---
        if (_showFilters)
          _buildFilterPanel(),

        const Divider(height: 24),
        if (_message.isNotEmpty)
          AlertMessage(msg: _message, type: 'error'),

        // --- Gráfico ---
        SizedBox(
          height: 300,
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _historial.isEmpty
                  ? const Center(child: Text('No hay datos históricos para mostrar.'))
                  : _buildBarChart(),
        ),

        // --- Tabla de Baja Rotación ---
        const SizedBox(height: 24),
        _BajaRotacionWidget(
          data: widget.bajaRotacionData,
          isLoading: widget.bajaRotacionLoading,
        ),
      ],
    );
  }

  // (React: Panel de Filtros)
  Widget _buildFilterPanel() {
    if (_isLoadingFilters) return const Center(child: Text('Cargando filtros...'));
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: Text('Desde: (Próximamente)')), // TODO: Implementar DatePicker
              Expanded(child: Text('Hasta: (Próximamente)')), // TODO: Implementar DatePicker
            ],
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _filtros['categoria']!.isEmpty ? null : _filtros['categoria'],
            hint: const Text('Todas las Categorías'),
            decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Categoría'),
            items: _allCategories.map((c) => DropdownMenuItem(value: c.id.toString(), child: Text(c.nombre))).toList(),
            onChanged: (val) => setState(() => _filtros['categoria'] = val ?? ''),
          ),
          const SizedBox(height: 12),
          // TODO: El dropdown de productos (filtrado por categoría)
          FilledButton(
            onPressed: () => _loadHistory(_filtros),
            child: const Text('Aplicar Filtros'),
          )
        ],
      ),
    );
  }

  // (React: BarChart)
  Widget _buildBarChart() {
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        gridData: const FlGridData(show: false),
        titlesData: FlTitlesData(
          show: true,
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 50, // Espacio para labels
              getTitlesWidget: (value, meta) {
                final index = value.toInt();
                if (index >= _historial.length) return const SizedBox();
                return Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    _historial[index].periodo, 
                    style: const TextStyle(fontSize: 10),
                    textAlign: TextAlign.center,
                  ),
                );
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 70,
              getTitlesWidget: (value, meta) => Text(formatPrice(value), style: const TextStyle(fontSize: 10)),
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        barGroups: _historial.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          return BarChartGroupData(
            x: index,
            barRods: [
              BarChartRodData(
                toY: item.totalVendido,
                color: Colors.green.shade600,
                width: 16,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }
}


// (React: BajaRotacionWidget)
class _BajaRotacionWidget extends StatelessWidget {
  final List<BajaRotacionProducto>? data;
  final bool isLoading;

  const _BajaRotacionWidget({required this.data, required this.isLoading});

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: Text('Cargando baja rotación...'));
    }
    if (data == null || data!.isEmpty) {
      return const AlertMessage(msg: '¡Buenas noticias! Todos los productos han rotado.', type: 'success');
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Productos de Baja Rotación', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columns: const [
              DataColumn(label: Text('Producto')),
              DataColumn(label: Text('Stock Actual'), numeric: true),
              DataColumn(label: Text('Ventas (90d)'), numeric: true),
            ],
            rows: data!.map((item) => DataRow(
              cells: [
                DataCell(
                  Row(
                    children: [
                      if (item.imagenUrl != null)
                        Image.network(item.imagenUrl!, width: 32, height: 32, fit: BoxFit.contain, errorBuilder: (_,__,___) => const Icon(LucideIcons.imageOff, size: 32))
                      else
                        const Icon(LucideIcons.package, size: 32),
                      const SizedBox(width: 8),
                      Text(item.nombre),
                    ],
                  )
                ),
                DataCell(Text(item.stock.toString())),
                DataCell(Text(item.totalVendido.toString(), style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold))),
              ],
            )).toList(),
          ),
        ),
      ],
    );
  }
}