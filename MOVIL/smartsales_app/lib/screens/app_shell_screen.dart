// lib/screens/app_shell_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/screens/product_catalog_screen.dart';
import 'package:smartsales_app/screens/favorites_screen.dart';
import 'package:smartsales_app/screens/my_purchases_screen.dart';
import 'package:smartsales_app/screens/warranty_screen.dart';
import 'package:smartsales_app/widgets/main_app_bar.dart'; 
import 'package:smartsales_app/screens/admin/gestion_promociones_screen.dart';
import 'package:smartsales_app/screens/admin/dashboard_screen.dart'; 

// ❗️ 1. IMPORTA TU SERVICIO DE NOTIFICACIÓN
import 'package:smartsales_app/services/notification_service.dart';

class AppShellScreen extends StatefulWidget {
 const AppShellScreen({super.key});

 @override
 State<AppShellScreen> createState() => _AppShellScreenState();
}

class _AppShellScreenState extends State<AppShellScreen> {
 int _selectedIndex = 0;

 // ❗️ 2. CREA UNA INSTANCIA DEL SERVICIO
 final NotificationService _notificationService = NotificationService();

 // ❗️ 3. AÑADE EL MÉTODO initState
 @override
 void initState() {
  super.initState();
  // Llama a la lógica de inicialización
  _initializeNotifications();
 }

 // ❗️ 4. CREA LA FUNCIÓN DE INICIALIZACIÓN
 Future<void> _initializeNotifications() async {
  // Espera a que el widget esté construido para usar el 'context'
  WidgetsBinding.instance.addPostFrameCallback((_) async {
   if (mounted) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.token;

    // ❗️ 5. ¡AQUÍ OCURRE LA MAGIA!
 // Esto llamará a requestPermission() y MOSTRARÁ EL POP-UP en Android 15
 await _notificationService.init(context);

 // Y esto registrará el token en tu backend
 await _notificationService.registerDeviceToken(token);
 }
 });
 }

 @override
 Widget build(BuildContext context) {
 // --- (TU CÓDIGO 'build' ORIGINAL VA AQUÍ, NO NECESITA CAMBIOS) ---
final user = context.watch<AuthProvider>().user;

final isClient = user?.rol == 'CLI';
 final isAdminOrVendedor = user?.rol == 'ADM' || user?.rol == 'VEN';

 
 // --- Lista de Títulos para el AppBar ---
 final List<String> pageTitles = [
'Catálogo',
 'Garantía',
 if (isClient) 'Favoritos',
 if (isClient) 'Mis Compras',
 if (isAdminOrVendedor) 'Dashboard',  
 if (isAdminOrVendedor) 'Promociones',
 ];

 // --- Lista de Pantallas (Widgets) ---
 final List<Widget> pages = [
 const ProductCatalogScreen(),
 const WarrantyScreen(),
 if (isClient) const FavoritesScreen(),
if (isClient) const MyPurchasesScreen(),
 if (isAdminOrVendedor) const DashboardScreen(), 
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
 const BottomNavigationBarItem( 
 icon: Icon(LucideIcons.chartBar), 
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