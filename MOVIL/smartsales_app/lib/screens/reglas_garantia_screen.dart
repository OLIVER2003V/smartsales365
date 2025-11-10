// lib/screens/reglas_garantia_screen.dart
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class ReglasGarantiaScreen extends StatelessWidget {
  const ReglasGarantiaScreen({super.key});

  // Helper para lanzar emails
  void _launchEmail() async {
    final Uri emailLaunchUri = Uri(
      scheme: 'mailto',
      path: 'soporte@smartsales365.com',
      queryParameters: {'subject': 'Reclamo de Garantía'},
    );
    
    if (await canLaunchUrl(emailLaunchUri)) {
      await launchUrl(emailLaunchUri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final linkStyle = TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.w500);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reglas de Garantía'),
      ),
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Encabezado
                  Row(
                    children: [
                      Icon(LucideIcons.shieldCheck, color: Theme.of(context).primaryColor, size: 32),
                      const SizedBox(width: 12),
                      Text('Política de Garantía', style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const Divider(height: 24),
                  
                  const Text(
                    'Bienvenido a la política de garantía de SmartSales365. Nos comprometemos a ofrecer productos de alta calidad y un servicio postventa confiable.',
                    style: TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 20),

                  // 1. Cobertura
                  _buildHeader(context, icon: LucideIcons.bookOpen, title: '1. Cobertura General'),
                  const Text(
                    'Todos los productos vendidos por SmartSales365 están cubiertos por una garantía estándar contra defectos de fabricación. El período de garantía se especifica en la descripción de cada producto (ej. 12, 24 meses) y comienza en la fecha de la compra, tal como figura en su comprobante.',
                    style: TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 20),

                  // 2. Exclusiones
                  _buildHeader(context, icon: LucideIcons.triangleAlert, title: '2. Exclusiones de la Garantía'),
                  const Text('Esta garantía no cubre:', style: TextStyle(fontSize: 16)),
                  _buildBulletPoint('Daños causados por mal uso, negligencia, accidentes o desastres naturales.'),
                  _buildBulletPoint('Daños causados por sobrevoltajes eléctricos o fluctuaciones de energía.'),
                  _buildBulletPoint('Productos que hayan sido abiertos, reparados o modificados por personal no autorizado.'),
                  _buildBulletPoint('Desgaste normal del producto (ej. baterías, filtros).'),
                  _buildBulletPoint('Daños cosméticos (rayones, abolladuras) que no afecten la funcionalidad.'),
                  const SizedBox(height: 20),
                  
                  // 3. Cómo Reclamar
                  _buildHeader(context, icon: LucideIcons.workflow, title: '3. Cómo Reclamar su Garantía'),
                  const Text('Para hacer un reclamo, siga estos pasos:', style: TextStyle(fontSize: 16)),
                  
                  _buildNumberedPoint(
                    '1.',
                    RichText(
                      text: TextSpan(
                        style: textTheme.bodyLarge,
                        children: [
                          const TextSpan(text: 'Verifique su Código: Use nuestra página de '),
                          TextSpan(
                            text: 'Consulta de Garantía',
                            style: linkStyle,
                            recognizer: TapGestureRecognizer()..onTap = () {
                              Navigator.of(context).pop();
                            },
                          ),
                          const TextSpan(text: ' para verificar que su producto esté dentro del período de cobertura.'),
                        ],
                      ),
                    ),
                  ),
                  _buildNumberedPoint(
                    '2.',
                    RichText(
                      text: TextSpan(
                        style: textTheme.bodyLarge,
                        children: [
                          const TextSpan(text: 'Contacte a Soporte: Envíe un correo a '),
                          TextSpan(
                            text: 'soporte@smartsales365.com',
                            style: linkStyle,
                            recognizer: TapGestureRecognizer()..onTap = _launchEmail,
                          ),
                          const TextSpan(text: ' con su código de garantía y comprobante.'),
                        ],
                      ),
                    ),
                  ),
                  _buildNumberedPoint('3.', const Text('Evaluación: Nuestro equipo técnico evaluará el caso. Es posible que se le solicite enviar el producto a nuestro centro de servicio.')),
                  const SizedBox(height: 20),
                  
                  // 4. Resolución
                  _buildHeader(context, icon: LucideIcons.squareCheck, title: '4. Resolución'),
                  const Text('Una vez aprobado el reclamo, SmartSales365 se reserva el derecho de:', style: TextStyle(fontSize: 16)),
                  _buildBulletPoint('Reparar el producto defectuoso.'),
                  _buildBulletPoint('Reemplazar el producto por una unidad nueva o reacondicionada equivalente.'),
                  _buildBulletPoint('Emitir una nota de crédito por el valor del producto, si la reparación o reemplazo no es posible.'),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Helper para títulos (h2)
  Widget _buildHeader(BuildContext context, {required IconData icon, required String title}) {
    return Padding(
      padding: const EdgeInsets.only(top: 8.0, bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start, // Alinea al inicio
        children: [
          Icon(icon, size: 20, color: Colors.black87),
          const SizedBox(width: 8),
          
          // ❗️❗️ LA CORRECCIÓN ❗️❗️
          // Envolvemos el Text en Expanded para que sepa cómo romperse
          Expanded(
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // Helper para viñetas (ul > li)
  Widget _buildBulletPoint(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 8.0, top: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 16))),
        ],
      ),
    );
  }
  
  // Helper para lista numerada (ol > li)
  Widget _buildNumberedPoint(String number, Widget content) {
    return Padding(
      padding: const EdgeInsets.only(left: 8.0, top: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$number ', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          Expanded(child: content),
        ],
      ),
    );
  }
}