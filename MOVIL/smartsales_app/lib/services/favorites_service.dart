import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:smartsales_app/models/product_model.dart';
import 'package:smartsales_app/services/api_config.dart';

// Modelo para el objeto Favorito (basado en tu API de React)
// La API devuelve: { id: 1, producto: { ... } }
class Favorite {
  final int id;
  final Product product;

  Favorite({required this.id, required this.product});

  factory Favorite.fromJson(Map<String, dynamic> json) {
    return Favorite(
      id: json['id'] ?? 0,
      product: Product.fromJson(json['producto'] as Map<String, dynamic>),
    );
  }
}

class FavoritesService {
  const FavoritesService();

  /// Obtiene la lista de IDs de productos favoritos del usuario
  Future<List<Favorite>> getFavoritos(String token) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/favoritos/');
    final resp = await http.get(uri, headers: ApiConfig.getAuthHeaders(token));

    if (resp.statusCode == 200) {
      final List<dynamic> data = jsonDecode(utf8.decode(resp.bodyBytes));
      return data.map((item) => Favorite.fromJson(item)).toList();
    } else {
      throw Exception('Error al cargar favoritos');
    }
  }

  /// Añade o quita un producto de favoritos
  Future<void> toggleFavoritoStatus(String token, int productoId) async {
    final uri = Uri.parse(
        '${ApiConfig.baseUrl}/api/productos/$productoId/toggle-favorito/');
    
    // Usamos POST como en tu API de React
    final resp = await http.post(
      uri,
      headers: ApiConfig.getAuthHeaders(token),
      body: jsonEncode({}), // Cuerpo vacío
    );

    if (resp.statusCode != 200 && resp.statusCode != 201) {
      throw Exception('Error al actualizar favoritos');
    }
    // El backend maneja la lógica, no necesitamos devolver nada
  }
}