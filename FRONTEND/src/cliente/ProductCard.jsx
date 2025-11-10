// src/cliente/ProductCard.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  ImageOff,
  AlertTriangle,
  CheckCircle,
  Percent,
  Loader2,
  Heart
} from 'lucide-react';
import StarRating from '../components/StarRating';
import toast from 'react-hot-toast';

const formatPrice = (price) => {
  const numericPrice = Number(price);
  if (isNaN(numericPrice)) return 'Precio no disponible';
  return numericPrice.toLocaleString('es-BO', {
    style: 'currency',
    currency: 'BOB',
  });
};

const ProductCard = ({
  product,
  onAddToCart,
  quantityInCart = 0,
  onToggleFavorite,
  isFavorite,
}) => {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    onAddToCart(product);
    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(product.id);
  };

  const precioMostrado = Number(product.precio_final);
  const precioOriginal = Number(product.precio);
  const hayOferta = precioMostrado < precioOriginal;
  const stock = product.stock;
  const hasStock = stock > 0;
  const isAtLimit = quantityInCart >= stock;
  const lowStock = hasStock && !isAtLimit && stock <= 5;

  // solo mostramos la banda de OFERTA si hay stock
  const showOferta = product.promocion_aplicada && hasStock;

  const getButtonState = () => {
    if (!hasStock)
      return {
        icon: <AlertTriangle size={16} />,
        text: 'Agotado',
        disabled: true,
        classes: 'bg-slate-300 text-slate-500 cursor-not-allowed',
      };
    if (isAtLimit)
      return {
        icon: <CheckCircle size={16} />,
        text: 'En Carrito',
        disabled: true,
        classes: 'bg-green-600 text-white cursor-not-allowed',
      };
    if (isAdding)
      return {
        icon: <Loader2 size={16} className="animate-spin" />,
        text: null,
        disabled: true,
        classes: 'bg-indigo-600 text-white opacity-70',
      };
    return {
      icon: <ShoppingCart size={16} />,
      text: 'Añadir',
      disabled: false,
      classes:
        'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
    };
  };
  const buttonState = getButtonState();

  return (
    <Link
      to={`/producto/${product.id}`}
      className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden flex flex-col transition duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1.5 group"
    >
      <div className="h-56 w-full bg-slate-100 flex items-center justify-center overflow-hidden relative">
        {product.imagen_url ? (
          <img
            src={product.imagen_url}
            alt={product.nombre}
            className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
          />
        ) : (
          <div className="flex flex-col items-center text-slate-400">
            <ImageOff size={48} strokeWidth={1.5} />
            <span className="text-xs mt-1">Imagen no disponible</span>
          </div>
        )}

        {/* Botón de Favorito */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/70 backdrop-blur-sm text-slate-700 hover:text-red-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
          title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          <Heart
            size={20}
            className={isFavorite ? 'text-red-500 fill-red-500' : 'text-slate-600'}
          />
        </button>

        {/* Badges de Oferta / Stock (NUNCA se sobreponen) */}
        {(showOferta || lowStock || !hasStock) && (
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {showOferta && (
              <div className="bg-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                <Percent size={14} />
                ¡OFERTA!
              </div>
            )}

            {lowStock && (
              <div className="bg-amber-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                <AlertTriangle size={14} />
                ¡Quedan pocas unidades!
              </div>
            )}

            {!hasStock && (
              <div className="bg-slate-700 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                <AlertTriangle size={14} />
                Agotado
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5 flex flex-col flex-grow">
        <p className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full self-start mb-2 font-semibold tracking-wide ring-1 ring-inset ring-indigo-200">
          {product.categoria || 'Sin Categoría'}
        </p>
        <h3
          className="text-lg font-bold text-slate-900 truncate mb-1 group-hover:text-indigo-700"
          title={product.nombre}
        >
          {product.nombre}
        </h3>
        <p className="text-sm text-slate-500 mb-2">
          {product.marca}{' '}
          {product.modelo && <span className="text-xs">({product.modelo})</span>}
        </p>
        <div className="mb-3">
          <StarRating
            rating={product.calificacion_promedio}
            totalResenas={product.total_resenas}
          />
        </div>

        {/* Footer (Precio y Botón) */}
        <div className="mt-auto flex justify-between items-center pt-4 border-t border-slate-100">
          <div className="flex flex-col items-start">
            {hayOferta && (
              <p className="text-sm text-slate-500 line-through -mb-1">
                {formatPrice(precioOriginal)}
              </p>
            )}
            <p
              className={`text-2xl font-extrabold ${
                hayOferta ? 'text-red-600' : 'text-indigo-700'
              }`}
            >
              {formatPrice(precioMostrado)}
            </p>
          </div>
          <button
            onClick={handleAddToCartClick}
            disabled={buttonState.disabled}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-lg shadow-md transition ${buttonState.classes}`}
            aria-label={`Añadir ${product.nombre} al carrito`}
          >
            {buttonState.icon}
            {buttonState.text && <span>{buttonState.text}</span>}
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
