import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import toast from 'react-hot-toast';

// --- API ---
// Importamos las funciones de sus archivos correctos
import { getProductoById } from '../api/producto'; 
import { 
    getResenasPorProducto, 
    createResena // <-- Usamos el nombre 'createResena' de tu api/resena.js
} from '../api/resena'; 

// --- Componentes e Iconos ---
import StarRating from '../components/StarRating'; 
import { 
    Loader2, AlertTriangle, ImageOff, Percent, ShoppingCart, 
    Heart, CheckCircle, Minus, Plus, ArrowLeft, Send, Star
} from 'lucide-react';

const formatPrice = (price) => {
    const numericPrice = Number(price);
    if (isNaN(numericPrice)) return 'N/A';
    return numericPrice.toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });
};

// --- Componente de Reseña Individual ---
const ReviewItem = ({ review }) => (
    <div className="py-4 border-b border-slate-200">
        <div className="flex items-center mb-1">
            <StarRating rating={review.calificacion} readOnly={true} />
            <span className="ml-2 text-sm font-semibold text-slate-800">{review.titulo}</span>
        </div>
        <p className="text-sm text-slate-600 mb-2">
            Por <span className="font-medium">{review.usuario_nombre || 'Anónimo'}</span> 
            el {new Date(review.fecha_creacion).toLocaleDateString('es-ES')}
        </p>
        <p className="text-slate-700 text-base">{review.comentario}</p>
    </div>
);

// --- Componente de Formulario de Reseña ---
const ReviewForm = ({ productoId, user, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [titulo, setTitulo] = useState('');
    const [comentario, setComentario] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { token } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0 || !titulo || !comentario) {
            toast.error("Por favor, completa la calificación, título y comentario.");
            return;
        }
        setIsSubmitting(true);
        try {
            // Tu API 'createResena' espera (token, resenaData)
            const nuevaResena = await createResena(token, { 
                producto: productoId, // El backend espera el ID del producto en el cuerpo
                calificacion: rating, 
                titulo, 
                comentario 
            });
            toast.success("¡Gracias por tu reseña!");
            onReviewSubmitted(nuevaResena); // Añade la nueva reseña a la lista en vivo
            setRating(0);
            setTitulo('');
            setComentario('');
        } catch (error) {
            console.error("Error al enviar reseña:", error);
            toast.error(error.error || "Error al enviar reseña. Es posible que ya hayas reseñado este producto.");
        } finally {
            setIsSubmitting(false);
        }
    };

    
};


// --- Componente Principal ---
const DetalleProducto = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const { addToCart, cartItems, loading: isCartLoading } = useCart();
    const { isFavorite, toggleFavorite, isLoadingFavorites } = useFavorites();

    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);

    // Carga de datos del producto y reseñas
    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            setIsLoading(true);
            setError('');
            try {
                // 1. Llama a 'getProductoById' (necesita token)
                // 2. Llama a 'getResenasPorProducto' (no necesita token según tu api/resena.js)
                const [productData, reviewsData] = await Promise.all([
                    getProductoById(token, id), // Nombre corregido
                    getResenasPorProducto(id)  // Argumentos corregidos (solo ID)
                ]);
                
                setProduct(productData);
                setReviews(reviewsData);

            } catch (err) {
                console.error("Error al cargar datos:", err);
                setError("No se pudo cargar el producto. Inténtalo de nuevo.");
                toast.error("Error al cargar el producto.");
                navigate('/catalogo'); // Redirige si el producto no se encuentra
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [id, token, navigate]); // Depende de 'token' porque getProductoById lo usa

    // --- Lógica del Carrito ---
    // --- ✨ ¡AQUÍ ESTÁ LA CORRECCIÓN DEL ERROR DE INICIALIZACIÓN! ---
    const { quantityInCart, stockDisponible, stockStatus } = useMemo(() => {
        if (!product) return { quantityInCart: 0, stockDisponible: 0, stockStatus: 'Agotado' };

        const itemInCart = cartItems.find(item => item.producto.id === product.id);
        const qInCart = itemInCart ? itemInCart.cantidad : 0;
        const sDisponible = product.stock - qInCart;

        let status = 'Disponible'; // Se declara la variable 'status'
        if (product.stock <= 0) status = 'Agotado';
        else if (sDisponible <= 0) status = 'En Carrito (Límite)';
        else if (sDisponible <= 5) status = 'Pocas Unidades';
        
        // El error estaba aquí: Se debe retornar 'status', no 'stockStatus'
        return { quantityInCart: qInCart, stockDisponible: sDisponible, stockStatus: status };
    }, [product, cartItems]);
    // --- FIN DE LA CORRECCIÓN ---

    const handleQuantityChange = (delta) => {
        setQuantity(prev => {
            const newQty = prev + delta;
            if (newQty < 1) return 1;
            if (newQty > stockDisponible && stockDisponible > 0) return stockDisponible;
            if (stockDisponible <= 0) return 1;
            return newQty;
        });
    };

    const handleAddToCart = () => {
        if (quantity > stockDisponible || quantity <= 0) {
            toast.error("No puedes añadir esa cantidad.");
            return;
        }
        setIsAdding(true);
        addToCart(product, quantity);
        toast.success(`Añadido ${quantity} x "${product.nombre}" al carrito.`, { icon: '🛒' });
        setQuantity(1); 
        setTimeout(() => setIsAdding(false), 1000);
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        toggleFavorite(product.id);
    };

    // Añade la nueva reseña a la lista sin recargar la página
    const handleReviewSubmitted = (nuevaResena) => {
        setReviews([nuevaResena, ...reviews]);
        setProduct(prev => {
            const newTotalResenas = (prev.total_resenas || 0) + 1;
            const newPromedio = ((prev.calificacion_promedio * (prev.total_resenas || 0)) + nuevaResena.calificacion) / newTotalResenas;
            return {
                ...prev,
                total_resenas: newTotalResenas,
                calificacion_promedio: newPromedio
            };
        });
    };

    // --- Renderizado ---
    if (isLoading || isLoadingFavorites) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-64px)] text-red-600">
                <AlertTriangle size={24} className="mr-2" /> {error}
            </div>
        );
    }

    if (!product) return null; // No renderiza nada si el producto no está

    // Variables de estado para la UI
    const isProductFavorite = isFavorite(product.id);
    const hayOferta = product.precio_final < product.precio;

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="container mx-auto max-w-7xl p-4 md:p-8">
                
                {/* Botón Volver */}
                <button
                    onClick={() => navigate('/catalogo')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-4"
                >
                    <ArrowLeft size={16} />
                    Volver al Catálogo
                </button>

                {/* Grid Principal */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 md:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                        
                        {/* --- Columna de Imagen --- */}
                        <div className="relative h-96 md:h-[500px] w-full bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {product.imagen_url ? (
                                <img
                                    src={product.imagen_url}
                                    alt={product.nombre}
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <ImageOff size={64} className="text-slate-400" />
                            )}
                            {hayOferta && (
                                <div className="absolute top-4 left-4 bg-red-600 text-white text-sm font-medium px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                    <Percent size={16} />
                                    ¡OFERTA!
                                </div>
                            )}
                        </div>

                        {/* --- Columna de Detalles --- */}
                        <div className="flex flex-col justify-center">
                            <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
                                {product.categoria || 'Sin Categoría'}
                            </span>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-1 mb-2">
                                {product.nombre}
                            </h1>
                            <p className="text-lg text-slate-500 mb-3">{product.marca} {product.modelo}</p>
                            
                            <div className="mb-4">
                                <StarRating 
                                    rating={product.calificacion_promedio} 
                                    totalResenas={product.total_resenas}
                                    readOnly={true}
                                />
                            </div>

                            {/* Precios */}
                            <div className="mb-4">
                                {hayOferta && (
                                    <p className="text-xl text-slate-500 line-through">
                                        {formatPrice(product.precio)}
                                    </p>
                                )}
                                <p className={`text-4xl font-extrabold ${hayOferta ? 'text-red-600' : 'text-slate-800'}`}>
                                    {formatPrice(product.precio_final)}
                                </p>
                            </div>

                            {/* Stock */}
                            <div className="mb-5">
                                {stockStatus === 'Agotado' && (
                                    <span className="flex items-center text-base font-semibold text-red-600"><AlertTriangle size={18} className="mr-2" />Agotado</span>
                                )}
                                {stockStatus === 'Pocas Unidades' && (
                                    <span className="flex items-center text-base font-semibold text-amber-600"><AlertTriangle size={18} className="mr-2" />¡Pocas unidades! ({stockDisponible} disp.)</span>
                                )}
                                {stockStatus === 'Disponible' && (
                                    <span className="flex items-center text-base font-semibold text-green-600"><CheckCircle size={18} className="mr-2" />En Stock</span>
                                )}
                                {stockStatus === 'En Carrito (Límite)' && (
                                    <span className="flex items-center text-base font-semibold text-slate-600"><CheckCircle size={18} className="mr-2" />Ya tienes el máximo en tu carrito</span>
                                )}
                            </div>

                            {/* Acciones (Añadir al carrito y Favorito) */}
                            {stockStatus !== 'Agotado' && (
                                <div className="flex items-center gap-3 mb-6">
                                    {/* Selector de Cantidad */}
                                    <div className="flex items-center border border-slate-300 rounded-lg">
                                        <button
                                            onClick={() => handleQuantityChange(-1)}
                                            disabled={quantity <= 1}
                                            className="px-3 py-3 text-slate-600 hover:bg-slate-100 rounded-l-lg disabled:opacity-50"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="px-5 text-lg font-bold w-16 text-center">{quantity}</span>
                                        <button
                                            onClick={() => handleQuantityChange(1)}
                                            disabled={quantity >= stockDisponible}
                                            className="px-3 py-3 text-slate-600 hover:bg-slate-100 rounded-r-lg disabled:opacity-50"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    
                                    {/* Botón Añadir */}
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={isAdding || isCartLoading || stockDisponible <= 0 || quantity > stockDisponible}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                                    >
                                        {isAdding ? <Loader2 className="animate-spin" size={20} /> : <ShoppingCart size={20} />}
                                        Añadir al Carrito
                                    </button>
                                </div>
                            )}

                             {/* Botón de Favorito (separado) */}
                            <button
                                onClick={handleFavoriteClick}
                                className={`inline-flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                                    isProductFavorite 
                                    ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
                                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                                }`}
                            >
                                <Heart size={20} className={isProductFavorite ? 'fill-current' : ''} />
                                {isProductFavorite ? 'Guardado en Favoritos' : 'Guardar en Favoritos'}
                            </button>

                            {/* Descripción */}
                            {product.descripcion && (
                                <div className="mt-8 border-t border-slate-200 pt-6">
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">Descripción</h3>
                                    <p className="text-slate-600 whitespace-pre-wrap">{product.descripcion}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Sección de Reseñas --- */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 md:p-8 mt-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">
                        Reseñas y Calificaciones ({product.total_resenas || 0})
                    </h2>

                    {/* Lista de Reseñas */}
                    <div className="mb-6">
                        {reviews.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">Este producto aún no tiene reseñas. ¡Sé el primero!</p>
                        ) : (
                            reviews.map(review => <ReviewItem key={review.id} review={review} />)
                        )}
                    </div>

                    {/* Formulario de Reseña */}
                    <ReviewForm 
                        productoId={product.id} 
                        user={user} 
                        onReviewSubmitted={handleReviewSubmitted} 
                    />
                </div>

            </div>
        </div>
    );
};

export default DetalleProducto;