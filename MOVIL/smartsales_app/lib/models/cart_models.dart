import 'product_model.dart';

class CartItemModel {
  final Product producto;
  final int cantidad;

  CartItemModel({required this.producto, required this.cantidad});

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    return CartItemModel(
      producto: Product.fromJson(json['producto']),
      cantidad: json['cantidad'] ?? 0,
    );
  }
}

class CartSummary {
  final List<CartItemModel> items;
  final double subtotal;
  final int totalItems;
  final String? mensajeConfirmacion;

  CartSummary({
    required this.items,
    required this.subtotal,
    required this.totalItems,
    this.mensajeConfirmacion,
  });

  factory CartSummary.fromJson(Map<String, dynamic> json) {
    double toDouble(dynamic v) =>
        v == null ? 0.0 : double.tryParse(v.toString()) ?? 0.0;

    final itemsJson = (json['items'] as List<dynamic>? ?? []);
    return CartSummary(
      items: itemsJson.map((e) => CartItemModel.fromJson(e)).toList(),
      subtotal: toDouble(json['subtotal']),
      totalItems: json['total_items'] ?? 0,
      mensajeConfirmacion: json['mensaje_confirmacion'],
    );
  }
}
