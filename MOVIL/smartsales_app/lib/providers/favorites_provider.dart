import 'dart:collection';
import 'package:flutter/material.dart';
import 'package:smartsales_app/services/favorites_service.dart';
import 'auth_provider.dart';

class FavoritesProvider extends ChangeNotifier {
  final FavoritesService _service = const FavoritesService();
  AuthProvider? _auth;

  Set<int> _favoriteIds = HashSet<int>();
  bool _isLoading = false;

  // Getters públicos
  bool get isLoadingFavorites => _isLoading;
  Set<int> get favoriteIds => UnmodifiableSetView(_favoriteIds);

  /// Comprueba si un producto es favorito (búsqueda rápida)
  bool isFavorite(int productoId) {
    return _favoriteIds.contains(productoId);
  }

  // Vinculación con AuthProvider
  void updateAuth(AuthProvider auth) {
    _auth = auth;
    if (_auth?.token != null) {
      fetchFavorites();
    } else {
      // Logout
      _favoriteIds = HashSet<int>();
      notifyListeners();
    }
  }

  String? get _token => _auth?.token;

  Future<void> fetchFavorites() async {
    if (_token == null) return;
    _isLoading = true;
    notifyListeners();

    try {
      final favoritesList = await _service.getFavoritos(_token!);
      // Extraemos solo los IDs, igual que en React
      _favoriteIds = HashSet<int>.from(
        favoritesList.map((fav) => fav.product.id),
      );
    } catch (e) {
      // Manejar error (ej. mostrar toast)
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Añade o quita un favorito (con Actualización Optimista)
  Future<void> toggleFavorite(int productoId) async {
    if (_token == null) return; // O mostrar toast de "iniciar sesión"

    final bool isCurrentlyFavorite = _favoriteIds.contains(productoId);

    // 1. Actualización Optimista (UI instantánea)
    if (isCurrentlyFavorite) {
      _favoriteIds.remove(productoId);
    } else {
      _favoriteIds.add(productoId);
    }
    notifyListeners();

    // 2. Llamada a la API en segundo plano
    try {
      await _service.toggleFavoritoStatus(_token!, productoId);
      // Éxito: no hacemos nada, la UI ya está actualizada.
    } catch (e) {
      // 3. Revertir si la API falla
      if (isCurrentlyFavorite) {
        _favoriteIds.add(productoId); // Vuelve a añadirlo
      } else {
        _favoriteIds.remove(productoId); // Vuelve a quitarlo
      }
      notifyListeners();
      // Opcional: Mostrar un toast de error
    }
  }
}