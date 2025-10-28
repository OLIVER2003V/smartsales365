// src/login/ProductList.jsx
import React from 'react';
import { deleteProduct } from '../api/producto';
// import { FiEdit, FiTrash2 } from 'react-icons/fi'; // Iconos opcionales

const ProductList = ({ products, onEdit, refreshProducts, token, setMessage }) => {

    const handleDelete = async (id, productName) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar "${productName}"? Esta acción no se puede deshacer.`)) return;

        setMessage('Eliminando producto...');
        try {
            await deleteProduct(token, id);
            setMessage('✅ Producto eliminado correctamente.');
            refreshProducts();
        } catch (error) {
            setMessage('❌ Error al eliminar el producto. Intenta de nuevo.');
        }
    };

    // Mensaje si no hay productos o la búsqueda no arrojó resultados
    if (!products || products.length === 0) {
        return (
            <div className="text-center py-16 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
                <p className="mt-1 text-sm text-gray-500">Intenta ajustar tu búsqueda o añade nuevos productos.</p>
            </div>
        );
    }

    // Función para formatear precio (ajusta a tu moneda si es necesario)
    const formatPrice = (price) => {
        return Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' }); // Formato Boliviano
    };

    return (
        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                    <tr>
                        {/* Columna Opcional para Imagen */}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Img</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre / Marca</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Categoría</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors duration-150">
                            {/* Celda Imagen */}
                            <td className="px-4 py-2 whitespace-nowrap">
                                {p.imagen_url ? (
                                    <img src={p.imagen_url} alt={p.nombre} className="h-10 w-10 object-contain rounded-md" />
                                ) : (
                                    <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center text-gray-400 text-xs">Sin img</div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{p.nombre}</div>
                                <div className="text-xs text-gray-500">{p.marca} {p.modelo && `(${p.modelo})`}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.categoria}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold">{p.stock}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-800">{formatPrice(p.precio)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-3">
                                <button
                                    onClick={() => onEdit(p)}
                                    className="text-indigo-600 hover:text-indigo-900 transition"
                                    title="Editar Producto"
                                >
                                    {/* <FiEdit className="h-5 w-5 inline" /> */}
                                     ✏️ Editar {/* Icono simple */}
                                </button>
                                <button
                                    onClick={() => handleDelete(p.id, p.nombre)}
                                    className="text-red-600 hover:text-red-900 transition"
                                    title="Eliminar Producto"
                                >
                                    {/* <FiTrash2 className="h-5 w-5 inline" /> */}
                                     🗑️ Eliminar {/* Icono simple */}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ProductList;