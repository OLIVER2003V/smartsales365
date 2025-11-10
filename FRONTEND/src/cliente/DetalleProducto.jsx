// src/cliente/DetalleProducto.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { getProductoById } from '../api/producto';
import { getResenasPorProducto } from '../api/resena';
import toast from 'react-hot-toast';
import StarRating from '../components/StarRating';
import {
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ShoppingCart,
  Heart,
  Truck,
  ShieldCheck,
  ImageOff,
  Minus,
  Plus,
  Star,
} from 'lucide-react';

// ---------- Helpers ----------
const formatPrice = (price) => {
  const numericPrice = Number(price);
  if (isNaN(numericPrice)) return 'Precio no disponible';
  return numericPrice.toLocaleString('es-BO', {
    style: 'currency',
    currency: 'BOB',
  });
};

const formatReviewDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-BO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

// ---------- UI pequeños ----------
const StockBadge = ({ stock }) => {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
        Agotado
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
        ¡Últimos {stock}!
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-200">
      En Stock
    </span>
  );
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-[60vh]">
    <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
  </div>
);

const ErrorState = ({ message }) => (
  <div className="text-center py-20 px-6 bg-white rounded-lg border-2 border-dashed border-red-300">
    <AlertTriangle size={48} className="mx-auto text-red-500" />
    <h3 className="mt-4 text-lg font-semibold text-red-700">Error al cargar</h3>
    <p className="mt-1 text-sm text-slate-500">{message}</p>
  </div>
);

// Estrellitas pequeñas para cada reseña
const SmallStars = ({ value = 0 }) => {
  const rating = Number(value) || 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={
            n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
          }
        />
      ))}
    </div>
  );
};

// ---------- Componente principal ----------
const DetalleProducto = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addToCart, cartItems } = useCart();
  const { toggleFavorite, isFavorite, isLoadingFavorites } = useFavorites();

  const [producto, setProducto] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  // Reseñas
  const [resenas, setResenas] = useState([]);
  const [isLoadingResenas, setIsLoadingResenas] = useState(false);

  // ---------- Fetch de producto + reseñas ----------
  useEffect(() => {
    const fetchProductoYResenas = async () => {
      if (!token || !id) {
        navigate('/catalogo');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1) Detalle del producto
        const data = await getProductoById(token, id);
        setProducto(data);

        // 2) Reseñas del producto (endpoint público)
        setIsLoadingResenas(true);
        try {
          const resenasData = await getResenasPorProducto(id);
          setResenas(Array.isArray(resenasData) ? resenasData : []);
        } catch (errResenas) {
          console.error('Error al cargar reseñas:', errResenas);
        } finally {
          setIsLoadingResenas(false);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('No se pudo encontrar el producto.');
        toast.error('Error al cargar el producto.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductoYResenas();
  }, [id, token, navigate]);

  // ---------- Handlers ----------
  const handleUpdateCantidad = (delta) => {
    setCantidad((prev) => {
      const nueva = prev + delta;
      if (!producto) return prev;
      if (nueva < 1) return 1;
      if (nueva > producto.stock) return producto.stock;
      return nueva;
    });
  };

  const handleAddToCart = () => {
    if (!producto) return;
    addToCart(producto, cantidad);
    toast.success(`${cantidad} x "${producto.nombre}" añadido(s) al carrito.`, {
      icon: '🛒',
    });
  };

  const handleToggleFavorite = () => {
    if (!producto) return;
    toggleFavorite(producto.id);
  };

  // ---------- Derivados ----------
  const itemEnCarrito = cartItems.find(
    (item) => item.producto.id === producto?.id
  );
  const cantidadEnCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0;
  const stockDisponible = (producto?.stock || 0) - cantidadEnCarrito;
  const canAddToCart = stockDisponible > 0 && cantidad <= stockDisponible;

  // ---------- Estados globales de carga / error ----------
  if (isLoading || isLoadingFavorites || isLoadingResenas) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!producto) return null;

  const precioMostrado = Number(producto.precio_final);
  const precioOriginal = Number(producto.precio);
  const hayOferta = precioMostrado < precioOriginal;
  const productoEsFavorito = isFavorite(producto.id);

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Volver */}
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
        >
          <ArrowLeft size={18} />
          Volver al Catálogo
        </Link>

        {/* TARJETA PRINCIPAL */}
        <div className="bg-white p-6 md:p-10 rounded-xl shadow-lg border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Imagen */}
            <div className="w-full h-[380px] md:h-[420px] flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
              {producto.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400 gap-2">
                  <ImageOff size={64} />
                  <span className="text-xs">Imagen no disponible</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-semibold ring-1 ring-inset ring-indigo-200">
                  {producto.categoria || 'Sin Categoría'}
                </span>
                <StockBadge stock={producto.stock} />
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                  {producto.nombre}
                </h1>
                <p className="mt-1 text-sm md:text-base text-slate-500">
                  Por{' '}
                  <span className="font-medium text-slate-700">
                    {producto.marca}
                  </span>
                  {producto.modelo && ` · Modelo: ${producto.modelo}`}
                </p>
              </div>

              {/* Rating global */}
              <div className="pb-2">
                <StarRating
                  rating={producto.calificacion_promedio}
                  totalResenas={producto.total_resenas}
                />
              </div>

              {/* Precios */}
              <div className="pb-4 border-b border-slate-200">
                {hayOferta && (
                  <p className="text-lg md:text-xl text-slate-500 line-through">
                    {formatPrice(precioOriginal)}
                  </p>
                )}
                <p
                  className={`text-4xl md:text-5xl font-extrabold ${
                    hayOferta ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {formatPrice(precioMostrado)}
                </p>
                {hayOferta && (
                  <p className="mt-1 text-xs md:text-sm text-emerald-600 font-medium">
                    ¡Oferta especial aplicada a este producto!
                  </p>
                )}
              </div>

              {/* Cantidad */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-sm font-medium text-slate-700">
                  Cantidad:
                </span>
                <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50">
                  <button
                    onClick={() => handleUpdateCantidad(-1)}
                    disabled={cantidad <= 1}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-l-lg transition focus:outline-none disabled:opacity-50"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-semibold text-slate-800 text-sm select-none">
                    {cantidad}
                  </span>
                  <button
                    onClick={() => handleUpdateCantidad(1)}
                    disabled={cantidad >= producto.stock || !canAddToCart}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-r-lg transition focus:outline-none disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {stockDisponible < cantidad && producto.stock > 0 && (
                  <span className="text-xs text-red-600">
                    Límite de stock alcanzado
                  </span>
                )}
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  disabled={!canAddToCart || producto.stock === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white text-base font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition disabled:bg-slate-400"
                >
                  <ShoppingCart size={18} />
                  {producto.stock === 0
                    ? 'Agotado'
                    : canAddToCart
                    ? 'Añadir al Carrito'
                    : 'Límite en Carrito'}
                </button>
                <button
                  onClick={handleToggleFavorite}
                  className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 text-base font-semibold rounded-lg border border-slate-300 shadow-sm hover:bg-slate-50 transition"
                  title={
                    productoEsFavorito
                      ? 'Quitar de favoritos'
                      : 'Añadir a favoritos'
                  }
                >
                  <Heart
                    size={18}
                    className={
                      productoEsFavorito
                        ? 'text-red-500 fill-red-500'
                        : 'text-slate-600'
                    }
                  />
                  {productoEsFavorito ? 'En tus favoritos' : 'Guardar'}
                </button>
              </div>

              {/* Extra info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs md:text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-indigo-500" />
                  <span>Envíos a todo el país.</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span>Compra protegida y garantía del proveedor.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DESCRIPCIÓN + RESEÑAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Descripción */}
          <section className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Detalle del producto
            </h2>
            {producto.descripcion ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {producto.descripcion}
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic">
                Este producto aún no tiene una descripción detallada.
              </p>
            )}

            <div className="mt-3 text-xs text-slate-500">
              <p>
                <span className="font-semibold">Código:</span>{' '}
                {producto.codigo || producto.id}
              </p>
              {typeof producto.stock === 'number' && (
                <p>
                  <span className="font-semibold">Stock disponible:</span>{' '}
                  {producto.stock} unidad(es)
                </p>
              )}
            </div>
          </section>

          {/* Reseñas */}
          <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-900">
                Opiniones de clientes
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {resenas.length > 0
                  ? `${resenas.length} reseña(s) en total`
                  : 'Sin reseñas todavía'}
              </span>
            </div>

            {resenas.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-lg py-6 px-4 text-center text-sm text-slate-500">
                Aún no hay reseñas para este producto.
                <br />
                <span className="font-medium text-slate-700">
                  ¡Sé el primero en opinar después de comprarlo!
                </span>
              </div>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {resenas.map((r) => {
                  const nombre = r.usuario_username || 'Usuario';
                  const inicial = nombre.trim().charAt(0).toUpperCase();
                  const fecha = r.fecha_creacion;

                  return (
                    <article
                      key={r.id}
                      className="flex gap-3 border border-slate-100 rounded-lg p-3 bg-slate-50/60"
                    >
                      {/* Avatar con inicial */}
                      <div className="flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                          {inicial || 'U'}
                        </div>
                      </div>

                      {/* Contenido de la reseña */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800">
                              {nombre}
                            </span>
                            {fecha && (
                              <span className="text-[11px] text-slate-400">
                                {formatReviewDate(fecha)}
                              </span>
                            )}
                          </div>
                          <SmallStars value={r.calificacion} />
                        </div>

                        {r.titulo && (
                          <p className="text-xs font-semibold text-slate-700">
                            {r.titulo}
                          </p>
                        )}

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {r.comentario}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DetalleProducto;
