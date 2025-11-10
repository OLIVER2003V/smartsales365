import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/providers/cart_provider.dart';
import 'package:smartsales_app/theme/app_theme.dart';

// Definimos un tipo para el item del menú de perfil
enum ProfileMenuAction { profile, logout }

class MainAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  const MainAppBar({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.read<AuthProvider>();
    final user = authProvider.user; // Leemos el usuario
    final rol = user?.getRolDisplay();

    // Lógica de Logout
    void handleLogout() async {
      final bool? confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('¿Cerrar Sesión?'),
          content: const Text('¿Seguro que deseas cerrar sesión?'),
          actions: [
            TextButton(
              child: const Text('Cancelar'),
              onPressed: () => Navigator.of(context).pop(false),
            ),
            FilledButton(
              child: const Text('Sí, Cerrar Sesión'),
              style: FilledButton.styleFrom(backgroundColor: AppTheme.dangerColor),
              onPressed: () => Navigator.of(context).pop(true),
            ),
          ],
        ),
      );

      if (confirmed == true) {
        await authProvider.logout();
        if (context.mounted) {
          Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
        }
      }
    }

    // Lógica para el menú de perfil
    void onProfileMenuSelected(ProfileMenuAction action) {
      switch (action) {
        case ProfileMenuAction.profile:
          Navigator.of(context).pushNamed('/profile');
          break;
        case ProfileMenuAction.logout:
          handleLogout();
          break;
      }
    }

    return AppBar(
      title: Text(title),
      actions: [
        // --- 1. Botón de Carrito (de Navbar.jsx) ---
        Consumer<CartProvider>(
          builder: (context, cart, child) {
            return Stack(
              children: [
                IconButton(
                  icon: const Icon(LucideIcons.shoppingCart),
                  onPressed: () => Navigator.of(context).pushNamed('/cart'),
                ),
                if (cart.itemCount > 0)
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppTheme.dangerColor,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                      child: Text(
                        '${cart.itemCount}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            );
          },
        ),

        // --- 2. Menú de Perfil (de Navbar.jsx) ---
        if (user != null)
          PopupMenuButton<ProfileMenuAction>(
            onSelected: onProfileMenuSelected,
            icon: const Icon(LucideIcons.circleUserRound), // Icono de usuario
            itemBuilder: (BuildContext context) => [
              // --- Cabecera (Bienvenido...) ---
              PopupMenuItem(
                enabled: false, // No se puede clickear
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Bienvenido, ${user.firstName.isNotEmpty ? user.firstName : user.username}',
                      style: const TextStyle(fontWeight: FontWeight.bold)
                    ),
                    Text(user.email, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    if (rol != null)
                      Text(rol, style: const TextStyle(fontSize: 12, color: Colors.blue)),
                  ],
                ),
              ),
              const PopupMenuDivider(),

              // --- Opción: Mi Perfil ---
              const PopupMenuItem(
                value: ProfileMenuAction.profile,
                child: Row(
                  children: [
                    Icon(LucideIcons.user, size: 18),
                    SizedBox(width: 8),
                    Text('Mi Perfil'),
                  ],
                ),
              ),

              // --- ❗️ TUS ENLACES DE "GESTIÓN" (opcional) ❗️ ---
              // if (user.rol == 'ADM' || user.rol == 'VEN') ...[
              //   const PopupMenuDivider(),
              //   const PopupMenuItem(
              //     child: Row(children: [Icon(LucideIcons.layoutDashboard), SizedBox(width: 8), Text('Dashboard')]),
              //     // onTap: () => ...
              //   ),
              // ],

              // --- Opción: Cerrar Sesión ---
              const PopupMenuDivider(),
              PopupMenuItem(
                value: ProfileMenuAction.logout,
                child: const Row(
                  children: [
                    Icon(LucideIcons.logOut, size: 18, color: AppTheme.dangerColor),
                    SizedBox(width: 8),
                    Text('Cerrar Sesión', style: TextStyle(color: AppTheme.dangerColor)),
                  ],
                ),
              ),
            ],
          ),
      ],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}