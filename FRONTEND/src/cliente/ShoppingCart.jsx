// src/cliente/ShoppingCart.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext'; // Hook del carrito
import toast from 'react-hot-toast'; // Usaremos toast para feedback

// Iconos "Pro" de Lucide
import { 
  ShoppingCart as CartIcon, 
  Trash2 as TrashIcon, 
  Plus, 
  Minus, 
  Frown, // Para el carrito vacío
  ArrowLeft // Para el botón de volver
} from 'lucide-react';

const ShoppingCart = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal, itemCount } = useCart();
  const navigate = useNavigate();

  const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

  // Confirmación para eliminar
  const handleRemoveItem = (item) => {
    if (window.confirm(`¿Seguro que deseas eliminar "${item.producto.nombre}" del carrito?`)) {
      removeFromCart(item.producto.id);
      toast.error(`"${item.producto.nombre}" eliminado.`);
    }
  };

  // Confirmación para vaciar carrito
  const handleClearCart = () => {
    if (cartItems.length > 0 && window.confirm("¿Seguro que deseas vaciar todo el carrito?")) {
      clearCart();
      toast.success("Carrito vaciado.");
    }
  };

  const handleProceedToCheckout = () => {
    // Simplemente navega. El log 'Procediendo...' ya no es necesario.
    navigate('/checkout'); 
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <CartIcon size={32} />
            Tu Carrito
          </h1>
          {cartItems.length > 0 && (
            <button 
              onClick={handleClearCart} 
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              <TrashIcon size={16} />
              Vaciar Carrito
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          // Estado de Carrito Vacío
          <div className="text-center bg-white p-12 rounded-lg shadow-md border border-gray-200">
            <Frown size={64} className="mx-auto text-gray-400" strokeWidth={1} />
            <h2 className="mt-4 text-2xl font-semibold text-gray-800">Tu carrito está vacío</h2>
            <p className="mt-2 text-gray-500">Parece que aún no has añadido nada.</p>
            <button 
              onClick={() => navigate('/catalogo')}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <ArrowLeft size={18} />
              Volver al Catálogo
            </button>
          </div>
        ) : (
          // Layout de 2 Columnas
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Columna Izquierda: Lista de Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map(item => (
                <div 
                  key={item.producto.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-5 rounded-lg shadow-sm border border-gray-200"
                >
                  {/* Info Producto */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* --- CORRECCIÓN DE URL AQUÍ --- */}
                    <img 
                      src={item.producto.imagen_url || 'https://placehold.co/80x80/EFEFEF/AAAAAA?text=Sin+Imagen'} 
                      alt={item.producto.nombre} 
                      className="h-20 w-20 object-contain rounded-md border bg-gray-50" 
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-lg text-gray-900">{item.producto.nombre}</p>
                      <p className="text-sm text-gray-500">{item.producto.marca}</p>
                      <p className="text-sm font-medium text-blue-600 mt-1">{formatPrice(item.producto.precio)} c/u</p>
                    </div>
                  </div>

                  {/* Controles y Subtotal */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button 
                        onClick={() => updateQuantity(item.producto.id, item.cantidad - 1)} 
                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg transition focus:outline-none"
                        aria-label="Restar uno"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center font-semibold text-gray-800 text-sm">{item.cantidad}</span>
                      <button 
                        onClick={() => updateQuantity(item.producto.id, item.cantidad + 1)} 
                        disabled={item.cantidad >= item.producto.stock} 
                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg transition focus:outline-none disabled:text-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        aria-label="Añadir uno"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    <div className="text-right sm:w-28">
                       <p className="font-semibold text-lg text-gray-900">{formatPrice(item.cantidad * item.producto.precio)}</p>
                       {item.cantidad >= item.producto.stock && (
                         <p className="text-xs text-orange-600 font-medium">Stock máx.</p>
                       )}
                    </div>
                    
                    <button 
                      onClick={() => handleRemoveItem(item)} 
                      className="text-gray-400 hover:text-red-600 transition" 
                      title="Eliminar item"
                    >
                      <TrashIcon size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Columna Derecha: Resumen de Compra */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 sticky top-24">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-4">
                  Resumen de Compra
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <p>Subtotal ({itemCount} {itemCount === 1 ? 'ítem' : 'ítems'})</p>
                    <p className="font-medium">{formatPrice(cartTotal)}</p>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <p>Envío</p>
                    <p className="font-medium">A calcular</p>
                  </div>
                </div>
                
                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between items-baseline font-bold text-gray-900">
                    <p className="text-lg">Total</p>
                    <p className="text-2xl">{formatPrice(cartTotal)}</p>
                  </div>
                </div>
                
                <button 
                  onClick={handleProceedToCheckout} 
                  className="mt-6 w-full inline-flex justify-center items-center px-6 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Proceder al Pago
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingCart;