// src/cliente/ProductCard.jsx
import React, { useState } from 'react';
import { ShoppingCart, ImageOff, AlertTriangle, CheckCircle } from 'lucide-react'; // Importa CheckCircle

// Formateador de moneda
const formatPrice = (price) => {
  const numericPrice = Number(price);
  if (isNaN(numericPrice)) return 'Precio no disponible';
  return numericPrice.toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });
};

// --- PASO 4: Recibir la nueva prop 'quantityInCart' ---
const ProductCard = ({ product, onAddToCart, quantityInCart = 0 }) => {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCartClick = () => {
    setIsAdding(true);
    onAddToCart(product);
    
    setTimeout(() => {
      setIsAdding(false);
    }, 1000); 
  };

  // --- PASO 5: Mejorar la lógica de estado ---
  const stock = product.stock;
  const hasStock = stock > 0;
  // Comprueba si la cantidad en el carrito ya es igual o mayor al stock
  const isAtLimit = quantityInCart >= stock; 
  // Solo muestra "Últimos!" si hay stock Y AÚN no se llega al límite
  const lowStock = hasStock && !isAtLimit && stock <= 5;

  // --- PASO 6: Lógica mejorada para el estado del botón ---
  const getButtonState = () => {
    if (isAdding) {
      return { 
        text: 'Añadiendo...', 
        disabled: true, 
        classes: 'bg-blue-600 text-white opacity-70' 
      };
    }
    if (!hasStock) {
      return { 
        text: 'Agotado', 
        disabled: true, 
        classes: 'bg-gray-300 text-gray-500 cursor-not-allowed' 
      };
    }
    if (isAtLimit) {
      return { 
        text: 'En el carrito', 
        disabled: true, 
        // Un estilo "sutil" para indicar que ya está al límite
        classes: 'bg-gray-200 text-gray-600 cursor-not-allowed' 
      };
    }
    return { 
      text: ( <><ShoppingCart size={16} /> Añadir</> ), 
      disabled: false, 
      classes: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800' 
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col transition duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1.5 group">
      {/* Imagen */}
      <div className="h-56 w-full bg-gray-100 flex items-center justify-center overflow-hidden relative">
        {product.imagen_url ? (
          <img 
            src={product.imagen_url} 
            alt={product.nombre} 
            className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110" 
          />
        ) : (
          <div className="flex flex-col items-center text-gray-400">
            <ImageOff size={48} strokeWidth={1.5} />
            <span className="text-xs mt-1">Imagen no disponible</span>
          </div>
        )}
        
        {/* --- PASO 7: Badges de Stock actualizados --- */}
        {!hasStock && (
          <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
            <AlertTriangle size={14} />
            Agotado
          </div>
        )}
        {/* NUEVO BADGE: Se muestra si hay stock pero se alcanzó el límite */}
        {hasStock && isAtLimit && (
           <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
            <CheckCircle size={14} />
            Límite en carrito
          </div>
        )}
        {/* BADGE MEJORADO: 'lowStock' ahora sabe si ya se alcanzó el límite */}
        {lowStock && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            ¡Últimos {stock - quantityInCart}!
          </div>
        )}
      </div>
      
      {/* Contenido */}
      <div className="p-5 flex flex-col flex-grow">
        <p className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full self-start mb-2 font-semibold tracking-wide">
          {product.categoria}
        </p>
        
        <h3 className="text-lg font-bold text-gray-900 truncate mb-1" title={product.nombre}>
          {product.nombre}
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {product.marca} {product.modelo && <span className="text-xs">({product.modelo})</span>}
        </p>
        
        {/* Footer (Precio y Botón) */}
        <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100">
          <p className="text-2xl font-extrabold text-blue-700">{formatPrice(product.precio)}</p>
          
          {/* --- PASO 8: Botón actualizado --- */}
          <button
            onClick={handleAddToCartClick}
            disabled={buttonState.disabled}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              buttonState.classes
            }`}
            aria-label={`Añadir ${product.nombre} al carrito`}
          >
            {buttonState.text}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;