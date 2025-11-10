// src/admin/GestionResenas.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getTodasResenas, deleteResena } from '../api/resena';
import { getProducts } from '../api/producto';
import { 
    Loader2, 
    Trash2, 
    AlertTriangle, 
    Search, 
    MessageSquare,
    User,
    Package,
    ArrowUpDown, // ✨ NUEVO: Para el selector de orden
    Star          // ✨ NUEVO: Para el selector de estrellas
} from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal'; 
import StarRating from '../components/StarRating';

// --- Icono de Carga Profesional ---
const SpinnerIcon = () => (
    <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
    </div>
);

// --- Componente de Estado Vacío Profesional ---
const EmptyState = () => (
    <div className="text-center py-20 px-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <MessageSquare size={48} className="mx-auto text-gray-400" strokeWidth={1.5} />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay reseñas</h3>
        <p className="mt-1 text-sm text-gray-500">Cuando los clientes publiquen reseñas, aparecerán aquí.</p>
    </div>
);

// --- Componente para Fila sin Resultados (Búsqueda/Filtro) ---
const NoResultsRow = ({ colSpan }) => (
    <tr>
        <td colSpan={colSpan} className="text-center p-10">
            <div className="flex flex-col items-center justify-center text-gray-500">
                <AlertTriangle size={32} className="mb-2 text-gray-400" />
                <span className="font-medium">No se encontraron resultados</span>
                <span className="text-sm">Intenta con una búsqueda o filtro diferente.</span>
            </div>
        </td>
    </tr>
);

// ✨ MEJORA: Estilos base para inputs y selects
const controlBaseStyles = `
    appearance-none block w-full pl-10 pr-8 py-2.5 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-slate-50
`;


const GestionResenas = () => {
    const navigate = useNavigate();
    const { token, user } = useAuth();

    const [resenas, setResenas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [productMap, setProductMap] = useState(new Map());
    
    // --- ESTADOS DE FILTRO ---
    const [searchTerm, setSearchTerm] = useState('');
    const [starFilter, setStarFilter] = useState('all'); // ✨ NUEVO
    const [sortCriteria, setSortCriteria] = useState('fecha_desc'); // ✨ NUEVO
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [resenaToDelete, setResenaToDelete] = useState(null);

    // Protección de ruta
    useEffect(() => {
        if (!user || (user.rol !== 'ADM' && user.rol !== 'VEN')) {
            toast.error('Acceso denegado.');
            navigate('/');
        }
    }, [user, navigate]);

    // Cargar Reseñas Y Productos
    const loadData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const [resenasData, productosData] = await Promise.all([
                getTodasResenas(token),
                getProducts(token)
            ]);

            const map = new Map();
            productosData.forEach(prod => {
                map.set(prod.id, prod.nombre);
            });
            setProductMap(map);
            
            // La lógica de ordenamiento ahora se maneja en useMemo
            setResenas(resenasData);

        } catch (error) {
            toast.error('Error al cargar reseñas o productos.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token && (user?.rol === 'ADM' || user?.rol === 'VEN')) {
            loadData();
        }
    }, [token, user, loadData]);

    // --- Manejadores de Acciones ---
    const handleOpenDelete = (resena) => {
        setResenaToDelete(resena);
        setIsDeleteModalOpen(true);
    };
    const handleCloseModals = () => {
        setIsDeleteModalOpen(false);
        setResenaToDelete(null);
    };

    const handleDeleteConfirm = async () => {
        if (!resenaToDelete) return;
        
        const promise = deleteResena(token, resenaToDelete.id);
        
        toast.promise(promise, {
            loading: 'Eliminando reseña...',
            success: () => {
                handleCloseModals();
                // Recargamos las reseñas
                getTodasResenas(token).then(data => {
                     setResenas(data);
                });
                return 'Reseña eliminada.';
            },
            error: 'Error al eliminar.',
        });
    };

    // ✨ --- useMemo MEJORADO (Filtra, Busca y Ordena) --- ✨
    const processedResenas = useMemo(() => {
        let filtered = [...resenas];

        // 1. Filtrar por Estrellas
        if (starFilter !== 'all') {
            const starNum = Number(starFilter);
            filtered = filtered.filter(r => r.calificacion === starNum);
        }

        // 2. Filtrar por Búsqueda
        const term = searchTerm.toLowerCase();
        if (term) {
            filtered = filtered.filter(r => {
                const productName = productMap.get(r.producto)?.toLowerCase() || '';
                return (
                    r.usuario_username?.toLowerCase().includes(term) ||
                    r.titulo?.toLowerCase().includes(term) ||
                    r.comentario?.toLowerCase().includes(term) ||
                    productName.includes(term)
                );
            });
        }
        
        // 3. Ordenar
        filtered.sort((a, b) => {
            switch (sortCriteria) {
                case 'fecha_asc':
                    return new Date(a.fecha_creacion) - new Date(b.fecha_creacion);
                case 'calificacion_desc':
                    return b.calificacion - a.calificacion;
                case 'calificacion_asc':
                    return a.calificacion - b.calificacion;
                case 'fecha_desc':
                default:
                    return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
            }
        });

        return filtered;

    }, [resenas, searchTerm, productMap, starFilter, sortCriteria]); // Dependencias actualizadas

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (isNaN(date)) return 'Fecha Inválida'; 
        return date.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 p-4 md:p-8">
                <SpinnerIcon />
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-slate-100 p-4 md:p-8">
                <div className="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
                    
                    <header className="mb-6 md:mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                            <MessageSquare size={30} className="text-indigo-600" />
                            Gestión de Reseñas
                        </h1>
                        <p className="text-gray-600 mt-1 text-sm">
                            Moderar y eliminar las reseñas de los clientes.
                        </p>
                    </header>

                    {resenas.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <>
                            {/* --- BARRA DE BÚSQUEDA Y FILTROS --- */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                {/* Barra de Búsqueda */}
                                <div className="relative flex-grow">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar por usuario, producto, o comentario..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                
                                {/* ✨ NUEVO: Filtro de Estrellas */}
                                <div className="relative w-full md:w-52">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Star className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <select
                                        value={starFilter}
                                        onChange={(e) => setStarFilter(e.target.value)}
                                        className={controlBaseStyles}
                                    >
                                        <option value="all">Todas las Estrellas</option>
                                        <option value="5">5 Estrellas</option>
                                        <option value="4">4 Estrellas</option>
                                        <option value="3">3 Estrellas</option>
                                        <option value="2">2 Estrellas</option>
                                        <option value="1">1 Estrella</option>
                                    </select>
                                </div>
                                
                                {/* ✨ NUEVO: Filtro de Ordenamiento */}
                                <div className="relative w-full md:w-52">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <ArrowUpDown className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <select
                                        value={sortCriteria}
                                        onChange={(e) => setSortCriteria(e.target.value)}
                                        className={controlBaseStyles}
                                    >
                                        <option value="fecha_desc">Más Recientes</option>
                                        <option value="fecha_asc">Más Antiguos</option>
                                        <option value="calificacion_desc">Mejor Calificación</option>
                                        <option value="calificacion_asc">Peor Calificación</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* --- TABLA DE RESEÑAS --- */}
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-200">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Usuario</th>
                                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Producto</th>
                                                <th className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Calificación</th>
                                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Comentario</th>
                                                <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Fecha</th>
                                                <th className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {/* ✨ ACTUALIZADO: Mapea sobre 'processedResenas' */}
                                            {processedResenas.length > 0 ? (
                                                processedResenas.map((resena) => {
                                                    const productName = productMap.get(resena.producto) || '(Producto no disponible)';

                                                    return (
                                                        <tr key={resena.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-slate-200 text-slate-600">
                                                                        <User size={18} />
                                                                    </div>
                                                                    <span className="text-sm font-medium text-gray-900">{resena.usuario_username}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <Link 
                                                                    to={`/producto/${resena.producto}`} 
                                                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 hover:underline"
                                                                    title={`Ver ${productName}`}
                                                                >
                                                                    <Package size={16} className="text-gray-400" />
                                                                    <span>{productName}</span>
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                <div className="flex justify-center">
                                                                    <StarRating rating={Number(resena.calificacion)} />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 max-w-sm">
                                                                <p className="font-semibold text-sm text-slate-800 truncate" title={resena.titulo}>
                                                                    {resena.titulo || '(Sin título)'}
                                                                </p>
                                                                <p className="text-sm text-slate-500 truncate" title={resena.comentario}>
                                                                    {resena.comentario || '(Sin comentario)'}
                                                                </p>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                <span className="text-sm text-gray-600">{formatDate(resena.fecha_creacion)}</span>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                <button
                                                                    onClick={() => handleOpenDelete(resena)}
                                                                    className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                                    title="Eliminar Reseña"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            ) : (
                                                <NoResultsRow colSpan={6} />
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isDeleteModalOpen && (
                <ConfirmDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseModals}
                    onConfirm={handleDeleteConfirm}
                    usuario={{ 
                        username: `Reseña de ${resenaToDelete?.usuario_username}`,
                        email: `"${resenaToDelete?.titulo}"`,
                    }}
                    isDeleting={false}
                />
            )}
        </>
    );
};

export default GestionResenas;