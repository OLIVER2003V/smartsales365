// src/cliente/ProductCatalog.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/producto';
import { useCart } from '../context/CartContext'; // Tu contexto
import ProductCard from './ProductCard'; 
import ProductSkeleton from './ProductSkeleton'; 
import { Search } from 'lucide-react'; 
import toast from 'react-hot-toast'; 

const ProductCatalog = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  
  // Tu contexto exporta 'cartItems', lo cual es correcto
  const { addToCart, cartItems } = useCart(); 

  // Carga inicial de productos
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const productList = await getProducts(token);
      setProducts(productList);
      if (productList.length === 0) {
        setMessage('ℹ️ No hay productos disponibles en este momento.');
      }
    } catch (error) {
      setMessage('❌ Error al cargar los productos.');
      if (error.response?.status === 401) {
        toast.error('Sesión expirada. Redirigiendo...');
        setTimeout(() => navigate('/', { replace: true }), 1500);
      } else {
        toast.error('Error al cargar productos.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, navigate]);

  // Ejecuta la carga inicial
  useEffect(() => {
    if (!token) { navigate('/', { replace: true }); return; }
    loadProducts();
  }, [token, navigate, loadProducts]);

  // Hook useMemo para optimizar el filtrado
  const filteredProducts = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return products.filter(p =>
      p.nombre.toLowerCase().includes(lowerSearch) ||
      p.marca.toLowerCase().includes(lowerSearch) ||
      p.categoria.toLowerCase().includes(lowerSearch) ||
      (p.modelo && p.modelo.toLowerCase().includes(lowerSearch))
    );
  }, [searchTerm, products]);

  // Manejador para añadir al carrito
  const handleAddToCart = useCallback((product) => {
    // Tu CartContext ya maneja la lógica de no añadir más del stock.
    addToCart(product, 1);
    toast.success(`"${product.nombre}" añadido al carrito.`, {
      icon: '🛒',
    });
  }, [addToCart]);


  // Función para renderizar el contenido
  const renderContent = () => {
    if (isLoading) {
      // Muestra 8 esqueletos durante la carga
      return Array.from({ length: 8 }).map((_, index) => (
        <ProductSkeleton key={index} />
      ));
    }

    if (filteredProducts.length > 0) {
      // Muestra las tarjetas de producto
      return filteredProducts.map(product => {
        
        // CORRECCIÓN: Busca el item en el carrito usando la estructura correcta
        const cartItem = cartItems.find(item => item.producto.id === product.id);
        const quantityInCart = cartItem ? cartItem.cantidad : 0;

        return (
          <ProductCard 
            key={product.id} 
            product={product} 
            onAddToCart={handleAddToCart}
            quantityInCart={quantityInCart} // Pasa la cantidad al componente hijo
          />
        );
      });
    }
    
    // Muestra mensaje si la API falló o no hay productos
    if (message) {
      return (
        <div className="col-span-full text-center py-10">
           <div className={`p-4 text-sm rounded-lg font-medium border-l-4 ${message.includes('❌') ? 'bg-red-50 text-red-700 border-red-500' : 'bg-blue-50 text-blue-700 border-blue-500'}`}>
            {message}
          </div>
        </div>
      );
    }
    
    // Muestra mensaje si la búsqueda no arrojó resultados
    if (!message && searchTerm) {
       return (
         <p className="col-span-full text-center text-gray-500 py-10">
           No se encontraron productos que coincidan con "{searchTerm}".
         </p>
       );
    }

    return null; // Caso por defecto
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado y Barra de Búsqueda */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Catálogo de Productos
          </h1>
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder="Buscar por nombre, marca, categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Grid de Contenido (Productos o Esqueletos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog;