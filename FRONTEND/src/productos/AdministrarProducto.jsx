// src/login/AdministrarProducto.jsx (Contenedor Principal Mejorado)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/producto';
import ProductList from './ProductList';
import ProductForm from './ProductForm';
import MassUploadForm from './MassUploadForm';
// Importa un ícono de búsqueda (si usas una librería como react-icons)
// import { FiSearch } from 'react-icons/fi';

const VIEW_MODES = { LIST: 'LIST', CREATE: 'CREATE', EDIT: 'EDIT', MASS_UPLOAD: 'MASS_UPLOAD' };

const AdministrarProducto = ({ token }) => {
    const [allProducts, setAllProducts] = useState(null); // Lista original sin filtrar
    const [filteredProducts, setFilteredProducts] = useState(null); // Lista para mostrar
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true); // Estado de carga inicial
    const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // <-- Estado para la búsqueda

    const navigate = useNavigate();

    // 1. Cargar Productos
    const refreshProducts = useCallback(async () => {
        setIsLoading(true);
        setMessage('');
        try {
            const productList = await getProducts(token);
            setAllProducts(productList);
            setFilteredProducts(productList); // Inicialmente, la lista filtrada es la misma
            setMessage(`✅ ${productList.length} electrodomésticos cargados.`);
        } catch (error) {
            setAllProducts([]);
            setFilteredProducts([]);
            // ... (manejo de errores existente) ...
             if (error.response?.status === 403) {
                setMessage("❌ Acceso Denegado (403): Rol no permitido.");
            } else if (error.response?.status === 401) {
                setMessage("❌ Sesión expirada. Redirigiendo...");
                setTimeout(() => navigate('/', { replace: true }), 1500);
            } else {
                setMessage("❌ Error al conectar con el API.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [token, navigate]);

    useEffect(() => {
        if (!token) {
            navigate('/', { replace: true });
            return;
        }
        refreshProducts();
    }, [token, navigate, refreshProducts]);

    // 2. Lógica de Búsqueda y Filtrado
    useEffect(() => {
        if (!allProducts) return;

        const lowerCaseSearch = searchTerm.toLowerCase();
        const filtered = allProducts.filter(p =>
            p.nombre.toLowerCase().includes(lowerCaseSearch) ||
            p.marca.toLowerCase().includes(lowerCaseSearch) ||
            p.categoria.toLowerCase().includes(lowerCaseSearch) ||
            (p.modelo && p.modelo.toLowerCase().includes(lowerCaseSearch))
        );
        setFilteredProducts(filtered);
    }, [searchTerm, allProducts]);

    // 3. Manejar Edición
    const handleEdit = (product) => {
        setSelectedProduct(product);
        setViewMode(VIEW_MODES.EDIT);
        setMessage('');
    };

    // 4. Renderizado Condicional
    const renderContent = () => {
        if (isLoading && viewMode === VIEW_MODES.LIST) {
             return (
                <div className="flex justify-center items-center h-64">
                    <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                    <span className="ml-3 text-gray-600">Cargando inventario...</span>
                </div>
            );
        }

        switch (viewMode) {
            case VIEW_MODES.CREATE:
                 return <ProductForm token={token} product={null} onSuccess={() => { refreshProducts(); setViewMode(VIEW_MODES.LIST); setMessage('✅ Producto creado.'); }} onCancel={() => setViewMode(VIEW_MODES.LIST)} setMessage={setMessage} />;
            case VIEW_MODES.EDIT:
                 return <ProductForm token={token} product={selectedProduct} onSuccess={() => { refreshProducts(); setViewMode(VIEW_MODES.LIST); setMessage('✅ Producto actualizado.'); }} onCancel={() => setViewMode(VIEW_MODES.LIST)} setMessage={setMessage} />;
            case VIEW_MODES.MASS_UPLOAD:
                 return <MassUploadForm token={token} onSuccess={() => { console.log("onSuccess triggered in Parent, calling refresh..."); refreshProducts(); setViewMode(VIEW_MODES.LIST); setMessage('✅ Carga masiva exitosa.'); }} onCancel={() => setViewMode(VIEW_MODES.LIST)} setMessage={setMessage} />;
            case VIEW_MODES.LIST:
            default:
                 return <ProductList products={filteredProducts} onEdit={handleEdit} refreshProducts={refreshProducts} token={token} setMessage={setMessage} />;
        }
    };

    return (
        // Contenedor principal con padding y fondo gris claro
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            {/* Tarjeta blanca principal */}
            <div className="w-full max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-xl space-y-6">

                {/* --- Encabezado --- */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 pb-4 mb-6">
                    {/* Título */}
                    <h1 className="text-3xl md:text-4xl font-bold text-blue-900">
                        Gestión de Inventario 📦
                    </h1>

                    {/* Botones de Acción (solo en modo Lista) */}
                    {viewMode === VIEW_MODES.LIST && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => setViewMode(VIEW_MODES.CREATE)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition"
                            >
                                {/* <FiPlusCircle className="h-5 w-5" /> */}
                                <span>Nuevo Producto</span>
                            </button>
                            <button
                                onClick={() => setViewMode(VIEW_MODES.MASS_UPLOAD)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition"
                            >
                                {/* <FiUpload className="h-5 w-5" /> */}
                                <span>Subida Masiva</span>
                            </button>
                        </div>
                    )}
                     {/* Botón para volver a la lista si no estamos en ella */}
                    {viewMode !== VIEW_MODES.LIST && (
                         <button
                            onClick={() => setViewMode(VIEW_MODES.LIST)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition"
                         >
                            {/* <FiArrowLeft className="h-5 w-5" /> */}
                             <span>Volver a la Lista</span>
                         </button>
                    )}
                </div>

                 {/* --- Barra de Búsqueda y Mensaje (solo en modo Lista) --- */}
                {viewMode === VIEW_MODES.LIST && (
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        {/* Buscador */}
                        <div className="relative w-full md:w-1/3">
                            <input
                                type="text"
                                placeholder="Buscar por nombre, marca, categoría..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                {/* <FiSearch className="h-5 w-5 text-gray-400" /> */}
                                🔍 {/* Icono simple si no usas librería */}
                            </div>
                        </div>

                         {/* Mensaje de Estado */}
                         <p className={`flex-shrink-0 text-sm font-medium p-2 rounded-md ${message.includes('❌') ? 'bg-red-100 text-red-700' : (message.includes('✅') ? 'bg-green-100 text-green-700' : 'text-gray-600')}`}>
                             {message}
                         </p>
                    </div>
                )}

                 {/* --- Contenido Principal (Lista o Formularios) --- */}
                 <div className="mt-6">
                     {renderContent()}
                 </div>

            </div>
        </div>
    );
};

export default AdministrarProducto;