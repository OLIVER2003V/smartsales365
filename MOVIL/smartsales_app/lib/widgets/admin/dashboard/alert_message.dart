// lib/widgets/admin/dashboard/alert_message.dart
import 'package:flutter/material.dart';
import 'package:lucide_flutter/lucide_flutter.dart';

class AlertMessage extends StatelessWidget {
  final String msg;
  final String type; // 'info', 'error', 'success'

  const AlertMessage({super.key, required this.msg, this.type = 'error'});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color bgColor;
    Color textColor;

    switch (type) {
      case 'success':
        icon = LucideIcons.circleCheck;
        bgColor = Colors.green.shade50;
        textColor = Colors.green.shade800;
        break;
      case 'info':
        icon = LucideIcons.info;
        bgColor = Colors.blue.shade50;
        textColor = Colors.blue.shade800;
        break;
      case 'error':
      default:
        icon = LucideIcons.triangleAlert;
        bgColor = Colors.red.shade50;
        textColor = Colors.red.shade800;
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: textColor.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: textColor),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              msg,
              style: TextStyle(color: textColor, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}