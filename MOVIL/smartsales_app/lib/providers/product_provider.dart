import 'package:flutter/material.dart';
import 'package:smartsales_app/models/product_model.dart';
import 'package:smartsales_app/services/product_service.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'dart:collection';

// --- Definimos los modos de orden ---
enum SortOrder {
  relevance,
  priceAsc,
  priceDesc,
  nameAsc,
}

class ProductProvider with ChangeNotifier {
  final ProductService _productService = ProductService();
  AuthProvider? _auth;

  List<Product> _allProducts = []; // <-- Lista maestra
  bool _isLoading = false;
  String? _errorMessage;

  // --- ESTADO DE LOS FILTROS ---
  String _searchTerm = '';
  String _category = 'all'; // 'all' es el valor por defecto
  SortOrder _sortOrder = SortOrder.relevance;

  // --- Getters públicos ---
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // ❗️ GETTERS PÚBLICOS PARA LOS FILTROS ❗️
  // (Para que la UI pueda LEER los valores actuales)
  String get searchTerm => _searchTerm;
  String get category => _category;
  SortOrder get sortOrder => _sortOrder;

  // --- GETTER DE CATEGORÍAS (como el useMemo de React) ---
  List<String> get categories {
    final catSet = HashSet<String>();
    for (var p in _allProducts) {
      if (p.categoria != null && p.categoria!.isNotEmpty) {
        catSet.add(p.categoria!);
      }
    }
    // ❗️ Lógica corregida: Añade 'all' y ordénala primero
    catSet.add('all');
    final sortedList = catSet.toList()
      ..sort((a, b) => a == 'all' ? -1 : a.compareTo(b));
    return sortedList;
  }

  // --- GETTER DE PRODUCTOS PROCESADOS (como el useMemo de React) ---
  List<Product> get processedProducts {
    List<Product> filtered = [..._allProducts];

    // 3.1. Filtrar por Categoría
    if (_category != 'all') {
      filtered = filtered.where((p) => p.categoria == _category).toList();
    }

    // 3.2. Filtrar por Búsqueda
    final lowerSearch = _searchTerm.toLowerCase();
    if (lowerSearch.isNotEmpty) {
      filtered = filtered.where((p) {
        return p.nombre.toLowerCase().contains(lowerSearch) ||
            p.marca.toLowerCase().contains(lowerSearch) ||
            (p.modelo != null && p.modelo!.toLowerCase().contains(lowerSearch));
      }).toList();
    }

    // 3.3. Ordenar
    switch (_sortOrder) {
      case SortOrder.priceAsc:
        filtered.sort((a, b) => a.precioFinal.compareTo(b.precioFinal));
        break;
      case SortOrder.priceDesc:
        filtered.sort((a, b) => b.precioFinal.compareTo(a.precioFinal));
        break;
      case SortOrder.nameAsc:
        filtered.sort((a, b) => a.nombre.compareTo(b.nombre));
        break;
      case SortOrder.relevance:
      default:
        // El orden por defecto ya está (el de la API)
        break;
    }
    return filtered;
  }

  String? get _token => _auth?.token;

  void updateAuth(AuthProvider auth) {
    _auth = auth;
    if (_auth?.token != null && _allProducts.isEmpty) {
      loadProducts();
    } else if (_auth?.token == null) {
      _allProducts = [];
      _errorMessage = null;
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- SETTERS PÚBLICOS PARA LOS FILTROS ---
  // (Llamados por los widgets de la UI)

  void setSearchTerm(String term) {
    _searchTerm = term;
    notifyListeners();
  }

  void setCategory(String category) {
    _category = category;
    notifyListeners();
  }

  void setSortOrder(SortOrder order) {
    _sortOrder = order;
    notifyListeners();
  }

  Future<void> loadProducts() async {
    if (_isLoading) return;
    if (_token == null) {
      _errorMessage = 'No hay token de autenticación.';
      notifyListeners();
      return;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _allProducts = await _productService.getProducts(_token!);
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      _allProducts = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}