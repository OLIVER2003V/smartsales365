// lib/widgets/product_skeleton.dart
import 'package:flutter/material.dart';

class ProductSkeleton extends StatelessWidget {
  const ProductSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 6,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Imagen esqueleto con una altura fija razonable
          const ShimmerContainer(
            height: 200,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),

          // El contenido lo envolvemos para evitar overflow
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: SingleChildScrollView(
                physics: const NeverScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    ShimmerContainer(
                      height: 18,
                      width: 80,
                      borderRadius: BorderRadius.all(Radius.circular(9)),
                    ),
                    SizedBox(height: 8),
                    ShimmerContainer(height: 36),
                    SizedBox(height: 4),
                    ShimmerContainer(height: 16, width: 120),
                    SizedBox(height: 8),
                    ShimmerContainer(height: 16, width: 100),
                    SizedBox(height: 16),
                    Divider(height: 1, color: Color(0xFFF1F5F9)),
                    SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: ShimmerContainer(height: 24, width: 70),
                        ),
                        SizedBox(width: 8),
                        ShimmerContainer(
                          height: 40,
                          width: 80,
                          borderRadius: BorderRadius.all(Radius.circular(8)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Widget auxiliar para simular el efecto de "Shimmer"
class ShimmerContainer extends StatelessWidget {
  final double height;
  final double? width;
  final BorderRadius? borderRadius;

  const ShimmerContainer({
    super.key,
    required this.height,
    this.width,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width ?? double.infinity,
      decoration: BoxDecoration(
        color: Colors.grey.shade300,
        borderRadius: borderRadius ?? BorderRadius.circular(4),
      ),
    );
  }
}
