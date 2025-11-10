// src/cliente/ProductCatalog.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/producto';
import { useCart } from '../context/CartContext'; 
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext'; // <-- 1. IMPORTAR HOOK
import ProductCard from './ProductCard'; 
import ProductSkeleton from './ProductSkeleton'; 
import { 
    Search, Mic, Square, Loader2, Send, MessageSquare,
    LayoutGrid, AlertTriangle, Inbox, Filter, ChevronDown, Tag, ArrowUpDown
} from 'lucide-react'; 
import toast from 'react-hot-toast'; 

// --- Componente: Encabezado, Búsqueda y Filtros ---
const ProductHeader = ({ filters, setFilters, categories }) => {
    
    const selectStyles = `
        appearance-none block w-full md:w-auto bg-white border border-slate-300 rounded-lg 
        py-2.5 pl-10 pr-8 text-sm text-slate-700
        focus:outline-none focus:ring-2 focus:ring-indigo-500
    `;
    
    return (
        <div className="mb-6 space-y-4">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <LayoutGrid size={32} className="text-indigo-600" />
                Catálogo de Productos
            </h1>

            <div className="flex flex-col md:flex-row gap-4">
                
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, marca o modelo..."
                        value={filters.searchTerm}
                        onChange={(e) => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm text-sm bg-white 
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                </div>

                <div className="relative w-full md:w-56">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Tag className="h-5 w-5 text-slate-400" />
                    </div>
                    <select 
                        value={filters.category}
                        onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                        className={selectStyles}
                    >
                        <option value="all">Todas las Categorías</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative w-full md:w-56">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ArrowUpDown className="h-5 w-5 text-slate-400" />
                    </div>
                    <select 
                        value={filters.sortOrder}
                        onChange={(e) => setFilters(f => ({ ...f, sortOrder: e.target.value }))}
                        className={selectStyles}
                    >
                        <option value="default">Relevancia</option>
                        <option value="price_asc">Precio: Más Bajo a Más Alto</option>
                        <option value="price_desc">Precio: Más Alto a Más Bajo</option>
                        <option value="name_asc">Nombre: A-Z</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>
        </div>
    );
};

// --- Componente: Barra de Comandos IA (Sin cambios) ---
const CommandBar = ({
    isListening, isCartLoading, isVoiceSupported, 
    textCommand, setTextCommand, handleTextCommandSubmit, 
    handleToggleListen, interimTranscript
}) => (
    <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
        <span className="font-semibold text-slate-800 flex-shrink-0">
            Comandos IA:
        </span>
        <form onSubmit={handleTextCommandSubmit} className="flex-1 flex gap-2 w-full">
            <div className="relative w-full">
                <input
                    type="text"
                    value={textCommand}
                    onChange={(e) => setTextCommand(e.target.value)}
                    placeholder="Ej: 'Añadir 2 licuadoras' o 'Quitar 1 tele'"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                    disabled={isCartLoading || isListening}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MessageSquare className="h-5 w-5 text-slate-400" />
                </div>
            </div>
            <button
                type="submit"
                disabled={isCartLoading || isListening || !textCommand}
                className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
                {isCartLoading && !isListening ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
            </button>
        </form>
        <span className="text-sm text-slate-500 hidden md:block">o</span>
        <button
            onClick={handleToggleListen}
            disabled={!isVoiceSupported || isCartLoading || isListening}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-lg shadow-sm transition w-full md:w-auto
                ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700'}
                ${!isVoiceSupported ? 'bg-slate-300 cursor-not-allowed' : ''}
                ${(isCartLoading && !isListening) ? 'bg-slate-400 cursor-not-allowed' : ''}
            `}
            title={isVoiceSupported ? 'Usar comando de voz' : 'Voz no soportada'}
        >
            {isCartLoading && !isListening ? <Loader2 className="animate-spin" size={18} /> : (isListening ? <Square size={18} /> : <Mic size={18} />)}
            <span>{isListening ? (interimTranscript || 'Escuchando...') : 'Dictar'}</span>
        </button>
    </div>
);

// --- Componente: Grid de Productos ---
// --- ¡CAMBIO AQUÍ! Pasamos 'toggleFavorite' y 'isFavorite' ---
const ProductGrid = ({ 
    isLoading, products, cartItems, handleAddToCart, 
    message, filters, 
    toggleFavorite, isFavorite // <-- 2. AÑADIR PROPS
}) => {
    
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                    <ProductSkeleton key={index} />
                ))}
            </div>
        );
    }
    
    if (message) { // Error de Carga
        return (
            <div className="col-span-full text-center py-12">
                <div className="flex flex-col items-center justify-center text-red-700 p-6 bg-red-50 rounded-lg border border-red-200 max-w-md mx-auto">
                    <AlertTriangle size={32} className="mb-2" />
                    <span className="font-medium">Error al cargar productos</span>
                    <span className="text-sm">{message.replace('❌', '')}</span>
                </div>
            </div>
        );
    }
    
    if (products.length === 0 && (filters.searchTerm || filters.category !== 'all')) { // Sin resultados de filtro
        return (
            <div className="col-span-full text-center py-12">
                <div className="flex flex-col items-center justify-center text-slate-600 max-w-md mx-auto">
                    <Search size={40} className="mb-4 text-slate-400" />
                    <h3 className="text-lg font-semibold">Sin resultados</h3>
                    <p className="text-sm text-slate-500">No se encontraron productos que coincidan con tus filtros.</p>
                </div>
            </div>
        );
    }

    if (products.length === 0) { // Catálogo vacío
        return (
            <div className="col-span-full text-center py-12">
                <div className="flex flex-col items-center justify-center text-slate-600 max-w-md mx-auto">
                    <Inbox size={40} className="mb-4 text-slate-400" />
                    <h3 className="text-lg font-semibold">Catálogo vacío</h3>
                    <p className="text-sm text-slate-500">No hay productos disponibles en este momento.</p>
                </div>
            </div>
        );
    }

    // Mostrar productos
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => {
                const cartItem = cartItems.find(item => item.producto.id === product.id);
                const quantityInCart = cartItem ? cartItem.cantidad : 0;
                return (
                    <ProductCard 
                        key={product.id} 
                        product={product} 
                        onAddToCart={handleAddToCart}
                        quantityInCart={quantityInCart} 
                        // --- 3. PASAR LAS PROPS AL HIJO ---
                        isFavorite={isFavorite(product.id)}
                        onToggleFavorite={() => toggleFavorite(product.id)}
                    />
                );
            })}
        </div>
    );
};


// --- Componente Principal: ProductCatalog ---
const ProductCatalog = () => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    
    const { token } = useAuth(); 
    const { addToCart, cartItems, sendCartCommand, loading: isCartLoading } = useCart(); 
    // --- 4. OBTENER LÓGICA DE FAVORITOS ---
    const { toggleFavorite, isFavorite, isLoadingFavorites } = useFavorites();

    const [filters, setFilters] = useState({
        searchTerm: '',
        category: 'all',
        sortOrder: 'default'
    });

    // Carga inicial de productos
    const loadProducts = useCallback(async () => {
        setIsLoading(true);
        setMessage('');
        try {
            const productList = await getProducts(token); 
            setProducts(productList);
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

    useEffect(() => {
        if (!token) { navigate('/', { replace: true }); return; }
        loadProducts();
    }, [token, navigate, loadProducts]);

    // --- ¡useMemo DE CATEGORÍAS CORREGIDO! ---
    const categories = useMemo(() => {
        const catSet = new Set();
        products.forEach(p => {
            // Usamos 'p.categoria' (el string) en lugar de 'p.nombre'
            if (p.categoria) catSet.add(p.categoria);
        });
        return [...catSet].sort();
    }, [products]);

    // --- useMemo DE PROCESAMIENTO (productos filtrados y ordenados) ---
    const processedProducts = useMemo(() => {
        let filtered = [...products];
        
        // 1. Filtrar por Categoría
        if (filters.category !== 'all') {
            filtered = filtered.filter(p => p.categoria === filters.category);
        }

        // 2. Filtrar por Búsqueda
        const lowerSearch = filters.searchTerm.toLowerCase();
        if (lowerSearch) {
            filtered = filtered.filter(p =>
                p.nombre.toLowerCase().includes(lowerSearch) ||
                p.marca.toLowerCase().includes(lowerSearch) ||
                (p.modelo && p.modelo.toLowerCase().includes(lowerSearch))
            );
        }

        // 3. Ordenar
        switch (filters.sortOrder) {
            case 'price_asc':
                filtered.sort((a, b) => Number(a.precio_final) - Number(b.precio_final));
                break;
            case 'price_desc':
                filtered.sort((a, b) => Number(b.precio_final) - Number(a.precio_final));
                break;
            case 'name_asc':
                filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
                break;
            default:
                break;
        }
        return filtered;
    }, [products, filters]);

    const handleAddToCart = useCallback((product) => {
        addToCart(product, 1);
        toast.success(`"${product.nombre}" añadido al carrito.`, { icon: '🛒' });
    }, [addToCart]);

    // --- Lógica de Comandos de Voz y Texto (Sin cambios) ---
    const [isListening, setIsListening] = useState(false);
    const [isVoiceSupported, setIsVoiceSupported] = useState(true);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [textCommand, setTextCommand] = useState('');
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { setIsVoiceSupported(false); return; }
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = true;
        let accumulatedFinalTranscript = '';
        recognition.onresult = (event) => {
            let interim = '';
            accumulatedFinalTranscript = ''; 
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) { accumulatedFinalTranscript += transcript + ' '; }
                else { interim += transcript; }
            }
            setInterimTranscript(interim);
        };
        recognition.onend = () => {
            setIsListening(false);
            setInterimTranscript('');
            const finalCommand = accumulatedFinalTranscript.trim();
            if (finalCommand) {
                toast(`Procesando: "${finalCommand}"`, { icon: '🤖' });
                sendCartCommand(finalCommand);
            }
            accumulatedFinalTranscript = '';
        };
        recognition.onerror = (event) => {
            if (event.error === 'no-speech') toast.error('No se detectó voz.');
            else if (event.error === 'not-allowed') toast.error('Permiso de micrófono denegado.');
            else toast.error(`Error de micrófono: ${event.error}`);
            setIsListening(false);
            accumulatedFinalTranscript = '';
        };
        return () => recognitionRef.current?.abort();
    }, [sendCartCommand]);

    const handleToggleListen = () => {
        if (isListening) { recognitionRef.current?.stop(); } 
        else { recognitionRef.current?.start(); setIsListening(true); }
    };
    
    const handleTextCommandSubmit = (e) => {
        e.preventDefault();
        if (!textCommand.trim()) return;
        sendCartCommand(textCommand.trim());
        setTextCommand(''); 
    };
    // --- Fin Lógica de Comandos ---

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                
                <ProductHeader 
                    filters={filters}
                    setFilters={setFilters}
                    categories={categories}
                />

                <CommandBar 
                    isListening={isListening}
                    // --- 5. Deshabilitar botones si el carrito O los favoritos están cargando ---
                    isCartLoading={isCartLoading || isLoadingFavorites}
                    isVoiceSupported={isVoiceSupported}
                    textCommand={textCommand}
                    setTextCommand={setTextCommand}
                    handleTextCommandSubmit={handleTextCommandSubmit}
                    handleToggleListen={handleToggleListen}
                    interimTranscript={interimTranscript}
                />

                <div className="mt-8">
                    <ProductGrid 
                        // --- 6. Pasa la carga de productos Y favoritos ---
                        isLoading={isLoading || isLoadingFavorites}
                        products={processedProducts} 
                        cartItems={cartItems}
                        handleAddToCart={handleAddToCart}
                        message={message}
                        filters={filters} 
                        // --- 7. Pasa las funciones de favoritos ---
                        toggleFavorite={toggleFavorite}
                        isFavorite={isFavorite}
                    />
                </div>
                
            </div>
        </div>
    );
};

export default ProductCatalog;