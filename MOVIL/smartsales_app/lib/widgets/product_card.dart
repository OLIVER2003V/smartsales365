// lib/widgets/product_card.dart
import 'package:flutter/material.dart';
import 'package:smartsales_app/models/product_model.dart';
import 'package:smartsales_app/widgets/star_rating.dart';
import 'package:smartsales_app/utils/format_price.dart';
import 'package:lucide_flutter/lucide_flutter.dart';

class ProductCard extends StatelessWidget {
  final Product product;
  final int quantityInCart;
  final VoidCallback onAddToCart;
  final VoidCallback onToggleFavorite;
  final bool isFavorite;

  const ProductCard({
    super.key,
    required this.product,
    required this.quantityInCart,
    required this.onAddToCart,
    required this.onToggleFavorite,
    required this.isFavorite,
  });

  @override
  Widget build(BuildContext context) {
    final double precioMostrado = product.precioFinal;
    final double precioOriginal = product.precio;
    final bool hayOferta = precioMostrado < precioOriginal;
    final int stock = product.stock;
    final bool hasStock = stock > 0;
    final bool isAtLimit = hasStock && quantityInCart >= stock;
    final bool lowStock = hasStock && !isAtLimit && stock <= 5;
    final bool showOfertaBadge = product.promocionAplicada && hasStock;

    return Card(
      elevation: 4,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min, // evita overflow con listas/grids
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Imagen y Badges
          SizedBox(
            height: 160,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _buildProductImage(),
                _buildFavoriteButton(context),
                _buildStatusBadges(showOfertaBadge, lowStock, hasStock),
              ],
            ),
          ),

          // Contenido
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (product.categoria != null && product.categoria!.isNotEmpty)
                  _buildCategoryChip(product.categoria!),

                const SizedBox(height: 8),

                Text(
                  product.nombre,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    height: 1.2,
                  ),
                ),

                const SizedBox(height: 4),

                Text(
                  [
                    product.marca,
                    if (product.modelo != null && product.modelo!.isNotEmpty)
                      '(${product.modelo})',
                  ].join(' '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),

                const SizedBox(height: 8),

                StarRating(
                  rating: product.calificacionPromedio,
                  totalReviews: product.totalResenas,
                ),

                const SizedBox(height: 12),

                // Footer - Ahora: SOLO precio encima del botón (derecha)
                _buildPriceAboveButton(
                  context,
                  precioMostrado,
                  precioOriginal,
                  hayOferta,
                  hasStock,
                  isAtLimit,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductImage() {
    if (product.imagenUrl != null && product.imagenUrl!.isNotEmpty) {
      return Image.network(
        product.imagenUrl!,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Container(
            color: Colors.grey.shade100,
            child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        },
        errorBuilder: (_, __, ___) {
          return Container(
            color: Colors.grey.shade200,
            child: const Center(
              child: Icon(LucideIcons.imageOff, size: 48, color: Colors.grey),
            ),
          );
        },
      );
    } else {
      return Container(
        color: Colors.grey.shade200,
        child: const Center(
          child: Icon(LucideIcons.image, size: 48, color: Colors.grey),
        ),
      );
    }
  }

  Widget _buildFavoriteButton(BuildContext context) {
    return Positioned(
      top: 8,
      right: 8,
      child: Material(
        color: Colors.white70,
        shape: const CircleBorder(),
        child: InkWell(
          onTap: onToggleFavorite,
          customBorder: const CircleBorder(),
          child: Padding(
            padding: const EdgeInsets.all(6.0),
            child: Semantics(
              button: true,
              label: isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
              child: Icon(
                isFavorite ? Icons.favorite : Icons.favorite_border_outlined,
                color: isFavorite ? Colors.red : Colors.grey.shade700,
                size: 22,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadges(bool showOfertaBadge, bool lowStock, bool hasStock) {
    final List<Widget> badges = [];

    // prioridad: Agotado (si no hay stock)
    if (!hasStock) {
      badges.add(_buildBadge('Agotado', Colors.grey.shade800, icon: LucideIcons.triangleAlert));
    } else {
      if (showOfertaBadge) {
        badges.add(_buildBadge('OFERTA', Colors.red.shade600, icon: LucideIcons.percent));
      }
      if (lowStock) {
        badges.add(_buildBadge('Pocas unidades', Colors.orange.shade600, icon: LucideIcons.triangleAlert));
      }
    }

    if (badges.isEmpty) return const SizedBox.shrink();

    return Positioned(
      top: 8,
      left: 8,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: badges,
      ),
    );
  }

  Widget _buildBadge(String text, Color color, {IconData? icon}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 6, offset: const Offset(0,2))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: Colors.white),
            const SizedBox(width: 6),
          ],
          Text(
            text,
            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String category) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.indigo.shade50,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        category,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: Colors.indigo.shade700,
        ),
      ),
    );
  }

  // FINAL: precio SOLO encima del botón (derecha). No hay copia a la izquierda.
  Widget _buildPriceAboveButton(
    BuildContext context,
    double precioMostrado,
    double precioOriginal,
    bool hayOferta,
    bool hasStock,
    bool isAtLimit,
  ) {
    const buttonWidth = 100.0;

    // Botón/estado
    Widget actionButton;
    if (!hasStock) {
      actionButton = SizedBox(
        width: buttonWidth,
        height: 36,
        child: Tooltip(
          message: 'Agotado',
          child: ElevatedButton(
            onPressed: null,
            style: ElevatedButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(0, 36),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              backgroundColor: Colors.grey.shade300,
              foregroundColor: Colors.grey.shade700,
            ),
            child: const Icon(LucideIcons.box, size: 18),
          ),
        ),
      );
    } else if (isAtLimit) {
      actionButton = SizedBox(
        width: buttonWidth,
        height: 36,
        child: OutlinedButton.icon(
          onPressed: null,
          icon: const Icon(LucideIcons.check, size: 16),
          label: const Text('En carrito', style: TextStyle(fontSize: 12)),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            minimumSize: const Size(0, 36),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            alignment: Alignment.center,
          ),
        ),
      );
    } else {
      actionButton = SizedBox(
        width: buttonWidth,
        height: 36,
        child: ElevatedButton.icon(
          onPressed: onAddToCart,
          icon: const Icon(LucideIcons.shoppingCart, size: 16),
          label: const Text('Añadir', style: TextStyle(fontSize: 12)),
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            minimumSize: const Size(0, 36),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            alignment: Alignment.center,
          ),
        ),
      );
    }

    // Row: LEFT = espacio (titulo/otros), RIGHT = columna con precio encima del botón.
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // izquierda: vacío para que el contenido principal mantenga su espacio
        const Expanded(child: SizedBox()),

        const SizedBox(width: 8),

        // derecha: precio encima del botón (alineado a la derecha)
        Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (hayOferta)
              SizedBox(
                width: buttonWidth,
                child: Text(
                  formatPrice(precioOriginal),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.right,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600, decoration: TextDecoration.lineThrough),
                ),
              ),
            SizedBox(
              width: buttonWidth,
              child: Text(
                formatPrice(precioMostrado),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.right,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: hayOferta ? Colors.red.shade600 : Colors.indigo.shade700,
                ),
              ),
            ),
            const SizedBox(height: 6),
            actionButton,
          ],
        ),
      ],
    );
  }
}
