// src/admin/GestionUsuarios.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    UserPlus,
    Edit,
    Trash2,
    Loader2,
    Search,
    Users,
    AlertTriangle,
    ShieldCheck, // ✨ Icono para Rol
    Filter,      // ✨ Icono para Filtro
} from 'lucide-react';

// --- API ---
import { getUsuarios, deleteUsuario } from '../api/admin';
// --- Contexto ---
import { useAuth } from '../context/AuthContext';

// --- Componentes ---
import UsuarioModal from './UsuarioModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

// --- Icono de Carga Profesional ---
const SpinnerIcon = () => (
    <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
    </div>
);

// --- Componente de Estado Vacío Profesional ---
const EmptyState = ({ onActionClick }) => (
    <div className="text-center py-20 px-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <Users size={48} className="mx-auto text-gray-400" strokeWidth={1.5} />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No hay usuarios</h3>
        <p className="mt-1 text-sm text-gray-500">Aún no se ha creado ningún usuario.</p>
        <div className="mt-6">
            <button
                type="button"
                onClick={onActionClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <UserPlus size={18} />
                Crear Primer Usuario
            </button>
        </div>
    </div>
);

// --- Componente para Fila sin Resultados (Búsqueda/Filtro) ---
const NoResultsRow = ({ colSpan }) => (
    <tr>
        <td colSpan={colSpan} className="text-center p-10">
            <div className="flex flex-col items-center justify-center text-gray-500">
                <AlertTriangle size={32} className="mb-2 text-gray-400" />
                <span className="font-medium">No se encontraron usuarios</span>
                <span className="text-sm">Intenta con una búsqueda o filtro diferente.</span>
            </div>
        </td>
    </tr>
);

// --- ✨ NUEVO: Componente de Badge de Rol ---
const RolBadge = ({ rol }) => {
    const styles = {
        'ADM': 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
        'VEN': 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20',
        'CLI': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    };
    const rolDisplay = {
        'ADM': 'Admin',
        'VEN': 'Vendedor',
        'CLI': 'Cliente',
    }
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${styles[rol] || 'bg-gray-100 text-gray-800'}`}>
            {rolDisplay[rol] || rol}
        </span>
    );
};

// --- ✨ NUEVO: Componente de Badge de Estado ---
const EstadoBadge = ({ activo }) => {
    const baseStyle = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium";
    const activeStyle = "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20";
    const inactiveStyle = "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20";

    return (
        <span className={`${baseStyle} ${activo ? activeStyle : inactiveStyle}`}>
            <span className={`h-2 w-2 rounded-full ${activo ? 'bg-green-500' : 'bg-slate-500'}`}></span>
            {activo ? 'Activo' : 'Inactivo'}
        </span>
    );
};

// ✨ MEJORA: Estilos base para controles
const controlBaseStyles = `
    appearance-none block w-full pl-10 pr-8 py-2.5 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-slate-50
`;

// --- Componente Principal ---
const GestionUsuarios = () => {
    const navigate = useNavigate();
    const { token, user } = useAuth();

    const [usuarios, setUsuarios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- ESTADOS DE FILTRO ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRol, setFilterRol] = useState('all'); // ✨ NUEVO
    const [filterEstado, setFilterEstado] = useState('all'); // ✨ NUEVO

    // --- Estados de Modales ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUsuario, setSelectedUsuario] = useState(null);
    const [usuarioToDelete, setUsuarioToDelete] = useState(null);

    // Protección de ruta
    useEffect(() => {
        if (!user || user.rol !== 'ADM') {
            toast.error('Acceso denegado. Debe ser administrador.');
            navigate('/');
        }
    }, [user, navigate]);

    // Cargar Datos
    const fetchUsuarios = useCallback(async () => {
        if (!token) return;
        setIsLoading(true); 
        try {
            const data = await getUsuarios(token);
            setUsuarios(data);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            toast.error('Error al cargar la lista de usuarios.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token && user?.rol === 'ADM') {
            fetchUsuarios();
        }
    }, [token, user, fetchUsuarios]);

    // --- Manejadores de Modales ---
    const handleOpenCreate = () => {
        setSelectedUsuario(null);
        setIsModalOpen(true);
    };
    const handleOpenEdit = (usuario) => {
        setSelectedUsuario(usuario);
        setIsModalOpen(true);
    };
    const handleOpenDelete = (usuario) => {
        setUsuarioToDelete(usuario);
        setIsDeleteModalOpen(true);
    };
    const handleCloseModals = () => {
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
        setSelectedUsuario(null);
        setUsuarioToDelete(null);
    };
    const handleSuccess = () => {
        handleCloseModals();
        fetchUsuarios(); // Recarga la lista
    };

    const handleDeleteConfirm = async () => {
        if (!usuarioToDelete) return;
        const promise = deleteUsuario(token, usuarioToDelete.id);
        toast.promise(promise, {
            loading: 'Eliminando usuario...',
            success: () => {
                handleSuccess(); // Cierra modal y recarga
                return 'Usuario eliminado exitosamente.';
            },
            error: (err) => err.message || 'Error al eliminar el usuario.',
        });
    };

    // --- ✨ useMemo MEJORADO (Filtra y Busca) ---
    const processedUsuarios = useMemo(() => {
        let filtered = [...usuarios];

        // 1. Filtrar por Rol
        if (filterRol !== 'all') {
            filtered = filtered.filter(u => u.rol === filterRol);
        }

        // 2. Filtrar por Estado
        if (filterEstado !== 'all') {
            const isActive = filterEstado === 'true'; // El valor del select es string
            filtered = filtered.filter(u => u.is_active === isActive);
        }

        // 3. Filtrar por Búsqueda
        const term = searchTerm.toLowerCase();
        if (term) {
            filtered = filtered.filter(
                (u) =>
                    u.username?.toLowerCase().includes(term) ||
                    u.email?.toLowerCase().includes(term) ||
                    u.first_name?.toLowerCase().includes(term) ||
                    u.last_name?.toLowerCase().includes(term)
            );
        }
        
        return filtered;
    }, [usuarios, searchTerm, filterRol, filterEstado]); // Dependencias actualizadas

    // --- Renderizado ---
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 p-4 md:p-8">
                <SpinnerIcon />
            </div>
        );
    }

    // Protección de ruta (redundante con useEffect, pero seguro)
    if (user?.rol !== 'ADM') {
        return null;
    }

    return (
        <>
            <div className="min-h-screen bg-slate-100 p-4 md:p-8">
                <div className="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
                    
                    {/* Encabezado y Botón de Acción */}
                    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                                <Users size={30} className="text-indigo-600" />
                                Gestión de Usuarios
                            </h1>
                            <p className="text-gray-600 mt-1 text-sm">
                                Crear, editar, activar y eliminar cuentas del sistema.
                            </p>
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
                        >
                            <UserPlus size={18} />
                            Crear Usuario
                        </button>
                    </header>

                    {/* Contenido Principal */}
                    {usuarios.length === 0 ? (
                        <EmptyState onActionClick={handleOpenCreate} />
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
                                        placeholder="Buscar por username, email o nombre..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                
                                {/* ✨ NUEVO: Filtro de Rol */}
                                <div className="relative w-full md:w-48">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <ShieldCheck className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <select
                                        value={filterRol}
                                        onChange={(e) => setFilterRol(e.target.value)}
                                        className={controlBaseStyles}
                                    >
                                        <option value="all">Todos los Roles</option>
                                        <option value="ADM">Admin</option>
                                        <option value="VEN">Vendedor</option>
                                        <option value="CLI">Cliente</option>
                                    </select>
                                </div>
                                
                                {/* ✨ NUEVO: Filtro de Estado */}
                                <div className="relative w-full md:w-48">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Filter className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <select
                                        value={filterEstado}
                                        onChange={(e) => setFilterEstado(e.target.value)}
                                        className={controlBaseStyles}
                                    >
                                        <option value="all">Todos los Estados</option>
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            {/* Contenedor de la Tabla */}
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-200">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                {/* ✨ MEJORA: Columnas revisadas */}
                                                <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Usuario</th>
                                                <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Nombre Completo</th>
                                                <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Rol</th>
                                                <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Estado</th>
                                                <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {/* ✨ ACTUALIZADO: Mapea sobre 'processedUsuarios' */}
                                            {processedUsuarios.length > 0 ? (
                                                processedUsuarios.map((usuario) => (
                                                    <tr key={usuario.id} className="hover:bg-slate-50 transition-colors">
                                                        
                                                        {/* ✨ MEJORA: Columna "Usuario" combinada */}
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">{usuario.username}</div>
                                                            <div className="text-sm text-gray-500">{usuario.email}</div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <span className="text-sm text-gray-600">
                                                                {/* Maneja el caso de nombres vacíos */}
                                                                {(usuario.first_name || usuario.last_name) 
                                                                    ? `${usuario.first_name || ''} ${usuario.last_name || ''}`
                                                                    : <span className="text-gray-400 italic">N/A</span>
                                                                }
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                                            <RolBadge rol={usuario.rol} />
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                                            <EstadoBadge activo={usuario.is_active} />
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleOpenEdit(usuario)}
                                                                    className="p-2 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                                    title="Editar Usuario"
                                                                >
                                                                    <Edit size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenDelete(usuario)}
                                                                    className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                                    title="Eliminar Usuario"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <NoResultsRow colSpan={5} />
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
                <UsuarioModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModals}
                    usuarioToEdit={selectedUsuario}
                    onSuccess={handleSuccess}
                />
            )}
            {isDeleteModalOpen && (
                <ConfirmDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseModals}
                    onConfirm={handleDeleteConfirm}
                    usuario={usuarioToDelete} // El modal de borrado ya espera un objeto 'usuario'
                    isDeleting={false} // toast.promise maneja la carga
                />
            )}
        </>
    );
};

export default GestionUsuarios;