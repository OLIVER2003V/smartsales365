// lib/services/category_service.dart
import 'package:dio/dio.dart';
import 'package:smartsales_app/models/categoria_model.dart';
import 'api_config.dart';

class CategoryService {
  final Dio _dio = Dio();

  Options _getAuthConfig(String token) {
    return Options(headers: {'Authorization': 'Token $token'});
  }

  /// Asume una ruta de API para obtener categorías
  Future<List<Categoria>> getCategorias(String token) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/categorias/', // Ajusta esta ruta si es diferente
        options: _getAuthConfig(token),
      );
      List<dynamic> data = response.data;
      return data.map((json) => Categoria.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al cargar categorías');
    }
  }
}