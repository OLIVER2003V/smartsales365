// src/pagos/CheckoutForm.jsx
import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createVenta } from '../api/venta';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
    Lock, 
    CreditCard, 
    User, 
    ArrowLeft, 
    Loader2, 
    ShoppingCart,
    Package,
    Frown
} from 'lucide-react';
// ❌ Eliminada la importación de 'tailwindcss/colors'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

// --- Componente Spinner ---
const Spinner = ({ text }) => (
    <div className="min-h-screen bg-slate-100 flex justify-center items-center p-4">
        <div className="flex flex-col items-center">
            <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
            <span className="mt-3 text-lg font-medium text-slate-700">{text}</span>
        </div>
    </div>
);

// --- Estilos de Formulario Estándar ---
const inputBaseStyles = `
    block w-full px-3 py-2.5 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
`;
const errorInputStyles = "border-red-500 text-red-900 placeholder:text-red-400 focus:ring-red-500 focus:border-red-500";
const normalInputStyles = "border-slate-300 focus:ring-indigo-500 focus:border-indigo-500";

// --- ✨ FIX: Opciones de Estilo de Stripe con Colores Fijos ---
const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            color: '#1e293b', // slate-800
            fontFamily: 'Inter, "Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: "antialiased",
            fontSize: "16px",
            "::placeholder": { color: '#94a3b8' } // slate-400
        },
        invalid: { color: '#ef4444', iconColor: '#ef4444' } // red-500
    }
};

// --- Componente InputGroup ---
const InputGroup = ({ id, label, error, required, children, type = 'text', ...props }) => (
    <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children ? (
            children
        ) : type === 'textarea' ? (
            <textarea
                id={id}
                name={id}
                className={`${inputBaseStyles} resize-none ${error ? errorInputStyles : normalInputStyles}`}
                {...props}
            />
        ) : (
            <input
                id={id}
                name={id}
                type={type}
                className={`${inputBaseStyles} ${error ? errorInputStyles : normalInputStyles}`}
                {...props}
            />
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
);

// --- Componente Resumen del Pedido ---
const OrderSummary = ({ cartItems, cartTotal }) => {
    return (
        <div className="bg-slate-50 rounded-xl shadow-lg border border-slate-200 p-6 lg:sticky lg:top-24">
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-4 mb-4 flex items-center gap-2">
                <ShoppingCart size={20} className="text-indigo-600" />
                Resumen de tu Pedido
            </h2>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {cartItems.map(item => (
                    <div key={item.producto.id} className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-16 w-16 flex items-center justify-center rounded-md border border-slate-200 bg-white overflow-hidden">
                            {item.producto.imagen_url ? (
                                <img 
                                    src={item.producto.imagen_url} 
                                    alt={item.producto.nombre} 
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <Package size={24} className="text-slate-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">{item.producto.nombre}</p>
                            <p className="text-sm text-slate-500">Cant: {item.cantidad}</p>
                        </div>
                        <p className="font-medium text-slate-900">{formatPrice(item.cantidad * item.producto.precio_final)}</p>
                    </div>
                ))}
            </div>
            <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-slate-600">
                    <p>Subtotal</p>
                    <p className="font-medium text-slate-800">{formatPrice(cartTotal)}</p>
                </div>
                <div className="flex justify-between text-slate-600">
                    <p>Envío</p>
                    <p className="font-medium text-slate-800">A calcular</p>
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 mt-2">
                    <p>Total a Pagar</p>
                    <p>{formatPrice(cartTotal)}</p>
                </div>
            </div>
        </div>
    );
};

// --- Componente Carrito Vacío ---
const EmptyCartState = () => (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center bg-white p-12 rounded-xl shadow-lg border border-slate-200">
            <Frown size={64} className="mx-auto text-slate-400" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-semibold text-slate-800">Tu carrito está vacío</h2>
            <p className="mt-2 text-slate-500">No puedes proceder al pago sin productos.</p>
            <Link 
                to="/catalogo"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <ArrowLeft size={18} />
                Volver al Catálogo
            </Link>
        </div>
    </div>
);

// --- Componente Principal del Checkout ---
const CheckoutForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const { cartItems, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [needsClientData, setNeedsClientData] = useState(false);
    const [clienteData, setClienteData] = useState({ nombre: '', apellido: '', email: '', telefono: '', direccion: '', nit_ci: '' });
    const [formErrors, setFormErrors] = useState({});

    const getConfig = () => ({ headers: { 'Authorization': `Token ${token}` } });

    // Protección: Si el carrito está vacío
    useEffect(() => {
        if (!isLoadingProfile && cartItems.length === 0) {
            toast.error("Tu carrito está vacío.");
            navigate('/catalogo', { replace: true });
        }
    }, [cartItems, isLoadingProfile, navigate]);

    // 1. Verificar perfil de cliente al cargar
    useEffect(() => {
        const checkProfile = async () => {
            if (!token) { navigate('/', { replace: true }); return; }
            if (cartItems.length === 0) { setIsLoadingProfile(false); return; }

            setIsLoadingProfile(true);
            const loadingToast = toast.loading('Verificando información...');
            try {
                const response = await axios.get(`${API_BASE_URL}/api/profile/`, getConfig());
                const userData = response.data;
                const clienteProfile = userData.cliente_profile; 

                if (clienteProfile && clienteProfile.direccion) {
                    setClienteData(clienteProfile);
                    setNeedsClientData(false);
                    toast.success('Datos de cliente cargados.', { id: loadingToast });
                } else {
                    setNeedsClientData(true);
                    setClienteData(prev => ({
                        ...prev,
                        nombre: clienteProfile?.nombre || userData.first_name || '',
                        apellido: clienteProfile?.apellido || userData.last_name || '',
                        email: clienteProfile?.email || userData.email || '',
                        telefono: clienteProfile?.telefono || '',
                        direccion: clienteProfile?.direccion || '',
                        nit_ci: clienteProfile?.nit_ci || '',
                    }));
                    toast('Por favor, completa tus datos.', { id: loadingToast, icon: '👤' });
                }
            } catch (error) {
                console.error("Error al verificar perfil:", error);
                toast.error('Error al verificar tu información.', { id: loadingToast });
                if (error.response?.status === 401) {
                    setTimeout(() => navigate('/', { replace: true }), 2000);
                }
                setNeedsClientData(true); 
            } finally {
                setIsLoadingProfile(false);
            }
        };
        
        checkProfile();
    }, [token, navigate, cartItems.length]);

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

    // Manejo del envío del formulario (Lógica de 3 pasos)
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!stripe || !elements || cartItems.length === 0 || isLoadingProfile) return;

        if (needsClientData) {
            if (!validateClienteData()) {
                toast.error('Por favor, corrige los errores en tus datos.');
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
            
            const intentResponse = await axios.post(`${API_BASE_URL}/api/create-payment-intent/`, intentPayload, getConfig());
            const secret = intentResponse.data.clientSecret;

            // PASO 2: Confirmar Pago con Stripe
            toast.loading('Confirmando pago con el banco...', { id: paymentToast });
            const cardElement = elements.getElement(CardElement);
            
            // Verificación crucial: Asegurarse de que el CardElement se encontró
            if (cardElement == null) {
                console.error('Stripe Error: CardElement not found.');
                throw new Error('Error al leer la tarjeta. Intenta recargar la página.');
            }

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

            // PASO 3: Registrar Venta en Backend
            toast.loading('Pago aceptado. Registrando tu pedido...', { id: paymentToast });
            const ventaData = {
                detalles: cartItems.map(item => ({ producto: item.producto.id, cantidad: item.cantidad })),
                ...(needsClientData && { cliente_nuevo: clienteData })
            };
            const ventaCreada = await createVenta(token, ventaData); 

            // PASO 4: ÉXITO TOTAL
            toast.success(`¡Compra completada! Pedido #${ventaCreada.id}.`, { id: paymentToast, duration: 4000 });
            clearCart();
            navigate(`/pago-exitoso/${ventaCreada.id}`, { replace: true });

        } catch (error) {
            console.error("Error en el proceso de pago:", error);
            setIsProcessing(false); 
            let errorMessage = "Ocurrió un error inesperado.";
            let isCriticalError = false;

            if (axios.isAxiosError(error) && error.response) { 
                errorMessage = error.response.data.error || error.response.data.detail || "Error al conectar con el servidor.";
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
    };

    // --- Renderizado ---

    if (isLoadingProfile) {
        return <Spinner text="Verificando información..." />;
    }
    
    if (cartItems.length === 0) {
        return <EmptyCartState />;
    }

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-8">
                    Confirmar y Pagar
                </h1>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Columna Izquierda: Formularios */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Formulario de Cliente (Condicional) */}
                        {needsClientData ? (
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                                <h2 className="text-xl font-semibold text-slate-900 mb-5 flex items-center gap-2">
                                    <User size={22} className="text-indigo-600" />
                                    Datos de Envío y Facturación
                                </h2>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <InputGroup id="nombre" label="Nombre" name="nombre" value={clienteData.nombre} onChange={(e) => setClienteData({...clienteData, nombre: e.target.value})} error={formErrors.nombre} required />
                                        <InputGroup id="apellido" label="Apellido" name="apellido" value={clienteData.apellido} onChange={(e) => setClienteData({...clienteData, apellido: e.target.value})} error={formErrors.apellido} required />
                                    </div>
                                    <InputGroup id="email" label="Email" name="email" type="email" value={clienteData.email} onChange={(e) => setClienteData({...clienteData, email: e.target.value})} error={formErrors.email} required />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                         <InputGroup id="telefono" label="Teléfono" name="telefono" type="tel" value={clienteData.telefono} onChange={(e) => setClienteData({...clienteData, telefono: e.target.value})} placeholder="71234567" />
                                         <InputGroup id="nit_ci" label="NIT/CI" name="nit_ci" type="text" value={clienteData.nit_ci} onChange={(e) => setClienteData({...clienteData, nit_ci: e.target.value})} placeholder="Para tu factura" />
                                    </div>
                                    <InputGroup id="direccion" label="Dirección" type="textarea" rows="3" name="direccion" value={clienteData.direccion} onChange={(e) => setClienteData({...clienteData, direccion: e.target.value})} error={formErrors.direccion} required />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                                    <User size={22} className="text-indigo-600" />
                                    Datos del Cliente
                                </h2>
                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
                                    <p className="font-medium">Usaremos tus datos de cliente guardados:</p>
                                    <p className="text-sm">{clienteData.nombre} {clienteData.apellido}</p>
                                    <p className="text-sm">{clienteData.direccion}</p>
                                </div>
                            </div>
                        )}

                        {/* Formulario de Pago */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                            <h2 className="text-xl font-semibold text-slate-900 mb-5 flex items-center gap-2">
                                <CreditCard size={22} className="text-indigo-600" />
                                Método de Pago
                            </h2>
                            <p className="text-sm text-slate-500 mb-4">Ingresa los datos de tu tarjeta. El pago es 100% seguro.</p>
                            
                            {/* --- ✨ FIX: Wrapper simple para CardElement --- */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Datos de la Tarjeta
                                </label>
                                <div className="p-3.5 border border-slate-300 rounded-lg bg-white shadow-inner focus-within:ring-2 focus-within:ring-indigo-500">
                                    <CardElement options={CARD_ELEMENT_OPTIONS} />
                                </div>
                            </div>
                            
                        </div>

                    </div>

                    {/* Columna Derecha: Resumen y Botón de Pago */}
                    <div className="lg:col-span-1 space-y-6">
                        <OrderSummary cartItems={cartItems} cartTotal={cartTotal} />
                        
                        <button
                            type="submit"
                            disabled={!stripe || isProcessing || isLoadingProfile}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Lock size={20} />}
                            {isProcessing ? 'Procesando Pago...' : `Pagar ${formatPrice(cartTotal)}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckoutForm;