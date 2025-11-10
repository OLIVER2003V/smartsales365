// src/productos/ProductList.jsx
import React, { useState } from 'react';
import { deleteProduct } from '../api/producto';
import { useAuth } from '../context/AuthContext';
import { 
    Edit, 
    Trash2, 
    ImageOff, 
    Package,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import ConfirmDeleteModal from '../admin/ConfirmDeleteModal';
import toast from 'react-hot-toast';

// --- ✨ MEJORA: Estado "Sin Resultados" Inteligente ---
const NoResultsState = ({ filters }) => {
    // Comprueba si algún filtro (además del ordenamiento) está activo
    const hasActiveFilters = filters.searchTerm || filters.category !== 'all' || filters.stock !== 'all';

    return (
        <tr>
            <td colSpan="6" className="text-center p-10">
                <div className="flex flex-col items-center justify-center text-slate-500">
                    <AlertTriangle size={32} className="mb-2 text-slate-400" />
                    <span className="font-medium text-slate-700">
                        {hasActiveFilters ? 'No se encontraron productos' : 'Aún no hay productos'}
                    </span>
                    <span className="text-sm">
                        {hasActiveFilters 
                            ? 'Intenta ajustar tu búsqueda o filtros.' 
                            : 'Añade un nuevo producto para empezar.'}
                    </span>
                </div>
            </td>
        </tr>
    );
};

// --- Componente de Lista ---
// ✨ Acepta 'filters' como prop
const ProductList = ({ products, onEdit, refreshProducts, setMessage, isLoading, filters }) => {
    const { token } = useAuth();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleOpenDelete = (product) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
    };

    const handleCloseDelete = () => {
        setProductToDelete(null);
        setIsDeleteModalOpen(false);
    };

    const handleDelete = async () => {
        if (!productToDelete) return;

        setIsDeleting(true);
        // El padre (AdministrarProducto) se encarga de mostrar el 'message'
        
        const promise = deleteProduct(token, productToDelete.id);

        toast.promise(promise, {
            loading: 'Eliminando producto...',
            success: () => {
                // Llama a refreshProducts CON el mensaje de éxito
                refreshProducts('✅ Producto eliminado correctamente.');
                handleCloseDelete();
                return 'Producto eliminado.';
            },
            error: (error) => {
                const errorMsg = error.response?.data?.detail || 'Error al eliminar el producto.';
                setMessage(`❌ ${errorMsg}`); // Muestra el error en el AlertMessage del padre
                handleCloseDelete();
                return errorMsg;
            }
        }).finally(() => {
            setIsDeleting(false);
        });
    };

    // Función para formatear precio
    const formatPrice = (price) => {
        return Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });
    };

    return (
        <>
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-slate-200">
                <div className="relative overflow-x-auto">

                    {isLoading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                            <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                            <span className="ml-3 text-indigo-700 font-medium text-sm">Actualizando lista...</span>
                        </div>
                    )}
                    
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700 w-[5%]">Img</th>
                                <th className="px-6 py-3.5 text-left text-sm font-semibold text-slate-700 w-[30%]">Nombre / Marca</th>
                                <th className="px-6 py-3.5 text-left text-sm font-semibold text-slate-700 w-[15%]">Categoría</th>
                                <th className="px-6 py-3.5 text-center text-sm font-semibold text-slate-700 w-[10%]">Stock</th>
                                <th className="px-6 py-3.5 text-right text-sm font-semibold text-slate-700 w-[15%]">Precio</th>
                                <th className="px-6 py-3.5 text-center text-sm font-semibold text-slate-700 w-[15%]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {/* ✨ Comprueba 'products' (que ya está procesado) */}
                            {products?.length > 0 ? (
                                products.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors duration-150">
                                        
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
                                                {p.imagen_url ? (
                                                    <img src={p.imagen_url} alt={p.nombre} className="h-full w-full object-contain" />
                                                ) : (
                                                    <ImageOff size={18} className="text-slate-400" />
                                                )}
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900 truncate" title={p.nombre}>{p.nombre}</div>
                                            <div className="text-xs text-slate-500">{p.marca} {p.modelo && `(${p.modelo})`}</div>
                                        </td>
                                        
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200">
                                                <Package size={14} /> 
                                                {p.nombre || 'N/A'}
                                            </span>
                                        </td>
                                        
                                        <td className={`px-6 py-4 whitespace-nowrap text-center text-sm font-bold ${p.stock === 0 ? 'text-red-600' : (p.stock <= 5 ? 'text-amber-600' : 'text-slate-700')}`}>
                                            {p.stock}
                                        </td>
                                        
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-indigo-700">
                                            {formatPrice(p.precio_final || p.precio)}
                                        </td>
                                        
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => onEdit(p)}
                                                    className="p-2 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" 
                                                    title="Editar Producto"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenDelete(p)}
                                                    className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" 
                                                    title="Eliminar Producto"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                // ✨ Pasa los filtros al estado de "Sin Resultados"
                                <NoResultsState filters={filters} />
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isDeleteModalOpen && (
                <ConfirmDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseDelete}
                    onConfirm={handleDelete}
                    usuario={{ 
                        username: productToDelete?.nombre,
                        email: `Producto (ID: ${productToDelete?.id})`,
                    }}
                    isDeleting={isDeleting}
                />
            )}
        </>
    );
};

export default ProductList;