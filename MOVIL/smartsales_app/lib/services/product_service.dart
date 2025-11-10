// lib/services/product_service.dart

import 'dart:convert';
import 'package:http/http.dart' as http;

import 'package:smartsales_app/models/product_model.dart';
import 'package:smartsales_app/services/api_config.dart';

class ProductService {
  final String _productsUrl = '${ApiConfig.baseUrl}/api/productos/';

  /// Lista todos los productos visibles en el catálogo
  Future<List<Product>> getProducts(String token) async {
    final url = Uri.parse(_productsUrl);

    // Descomenta si quieres ver en consola:
    // print('[ProductService] GET $url');

    final response = await http.get(
      url,
      headers: ApiConfig.getAuthHeaders(token),
    );

    // print('[ProductService] statusCode: ${response.statusCode}');

    if (response.statusCode == 200) {
      // 1. Decodifica la respuesta sin asumir su tipo
      final dynamic decodedData =
          json.decode(utf8.decode(response.bodyBytes));

      List<dynamic> jsonList;

      // 2. Respuesta paginada tipo DRF: { "count": X, "results": [ ... ] }
      if (decodedData is Map<String, dynamic> &&
          decodedData.containsKey('results')) {
        jsonList = decodedData['results'];
      }
      // 3. Lista simple: [ {...}, {...} ]
      else if (decodedData is List) {
        jsonList = decodedData;
      }
      // 4. Formato inesperado
      else {
        throw Exception(
          'El formato de la respuesta de productos es desconocido.',
        );
      }

      // 5. Mapeo a modelo Product
      final products = jsonList
          .map((json) => Product.fromJson(json as Map<String, dynamic>))
          .toList();

      // print('[ProductService] productos parseados: ${products.length}');
      return products;
    } else if (response.statusCode == 401) {
      // Manejo de token expirado o no autorizado
      throw Exception('Sesión expirada o no autorizado.');
    } else {
      // Intentamos parsear el cuerpo de error, pero sin romper si no es JSON
      dynamic errorBody;
      try {
        errorBody = json.decode(utf8.decode(response.bodyBytes));
      } catch (_) {
        errorBody = null;
      }

      final detail = (errorBody is Map && errorBody['detail'] != null)
          ? errorBody['detail']
          : response.reasonPhrase;

      throw Exception('Error al cargar productos: $detail');
    }
  }

  /// Obtiene un producto por ID (detalle)
  Future<Product> getProductById(String token, int id) async {
    final url = Uri.parse('$_productsUrl$id/');

    final response = await http.get(
      url,
      headers: ApiConfig.getAuthHeaders(token),
    );

    if (response.statusCode == 200) {
      return Product.fromJson(
        json.decode(utf8.decode(response.bodyBytes)),
      );
    } else if (response.statusCode == 404) {
      throw Exception('Producto no encontrado.');
    } else {
      throw Exception(
        'Error al obtener producto: ${response.reasonPhrase}',
      );
    }
  }
}
