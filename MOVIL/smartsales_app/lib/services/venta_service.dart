import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:smartsales_app/models/venta_model.dart';
import 'package:smartsales_app/services/api_config.dart';

class VentaService {
  final Dio _dio = Dio();

  Options _getAuthConfig(String token) {
    return Options(
      headers: {
        'Authorization': 'Token $token',
        'Content-Type': 'application/json',
      },
    );
  }

  /// (POST /api/create-payment-intent/)
  /// Crea el PaymentIntent y devuelve el clientSecret.
  Future<String> createPaymentIntent(String token, List<Map<String, dynamic>> items, Map<String, dynamic>? clienteNuevo) async {
    final payload = {
      'items': items,
      if (clienteNuevo != null) 'cliente_nuevo': clienteNuevo,
    };
    
    try {
      final response = await _dio.post(
        '${ApiConfig.baseUrl}/api/create-payment-intent/',
        data: jsonEncode(payload),
        options: _getAuthConfig(token),
      );
      return response.data['clientSecret'];
    } on DioException catch (e) {
      throw Exception(e.response?.data['error'] ?? 'Error al crear la intención de pago');
    }
  }

  /// (POST /api/ventas/)
  /// Crea la venta final después del pago.
  Future<Venta> createVenta(String token, List<Map<String, dynamic>> detalles, Map<String, dynamic>? clienteNuevo) async {
    final payload = {
      'detalles': detalles,
      if (clienteNuevo != null) 'cliente_nuevo': clienteNuevo,
    };

    try {
      final response = await _dio.post(
        '${ApiConfig.baseUrl}/api/ventas/',
        data: jsonEncode(payload),
        options: _getAuthConfig(token),
      );
      return Venta.fromJson(response.data);
    } on DioException catch (e) {
      throw Exception(e.response?.data['error'] ?? 'Error al registrar la venta');
    }
  }

  /// (GET /api/ventas/)
  /// Obtiene el historial de ventas del cliente.
  Future<List<Venta>> getVentas(String token) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/ventas/',
        options: _getAuthConfig(token),
      );
      List<dynamic> data = response.data;
      return data.map((v) => Venta.fromJson(v)).toList();
    } catch (e) {
      throw Exception('Error al cargar el historial de ventas');
    }
  }

  /// (GET /api/ventas/{id}/)
  /// Obtiene una venta específica.
  Future<Venta> getVentaById(String token, int ventaId) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/ventas/$ventaId/',
        options: _getAuthConfig(token),
      );
      return Venta.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al cargar los detalles de la venta');
    }
  }

  /// (GET /api/ventas/{id}/comprobante/)
  /// Descarga el PDF. Devuelve la ruta del archivo guardado.
  Future<List<int>> descargarComprobante(String token, int ventaId) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/ventas/$ventaId/comprobante/',
        options: Options(
          headers: {'Authorization': 'Token $token'},
          responseType: ResponseType.bytes, // ❗️ Pide los bytes (el "blob")
        ),
      );
      return response.data as List<int>;
    } catch (e) {
      throw Exception('Error al descargar el comprobante');
    }
  }
}