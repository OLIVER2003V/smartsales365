// lib/services/pdf_service.dart
import 'dart:io';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:smartsales_app/models/kpi_model.dart';
import 'package:smartsales_app/models/baja_rotacion_model.dart';
import 'package:smartsales_app/utils/formatters.dart';

class PdfService {
  Future<void> generateAndShareDashboardPdf({
    required KpiModel kpis,
    required List<BajaRotacionProducto> bajaRotacion,
    required String userName,
  }) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            pw.Center(
              child: pw.Text(
                'Reporte de Dashboard SmartSales',
                style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.SizedBox(height: 20),
            pw.Text('Generado por: $userName', style: const pw.TextStyle(fontSize: 12)),
            // ❗️ CORRECCIÓN: Tu formatDate espera un String?
            //    y DateTime.now() no es un String.
            //    Usaremos un helper simple de intl para la fecha actual.
            pw.Text('Fecha: ${formatDate(DateTime.now().toIso8601String())}', style: const pw.TextStyle(fontSize: 12)),
            pw.SizedBox(height: 20),

            pw.Header(
              level: 0,
              child: pw.Text('KPIs del Dashboard', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 18)),
            ),
            pw.SizedBox(height: 10),
            pw.Table.fromTextArray(
              headers: ['Métrica', 'Valor'],
              data: [
                ['Ventas Totales', formatPrice(kpis.totalHistoricoBs)],
                ['Ventas de Hoy', formatPrice(kpis.totalHoyBs)],
                ['Productos Activos', kpis.totalProductos.toString()],
                ['Órdenes Entregadas', kpis.totalOrdenes.toString()],
              ],
              border: pw.TableBorder.all(color: PdfColors.grey500),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              cellAlignment: pw.Alignment.centerLeft,
              cellPadding: const pw.EdgeInsets.all(6),
            ),
            pw.SizedBox(height: 20),

            if (bajaRotacion.isNotEmpty) ...[
              pw.Header(
                level: 0,
                child: pw.Text('Productos de Baja Rotación', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 18)),
              ),
              pw.SizedBox(height: 10),
              pw.Table.fromTextArray(
                headers: ['Producto', 'Categoría', 'Última Venta'],
                // ❗️ CORRECCIÓN: Los campos 'categoria' y 'ultimaVenta' ahora existen
                data: bajaRotacion.map((p) => [p.nombre, p.categoria ?? 'N/A', formatDate(p.ultimaVenta)]).toList(),
                border: pw.TableBorder.all(color: PdfColors.grey500),
                headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                cellAlignment: pw.Alignment.centerLeft,
                cellPadding: const pw.EdgeInsets.all(6),
              ),
            ],

            pw.SizedBox(height: 20),
            pw.Text(
              'Este reporte proporciona una vista general de las métricas clave del negocio.',
              style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey600),
            ),
          ];
        },
      ),
    );

    // Guardar el PDF
    final output = await getTemporaryDirectory();
    final file = File('${output.path}/reporte_dashboard.pdf');
    await file.writeAsBytes(await pdf.save());

    // Compartir el PDF
    await Share.shareXFiles([XFile(file.path)], text: 'Reporte de Dashboard SmartSales');
  }
}