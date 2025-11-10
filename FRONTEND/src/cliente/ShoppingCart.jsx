// src/cliente/ShoppingCart.jsx
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { 
    ShoppingCart as CartIcon, 
    Trash2 as TrashIcon, 
    Plus, 
    Minus, 
    Frown,
    ArrowLeft,
    Package // ✨ Icono para placeholder
} from 'lucide-react';

// --- Utilidades de Formato ---
const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

// --- ✨ MEJORA: Estado de Carrito Vacío ---
const EmptyCart = () => {
    const navigate = useNavigate();
    return (
        <div className="text-center bg-white p-12 rounded-xl shadow-lg border border-slate-200">
            <Frown size={64} className="mx-auto text-slate-400" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-semibold text-slate-800">Tu carrito está vacío</h2>
            <p className="mt-2 text-slate-500">Parece que aún no has añadido nada.</p>
            <button 
                onClick={() => navigate('/catalogo')}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <ArrowLeft size={18} />
                Volver al Catálogo
            </button>
        </div>
    );
};

// --- ✨ MEJORA: Componente de Control de Cantidad ---
const QuantityControl = ({ item, onUpdate }) => (
    <div className="flex items-center border border-slate-300 rounded-lg">
        <button 
            onClick={() => onUpdate(item.producto.id, item.cantidad - 1)} 
            className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-l-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Restar uno"
        >
            <Minus size={16} />
        </button>
        <span className="w-12 text-center font-semibold text-slate-800 text-sm select-none">
            {item.cantidad}
        </span>
        <button 
            onClick={() => onUpdate(item.producto.id, item.cantidad + 1)} 
            disabled={item.cantidad >= item.producto.stock} 
            className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-r-lg transition focus:outline-none disabled:text-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Añadir uno"
        >
            <Plus size={16} />
        </button>
    </div>
);

// --- ✨ MEJORA: Componente de Fila de Producto en Carrito ---
const CartItem = ({ item, onUpdate, onRemove }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        
        {/* Info Producto */}
        <div className="flex items-center gap-4 flex-1">
            <div className="flex-shrink-0 h-20 w-20 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
                {item.producto.imagen_url ? (
                    <img 
                        src={item.producto.imagen_url} 
                        alt={item.producto.nombre} 
                        className="h-full w-full object-contain" 
                    />
                ) : (
                    <Package size={32} className="text-slate-400" />
                )}
            </div>
            <div className="flex-1">
                <Link to={`/producto/${item.producto.id}`} className="font-semibold text-lg text-slate-900 hover:text-indigo-600 hover:underline">
                    {item.producto.nombre}
                </Link>
                <p className="text-sm text-slate-500">{item.producto.marca}</p>
                <p className="text-sm font-medium text-indigo-700 mt-1">{formatPrice(item.producto.precio_final)} c/u</p>
            </div>
        </div>

        {/* Controles y Subtotal */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
            <QuantityControl item={item} onUpdate={onUpdate} />
            
            <div className="text-right sm:w-28">
                <p className="font-semibold text-lg text-slate-900">{formatPrice(item.cantidad * item.producto.precio_final)}</p>
                {item.cantidad >= item.producto.stock && (
                    <p className="text-xs text-amber-600 font-medium">Stock máx.</p>
                )}
            </div>
            
            <button 
                onClick={() => onRemove(item)} 
                className="text-slate-400 hover:text-red-600 transition" 
                title="Eliminar item"
            >
                <TrashIcon size={20} />
            </button>
        </div>
    </div>
);

// --- ✨ MEJORA: Componente de Resumen de Orden ---
const OrderSummary = ({ itemCount, cartTotal, onCheckout }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 sticky top-24">
        <h2 className="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-4">
            Resumen de Compra
        </h2>
        <div className="space-y-3">
            <div className="flex justify-between text-slate-600">
                <p>Subtotal ({itemCount} {itemCount === 1 ? 'ítem' : 'ítems'})</p>
                <p className="font-medium text-slate-800">{formatPrice(cartTotal)}</p>
            </div>
            
        </div>
        
        <div className="border-t border-slate-200 mt-4 pt-4">
            <div className="flex justify-between items-baseline font-bold text-slate-900">
                <p className="text-lg">Total</p>
                <p className="text-2xl">{formatPrice(cartTotal)}</p>
            </div>
        </div>
        
        <button 
            onClick={onCheckout} 
            className="mt-6 w-full inline-flex justify-center items-center px-6 py-3 bg-indigo-600 text-white text-lg font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
            Proceder al Pago
        </button>
    </div>
);

// --- Componente Principal ---
const ShoppingCart = () => {
    const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal, itemCount } = useCart();
    const navigate = useNavigate();

    // ✨ MEJORA UX: Feedback no bloqueante
    const handleRemoveItem = (item) => {
        removeFromCart(item.producto.id);
        toast.error(`"${item.producto.nombre}" eliminado.`);
    };

    const handleClearCart = () => {
        if (cartItems.length > 0) {
            clearCart();
            toast.success("Carrito vaciado.");
        }
    };

    const handleProceedToCheckout = () => {
        navigate('/checkout'); 
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                
                {/* Encabezado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <CartIcon size={32} />
                        Tu Carrito
                    </h1>
                    {cartItems.length > 0 && (
                        <button 
                            onClick={handleClearCart} 
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                        >
                            <TrashIcon size={16} />
                            Vaciar Carrito
                        </button>
                    )}
                </div>

                {cartItems.length === 0 ? (
                    <EmptyCart />
                ) : (
                    // Layout de 2 Columnas
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Columna Izquierda: Lista de Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {cartItems.map(item => (
                                <CartItem 
                                    key={item.producto.id}
                                    item={item}
                                    onUpdate={updateQuantity}
                                    onRemove={handleRemoveItem}
                                />
                            ))}
                        </div>

                        {/* Columna Derecha: Resumen de Compra */}
                        <div className="lg:col-span-1">
                            <OrderSummary 
                                itemCount={itemCount}
                                cartTotal={cartTotal}
                                onCheckout={handleProceedToCheckout}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShoppingCart;