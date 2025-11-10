import 'package:flutter/material.dart';

class StarRating extends StatelessWidget {
  final double rating;
  final int totalReviews;

  const StarRating({
    super.key,
    required this.rating,
    required this.totalReviews,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // ⭐ Estrellas
        ...List.generate(5, (index) {
          return Icon(
            index < rating.floor()
                ? Icons.star          // Estrella llena
                : index < rating
                    ? Icons.star_half  // Media estrella
                    : Icons.star_border, // Estrella vacía
            color: Colors.amber,
            size: 16,
          );
        }),

        // 👥 Cantidad de reseñas
        Padding(
          padding: const EdgeInsets.only(left: 4.0),
          child: Text(
            '($totalReviews)',
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: Colors.grey.shade600),
          ),
        ),
      ],
    );
  }
}
