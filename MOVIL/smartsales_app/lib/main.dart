import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/providers/cart_provider.dart';
import 'package:smartsales_app/providers/product_provider.dart';
import 'package:smartsales_app/providers/favorites_provider.dart';

import 'package:smartsales_app/screens/login_screen.dart';
import 'package:smartsales_app/screens/shopping_cart_screen.dart';
import 'package:smartsales_app/screens/profile_screen.dart';
import 'package:smartsales_app/screens/register_screen.dart';
import 'package:smartsales_app/screens/forgot_password_screen.dart';
import 'package:smartsales_app/screens/reset_password_screen.dart';
import 'package:smartsales_app/screens/app_shell_screen.dart'; // ❗️ 1. IMPORTAR EL SHELL
import 'package:smartsales_app/theme/app_theme.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:smartsales_app/screens/checkout_screen.dart';       // 4. Importar
import 'package:smartsales_app/screens/pago_exitoso_screen.dart';  // 4. Importar
import 'package:smartsales_app/screens/my_purchases_screen.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:smartsales_app/screens/reglas_garantia_screen.dart';
import 'package:smartsales_app/screens/admin/gestion_promociones_screen.dart';
import 'package:smartsales_app/screens/admin/dashboard_screen.dart';
import 'package:smartsales_app/screens/cliente/my_purchase_details_screen.dart';

const String tuClavePublicableStripe = 'pk_test_51SAdplJBBOzsVfxM6xZOdAX5HKTGdtuDBDsM9JwSx4AoSPtklO9JMcGgOm5X4vpluD2FXblT22hBuFm1pqRtnL1n00Q8d4EBmg';
void main() async {
  // 2. Asegurar que los bindings estén inicializados
  WidgetsFlutterBinding.ensureInitialized(); 

  // 3. Inicializar Stripe
  Stripe.publishableKey = tuClavePublicableStripe;
  await Stripe.instance.applySettings();
  await initializeDateFormatting('es_ES', null);
  runApp(
    MultiProvider(
      providers: [
        // 1) Auth global
        ChangeNotifierProvider(
          create: (_) => AuthProvider(),
        ),

        // 2) CartProvider depende de AuthProvider
        ChangeNotifierProxyProvider<AuthProvider, CartProvider>(
          create: (_) => CartProvider(),
          update: (_, auth, cart) {
            cart ??= CartProvider();
            cart.updateAuth(auth);
            return cart;
          },
        ),

        // 3) ProductProvider depende de AuthProvider
        ChangeNotifierProxyProvider<AuthProvider, ProductProvider>(
          create: (_) => ProductProvider(),
          update: (_, auth, product) {
            product ??= ProductProvider();
            product.updateAuth(auth);
            return product;
          },
        ),
        
        // 4) FavoritesProvider depende de AuthProvider
        ChangeNotifierProxyProvider<AuthProvider, FavoritesProvider>(
          create: (_) => FavoritesProvider(),
          update: (_, auth, favorites) {
            favorites ??= FavoritesProvider();
            favorites.updateAuth(auth);
            return favorites;
          },
        ),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartSales365',
      theme: AppTheme.lightTheme,
      home: const AuthCheckScreen(), // Perfecto, esto chequea el auth
      routes: {
        // ❗️ 2. AÑADIR LA RUTA DEL SHELL
        '/shell': (context) => const AppShellScreen(), 
        
        '/login': (context) => const LoginScreen(),
        '/cart': (context) => const ShoppingCartScreen(),
        '/profile': (context) => const ProfileScreen(),
        '/register': (context) => const RegisterScreen(),
        '/forgot-password': (context) => const ForgotPasswordScreen(),
        '/checkout': (context) => const CheckoutScreen(),
        '/mis-compras': (context) => const MyPurchasesScreen(),
        '/reglas-garantia': (context) => const ReglasGarantiaScreen(),
        '/admin/promociones': (context) => const GestionPromocionesScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        // ❗️ 3. QUITAR /catalogo (ahora vive dentro de /shell)
      },
      onGenerateRoute: (settings) {
        // ... tu código de onGenerateRoute ...
        if (settings.name == '/reset-password') {
          return MaterialPageRoute(
            builder: (context) {
              return const ResetPasswordScreen();
            },
            settings: settings,
          );
        }
        if (settings.name == '/pago-exitoso') {
          final ventaId = settings.arguments as int;
          return MaterialPageRoute(
            builder: (context) => PagoExitosoScreen(ventaId: ventaId),
          );
        }

        



        // 2. RUTA DINÁMICA DE DETALLE DE COMPRA (APUNTA a la nueva pantalla)
        if (settings.name?.startsWith('/mis-compras/') == true) {
            final ventaIdString = settings.name!.split('/').last;
            final ventaId = int.tryParse(ventaIdString);
            
            if (ventaId != null) {
                return MaterialPageRoute(
                    // Usa la nueva pantalla de detalle que soporta Reseñas
                    builder: (context) => MyPurchaseDetailsScreen(ventaId: ventaIdString), 
                );
            }
        }
        return null;
        
      },
      
    );
  }
}


// Widget que decide la pantalla inicial
class AuthCheckScreen extends StatefulWidget {
  const AuthCheckScreen({super.key});
  @override
  State<AuthCheckScreen> createState() => _AuthCheckScreenState();
}

class _AuthCheckScreenState extends State<AuthCheckScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final bool isLoggedIn = await authProvider.tryAutoLogin();

    if (mounted) {
      if (isLoggedIn) {
        // ❗️ 4. CAMBIO CLAVE: Navegar al Shell
        Navigator.pushReplacementNamed(context, '/shell');
      } else {
        Navigator.pushReplacementNamed(context, '/login');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}