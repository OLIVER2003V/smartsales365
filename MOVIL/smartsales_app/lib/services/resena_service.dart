// lib/services/resena_service.dart
import 'package:dio/dio.dart';
import 'package:smartsales_app/services/api_config.dart'; // Usamos ApiConfig consistente
import 'package:flutter/foundation.dart'; // Para kDebugMode y print

// Modelo de datos simple para la reseña que espera el backend
class ResenaData {
  final int productoId;
  final int calificacion;
  final String titulo;
  final String comentario;

  ResenaData({
    required this.productoId,
    required this.calificacion,
    required this.titulo,
    required this.comentario,
  });

  Map<String, dynamic> toJson() => {
    'producto': productoId,
    'calificacion': calificacion,
    'titulo': titulo,
    'comentario': comentario,
  };
}

class ResenaService {
  final Dio _dio = Dio();

  Options _getAuthConfig(String token) {
    return Options(
      headers: {
        'Authorization': 'Token $token',
        'Content-Type': 'application/json',
      },
    );
  }

  /// (GET /api/resenas/)
  /// Obtiene las reseñas del usuario logueado.
  Future<List<Map<String, dynamic>>> getResenasDelUsuario(String token) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/resenas/',
        options: _getAuthConfig(token),
      );
      // Asumimos que el backend retorna una lista de JSONs de reseñas del usuario.
      List<dynamic> data = response.data;
      return data.cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      // Manejo de errores consistente con promocion_service
      if (kDebugMode) print('Error de Dio en getResenasDelUsuario: ${e.response?.data}');
      throw Exception('Error al cargar reseñas: ${e.response?.data?['detail'] ?? e.message}');
    } catch (e) {
      if (kDebugMode) print('Error genérico en getResenasDelUsuario: $e');
      throw Exception('Error al cargar reseñas');
    }
  }

  /// (POST /api/resenas/)
  /// Crea una nueva reseña para un producto (requiere token de Cliente).
  Future<Map<String, dynamic>> createResena(String token, ResenaData data) async {
    try {
      final response = await _dio.post(
        '${ApiConfig.baseUrl}/api/resenas/',
        data: data.toJson(),
        options: _getAuthConfig(token),
      );
      // Retornamos la reseña creada
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      // Manejo de errores consistente con promocion_service
      if (kDebugMode) print('Error de Dio en createResena: ${e.response?.data}');
      
      // Intentar obtener un mensaje de error detallado del backend
      String errorMessage = 'No se pudo enviar la reseña.';
      final responseData = e.response?.data;

      if (responseData is Map && responseData.containsKey('detail')) {
          errorMessage = responseData['detail'].toString();
      } else if (responseData is Map) {
          // Si el backend devuelve errores de validación de campo (ej. {'titulo': ['Este campo es requerido']})
          errorMessage = responseData.values.map((v) => v.toString().replaceAll('[', '').replaceAll(']', '')).join('; ');
      } else if (e.message != null) {
          errorMessage = e.message!;
      }

      throw Exception(errorMessage);
    } catch (e) {
      if (kDebugMode) print('Error genérico en createResena: $e');
      throw Exception('Error al crear la reseña');
    }
  }
}