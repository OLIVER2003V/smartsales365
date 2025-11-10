// lib/screens/admin/dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/models/kpi_model.dart';
import 'package:smartsales_app/models/baja_rotacion_model.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/services/analitica_service.dart';
import 'package:smartsales_app/services/pdf_service.dart'; // ❗️ IMPORTA EL NUEVO SERVICIO
import 'package:smartsales_app/theme/app_theme.dart';

import 'package:smartsales_app/widgets/admin/dashboard/kpi_card.dart';
import 'package:smartsales_app/widgets/admin/dashboard/tab_button.dart';
import 'package:smartsales_app/widgets/admin/dashboard/alert_message.dart';
import 'package:smartsales_app/widgets/admin/dashboard/vista_historico.dart';
import 'package:smartsales_app/widgets/admin/dashboard/vista_futuro.dart';
import 'package:smartsales_app/utils/formatters.dart';
import 'package:share_plus/share_plus.dart'; // Importa share_plus

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final AnaliticaService _analiticaService = AnaliticaService(); // Renombrado para claridad
  final PdfService _pdfService = PdfService(); // ❗️ INSTANCIA DEL SERVICIO PDF
  String? _token;

  KpiModel? _kpis;
  List<BajaRotacionProducto>? _bajaRotacion;
  bool _isLoadingKpis = true;
  bool _isLoadingBajaRotacion = true;
  bool _isTraining = false;
  String _message = '';
  String _messageType = 'info';
  String _vistaActiva = 'historico';

  @override
  void initState() {
    super.initState();
    _checkRoleAndFetch();
  }

  Future<void> _checkRoleAndFetch() async {
    final auth = context.read<AuthProvider>();
    if (auth.user?.rol != 'ADM' && auth.user?.rol != 'VEN') {
      Navigator.of(context).pop();
      return;
    }
    _token = auth.token;
    _loadKpis();
    _loadBajaRotacion();
  }

  Future<void> _loadKpis() async {
    if (_token == null) return;
    setState(() => _isLoadingKpis = true);
    try {
      final kpisData = await _analiticaService.getDashboardKPIs(_token!);
      setState(() => _kpis = kpisData);
    } catch (e) {
      _showMessage(e.toString(), isError: true);
    } finally {
      setState(() => _isLoadingKpis = false);
    }
  }

  Future<void> _loadBajaRotacion() async {
    if (_token == null) return;
    setState(() => _isLoadingBajaRotacion = true);
    try {
      final data = await _analiticaService.getProductosBajaRotacion(_token!);
      setState(() => _bajaRotacion = data);
    } catch (e) {
      print(e);
      _showMessage('Error al cargar productos de baja rotación: $e', isError: true);
    } finally {
      setState(() => _isLoadingBajaRotacion = false);
    }
  }
  
  void _showMessage(String msg, {bool isError = false}) {
    setState(() {
      _message = msg.replaceAll('Exception: ', ''); // Limpia el mensaje
      _messageType = isError ? 'error' : 'success';
    });
  }

  Future<void> _handleTrainModel() async {
    if (_token == null) return;
    setState(() {
      _isTraining = true;
      _message = 'Iniciando re-entrenamiento del modelo...';
      _messageType = 'info';
    });
    try {
      final result = await _analiticaService.triggerModelTraining(_token!);
      _showMessage(result['message'] ?? 'Modelo re-entrenado', isError: false);
    } catch (e) {
      _showMessage(e.toString(), isError: true);
    } finally {
      setState(() => _isTraining = false);
    }
  }

  // ❗️ FUNCIÓN PARA GENERAR Y COMPARTIR PDF
  Future<void> _generateAndSharePdf() async {
    if (_kpis == null || _bajaRotacion == null || _token == null) {
      _showMessage('Datos incompletos para generar el PDF.', isError: true);
      return;
    }

    setState(() {
      _message = 'Generando reporte PDF...';
      _messageType = 'info';
    });

    try {
      final auth = context.read<AuthProvider>();
      final userName = auth.user?.firstName ?? 'Usuario Desconocido';

      await _pdfService.generateAndShareDashboardPdf(
        kpis: _kpis!,
        bajaRotacion: _bajaRotacion!,
        userName: userName,
      );
      _showMessage('Reporte PDF generado y listo para compartir.', isError: false);
    } catch (e) {
      _showMessage('Error al generar o compartir el PDF: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    if (user?.rol != 'ADM' && user?.rol != 'VEN') {
      return const Scaffold(body: Center(child: Text('Acceso Denegado')));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard de Analíticas'),
        actions: [
          // ❗️ BOTÓN PARA DESCARGAR PDF
          IconButton(
            icon: const Icon(LucideIcons.download),
            onPressed: (_kpis != null && _bajaRotacion != null && !_isLoadingKpis && !_isLoadingBajaRotacion)
                ? _generateAndSharePdf
                : null, // Deshabilita si no hay datos o están cargando
            tooltip: 'Descargar Reporte PDF',
          ),
        ],
      ),
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- KPIs ---
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.6, 
              children: [
                KpiCard(
                  title: 'Ventas Totales',
                  value: _kpis != null ? formatPrice(_kpis!.totalHistoricoBs) : '...',
                  icon: LucideIcons.dollarSign,
                  isLoading: _isLoadingKpis,
                ),
                KpiCard(
                  title: 'Ventas de Hoy',
                  value: _kpis != null ? formatPrice(_kpis!.totalHoyBs) : '...',
                  icon: LucideIcons.calendar,
                  isLoading: _isLoadingKpis,
                ),
                KpiCard(
                  title: 'Productos Activos',
                  value: _kpis != null ? _kpis!.totalProductos.toString() : '...',
                  icon: LucideIcons.box,
                  isLoading: _isLoadingKpis,
                ),
                KpiCard(
                  title: 'Órdenes Entregadas',
                  value: _kpis != null ? _kpis!.totalOrdenes.toString() : '...',
                  icon: LucideIcons.list,
                  isLoading: _isLoadingKpis,
                ),
              ],
            ),
            const SizedBox(height: 16),

            // --- Alertas ---
            if (_message.isNotEmpty && (_isTraining || _messageType != 'info'))
              AlertMessage(msg: _message, type: _messageType),

            // --- Contenedor Principal con Pestañas ---
            const SizedBox(height: 16),
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              clipBehavior: Clip.antiAlias,
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    // --- Pestañas (Tabs) ---
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TabButton(
                              label: 'Histórico',
                              icon: LucideIcons.history,
                              isActive: _vistaActiva == 'historico',
                              onTap: () => setState(() => _vistaActiva = 'historico'),
                            ),
                          ),
                          Expanded(
                            child: TabButton(
                              label: 'Predicción',
                              icon: LucideIcons.chartBar,
                              isActive: _vistaActiva == 'futuro',
                              onTap: () => setState(() => _vistaActiva = 'futuro'),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // --- Contenido de la Pestaña ---
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      child: _vistaActiva == 'historico'
                          ? VistaHistorico(
                              key: const ValueKey('historico'),
                              kpis: _kpis,
                              bajaRotacionData: _bajaRotacion,
                              bajaRotacionLoading: _isLoadingBajaRotacion,
                            )
                          : VistaFuturo(
                              key: const ValueKey('futuro'),
                              kpis: _kpis,
                              isTraining: _isTraining,
                              onTrainModel: _handleTrainModel,
                              // Asegúrate de pasar el token real a VistaFuturo
                              token: _token!, 
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}