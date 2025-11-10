import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';

import { getFavoritos } from '../api/favorito';
import ProductCard from './ProductCard';

import toast from 'react-hot-toast';
import { Loader2, AlertTriangle, ArrowLeft, Heart } from 'lucide-react';

// --- Pequeños componentes reutilizables ---
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-[60vh]">
    <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
  </div>
);

const ErrorState = ({ message }) => (
  <div className="text-center py-16 px-6 bg-white rounded-lg border-2 border-dashed border-red-300">
    <AlertTriangle size={40} className="mx-auto text-red-500" />
    <h3 className="mt-4 text-base font-semibold text-red-700">
      Error al cargar favoritos
    </h3>
    <p className="mt-1 text-sm text-slate-500">{message}</p>
  </div>
);

const Favoritos = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { cartItems, addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const [favoritos, setFavoritos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Helpers ---
  const getQuantityInCart = (productId) => {
    const item = cartItems.find((i) => i.producto.id === productId);
    return item ? item.cantidad : 0;
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    toast.success(`"${product.nombre}" añadido al carrito.`, { icon: '🛒' });
  };

  const handleToggleFavorite = async (productId) => {
    try {
      await toggleFavorite(productId);
      // Actualizamos la lista local para que el producto desaparezca de la vista
      setFavoritos((prev) =>
        prev.filter((fav) => fav.producto.id !== productId)
      );
    } catch (err) {
      console.error('Error al quitar de favoritos:', err);
      toast.error('No se pudo actualizar este favorito.');
    }
  };

  // --- Carga inicial de favoritos ---
  useEffect(() => {
    const fetchFavoritos = async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await getFavoritos(token);
        // API devuelve: [{ id, producto: {...}, fecha_agregado }, ...]
        setFavoritos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error al cargar favoritos:', err);
        setError('No se pudieron cargar tus productos favoritos.');
        toast.error('Error al cargar tus favoritos.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavoritos();
  }, [token, navigate]);

  // --- Estados globales ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <Header favoritosCount={0} />
          <ErrorState message={error} />
        </div>
      </div>
    );
  }

  const favoritosCount = favoritos.length;

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Encabezado */}
        <Header favoritosCount={favoritosCount} />

        {/* Contenido */}
        {favoritosCount === 0 ? (
          <EmptyState />
        ) : (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoritos.map((fav) => {
                const product = fav.producto;
                return (
                  <ProductCard
                    key={fav.id}
                    product={product}
                    onAddToCart={() => handleAddToCart(product)}
                    quantityInCart={getQuantityInCart(product.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={isFavorite(product.id) ?? true}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

// --- Subcomponentes de la página ---
const Header = ({ favoritosCount }) => (
  <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div className="flex items-center gap-2 text-slate-700">
      <Link
        to="/catalogo"
        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
      >
        <ArrowLeft size={16} />
        Volver al catálogo
      </Link>
    </div>

    <div className="flex items-center justify-between md:justify-end gap-3">
      <div className="flex items-center gap-2">
        <Heart className="text-rose-500 fill-rose-100" size={20} />
        <div className="flex flex-col">
          <h1 className="text-lg md:text-xl font-semibold text-slate-900">
            Mis productos favoritos
          </h1>
          <p className="text-xs text-slate-500">
            {favoritosCount > 0
              ? `${favoritosCount} producto(s) guardado(s)`
              : 'Aún no has guardado ningún producto.'}
          </p>
        </div>
      </div>
    </div>
  </header>
);

const EmptyState = () => (
  <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 flex flex-col items-center justify-center text-center space-y-3">
    <Heart size={40} className="text-slate-300" />
    <h2 className="text-base md:text-lg font-semibold text-slate-800">
      No tienes productos favoritos todavía
    </h2>
    <p className="text-sm text-slate-500 max-w-md">
      Explora el catálogo y toca el icono de corazón en los productos que más
      te gusten para guardarlos aquí y encontrarlos rápidamente más adelante.
    </p>
    <Link
      to="/catalogo"
      className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
    >
      Ver catálogo
    </Link>
  </section>
);

export default Favoritos;
