import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/providers/cart_provider.dart';
import 'package:smartsales_app/models/cart_models.dart';
import 'package:smartsales_app/theme/app_theme.dart';
import 'package:smartsales_app/utils/format_price.dart';

class ShoppingCartScreen extends StatelessWidget {
  const ShoppingCartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tu Carrito'),
        actions: [
          if (cart.itemCount > 0 && !cart.loading)
            TextButton.icon(
              onPressed: () {
                cart.clearCart();
              },
              icon: const Icon(LucideIcons.trash2, color: AppTheme.dangerColor, size: 20),
              label: const Text('Vaciar', style: TextStyle(color: AppTheme.dangerColor)),
            ),
        ],
      ),
      backgroundColor: const Color(0xFFF8FAFC),

      bottomNavigationBar: cart.itemCount > 0
          ? _CheckoutBar(
              cartTotal: cart.cartTotal,
              
              // ❗️❗️ LA CORRECCIÓN ESTÁ AQUÍ ❗️❗️
              onCheckout: () {
                // Simplemente navega a la ruta de checkout
                Navigator.of(context).pushNamed('/checkout');
              },
            )
          : null,

      body: Consumer<CartProvider>(
        builder: (context, cart, child) {
          if (cart.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (cart.itemCount == 0) {
            return const _EmptyCart();
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16).copyWith(bottom: 96),
            itemCount: cart.items.length,
            itemBuilder: (context, index) {
              final item = cart.items[index];
              return _CartItemWidget(
                item: item,
                onUpdate: (newQty) {
                  cart.updateQuantity(item.producto.id, newQty);
                },
                onRemove: () {
                  cart.removeFromCart(item.producto.id);
                },
              );
            },
          );
        },
      ),
    );
  }
}

// ===================================================================
// --- WIDGETS AUXILIARES (Sin cambios) ---
// ===================================================================

class _EmptyCart extends StatelessWidget {
  const _EmptyCart();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(LucideIcons.frown, size: 64, color: Color(0xFF94A3B8)),
            const SizedBox(height: 16),
            Text(
              'Tu carrito está vacío',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Parece que aún no has añadido nada.',
              style: TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => Navigator.of(context).pushNamedAndRemoveUntil('/shell', (route) => false),
              icon: const Icon(LucideIcons.arrowLeft, size: 18),
              label: const Text('Volver al Catálogo'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartItemWidget extends StatelessWidget {
  final CartItemModel item;
  final Function(int) onUpdate;
  final VoidCallback onRemove;

  const _CartItemWidget({
    required this.item,
    required this.onUpdate,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 80,
                  width: 80,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: (item.producto.imagenUrl != null && item.producto.imagenUrl!.isNotEmpty)
                        ? Image.network(
                            item.producto.imagenUrl!,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => const Icon(LucideIcons.package, color: Colors.grey),
                          )
                        : const Icon(LucideIcons.package, color: Colors.grey),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.producto.nombre,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(item.producto.marca, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Text(
                        '${formatPrice(item.producto.precioFinal)} c/u',
                        style: TextStyle(
                          color: Theme.of(context).primaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.trash2, color: Colors.grey, size: 20),
                  onPressed: onRemove,
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _QuantityControl(
                  quantity: item.cantidad,
                  maxStock: item.producto.stock,
                  onDecrement: () => onUpdate(item.cantidad - 1),
                  onIncrement: () => onUpdate(item.cantidad + 1),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formatPrice(item.cantidad * item.producto.precioFinal),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                    if (item.cantidad >= item.producto.stock)
                      const Text(
                        'Stock máx.',
                        style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckoutBar extends StatelessWidget {
  final double cartTotal;
  final VoidCallback onCheckout;

  const _CheckoutBar({required this.cartTotal, required this.onCheckout});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16).copyWith(
        bottom: MediaQuery.of(context).padding.bottom + 16,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total a Pagar', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text(
                formatPrice(cartTotal),
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: onCheckout, // <--- AHORA SÍ LLAMA A LA FUNCIÓN
            style: FilledButton.styleFrom(
              minimumSize: const Size(double.infinity, 50),
              textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            child: const Text('Proceder al Pago'),
          ),
        ],
      ),
    );
  }
}

class _QuantityControl extends StatelessWidget {
  final int quantity;
  final int maxStock;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  const _QuantityControl({
    required this.quantity,
    required this.maxStock,
    required this.onIncrement,
    required this.onDecrement,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(LucideIcons.minus, size: 16),
            onPressed: quantity > 1 ? onDecrement : null,
            visualDensity: VisualDensity.compact,
          ),
          Text(
            '$quantity',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          IconButton(
            icon: const Icon(LucideIcons.plus, size: 16),
            onPressed: quantity < maxStock ? onIncrement : null,
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}