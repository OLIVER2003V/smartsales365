// lib/widgets/admin/dashboard/vista_futuro.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/models/kpi_model.dart';
import 'package:smartsales_app/models/prediccion_model.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/services/analitica_service.dart';
import 'package:smartsales_app/utils/formatters.dart';
import 'package:smartsales_app/widgets/admin/dashboard/alert_message.dart'; 

class VistaFuturo extends StatefulWidget {
  final KpiModel? kpis;
  final bool isTraining;
  final VoidCallback onTrainModel;
  final String token; 

  const VistaFuturo({
    super.key,
    this.kpis,
    required this.isTraining,
    required this.onTrainModel,
    required this.token, 
  });

  @override
  State<VistaFuturo> createState() => _VistaFuturoState();
}

class _VistaFuturoState extends State<VistaFuturo> {
  final AnaliticaService _service = AnaliticaService();

  List<PrediccionVenta> _predicciones = [];
  bool _isLoadingChart = true;
  String _message = '';
  String _messageType = 'info';
  int _diasAPredecir = 30;

  @override
  void initState() {
    super.initState();
    _loadPredictions(_diasAPredecir);
  }

  @override
  void didUpdateWidget(covariant VistaFuturo oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.token != widget.token) {
      _loadPredictions(_diasAPredecir);
    }
  }

  Future<void> _loadPredictions(int dias) async {
    setState(() {
      _isLoadingChart = true;
      _message = 'Generando predicción para $dias días...';
      _messageType = 'info';
      _predicciones = [];
    });

    try {
      final data = await _service.getPrediccionesVentas(widget.token, dias);
      setState(() {
        _predicciones = data;
        _message = '';
      });
    } catch (e) {
      setState(() {
        _message = e.toString().replaceAll('Exception: ', '');
        _messageType = 'error';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoadingChart = false);
      }
    }
  }

  void _setRange(int dias) {
    setState(() => _diasAPredecir = dias);
    _loadPredictions(dias);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // --- Controles y Botones ---
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ❗️❗️ CORRECCIÓN 1: Usar Flexible para el título
            Flexible( 
              child: Text(
                'Predicción de Ventas', 
                style: Theme.of(context).textTheme.headlineSmall,
                overflow: TextOverflow.ellipsis, // Previene overflow en el título si es muy largo
              ),
            ),
            const SizedBox(width: 8), // Espacio entre el título y el botón

            // ❗️❗️ CORRECCIÓN 2: Usar Flexible/Expanded para el botón
            // Esto asegura que el botón se comprima si es necesario.
            // Usamos SizedBox con un ancho fijo en el icono para que el Flexible afecte el texto.
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: widget.isTraining || _isLoadingChart ? null : widget.onTrainModel,
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (widget.isTraining)
                          const SizedBox(
                            width: 16, height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                          )
                        else
                          const Icon(LucideIcons.repeat, color: Colors.white, size: 16),
                        const SizedBox(width: 6),
                        // El texto dentro del Row interno puede ser Fixed o usar FittedBox
                        FittedBox( 
                          fit: BoxFit.scaleDown,
                          child: Text(
                            widget.isTraining ? 'Entrenando...' : 'Re-entrenar',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                            maxLines: 1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        // --- El resto de tu código sin cambios mayores ---
        const SizedBox(height: 16),

        // --- Rango de Fechas ---
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            const Text('Ver:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            // Aseguramos que los ChoiceChip estén bien formateados (se ven bien en tu imagen)
            ...[30, 90, 180, 365].map((dias) => ChoiceChip(
              label: Text(
                dias == 30 ? '30 Días' :
                dias == 90 ? '3 Meses' :
                dias == 180 ? '6 Meses' : '1 Año',
              ),
              selected: _diasAPredecir == dias,
              onSelected: (selected) {
                if (selected) _setRange(dias);
              },
            )),
          ],
        ),
        const Divider(height: 24),

        // --- Alerta de Error ---
        if (_message.isNotEmpty && _messageType == 'error')
          Padding(
            padding: const EdgeInsets.only(bottom: 16.0),
            child: AlertMessage(msg: _message, type: 'error'),
          ),

        // --- Gráfico ---
        // El widget _buildAreaChart está dentro de un SizedBox con altura fija, lo cual es correcto.
        SizedBox(
          height: 300,
          child: _isLoadingChart || widget.isTraining
              ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [const CircularProgressIndicator(), const SizedBox(height: 8), Text(_message)]))
              : _predicciones.isEmpty
                  ? const Center(child: Text('No hay datos de predicción para mostrar.'))
                  : _buildAreaChart(),
        ),
        
        // --- Tabla de Datos ---
        const SizedBox(height: 16),
        Text('Datos Detallados', style: Theme.of(context).textTheme.titleLarge),
        _buildDataTable(),
      ],
    );
  }

  Widget _buildAreaChart() {
    final spots = _predicciones.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value.prediccionTotalBs);
    }).toList();

    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: FlTitlesData(
          show: true,
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 30,
              // Ajuste de intervalo para manejar diferentes rangos de días
              interval: _predicciones.length > 5 ? (_predicciones.length / 4).floor().toDouble() : 1.0, 
              getTitlesWidget: (value, meta) {
                final index = value.toInt();
                if (index < 0 || index >= _predicciones.length) return const SizedBox();
                final dateParts = _predicciones[index].fecha.split('-');
                if (dateParts.length < 3) return const SizedBox();
                return Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text('${dateParts[1]}-${dateParts[2]}', style: const TextStyle(fontSize: 10)),
                );
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 70, 
              getTitlesWidget: (value, meta) {
                return Text(formatPrice(value), style: const TextStyle(fontSize: 10));
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: Theme.of(context).primaryColor,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                colors: [
                  Theme.of(context).primaryColor.withOpacity(0.5),
                  Theme.of(context).primaryColor.withOpacity(0.0),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDataTable() {
    // ❗️❗️ CORRECCIÓN 3: Envuelve el DataTable en SingleChildScrollView
    // para prevenir overflow si la tabla es más ancha que la pantalla.
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columns: const [
          DataColumn(label: Text('Periodo')),
          DataColumn(label: Text('Ventas Previstas'), numeric: true),
        ],
        rows: _predicciones.map((p) => DataRow(
          cells: [
            DataCell(Text(p.fecha)),
            DataCell(Text(formatPrice(p.prediccionTotalBs))),
          ],
        )).toList(),
      ),
    );
  }
}