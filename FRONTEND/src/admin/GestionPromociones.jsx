// src/admin/GestionPromociones.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getPromociones, deletePromocion } from '../api/promocion';
import { 
    Loader2, 
    Tag, 
    PlusCircle, 
    Edit, 
    Trash2, 
    Search,
    TicketPercent, // ✨ Icono temático para "promociones"
    CalendarDays, // ✨ Icono para fechas
    AlertTriangle
} from 'lucide-react';

import PromocionModal from './PromocionModal'; // Asumimos que este componente existe
import ConfirmDeleteModal from './ConfirmDeleteModal'; // Reutilizamos el modal

// --- Icono de Carga Profesional ---
const SpinnerIcon = () => (
    <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
    </div>
);

// --- Componente de Estado Vacío Profesional ---
const EmptyState = ({ onActionClick }) => (
    <div className="text-center py-20 px-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <TicketPercent size={48} className="mx-auto text-gray-400" strokeWidth={1.5} />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay promociones</h3>
        <p className="mt-1 text-sm text-gray-500">Aún no se ha creado ninguna promoción.</p>
        <div className="mt-6">
            <button
                type="button"
                onClick={onActionClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <PlusCircle size={18} />
                Crear Primera Promoción
            </button>
        </div>
    </div>
);

// --- Componente de Badge de Estado (Activo/Inactivo) ---
// ✨ MEJORA: Patrón de UI limpio con punto de color
const EstadoBadge = ({ activo }) => {
    const baseStyle = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium";
    const activeStyle = "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20";
    const inactiveStyle = "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20";

    return (
        <span className={`${baseStyle} ${activo ? activeStyle : inactiveStyle}`}>
            <span className={`h-2 w-2 rounded-full ${activo ? 'bg-green-500' : 'bg-slate-500'}`}></span>
            {activo ? 'Activa' : 'Inactiva'}
        </span>
    );
};


const GestionPromociones = () => {
    const navigate = useNavigate();
    const { token, user } = useAuth();

    const [promociones, setPromociones] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados de Modales
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedPromocion, setSelectedPromocion] = useState(null);
    const [promoToDelete, setPromoToDelete] = useState(null);

    // --- Helpers de Formato ---
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        // Aseguramos que la fecha se interprete como UTC para evitar problemas de zona horaria
        const date = new Date(dateStr);
        if (isNaN(date)) return 'Fecha Inválida';
        return date.toLocaleString('es-ES', {
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    };
    const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

    // Protección de ruta
    useEffect(() => {
        if (!user || (user.rol !== 'ADM' && user.rol !== 'VEN')) {
            toast.error('Acceso denegado.');
            navigate('/');
        }
    }, [user, navigate]);

    // Cargar Datos
    const fetchPromociones = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const data = await getPromociones(token);
            setPromociones(data);
        } catch (error) {
            toast.error('Error al cargar la lista de promociones.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token && (user?.rol === 'ADM' || user?.rol === 'VEN')) {
            fetchPromociones();
        }
    }, [token, user, fetchPromociones]);

    // Manejadores de Acciones
    const handleOpenCreate = () => {
        setSelectedPromocion(null);
        setIsModalOpen(true);
    };
    const handleOpenEdit = (promo) => {
        setSelectedPromocion(promo);
        setIsModalOpen(true);
    };
    const handleOpenDelete = (promo) => {
        setPromoToDelete(promo);
        setIsDeleteModalOpen(true);
    };
    const handleCloseModals = () => {
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
        setSelectedPromocion(null);
        setPromoToDelete(null);
    };
    const handleSuccess = () => {
        handleCloseModals();
        fetchPromociones(); // Recarga la lista
    };

    const handleDeleteConfirm = async () => {
        if (!promoToDelete) return;
        
        // Usamos toast.promise para el manejo de estados de borrado
        const promise = deletePromocion(token, promoToDelete.id);
        
        toast.promise(promise, {
            loading: 'Eliminando promoción...',
            success: () => {
                handleSuccess(); // Cierra modal y recarga
                return 'Promoción eliminada con éxito.';
            },
            error: (err) => err.message || 'Error al eliminar la promoción.',
        });
    };

    // Filtrado
    const filteredPromociones = useMemo(() => {
        return promociones.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [promociones, searchTerm]);


    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 p-4 md:p-8">
                <SpinnerIcon />
            </div>
        );
    }
    
    return (
        <>
            {/* ✨ MEJORA: Fondo de página slate-100 */}
            <div className="min-h-screen bg-slate-100 p-4 md:p-8">
                {/* ✨ MEJORA: Contenedor blanco con sombra y borde */}
                <div className="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
                    
                    {/* Encabezado */}
                    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                                <Tag size={30} className="text-indigo-600" />
                                Gestión de Promociones
                            </h1>
                            <p className="text-gray-600 mt-1 text-sm">
                                Crear, editar y administrar descuentos y ofertas.
                            </p>
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
                        >
                            <PlusCircle size={18} />
                            Crear Promoción
                        </button>
                    </header>
                    
                    {/* Contenido Principal */}
                    {promociones.length === 0 ? (
                        <EmptyState onActionClick={handleOpenCreate} />
                    ) : (
                        <>
                            {/* Barra de Búsqueda */}
                            <div className="mb-6 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre de promoción..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Tabla de Promociones */}
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-200">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Nombre</th>
                                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Descuento</th>
                                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Vigencia</th>
                                                <th className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Estado</th>
                                                <th className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredPromociones.length > 0 ? (
                                                filteredPromociones.map((promo) => (
                                                    <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {promo.nombre}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-indigo-700">
                                                            {promo.tipo_descuento === 'PCT' 
                                                                ? `${parseFloat(promo.valor_descuento).toFixed(0)}%` 
                                                                : formatPrice(promo.valor_descuento)
                                                            }
                                                        </td>
                                                        {/* ✨ MEJORA UX: Columna "Vigencia" */}
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                                            <div className="flex items-center gap-2">
                                                                <CalendarDays size={16} className="text-gray-400" />
                                                                <span>{formatDate(promo.fecha_inicio)} al {formatDate(promo.fecha_fin)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <EstadoBadge activo={promo.activo} />
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                                                            <button 
                                                                onClick={() => handleOpenEdit(promo)} 
                                                                className="p-2 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                                title="Editar"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleOpenDelete(promo)} 
                                                                className="ml-2 p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                // Estado para "Sin resultados de búsqueda"
                                                <tr>
                                                    <td colSpan="5" className="text-center p-10">
                                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                                            <AlertTriangle size={32} className="mb-2 text-gray-400" />
                                                            <span className="font-medium">No se encontraron resultados</span>
                                                            <span className="text-sm">Intenta con un término de búsqueda diferente.</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modales */}
            {isModalOpen && (
                <PromocionModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModals}
                    promocionToEdit={selectedPromocion}
                    onSuccess={handleSuccess}
                />
            )}
            {isDeleteModalOpen && (
                <ConfirmDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseModals}
                    onConfirm={handleDeleteConfirm}
                    // ✨ Excelente reutilización del modal
                    usuario={{ 
                        username: promoToDelete?.nombre,
                        email: 'Promoción (ID: ' + promoToDelete?.id + ')',
                    }}
                    isDeleting={false} // toast.promise maneja el estado de carga
                />
            )}
        </>
    );
};

export default GestionPromociones;