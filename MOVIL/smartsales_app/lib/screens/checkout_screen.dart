import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:lucide_flutter/lucide_flutter.dart';

import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/providers/cart_provider.dart';
import 'package:smartsales_app/services/venta_service.dart';
import 'package:smartsales_app/models/user_model.dart';
import 'package:smartsales_app/utils/format_price.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _ventaService = VentaService();
  final _formKey = GlobalKey<FormState>();

  // Estado
  bool _isLoadingProfile = true;
  bool _isProcessing = false;
  bool _needsClientData = false;
  
  // Controladores
  late TextEditingController _nombreController;
  late TextEditingController _apellidoController;
  late TextEditingController _emailController;
  late TextEditingController _telefonoController;
  late TextEditingController _direccionController;
  late TextEditingController _nitCiController;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
    _checkProfile();
  }
  
  void _initializeControllers() {
    final user = context.read<AuthProvider>().user;
    final profile = user?.clienteProfile;
    
    _nombreController = TextEditingController(text: profile?.nombre ?? user?.firstName ?? '');
    _apellidoController = TextEditingController(text: profile?.apellido ?? user?.lastName ?? '');
    // ❗️ CORRECCIÓN APLICADA ❗️
    _emailController = TextEditingController(text: user?.email ?? '');
    _telefonoController = TextEditingController(text: profile?.telefono ?? '');
    _direccionController = TextEditingController(text: profile?.direccion ?? '');
    _nitCiController = TextEditingController(text: profile?.nitCi ?? '');
  }

  Future<void> _checkProfile() async {
    final user = context.read<AuthProvider>().user;
    
    if (context.read<CartProvider>().itemCount == 0) {
      Navigator.of(context).pop();
      return;
    }

    if (user?.clienteProfile == null || user!.clienteProfile!.direccion.isEmpty) {
      setState(() {
        _needsClientData = true;
      });
    } else {
      setState(() {
        _needsClientData = false;
      });
    }
    
    setState(() => _isLoadingProfile = false);
  }

  @override
  void dispose() {
    _nombreController.dispose();
    _apellidoController.dispose();
    _emailController.dispose();
    _telefonoController.dispose();
    _direccionController.dispose();
    _nitCiController.dispose();
    super.dispose();
  }

  Map<String, dynamic> _getClienteData() {
    return {
      'nombre': _nombreController.text,
      'apellido': _apellidoController.text,
      'email': _emailController.text,
      'telefono': _telefonoController.text,
      'direccion': _direccionController.text,
      'nit_ci': _nitCiController.text,
    };
  }
  
  List<Map<String, dynamic>> _getItemsData() {
    final cart = context.read<CartProvider>();
    return cart.items.map((item) => {
      'id': item.producto.id,
      'quantity': item.cantidad,
      'producto': item.producto.id, 
      'cantidad': item.cantidad,
    }).toList();
  }

  Future<void> _handleSubmit() async {
    if (_isProcessing) return;
    
    if (_needsClientData && !_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, corrige los errores en tus datos.'), backgroundColor: Colors.red),
      );
      return;
    }
    
    setState(() => _isProcessing = true);
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final auth = context.read<AuthProvider>();
    final cart = context.read<CartProvider>();

    try {
      final token = auth.token!;
      final clienteData = _needsClientData ? _getClienteData() : null;
      final itemsData = _getItemsData();

      // PASO 1: Crear PaymentIntent
      final clientSecret = await _ventaService.createPaymentIntent(token, itemsData, clienteData);

      // PASO 2: Confirmar Pago con Stripe
      final billingDetails = BillingDetails(
        name: '${_nombreController.text} ${_apellidoController.text}',
        email: _emailController.text,
        phone: _telefonoController.text,
        address: Address(
          line1: _direccionController.text,
          line2: null,          // 👈 O '', como prefieras
          city: '',             // o null
          state: '',            // o null
          postalCode: '',       // o null
          country: 'BO',
        ),
      );


      await Stripe.instance.confirmPayment(
        paymentIntentClientSecret: clientSecret,
        data: PaymentMethodParams.card(
          paymentMethodData: PaymentMethodData(billingDetails: billingDetails),
        ),
      );

      // PASO 3: Registrar Venta en Backend
      final ventaCreada = await _ventaService.createVenta(token, itemsData, clienteData);

      // PASO 4: ÉXITO TOTAL
      cart.clearCart();
      navigator.pushReplacementNamed('/pago-exitoso', arguments: ventaCreada.id);

    } on StripeException catch (e) {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Error de pago: ${e.error.localizedMessage ?? e.error.message}'), backgroundColor: Colors.red),
      );
    } catch (e) {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'), backgroundColor: Colors.red),
      );
    } finally {
      if(mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingProfile) {
      return Scaffold(appBar: AppBar(), body: const Center(child: CircularProgressIndicator()));
    }
    
    final cart = context.watch<CartProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Confirmar y Pagar')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _OrderSummary(cart: cart),
              const SizedBox(height: 24),
              
              _ClientDataForm(
                needsClientData: _needsClientData,
                nombreController: _nombreController,
                apellidoController: _apellidoController,
                emailController: _emailController,
                telefonoController: _telefonoController,
                direccionController: _direccionController,
                nitCiController: _nitCiController,
              ),
              const SizedBox(height: 24),

              Text('Método de Pago', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              const Text('Ingresa los datos de tu tarjeta. El pago es 100% seguro.', style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade400),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const CardField(),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _CheckoutButton(
        cartTotal: cart.cartTotal,
        isProcessing: _isProcessing,
        onPressed: _handleSubmit,
      ),
    );
  }
}

// --- WIDGETS AUXILIARES (Como en React) ---

class _OrderSummary extends StatelessWidget {
  final CartProvider cart;
  const _OrderSummary({required this.cart});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Resumen de tu Pedido', style: Theme.of(context).textTheme.headlineSmall),
          const Divider(height: 24),
          ...cart.items.map((item) => Padding(
            padding: const EdgeInsets.only(bottom: 8.0),
            child: Row(
              children: [
                Expanded(child: Text('${item.producto.nombre} (x${item.cantidad})')),
                Text(formatPrice(item.cantidad * item.producto.precioFinal)),
              ],
            ),
          )),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Subtotal', style: TextStyle(color: Colors.grey)),
              Text(formatPrice(cart.cartTotal)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Total a Pagar', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
              Text(formatPrice(cart.cartTotal), style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ClientDataForm extends StatelessWidget {
  final bool needsClientData;
  final TextEditingController nombreController;
  final TextEditingController apellidoController;
  final TextEditingController emailController;
  final TextEditingController telefonoController;
  final TextEditingController direccionController;
  final TextEditingController nitCiController;

  const _ClientDataForm({
    required this.needsClientData,
    required this.nombreController,
    required this.apellidoController,
    required this.emailController,
    required this.telefonoController,
    required this.direccionController,
    required this.nitCiController,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Datos de Envío y Facturación', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),

          if (!needsClientData)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Usaremos tus datos guardados:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                  Text('${nombreController.text} ${apellidoController.text}'),
                  Text(direccionController.text),
                ],
              ),
            ),
          
          if (needsClientData) ...[
            const Text('Por favor, completa tus datos para finalizar la compra.', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 16),
            TextFormField(
              controller: nombreController,
              decoration: const InputDecoration(labelText: 'Nombre *', border: OutlineInputBorder()),
              validator: (val) => (val == null || val.isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: apellidoController,
              decoration: const InputDecoration(labelText: 'Apellido *', border: OutlineInputBorder()),
              validator: (val) => (val == null || val.isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: emailController,
              decoration: const InputDecoration(labelText: 'Email *', border: OutlineInputBorder()),
              keyboardType: TextInputType.emailAddress,
              validator: (val) => (val == null || !val.contains('@')) ? 'Email inválido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: direccionController,
              decoration: const InputDecoration(labelText: 'Dirección *', border: OutlineInputBorder()),
              validator: (val) => (val == null || val.isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: telefonoController,
              decoration: const InputDecoration(labelText: 'Teléfono', border: OutlineInputBorder()),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: nitCiController,
              decoration: const InputDecoration(labelText: 'NIT/CI (Para factura)', border: OutlineInputBorder()),
              keyboardType: TextInputType.text,
            ),
          ]
        ],
      ),
    );
  }
}

class _CheckoutButton extends StatelessWidget {
  final double cartTotal;
  final bool isProcessing;
  final VoidCallback onPressed;

  const _CheckoutButton({
    required this.cartTotal,
    required this.isProcessing,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16).copyWith(
        bottom: MediaQuery.of(context).padding.bottom + 16,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, -5)),
        ],
      ),
      child: FilledButton.icon(
        icon: isProcessing 
          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
          : const Icon(LucideIcons.lock, size: 20),
        label: Text(isProcessing ? 'Procesando...' : 'Pagar ${formatPrice(cartTotal)}'),
        onPressed: isProcessing ? null : onPressed,
        style: FilledButton.styleFrom(
          minimumSize: const Size(double.infinity, 50),
          textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}