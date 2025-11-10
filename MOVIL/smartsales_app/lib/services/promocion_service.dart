// lib/services/promocion_service.dart
import 'package:dio/dio.dart';
import 'package:smartsales_app/models/promocion_model.dart';
import 'api_config.dart';

class PromocionService {
  final Dio _dio = Dio();

  Options _getAuthConfig(String token) {
    return Options(
      headers: {
        'Authorization': 'Token $token',
        'Content-Type': 'application/json',
      },
    );
  }

  /// (GET /api/admin/promociones/)
  Future<List<Promocion>> getPromociones(String token) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/admin/promociones/',
        options: _getAuthConfig(token),
      );
      List<dynamic> data = response.data;
      return data.map((json) => Promocion.fromJson(json)).toList();
    } 
    // ❗️❗️ CORRECCIÓN DE ERROR ❗️❗️
    // Capturamos el error de Dio para ver el mensaje real
    on DioException catch (e) {
      // Esto imprimirá el error real (ej. 404, 403) en tu consola de debug
      print('Error de Dio en getPromociones: ${e.response?.data}');
      throw Exception('Error al cargar promociones: ${e.response?.data?['detail'] ?? e.message}');
    } 
    catch (e) {
      print('Error genérico en getPromociones: $e');
      throw Exception('Error al cargar promociones');
    }
  }

  /// (POST /api/admin/promociones/)
  Future<Promocion> createPromocion(String token, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(
        '${ApiConfig.baseUrl}/api/admin/promociones/',
        data: data,
        options: _getAuthConfig(token),
      );
      return Promocion.fromJson(response.data);
    } on DioException catch (e) {
      print('Error de Dio en createPromocion: ${e.response?.data}');
      throw Exception('Error al crear: ${e.response?.data.toString()}');
    }
  }

  /// (PATCH /api/admin/promociones/{id}/)
  Future<Promocion> updatePromocion(String token, int id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch(
        '${ApiConfig.baseUrl}/api/admin/promociones/$id/',
        data: data,
        options: _getAuthConfig(token),
      );
      return Promocion.fromJson(response.data);
    } on DioException catch (e) {
      print('Error de Dio en updatePromocion: ${e.response?.data}');
      throw Exception('Error al actualizar: ${e.response?.data.toString()}');
    }
  }

  /// (DELETE /api/admin/promociones/{id}/)
  Future<void> deletePromocion(String token, int id) async {
    try {
      await _dio.delete(
        '${ApiConfig.baseUrl}/api/admin/promociones/$id/',
        options: _getAuthConfig(token),
      );
    } on DioException catch (e) {
      print('Error de Dio en deletePromocion: ${e.response?.data}');
      throw Exception('Error al eliminar');
    }
  }
}