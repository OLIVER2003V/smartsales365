// src/pagos/CheckoutForm.jsx
import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { createVenta } from '../api/venta';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Iconos "Pro"
import { 
  Lock, 
  CreditCard, 
  User, 
  ArrowLeft, 
  Loader2, // Spinner
  ShoppingCart 
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- Icono de Carga ---
const SpinnerIcon = () => (
    <Loader2 className="animate-spin h-5 w-5" />
);

// --- Opciones de Estilo "Pro" para Stripe ---
const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            color: "#32325d",
            fontFamily: 'Inter, "Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: "antialiased",
            fontSize: "16px",
            "::placeholder": { color: "#aab7c4" }
        },
        invalid: { color: "#fa755a", iconColor: "#fa755a" }
    }
    // Código Postal visible por defecto
};

// --- Componente Reutilizable de Campo de Formulario ---
const FormField = ({ id, label, error, required, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            id={id}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-2 ${
                error 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
);

// --- Componente de Resumen del Pedido ---
const OrderSummary = ({ cartItems, cartTotal }) => {
    const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

    return (
        <div className="bg-slate-50 rounded-lg shadow-sm border border-gray-200 p-6 lg:sticky lg:top-24">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-4 mb-4 flex items-center gap-2">
                <ShoppingCart size={20} />
                Resumen de tu Pedido
            </h2>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {cartItems.map(item => (
                    <div key={item.producto.id} className="flex items-center gap-3">
                        <img 
                            src={item.producto.imagen_url || 'https://placehold.co/64x64/EFEFEF/AAAAAA?text=Sin+Imagen'} 
                            alt={item.producto.nombre} 
                            className="h-16 w-16 object-contain rounded-md border bg-white"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{item.producto.nombre}</p>
                            <p className="text-sm text-gray-500">Cant: {item.cantidad}</p>
                        </div>
                        <p className="font-medium text-gray-900">{formatPrice(item.cantidad * item.producto.precio)}</p>
                    </div>
                ))}
            </div>
            <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                    <p>Subtotal</p>
                    <p className="font-medium">{formatPrice(cartTotal)}</p>
                </div>
                <div className="flex justify-between text-gray-600">
                    <p>Envío</p>
                    <p className="font-medium">A calcular</p>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 mt-2">
                    <p>Total a Pagar</p>
                    <p>{formatPrice(cartTotal)}</p>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal del Checkout ---
const CheckoutForm = ({ token }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { cartItems, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [needsClientData, setNeedsClientData] = useState(false);
    const [clienteData, setClienteData] = useState({ nombre: '', apellido: '', email: '', telefono: '', direccion: '', nit_ci: '' });
    const [formErrors, setFormErrors] = useState({});

    const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });
    const getConfig = (tk) => ({ headers: { 'Authorization': `Token ${tk}` } });

    // Protección: Si el carrito está vacío, no se puede estar aquí
    useEffect(() => {
        // Ejecuta la redirección solo si el perfil ya cargó (o falló) Y el carrito está vacío
        if (!isLoadingProfile && cartItems.length === 0) {
            
            navigate('/catalogo', { replace: true }); // Usar replace para no guardar checkout en el historial
        }
    }, [cartItems, isLoadingProfile, navigate]);

    // 1. Verificar perfil de cliente al cargar
    useEffect(() => {
        const checkProfile = async () => {
            if (!token) {
                navigate('/', { replace: true });
                return;
            }
            // No iniciar la carga del perfil si el carrito ya está vacío (el otro useEffect redirigirá)
            if (cartItems.length === 0) {
                setIsLoadingProfile(false); 
                return;
            }

            setIsLoadingProfile(true);
            const loadingToast = toast.loading('Verificando información...');
            try {
                const response = await axios.get(`${API_BASE_URL}/api/profile/`, getConfig(token));
                const userData = response.data;
                const clienteProfile = userData.cliente_profile; 

                if (clienteProfile) {
                    setClienteData(clienteProfile);
                    setNeedsClientData(false);
                    toast.success('Datos de cliente cargados.', { id: loadingToast });
                } else {
                    setNeedsClientData(true);
                    setClienteData(prev => ({
                        ...prev,
                        nombre: userData.first_name || '',
                        apellido: userData.last_name || '',
                        email: userData.email || '',
                    }));
                    toast('Por favor, completa tus datos.', { id: loadingToast, icon: '👤' });
                }
            } catch (error) {
                console.error("Error al verificar perfil:", error);
                toast.error('Error al verificar tu información.', { id: loadingToast });
                if (error.response?.status === 401) {
                    // Si el token es inválido aquí, redirige al login
                    setTimeout(() => navigate('/', { replace: true }), 2000);
                }
                // Si hay otro error, permite al usuario ver el formulario de pago igualmente,
                // pero necesitará ingresar sus datos (needsClientData podría ya ser true)
                 setNeedsClientData(true); // Fuerza a pedir datos si la carga falló
            } finally {
                setIsLoadingProfile(false);
            }
        };
        // Llama a checkProfile solo si hay items en el carrito (optimización)
        if (cartItems.length > 0) {
             checkProfile();
        } else {
            setIsLoadingProfile(false); // Marca como no cargando si el carrito está vacío
        }
    }, [token, navigate, cartItems.length]); // Depende de cartItems.length para reaccionar si se vacía mientras está aquí

    // Validación del formulario de cliente
    const validateClienteData = () => {
        const errors = {};
        if (!clienteData.nombre.trim()) errors.nombre = "El nombre es requerido.";
        if (!clienteData.apellido.trim()) errors.apellido = "El apellido es requerido.";
        if (!clienteData.email.trim()) errors.email = "El email es requerido.";
        else if (!/\S+@\S+\.\S+/.test(clienteData.email)) errors.email = "Email inválido.";
        if (!clienteData.direccion.trim()) errors.direccion = "La dirección es requerida.";
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Manejo del envío del formulario
    const handleSubmit = async (event) => {
        event.preventDefault();
        // Agrega una guarda extra por si acaso el useEffect no ha redirigido aún
        if (!stripe || !elements || cartItems.length === 0 || isLoadingProfile) return;

        if (needsClientData) {
            if (!validateClienteData()) {
                toast.error('Por favor, corrige los errores en el formulario.');
                return;
            }
        }

        setIsProcessing(true);
        const paymentToast = toast.loading('Iniciando proceso de pago...');

        try {
            // PASO 1: Crear PaymentIntent
            toast.loading('Preparando pasarela de pago...', { id: paymentToast });
            const intentPayload = {
                items: cartItems.map(item => ({ id: item.producto.id, quantity: item.cantidad })),
                ...(needsClientData && { cliente_nuevo: clienteData })
            };
            
            const intentResponse = await axios.post(
                `${API_BASE_URL}/api/create-payment-intent/`,
                intentPayload,
                getConfig(token)
            );
            const secret = intentResponse.data.clientSecret;

            // PASO 2: Confirmar Pago con Stripe
            toast.loading('Confirmando pago con el banco...', { id: paymentToast });
            const cardElement = elements.getElement(CardElement);
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
                secret,
                { payment_method: { card: cardElement, billing_details: { name: `${clienteData.nombre} ${clienteData.apellido}`, email: clienteData.email } } }
            );

            if (stripeError) {
                throw new Error(`Error de pago: ${stripeError.message}`);
            }

            if (paymentIntent.status !== 'succeeded') {
                throw new Error(`Estado del pago inesperado: ${paymentIntent.status}`);
            }

            // PASO 3: Registrar Venta en Backend (CRÍTICO)
            toast.loading('Pago aceptado. Registrando tu pedido...', { id: paymentToast });
            const ventaData = {
                detalles: cartItems.map(item => ({
                    producto: item.producto.id,
                    cantidad: item.cantidad
                })),
                ...(needsClientData && { cliente_nuevo: clienteData })
            };
            const ventaCreada = await createVenta(token, ventaData);

            // PASO 4: ÉXITO TOTAL - Navegación Inmediata
            toast.success(`¡Compra completada! Pedido #${ventaCreada.id} registrado. Redirigiendo...`, { 
                id: paymentToast, 
                duration: 4000 // Deja el toast visible un poco más mientras navega
            });
            clearCart();
            // ¡NAVEGA INMEDIATAMENTE!
            navigate('/profile'); // O a '/mis-pedidos' si tienes esa ruta

        } catch (error) {
            // MANEJO CENTRALIZADO DE ERRORES
            console.error("Error en el proceso de pago:", error);
            setIsProcessing(false); 

            let errorMessage = "Ocurrió un error inesperado.";
            let isCriticalError = false;

            if (axios.isAxiosError(error) && error.response) { 
                errorMessage = error.response.data.error || error.response.data.detail || "Error al conectar con el servidor.";
                // Verifica si la URL del error es la de crear la venta
                if (error.config?.url?.includes('/api/ventas/')) {
                    isCriticalError = true;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            if (isCriticalError) {
                toast.error(
                    "Error CRÍTICO: Tu pago fue aceptado, pero no pudimos registrar tu pedido. Contacta a soporte.", 
                    { id: paymentToast, duration: 10000 }
                );
            } else {
                toast.error(errorMessage, { id: paymentToast, duration: 6000 });
            }
        } 
        // No necesitamos 'finally' aquí si navegamos en el éxito
    };

    // --- Renderizado ---

    // Muestra carga solo si está verificando perfil Y hay items (evita flash si carrito vacío)
    if (isLoadingProfile && cartItems.length > 0) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <SpinnerIcon /> <span className="ml-3 text-lg font-medium text-gray-600">Verificando información...</span>
            </div>
        );
    }
    
    // Muestra mensaje y botón si el carrito está vacío (controlado por useEffect también)
    if (cartItems.length === 0) {
        return (
             <div className="text-center py-10">
                {/* El toast de error ya debería haber aparecido */}
                 <button 
                    onClick={() => navigate('/catalogo')}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700"
                >
                    <ArrowLeft size={18} />
                    Volver al Catálogo
                </button>
            </div>
        );
    }

    // Renderizado principal del formulario
    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-8">
                    Confirmar y Pagar
                </h1>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Columna Izquierda (Formularios) */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Sección 1: Datos del Cliente (Condicional) */}
                        {needsClientData ? (
                            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900 mb-5 flex items-center gap-2">
                                    <User size={22} />
                                    Datos de Envío y Facturación
                                </h2>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField id="nombre" label="Nombre" name="nombre" value={clienteData.nombre} onChange={(e) => setClienteData({...clienteData, nombre: e.target.value})} error={formErrors.nombre} required />
                                        <FormField id="apellido" label="Apellido" name="apellido" value={clienteData.apellido} onChange={(e) => setClienteData({...clienteData, apellido: e.target.value})} error={formErrors.apellido} required />
                                    </div>
                                    <FormField id="email" label="Email" name="email" type="email" value={clienteData.email} onChange={(e) => setClienteData({...clienteData, email: e.target.value})} error={formErrors.email} required />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                         <FormField id="telefono" label="Teléfono" name="telefono" type="tel" value={clienteData.telefono} onChange={(e) => setClienteData({...clienteData, telefono: e.target.value})} placeholder="71234567" />
                                         <FormField id="nit_ci" label="NIT/CI" name="nit_ci" type="text" value={clienteData.nit_ci} onChange={(e) => setClienteData({...clienteData, nit_ci: e.target.value})} placeholder="Para tu factura" />
                                    </div>
                                    <div>
                                        <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">Dirección <span className="text-red-500">*</span></label>
                                        <textarea id="direccion" name="direccion" rows="3" value={clienteData.direccion} onChange={(e) => setClienteData({...clienteData, direccion: e.target.value})} className={`block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-2 ${formErrors.direccion ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}></textarea>
                                        {formErrors.direccion && <p className="mt-1 text-xs text-red-600">{formErrors.direccion}</p>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                             <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                    <User size={22} />
                                    Datos del Cliente
                                </h2>
                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
                                    <p className="font-medium">Usaremos tus datos de cliente guardados:</p>
                                    <p className="text-sm">{clienteData.nombre} {clienteData.apellido}</p>
                                    <p className="text-sm">{clienteData.direccion}</p>
                                </div>
                            </div>
                        )}

                        {/* Sección 2: Método de Pago */}
                        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900 mb-5 flex items-center gap-2">
                                <CreditCard size={22} />
                                Método de Pago
                            </h2>
                            <p className="text-sm text-gray-500 mb-4">Ingresa los datos de tu tarjeta. El pago es 100% seguro.</p>
                            <div className="p-4 border border-gray-300 rounded-md bg-white shadow-inner">
                                <CardElement options={CARD_ELEMENT_OPTIONS} />
                            </div>
                        </div>

                    </div>

                    {/* Columna Derecha (Resumen del Pedido) */}
                    <div className="lg:col-span-1 space-y-6">
                        <OrderSummary cartItems={cartItems} cartTotal={cartTotal} />
                        
                        <button
                            type="submit"
                            disabled={!stripe || isProcessing || isLoadingProfile}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 text-lg font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? <SpinnerIcon /> : <Lock size={20} />}
                            {isProcessing ? 'Procesando Pago...' : `Pagar ${formatPrice(cartTotal)}`}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default CheckoutForm;