// src/categorias/GestionCategorias.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Edit,
    Trash2,
    Loader2,
    Search,
    PlusCircle,
    Bookmark, // Icono temático para Categorías
    AlertTriangle,
} from 'lucide-react';

// --- API ---
import { getCategorias, deleteCategoria } from '../api/categoria';
// --- Contexto ---
import { useAuth } from '../context/AuthContext';

// --- Componentes ---
import CategoriaModal from './CategoriaModal';
import ConfirmDeleteModal from '../admin/ConfirmDeleteModal'; // Asumimos esta ruta

// --- Icono de Carga Profesional ---
const SpinnerIcon = () => (
    <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
    </div>
);

// --- Componente de Estado Vacío Profesional ---
const EmptyState = ({ onActionClick }) => (
    <div className="text-center py-20 px-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <Bookmark size={48} className="mx-auto text-gray-400" strokeWidth={1.5} />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay categorías</h3>
        <p className="mt-1 text-sm text-gray-500">Aún no se ha creado ninguna categoría.</p>
        <div className="mt-6">
            <button
                type="button"
                onClick={onActionClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <PlusCircle size={18} />
                Crear Primera Categoría
            </button>
        </div>
    </div>
);

// --- Componente para Fila sin Resultados (Búsqueda) ---
const NoResultsRow = ({ colSpan }) => (
    <tr>
        <td colSpan={colSpan} className="text-center p-10">
            <div className="flex flex-col items-center justify-center text-gray-500">
                <AlertTriangle size={32} className="mb-2 text-gray-400" />
                <span className="font-medium">No se encontraron categorías</span>
                <span className="text-sm">Intenta con un término de búsqueda diferente.</span>
            </div>
        </td>
    </tr>
);

// --- Componente Principal ---
const GestionCategorias = () => {
    const navigate = useNavigate();
    const { token, user } = useAuth();

    const [categorias, setCategorias] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de Modales
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCategoria, setSelectedCategoria] = useState(null);
    const [categoriaToDelete, setCategoriaToDelete] = useState(null);

    // Protección de ruta
    useEffect(() => {
        if (!user || (user.rol !== 'ADM' && user.rol !== 'VEN')) {
            toast.error('Acceso denegado. Solo Admin o Vendedores.');
            navigate('/');
        }
    }, [user, navigate]);

    // Cargar Datos
    const fetchCategorias = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const data = await getCategorias(token);
            setCategorias(data);
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            toast.error('Error al cargar la lista de categorías.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token && (user?.rol === 'ADM' || user?.rol === 'VEN')) {
            fetchCategorias();
        }
    }, [token, user, fetchCategorias]);

    // --- Manejadores de Acciones ---
    const handleOpenCreate = () => {
        setSelectedCategoria(null);
        setIsModalOpen(true);
    };
    const handleOpenEdit = (categoria) => {
        setSelectedCategoria(categoria);
        setIsModalOpen(true);
    };
    const handleOpenDelete = (categoria) => {
        setCategoriaToDelete(categoria);
        setIsDeleteModalOpen(true);
    };
    const handleCloseModals = () => {
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
        setSelectedCategoria(null);
        setCategoriaToDelete(null);
    };
    const handleSuccess = () => {
        handleCloseModals();
        fetchCategorias();
    };

    const handleDeleteConfirm = async () => {
        if (!categoriaToDelete) return;
        const promise = deleteCategoria(token, categoriaToDelete.id);
        toast.promise(promise, {
            loading: 'Eliminando categoría...',
            success: () => {
                handleSuccess();
                return 'Categoría eliminada exitosamente.';
            },
            error: (error) => {
                if (error.response?.status === 409) {
                    return 'Error: Esta categoría tiene productos asociados.';
                }
                return 'Error al eliminar la categoría.';
            },
        });
    };

    // Filtrado
    const filteredCategorias = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (!term) return categorias;
        return categorias.filter(
            (c) =>
                c.nombre?.toLowerCase().includes(term) ||
                c.descripcion?.toLowerCase().includes(term)
        );
    }, [categorias, searchTerm]);

    // --- Renderizado ---
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 p-4 md:p-8">
                <SpinnerIcon />
            </div>
        );
    }

    if (user?.rol !== 'ADM' && user?.rol !== 'VEN') {
        return null; 
    }

    return (
        <>
            <div className="min-h-screen bg-slate-100 p-4 md:p-8">
                <div className="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
                    
                    {/* Encabezado */}
                    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                                <Bookmark size={30} className="text-indigo-600" />
                                Gestión de Categorías
                            </h1>
                            <p className="text-gray-600 mt-1 text-sm">
                                Crear, editar y eliminar categorías de productos.
                            </p>
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
                        >
                            <PlusCircle size={18} />
                            Crear Categoría
                        </button>
                    </header>
                    
                    {/* Contenido Principal */}
                    {categorias.length === 0 ? (
                        <EmptyState onActionClick={handleOpenCreate} />
                    ) : (
                        <>
                            {/* Búsqueda */}
                            <div className="mb-6 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="search-categoria"
                                    type="text"
                                    placeholder="Buscar por nombre o descripción..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Tabla de Categorías */}
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-200">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Nombre</th>
                                                <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Descripción</th>
                                                <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredCategorias.length > 0 ? (
                                                filteredCategorias.map((cat) => (
                                                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <span className="text-sm font-medium text-gray-900">{cat.nombre}</span>
                                                        </td>
                                                        {/* ✨ MEJORA: Truncate para descripciones largas */}
                                                        <td className="px-4 py-4 max-w-lg">
                                                            <p className="text-sm text-slate-500 truncate" title={cat.descripcion}>
                                                                {cat.descripcion || <span className="text-slate-400 italic">N/A</span>}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleOpenEdit(cat)}
                                                                    className="p-2 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                                    title="Editar Categoría"
                                                                >
                                                                    <Edit size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenDelete(cat)}
                                                                    className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                                    title="Eliminar Categoría"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <NoResultsRow colSpan={3} />
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* --- Modales --- */}
            {isModalOpen && (
                <CategoriaModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModals}
                    categoriaToEdit={selectedCategoria}
                    onSuccess={handleSuccess}
                />
            )}

            {isDeleteModalOpen && (
                <ConfirmDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseModals}
                    onConfirm={handleDeleteConfirm}
                    usuario={{
                        username: categoriaToDelete?.nombre,
                        email: `Categoría (ID: ${categoriaToDelete?.id})`, // ✨ Más específico
                    }}
                    isDeleting={false} // toast.promise maneja la carga
                />
            )}
        </>
    );
};

export default GestionCategorias;