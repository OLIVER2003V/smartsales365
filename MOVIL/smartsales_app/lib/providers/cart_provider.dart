import 'package:flutter/material.dart';
import '../models/cart_models.dart';
import '../models/product_model.dart';
import '../services/cart_service.dart';
import 'auth_provider.dart';

class CartProvider extends ChangeNotifier {
  final CartService _cartService = const CartService();
  AuthProvider? _auth;

  List<CartItemModel> _items = [];
  double _cartTotal = 0;
  int _itemCount = 0;
  bool _loading = false;

  List<CartItemModel> get items => _items;
  double get cartTotal => _cartTotal;
  int get itemCount => _itemCount;
  bool get loading => _loading;

  void updateAuth(AuthProvider auth) {
    _auth = auth;
    // cuando hay login/logout recargamos carrito
    if (_auth?.token != null) {
      fetchCart();
    } else {
      _items = [];
      _cartTotal = 0;
      _itemCount = 0;
      notifyListeners();
    }
  }

  String? get _token => _auth?.token;

  Future<void> fetchCart() async {
    if (_token == null) return;
    _loading = true;
    notifyListeners();
    try {
      final summary = await _cartService.getCart(_token!);
      _applySummary(summary);
    } catch (_) {
      // podrías propagar error si quieres
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void _applySummary(CartSummary summary) {
    _items = summary.items;
    _cartTotal = summary.subtotal;
    _itemCount = summary.totalItems;
  }

  /// 🔢 Cantidad de UN producto en el carrito
  int getQuantityInCart(int productoId) {
    try {
      // Ajusta 'cantidad' por 'quantity' si tu modelo usa ese nombre
      return _items
          .firstWhere((item) => item.producto.id == productoId)
          .cantidad;
    } catch (_) {
      return 0;
    }
  }

  Future<void> addToCart(Product product, {int cantidad = 1}) async {
    if (_token == null) return;
    _loading = true;
    notifyListeners();
    try {
      final summary =
          await _cartService.addItemToCart(_token!, product.id, cantidad);
      _applySummary(summary);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> updateQuantity(int productoId, int nuevaCantidad) async {
    if (_token == null) return;
    _loading = true;
    notifyListeners();
    try {
      final summary = await _cartService.updateItemQuantity(
          _token!, productoId, nuevaCantidad);
      _applySummary(summary);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> removeFromCart(int productoId) async {
    if (_token == null) return;
    _loading = true;
    notifyListeners();
    try {
      final summary =
          await _cartService.removeItemFromCart(_token!, productoId);
      _applySummary(summary);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> clearCart() async {
    if (_token == null) return;
    _loading = true;
    notifyListeners();
    try {
      final summary = await _cartService.clearCart(_token!);
      _applySummary(summary);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<String?> sendCartCommand(String comando) async {
    if (_token == null) return null;
    _loading = true;
    notifyListeners();
    try {
      final summary = await _cartService.sendCartCommand(_token!, comando);
      _applySummary(summary);
      return summary.mensajeConfirmacion;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
