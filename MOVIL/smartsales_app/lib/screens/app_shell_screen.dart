import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/screens/product_catalog_screen.dart';
import 'package:smartsales_app/screens/favorites_screen.dart';
import 'package:smartsales_app/screens/my_purchases_screen.dart';
import 'package:smartsales_app/screens/warranty_screen.dart';
import 'package:smartsales_app/widgets/main_app_bar.dart'; 
// ❗️ 1. Importa las pantallas de Admin
import 'package:smartsales_app/screens/admin/gestion_promociones_screen.dart';
import 'package:smartsales_app/screens/admin/dashboard_screen.dart'; // <--- AÑADE ESTA LÍNEA

class AppShellScreen extends StatefulWidget {
  const AppShellScreen({super.key});

  @override
  State<AppShellScreen> createState() => _AppShellScreenState();
}

class _AppShellScreenState extends State<AppShellScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    
    final isClient = user?.rol == 'CLI';
    final isAdminOrVendedor = user?.rol == 'ADM' || user?.rol == 'VEN';

    
    // --- Lista de Títulos para el AppBar ---
    final List<String> pageTitles = [
      'Catálogo',
      'Garantía',
      if (isClient) 'Favoritos',
      if (isClient) 'Mis Compras',
      if (isAdminOrVendedor) 'Dashboard',   // <--- AÑADE ESTA LÍNEA
      if (isAdminOrVendedor) 'Promociones',
    ];

    // --- Lista de Pantallas (Widgets) ---
    final List<Widget> pages = [
      const ProductCatalogScreen(),
      const WarrantyScreen(),
      if (isClient) const FavoritesScreen(),
      if (isClient) const MyPurchasesScreen(),
      if (isAdminOrVendedor) const DashboardScreen(), // <--- AÑADE ESTA LÍNEA
      if (isAdminOrVendedor) const GestionPromocionesScreen(),
    ];

    // --- Lista de Botones de Navegación ---
    final List<BottomNavigationBarItem> navItems = [
      const BottomNavigationBarItem(
        icon: Icon(LucideIcons.layoutGrid),
        label: 'Catálogo',
      ),
      const BottomNavigationBarItem(
        icon: Icon(LucideIcons.shieldCheck),
        label: 'Garantía',
      ),
      if (isClient)
        const BottomNavigationBarItem(
          icon: Icon(LucideIcons.heart),
          label: 'Favoritos',
        ),
      if (isClient)
        const BottomNavigationBarItem(
          icon: Icon(LucideIcons.shoppingBag),
          label: 'Compras',
        ),
      if (isAdminOrVendedor)
        const BottomNavigationBarItem( // <--- AÑADE ESTA LÍNEA
          icon: Icon(LucideIcons.chartBar), // Icono del Dashboard
          label: 'Dashboard',
        ),
      if (isAdminOrVendedor)
        const BottomNavigationBarItem(
          icon: Icon(LucideIcons.ticketPercent),
          label: 'Promos',
        ),
    ];

    // ❗️ Cuidado: Si el índice está fuera de rango, resetea a 0
    if (_selectedIndex >= pageTitles.length) {
      _selectedIndex = 0;
    }

    return Scaffold(
      appBar: MainAppBar(
        title: pageTitles[_selectedIndex],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: pages,
      ),
      bottomNavigationBar: BottomNavigationBar(
        items: navItems,
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Theme.of(context).primaryColor,
        unselectedItemColor: Colors.grey.shade600,
      ),
    );
  }
}