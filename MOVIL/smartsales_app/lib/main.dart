// lib/main.dart
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
import 'package:smartsales_app/screens/app_shell_screen.dart';
import 'package:smartsales_app/theme/app_theme.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:smartsales_app/screens/checkout_screen.dart';
import 'package:smartsales_app/screens/pago_exitoso_screen.dart';
import 'package:smartsales_app/screens/my_purchases_screen.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:smartsales_app/screens/reglas_garantia_screen.dart';
import 'package:smartsales_app/screens/admin/gestion_promociones_screen.dart';
import 'package:smartsales_app/screens/admin/dashboard_screen.dart';
import 'package:smartsales_app/screens/cliente/my_purchase_details_screen.dart';

// ❗️ 1. IMPORTACIONES DE FIREBASE Y NOTIFICACIONES
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:smartsales_app/services/notification_service.dart';

// ❗️ 2. HANDLER DE FONDO (OBLIGATORIO)
// Esta función DEBE estar fuera de cualquier clase
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Asegúrate de inicializar Firebase aquí también
  await Firebase.initializeApp();
  print("Handling a background message: ${message.messageId}");
}

const String tuClavePublicableStripe = 'pk_test_51SAdplJBBOzsVfxM6xZOdAX5HKTGdtuDBDsM9JwSx4AoSPtklO9JMcGgOm5X4vpluD2FXblT22hBuFm1pqRtnL1n00Q8d4EBmg';

void main() async {
  // Asegurar que los bindings estén inicializados
  WidgetsFlutterBinding.ensureInitialized(); 

  // ❗️ 3. INICIALIZAR FIREBASE (ANTES QUE OTROS)
  await Firebase.initializeApp();
  // Configurar el handler de fondo
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Inicializar Stripe
  Stripe.publishableKey = tuClavePublicableStripe;
  await Stripe.instance.applySettings();
  
  // Inicializar formato de fechas
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
      
      // ❗️ 4. ASIGNAR EL NAVIGATOR KEY (PARA NAVEGACIÓN DESDE NOTIFICACIONES)
      navigatorKey: NotificationService.navigatorKey, 
      
      home: const AuthCheckScreen(), // Perfecto
      routes: {
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
        // (La ruta /catalogo ya no es necesaria aquí, está bien)
      },
      onGenerateRoute: (settings) {
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

        // ❗️ 5. CORRECCIÓN EN LA RUTA DE DETALLE (TU CÓDIGO ESTABA BIEN, PERO LO REAFIRMO)
        if (settings.name?.startsWith('/mis-compras/') == true) {
            final ventaIdString = settings.name!.split('/').last;
            final ventaId = int.tryParse(ventaIdString);
            
            if (ventaId != null) {
                return MaterialPageRoute(
                    // (Tu ruta a MyPurchaseDetailsScreen estaba bien, la he quitado
                    // si estás usando PagoExitosoScreen para ambos, como en mi sugerencia)
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