// src/clientes/AdministrarCliente.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientes } from '../api/cliente';
import { useAuth } from '../context/AuthContext';
import ClienteList from './ClienteList'; // Componente hijo (asumido)
import ClienteForm from './ClienteForm'; // Componente hijo (asumido)
import {
    Plus,
    Search,
    Loader2,
    ArrowLeft,
    Users,
    AlertTriangle,
    CheckCircle,
    Info,
    X
} from 'lucide-react'; // ✨ Iconos importados de Lucide

// --- Componentes de UI Locales (Refactorizados) ---

// ✨ MEJORA: Componente de Alerta rediseñado
const AlertMessage = ({ msg, onDismiss }) => {
    if (!msg) return null;

    let config = {
        icon: <Info size={18} />,
        styles: "bg-blue-50 text-blue-700 border-blue-200"
    };

    if (msg.startsWith('❌') || msg.startsWith('⚠️')) {
        config = {
            icon: <AlertTriangle size={18} />,
            styles: "bg-red-50 text-red-700 border-red-200"
        };
    } else if (msg.startsWith('✅')) {
        config = {
            icon: <CheckCircle size={18} />,
            styles: "bg-green-50 text-green-700 border-green-200"
        };
    }

    return (
        <div className={`w-full p-4 rounded-lg border flex justify-between items-center ${config.styles}`} role="alert">
            <div className="flex items-center gap-3">
                <span className="flex-shrink-0">{config.icon}</span>
                <span className="text-sm font-medium">{msg.replace(/^[❌⚠️✅]/, '').trim()}</span>
            </div>
            {onDismiss && (
                <button 
                    onClick={onDismiss} 
                    className={`ml-2 p-1 rounded-full hover:bg-black/10 transition-colors ${config.styles}`}
                >
                    <X size={18} />
                </button>
            )}
        </div>
    );
};

// ✨ MEJORA: Indicador de Carga
const LoadingIndicator = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
        <p className="mt-3 text-lg font-medium">Cargando clientes...</p>
    </div>
);

// ✨ MEJORA: Estado Vacío (si no hay clientes)
const EmptyState = ({ onActionClick }) => (
    <div className="text-center py-20 px-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <Users size={48} className="mx-auto text-slate-400" strokeWidth={1.5} />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">No hay clientes</h3>
        <p className="mt-1 text-sm text-slate-500">Aún no se ha registrado ningún cliente.</p>
        <div className="mt-6">
            <button
                type="button"
                onClick={onActionClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <Plus size={18} />
                Crear Primer Cliente
            </button>
        </div>
    </div>
);


// --- Constantes ---
const VIEW_MODES = { LIST: 'LIST', CREATE: 'CREATE', EDIT: 'EDIT' };

// --- Componente Principal ---
const AdministrarCliente = () => {
    const [allClientes, setAllClientes] = useState(null); // Inicia como null para diferenciar de "vacío"
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const { token, user } = useAuth();

    // Función para refrescar clientes
    const refreshClientes = useCallback(async () => {
        if (!token) return;
        setIsLoading(true); 
        try {
            const clienteList = await getClientes(token);
            setAllClientes(clienteList);
            if (!message) {
                // No mostrar toast de éxito en la carga inicial
            }
        } catch (error) {
            setAllClientes([]); // Lista vacía en caso de error
            if (error.response?.status === 403) {
                setMessage("❌ Acceso Denegado (403): Rol no permitido.");
                navigate('/');
            } else if (error.response?.status === 401) {
                setMessage("❌ Sesión expirada. Redirigiendo al inicio...");
                setTimeout(() => navigate('/', { replace: true }), 2000);
            } else {
                setMessage("❌ Error al conectar con el API de clientes.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [token, navigate, message]); 

    // Carga inicial y protección de ruta
    useEffect(() => {
        if (!user || (user.rol !== 'ADM' && user.rol !== 'VEN')) {
            toast.error('Acceso denegado. Solo Admin o Vendedores.');
            navigate('/');
            return;
        }
        if (token) {
            refreshClientes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, user, navigate]); // Solo se ejecuta si cambian estos valores

    // Filtrado por búsqueda
    const filteredClientes = useMemo(() => {
        if (!allClientes) return [];
        const lowerCaseSearch = searchTerm.toLowerCase();
        return allClientes.filter(c =>
            c.nombre.toLowerCase().includes(lowerCaseSearch) ||
            c.apellido.toLowerCase().includes(lowerCaseSearch) ||
            c.email.toLowerCase().includes(lowerCaseSearch) ||
            (c.telefono && c.telefono.includes(searchTerm))
        );
    }, [searchTerm, allClientes]);

    // --- Navegación y Manejadores ---
    const handleEdit = (cliente) => {
        setSelectedCliente(cliente);
        setViewMode(VIEW_MODES.EDIT);
        setMessage(''); 
    };

    const handleFormSuccess = (successMessage) => {
        // Establece el mensaje primero
        setMessage(successMessage); 
        // Cambia la vista
        setViewMode(VIEW_MODES.LIST);
        setSelectedCliente(null);
        // Refresca la lista *después* de cambiar la vista
        refreshClientes(); 
        // Limpia el mensaje después de 3s
        setTimeout(() => setMessage(''), 3000); 
    };

    const handleFormCancel = () => {
        setViewMode(VIEW_MODES.LIST);
        setSelectedCliente(null);
        setMessage(''); 
    };
    
    const handleShowCreate = () => {
        setViewMode(VIEW_MODES.CREATE);
        setSelectedCliente(null);
        setMessage('');
    };

    // Renderizado condicional del contenido principal
    const renderContent = () => {
        if (isLoading && !allClientes) {
            return <LoadingIndicator />;
        }

        switch (viewMode) {
            case VIEW_MODES.CREATE:
                return (
                    <ClienteForm
                        cliente={null}
                        onSuccess={() => handleFormSuccess('✅ Cliente creado exitosamente.')}
                        onCancel={handleFormCancel}
                        setMessage={setMessage}
                    />
                );
            case VIEW_MODES.EDIT:
                return (
                    <ClienteForm
                        cliente={selectedCliente}
                        onSuccess={() => handleFormSuccess('✅ Cliente actualizado exitosamente.')}
                        onCancel={handleFormCancel}
                        setMessage={setMessage}
                    />
                );
            case VIEW_MODES.LIST:
            default:
                if (!allClientes) return <LoadingIndicator />; // Caso de seguridad
                if (allClientes.length === 0 && !isLoading) {
                    return <EmptyState onActionClick={handleShowCreate} />;
                }
                return (
                    <ClienteList
                        clientes={filteredClientes}
                        onEdit={handleEdit}
                        refreshClientes={refreshClientes}
                        setMessage={setMessage}
                        isLoading={isLoading} // Para el spinner de recarga
                        searchTerm={searchTerm} // Para el estado "sin resultados"
                    />
                );
        }
    };

    return (
        // ✨ MEJORA: Fondo y paleta slate
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="w-full max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200 space-y-6">
                
                {/* --- Encabezado --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Users size={30} className="text-indigo-600" />
                        Gestión de Clientes
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {viewMode === VIEW_MODES.LIST ? (
                            <button 
                                onClick={handleShowCreate} 
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                <Plus size={18} /> Nuevo Cliente
                            </button>
                        ) : (
                            <button 
                                onClick={handleFormCancel} 
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                <ArrowLeft size={18} /> Volver a la Lista
                            </button>
                        )}
                    </div>
                </div>

                {/* --- Barra de Herramientas (Mensaje y Búsqueda) --- */}
                <div className="space-y-4">
                    <AlertMessage msg={message} onDismiss={() => setMessage('')} />
                
                    {viewMode === VIEW_MODES.LIST && allClientes && allClientes.length > 0 && (
                        <div className="flex justify-start">
                            <div className="relative w-full md:w-2/5">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search size={20} className="text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, apellido, email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg shadow-sm text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* --- Contenido Principal --- */}
                <div className="mt-6 min-h-[400px]">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AdministrarCliente;