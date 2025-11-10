// lib/screens/product_catalog_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import 'package:smartsales_app/theme/app_theme.dart';
import 'package:smartsales_app/providers/product_provider.dart';
import 'package:smartsales_app/providers/cart_provider.dart';
import 'package:smartsales_app/providers/favorites_provider.dart';
import 'package:smartsales_app/widgets/product_card.dart';
import 'package:smartsales_app/widgets/product_skeleton.dart';
import 'package:smartsales_app/widgets/product_header.dart';
import 'package:smartsales_app/widgets/command_bar.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/models/product_model.dart';

class ProductCatalogScreen extends StatefulWidget {
  const ProductCatalogScreen({super.key});

  @override
  State<ProductCatalogScreen> createState() => _ProductCatalogScreenState();
}

class _ProductCatalogScreenState extends State<ProductCatalogScreen> {
  final ScrollController _scrollController = ScrollController();

  void _showFeedback(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade600 : Colors.green.shade600,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Consumer3<ProductProvider, CartProvider, FavoritesProvider>(
        builder: (context, productProvider, cartProvider, favoritesProvider, child) {
          
          final bool isLoading = productProvider.isLoading || favoritesProvider.isLoadingFavorites;
          final String? errorMessage = productProvider.errorMessage;
          
          if (isLoading) {
            return _buildLoadingSkeletons();
          }

          if (errorMessage != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(LucideIcons.triangleAlert, color: AppTheme.dangerColor, size: 48),
                    const SizedBox(height: 16),
                    Text('Error al cargar', style: Theme.of(context).textTheme.headlineSmall),
                    Text(errorMessage, textAlign: TextAlign.center),
                  ],
                ),
              ),
            );
          }

          final products = productProvider.processedProducts;
          final bool hasFilters = productProvider.searchTerm.isNotEmpty || productProvider.category != 'all';

          return CustomScrollView(
            controller: _scrollController,
            slivers: [
              SliverToBoxAdapter(
                child: Column(
                  children: [
                    const ProductHeader(),
                    const CommandBar(),
                    if (products.isEmpty)
                      _buildEmptyState(context, hasFilters),
                  ],
                ),
              ),

              if (products.isNotEmpty)
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: _buildProductGrid(
                    context,
                    products,
                    cartProvider,
                    favoritesProvider,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  // Helper del Grid
  Widget _buildProductGrid(
    BuildContext context,
    List<Product> products,
    CartProvider cartProvider,
    FavoritesProvider favoritesProvider,
  ) {
    // ❗️❗️ CONFIRMACIÓN DE CORRECCIÓN ❗️❗️
    // Este valor (0.38) le da MÁS ALTURA a la tarjeta.
    // Esto es NECESARIO para que todo el contenido (nombre, precio, botón)
    // quepa sin cortarse, como pasaba en tu screenshot.
    // Si es demasiado alto, prueba con 0.45 o 0.5.
    const gridDelegate = SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 0.44, 
    );

    return SliverGrid(
      gridDelegate: gridDelegate,
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final product = products[index];
          return ProductCard(
            product: product,
            quantityInCart: cartProvider.getQuantityInCart(product.id),
            onAddToCart: () {
              cartProvider.addToCart(product, cantidad: 1);
              _showFeedback('"${product.nombre}" añadido al carrito.');
            },
            isFavorite: favoritesProvider.isFavorite(product.id),
            onToggleFavorite: () {
              favoritesProvider.toggleFavorite(product.id);
            },
          );
        },
        childCount: products.length,
      ),
    );
  }

  // Helper de Estado Vacío
  Widget _buildEmptyState(BuildContext context, bool noResults) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            noResults ? LucideIcons.searchX : LucideIcons.inbox,
            size: 60,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            noResults ? 'Sin resultados' : 'Catálogo vacío',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          Text(
            noResults
                ? 'No se encontraron productos con esos filtros.'
                : 'No hay productos disponibles por ahora.',
            style: TextStyle(color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  // Helper de Carga (Shimmer)
  Widget _buildLoadingSkeletons() {
    // ❗️❗️ MISMO ASPECT RATIO CORREGIDO ❗️❗️
    const gridDelegate = SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 0.38,
    );
    
    return Shimmer.fromColors(
      baseColor: Colors.grey.shade300,
      highlightColor: Colors.grey.shade100,
      child: CustomScrollView(
        physics: const NeverScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: Column(
              children: [
                const ProductHeader(),
                Container(
                  height: 60,
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ],
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverGrid(
              gridDelegate: gridDelegate,
              delegate: SliverChildBuilderDelegate(
                (context, index) => const ProductSkeleton(),
                childCount: 8,
              ),
            ),
          ),
        ],
      ),
    );
  }
}