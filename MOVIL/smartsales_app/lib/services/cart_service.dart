import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';
import '../models/cart_models.dart';

class CartService {
  const CartService();

  Map<String, String> _authHeaders(String token) => {
        'Authorization': 'Token $token',
        'Content-Type': 'application/json',
      };

  Future<CartSummary> getCart(String token) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/carrito/');
    final resp = await http.get(uri, headers: _authHeaders(token));
    if (resp.statusCode == 200) {
      final data = jsonDecode(utf8.decode(resp.bodyBytes));
      return CartSummary.fromJson(data);
    }
    throw Exception('Error al cargar carrito');
  }

  Future<CartSummary> addItemToCart(
      String token, int productoId, int cantidad) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/carrito/add-item/');
    final resp = await http.post(
      uri,
      headers: _authHeaders(token),
      body: jsonEncode({'producto_id': productoId, 'cantidad': cantidad}),
    );
    if (resp.statusCode == 200) {
      final data = jsonDecode(utf8.decode(resp.bodyBytes));
      return CartSummary.fromJson(data);
    }
    throw Exception('Error al añadir ítem');
  }

  Future<CartSummary> updateItemQuantity(
      String token, int productoId, int cantidad) async {
    final uri =
        Uri.parse('${ApiConfig.baseUrl}/api/carrito/update-quantity/');
    final resp = await http.post(
      uri,
      headers: _authHeaders(token),
      body: jsonEncode({'producto_id': productoId, 'cantidad': cantidad}),
    );
    if (resp.statusCode == 200) {
      final data = jsonDecode(utf8.decode(resp.bodyBytes));
      return CartSummary.fromJson(data);
    }
    throw Exception('Error al actualizar cantidad');
  }

  Future<CartSummary> removeItemFromCart(String token, int productoId) async {
    final uri =
        Uri.parse('${ApiConfig.baseUrl}/api/carrito/remove-item/');
    final resp = await http.post(
      uri,
      headers: _authHeaders(token),
      body: jsonEncode({'producto_id': productoId}),
    );
    if (resp.statusCode == 200) {
      final data = jsonDecode(utf8.decode(resp.bodyBytes));
      return CartSummary.fromJson(data);
    }
    throw Exception('Error al eliminar ítem');
  }

  Future<CartSummary> clearCart(String token) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/carrito/clear/');
    final resp = await http.post(
      uri,
      headers: _authHeaders(token),
      body: jsonEncode({}),
    );
    if (resp.statusCode == 200) {
      final data = jsonDecode(utf8.decode(resp.bodyBytes));
      return CartSummary.fromJson(data);
    }
    throw Exception('Error al vaciar carrito');
  }

  Future<CartSummary> sendCartCommand(String token, String comando) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/carrito/command/');
    final resp = await http.post(
      uri,
      headers: _authHeaders(token),
      body: jsonEncode({'comando': comando}),
    );
    if (resp.statusCode == 200) {
      final data = jsonDecode(utf8.decode(resp.bodyBytes));
      return CartSummary.fromJson(data);
    }
    throw Exception('Error al procesar comando');
  }
}
