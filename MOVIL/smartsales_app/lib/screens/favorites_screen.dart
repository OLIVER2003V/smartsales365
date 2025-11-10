// lib/screens/favorites_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/models/product_model.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/providers/cart_provider.dart';
import 'package:smartsales_app/providers/favorites_provider.dart';
import 'package:smartsales_app/services/favorites_service.dart';
import 'package:smartsales_app/widgets/product_card.dart';
import 'package:smartsales_app/theme/app_theme.dart';
import 'package:smartsales_app/utils/format_price.dart'; // Importa tu helper

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  // Estado local, igual que en React
  List<Favorite> _favoritos = [];
  bool _isLoading = true;
  String? _error;

  // Instancia del servicio para cargar la lista
  final FavoritesService _service = const FavoritesService();

  @override
  void initState() {
    super.initState();
    _fetchFavoritos(isInitialLoad: true);
  }

  // (React: useEffect)
  Future<void> _fetchFavoritos({bool isInitialLoad = false}) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    // Solo muestra el spinner grande en la carga inicial
    if (isInitialLoad) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final data = await _service.getFavoritos(token);
      if (mounted) {
        setState(() {
          _favoritos = data;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'No se pudieron cargar tus productos favoritos.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  // (React: handleAddToCart)
  void _handleAddToCart(Product product) {
    context.read<CartProvider>().addToCart(product, cantidad: 1);
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('"${product.nombre}" añadido al carrito.'),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // (React: handleToggleFavorite)
  void _handleToggleFavorite(int productId) {
    // 1. Llama al provider global (actualización optimista)
    context.read<FavoritesProvider>().toggleFavorite(productId);

    // 2. Actualiza el estado local (para UI instantánea)
    setState(() {
      _favoritos.removeWhere((fav) => fav.product.id == productId);
    });
  }

  @override
  Widget build(BuildContext context) {
    // El AppBar ya lo provee el AppShellScreen
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      // ❗️ 1. AÑADIMOS EL REFRESH INDICATOR
      body: RefreshIndicator(
        onRefresh: _fetchFavoritos, // Llama a la función de recarga
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    // --- ESTADO 1: Cargando (Solo la primera vez) ---
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    // --- ESTADO 2: Error ---
    if (_error != null) {
      // ❗️ 2. Envolvemos en un ScrollView para permitir "jalar"
      return SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Container(
          height: MediaQuery.of(context).size.height * 0.7, // Ocupa espacio
          alignment: Alignment.center,
          child: _ErrorState(message: _error!),
        ),
      );
    }

    // --- ESTADO 3: Carrito Vacío ---
    if (_favoritos.isEmpty) {
      // ❗️ 3. Envolvemos en un ScrollView para permitir "jalar"
      return SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Container(
          height: MediaQuery.of(context).size.height * 0.7, // Ocupa espacio
          alignment: Alignment.center,
          child: const _EmptyState(),
        ),
      );
    }

    // --- ESTADO 4: Contenido ---
    // ❗️ 4. Usamos el MISMO aspect ratio del catálogo
    const gridDelegate = SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 0.43,
    );

    return GridView.builder(
      // ❗️ 5. Le damos physics para que siempre se pueda scrollear
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      gridDelegate: gridDelegate,
      itemCount: _favoritos.length,
      itemBuilder: (context, index) {
        final product = _favoritos[index].product;
        // Usamos 'watch' en el CartProvider para que el botón se actualice
        final quantityInCart = context.watch<CartProvider>().getQuantityInCart(product.id);

        return ProductCard(
          product: product,
          quantityInCart: quantityInCart,
          onAddToCart: () => _handleAddToCart(product),
          onToggleFavorite: () => _handleToggleFavorite(product.id),
          // Si está en esta pantalla, ES favorito
          isFavorite: true, 
        );
      },
    );
  }
}

// ===============================================
// --- Widgets Auxiliares (Sin Cambios) ---
// ===============================================

class _ErrorState extends StatelessWidget {
  final String message;
  const _ErrorState({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.red.shade200),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(LucideIcons.triangleAlert, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Error al cargar',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: const TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(LucideIcons.heart, size: 64, color: Color(0xFF94A3B8)),
            const SizedBox(height: 16),
            Text(
              'No tienes favoritos',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Toca el corazón en un producto para guardarlo aquí.',
              style: TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).pushNamedAndRemoveUntil('/shell', (route) => false);
              },
              icon: const Icon(LucideIcons.layoutGrid, size: 18),
              label: const Text('Ver catálogo'),
            ),
          ],
        ),
      ),
    );
  }
}