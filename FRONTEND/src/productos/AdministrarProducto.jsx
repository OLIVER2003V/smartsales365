// src/productos/AdministrarProducto.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/producto';
import { getCategorias } from '../api/categoria'; // Sigue siendo necesario para ProductForm
import { useAuth } from '../context/AuthContext';
import { 
    Bookmark, 
    Loader2, 
    Package, 
    Plus, 
    Upload, 
    Search, 
    ArrowLeft,
    AlertTriangle, 
    CheckCircle, 
    Info, 
    X,
    Tag, 
    Archive, 
    ArrowUpDown,
    ChevronDown
} from 'lucide-react';
import ProductList from './ProductList';
import ProductForm from './ProductForm';
import MassUploadForm from './MassUploadForm';
import toast from 'react-hot-toast';

const VIEW_MODES = { LIST: 'LIST', CREATE: 'CREATE', EDIT: 'EDIT', MASS_UPLOAD: 'MASS_UPLOAD' };

// --- Componentes de UI Locales (Sin cambios) ---
const LoadingIndicator = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
        <p className="mt-3 text-lg font-medium">Cargando inventario...</p>
    </div>
);
const AlertMessage = ({ msg, type, onDismiss }) => {
    if (!msg) return null;
    let config = { icon: <Info size={18} />, styles: "bg-blue-50 text-blue-700 border-blue-200" };
    if (type === 'error') config = { icon: <AlertTriangle size={18} />, styles: "bg-red-50 text-red-700 border-red-200" };
    else if (type === 'success') config = { icon: <CheckCircle size={18} />, styles: "bg-green-50 text-green-700 border-green-200" };
    return (
        <div className={`w-full p-4 rounded-lg border flex justify-between items-center ${config.styles}`} role="alert">
            <div className="flex items-center gap-3"><span className="flex-shrink-0">{config.icon}</span><span className="text-sm font-medium">{msg}</span></div>
            {onDismiss && (<button onClick={onDismiss} className={`ml-2 p-1 rounded-full hover:bg-black/10 transition-colors ${config.styles}`}><X size={18} /></button>)}
        </div>
    );
};
const selectBaseStyles = `
    appearance-none block w-full pl-10 pr-8 py-2.5 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
`;
// --- Fin Componentes de UI ---


// --- Componente Principal ---
const AdministrarProducto = () => {
    const [allProducts, setAllProducts] = useState(null); 
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [isLoading, setIsLoading] = useState(true); 
    const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [categoriasApi, setCategoriasApi] = useState([]); // Para el Formulario
    
    const [filters, setFilters] = useState({
        searchTerm: '',
        category: 'all', // <-- Este será el NOMBRE de la categoría (string)
        stock: 'all',
        sort: 'nombre_asc'
    });
    
    const navigate = useNavigate();
    const { token, user } = useAuth();

    // 1. Cargar Categorías (Solo para el FORMULARIO)
    const fetchCategorias = useCallback(async (authToken) => {
        try {
            const categoriaList = await getCategorias(authToken);
            setCategoriasApi(categoriaList); // Guarda la lista de la API para ProductForm
        } catch (error) {
            console.error("Error al cargar categorías:", error);
            setMessage("❌ Error al cargar las categorías. El formulario de productos puede no funcionar.");
            setMessageType('error');
        }
    }, []);

    // 2. Cargar Productos (Igual que antes)
    const refreshProducts = useCallback(async (successMsg = null) => {
        if (!token) return;
        setIsLoading(true);
        if (!successMsg) setMessage('');

        await Promise.all([
            fetchCategorias(token),
            (async () => {
                try {
                    const productList = await getProducts(token);
                    setAllProducts(productList);
                    if (successMsg) {
                        setMessage(successMsg); setMessageType('success');
                    } else if (productList.length > 0) {
                        setMessage(`✅ ${productList.length} productos cargados.`); setMessageType('success');
                    } else {
                        setMessage("ℹ️ No hay productos registrados."); setMessageType('info');
                    }
                } catch (error) {
                    setAllProducts([]);
                    // ... (manejo de errores)
                    setMessage("❌ Error al conectar con el API."); setMessageType('error');
                }
            })()
        ]);

        setIsLoading(false);
        if (message) { 
            setTimeout(() => setMessage(''), 3000);
        }
    }, [token, navigate, fetchCategorias, message]);

    // Carga inicial
    useEffect(() => {
        if (!user || (user.rol !== 'ADM' && user.rol !== 'VEN')) {
            toast.error('Acceso denegado. Solo Admin o Vendedores.');
            navigate('/'); return;
        }
        if (token) {
            refreshProducts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, user, navigate]);

    // --- ✨✨ CORRECCIÓN #1: `useMemo` para la lista de filtros de categoría ---
    // (Exactamente como en ProductCatalog.jsx)
    const categoriasParaFiltro = useMemo(() => {
        const catSet = new Set();
        if (allProducts) {
            allProducts.forEach(p => {
                // Usamos 'categoria_nombre' que viene del producto
                if (p.nombre) catSet.add(p.nombre);
            });
        }
        return [...catSet].sort();
    }, [allProducts]); // Depende solo de los productos

    // --- ✨✨ CORRECCIÓN #2: `useMemo` para procesar los productos ---
    const processedProducts = useMemo(() => {
        if (!allProducts) return [];
        
        let filtered = [...allProducts];

        // 1. Filtrar por Categoría (string)
        if (filters.category !== 'all') {
            // Compara el string del filtro (ej: "Cocina") con el string del producto
            filtered = filtered.filter(p => p.nombre === filters.category);
        }
        // --- FIN DE LA CORRECCIÓN ---

        // 2. Filtrar por Stock
        if (filters.stock === 'in_stock') {
            filtered = filtered.filter(p => p.stock > 0);
        } else if (filters.stock === 'low_stock') {
            filtered = filtered.filter(p => p.stock > 0 && p.stock <= 5);
        } else if (filters.stock === 'out_of_stock') {
            filtered = filtered.filter(p => p.stock === 0);
        }

        // 3. Filtrar por Búsqueda
        const lowerSearch = filters.searchTerm.toLowerCase();
        if (lowerSearch) {
            filtered = filtered.filter(p =>
                p.nombre.toLowerCase().includes(lowerSearch) ||
                p.marca.toLowerCase().includes(lowerSearch) ||
                (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(lowerSearch)) ||
                (p.modelo && p.modelo.toLowerCase().includes(lowerSearch))
            );
        }

        // 4. Ordenar
        filtered.sort((a, b) => {
            switch (filters.sort) {
                case 'precio_desc': return Number(b.precio) - Number(a.precio);
                case 'precio_asc': return Number(a.precio) - Number(b.precio);
                case 'stock_desc': return b.stock - a.stock;
                case 'stock_asc': return a.stock - b.stock;
                case 'nombre_asc':
                default: return a.nombre.localeCompare(b.nombre);
            }
        });

        return filtered;
    }, [allProducts, filters]); // Ya no depende de 'categorias'

    // Manejador para todos los filtros
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // 4. Manejadores de Navegación (sin cambios)
    const handleEdit = (product) => { setSelectedProduct(product); setViewMode(VIEW_MODES.EDIT); setMessage(''); };
    const handleCancel = () => { setViewMode(VIEW_MODES.LIST); setSelectedProduct(null); setMessage(''); };
    const handleSuccess = (view, successMessage) => { setViewMode(view); setSelectedProduct(null); refreshProducts(successMessage); };
    const handleShowCreate = () => { setViewMode(VIEW_MODES.CREATE); setSelectedProduct(null); setMessage(''); };

    // 5. Renderizado Condicional
    const renderContent = () => {
        if (isLoading && !allProducts) { return <LoadingIndicator />; }
        switch (viewMode) {
            // Pasa 'categoriasApi' (la lista con IDs) al formulario
            case VIEW_MODES.CREATE:
                return <ProductForm product={null} categorias={categoriasApi} onSuccess={() => handleSuccess(VIEW_MODES.LIST, '✅ Producto creado.')} onCancel={handleCancel} setMessage={setMessage} />;
            case VIEW_MODES.EDIT:
                return <ProductForm product={selectedProduct} categorias={categoriasApi} onSuccess={() => handleSuccess(VIEW_MODES.LIST, '✅ Producto actualizado.')} onCancel={handleCancel} setMessage={setMessage} />;
            case VIEW_MODES.MASS_UPLOAD:
                return <MassUploadForm onSuccess={() => handleSuccess(VIEW_MODES.LIST, '✅ Carga masiva completada.')} onCancel={handleCancel} setMessage={setMessage} />;
            case VIEW_MODES.LIST:
            default:
                if (!allProducts) return <LoadingIndicator />;
                return <ProductList products={processedProducts} onEdit={handleEdit} refreshProducts={refreshProducts} setMessage={setMessage} isLoading={isLoading} filters={filters} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="w-full max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200 space-y-6">
                {/* --- Encabezado --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Package size={30} className="text-indigo-600" />
                        Gestión de Inventario
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {viewMode === VIEW_MODES.LIST ? (
                            <>
                                <button onClick={() => navigate('/categorias')} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition">
                                    <Bookmark size={16} /><span>Categorías</span>
                                </button>
                                <button onClick={() => setViewMode(VIEW_MODES.MASS_UPLOAD)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-emerald-700 transition">
                                    <Upload size={16} /><span>Subida Masiva</span>
                                </button>
                                <button onClick={handleShowCreate} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition">
                                    <Plus size={18} /><span>Nuevo Producto</span>
                                </button>
                            </>
                        ) : (
                            <button onClick={handleCancel} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition">
                                <ArrowLeft size={16} /><span>Volver a la Lista</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* --- Barra de Búsqueda y Mensaje --- */}
                <div className="space-y-4">
                    <AlertMessage msg={message} type={messageType} onDismiss={() => setMessage('')} />
                
                    {viewMode === VIEW_MODES.LIST && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Buscador */}
                            <div className="relative md:col-span-2 lg:col-span-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={20} className="text-slate-400" /></div>
                                <input
                                    type="text"
                                    name="searchTerm"
                                    placeholder="Buscar por nombre, marca..."
                                    value={filters.searchTerm}
                                    onChange={handleFilterChange}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg shadow-sm text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            {/* --- ✨✨ CORRECCIÓN #3: Select de Categoría --- */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Tag size={18} className="text-slate-400" /></div>
                                <select name="category" value={filters.category} onChange={handleFilterChange} className={selectBaseStyles}>
                                    <option value="all">Todas las Categorías</option>
                                    {/* Ahora itera sobre los NOMBRES de 'categoriasParaFiltro' */}
                                    {categoriasParaFiltro.map(catNombre => (
                                        <option key={catNombre} value={catNombre}>{catNombre}</option>
                                    ))}
                                </select>
                                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                            
                            {/* Filtro Stock */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Archive size={18} className="text-slate-400" /></div>
                                <select name="stock" value={filters.stock} onChange={handleFilterChange} className={selectBaseStyles}>
                                    <option value="all">Todo el Stock</option>
                                    <option value="in_stock">En Stock</option>
                                    <option value="low_stock">Stock Bajo (&lt;= 5)</option>
                                    <option value="out_of_stock">Agotado</option>
                                </select>
                                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                            
                            {/* Ordenar */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ArrowUpDown size={18} className="text-slate-400" /></div>
                                <select name="sort" value={filters.sort} onChange={handleFilterChange} className={selectBaseStyles}>
                                    <option value="nombre_asc">Nombre (A-Z)</option>
                                    <option value="precio_desc">Precio (Mayor a Menor)</option>
                                    <option value="precio_asc">Precio (Menor a Mayor)</option>
                                    <option value="stock_desc">Stock (Mayor a Menor)</option>
                                    <option value="stock_asc">Stock (Menor a Mayor)</option>
                                </select>
                                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    )}
                </div>

                {/* --- Contenido Principal (Lista o Formularios) --- */}
                <div className="mt-6 min-h-[400px]">
                    {renderContent()}
                </div>

            </div>
        </div>
    );
};

export default AdministrarProducto;