// src/clientes/ClienteList.jsx
import React, { useState } from 'react'; // ✨ Importar useState
import { deleteCliente } from '../api/cliente';
import { useAuth } from '../context/AuthContext';
import { Edit, Trash2, Users, AlertTriangle, Loader2 } from 'lucide-react'; // ✨ Iconos de Lucide
import ConfirmDeleteModal from '../admin/ConfirmDeleteModal'; // ✨ Importar Modal de Borrado

// --- ✨ MEJORA: Estado "Sin Resultados" ---
const NoResultsState = ({ searchTerm }) => (
    <tr>
        <td colSpan="4" className="text-center p-10">
            <div className="flex flex-col items-center justify-center text-slate-500">
                <Users size={40} className="mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-700">
                    {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </h3>
                <p className="text-sm">
                    {searchTerm 
                        ? 'Intenta ajustar tu búsqueda.' 
                        : 'Añade un nuevo cliente para empezar.'}
                </p>
            </div>
        </td>
    </tr>
);

// --- Componente de Lista ---
const ClienteList = ({ clientes, onEdit, refreshClientes, setMessage, isLoading, searchTerm }) => {
    const { token } = useAuth();

    // --- ✨ MEJORA: Estado local para el modal de borrado ---
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clienteToDelete, setClienteToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleOpenDelete = (cliente) => {
        setClienteToDelete(cliente);
        setIsDeleteModalOpen(true);
    };

    const handleCloseDelete = () => {
        setClienteToDelete(null);
        setIsDeleteModalOpen(false);
    };

    const handleDeleteConfirm = async () => {
        if (!clienteToDelete) return;

        setIsDeleting(true);
        setMessage('⏳ Eliminando cliente...');
        try {
            await deleteCliente(token, clienteToDelete.id);
            setMessage('✅ Cliente eliminado.');
            refreshClientes();
        } catch (error) {
            const errorMsg = error.response?.data?.detail || error.message || 'Intenta nuevamente.';
            setMessage(`❌ Error al eliminar: ${errorMsg}`);
        } finally {
            setIsDeleting(false);
            handleCloseDelete();
            setTimeout(() => setMessage(''), 3000);
        }
    };

    if (isLoading && !clientes) {
        return <div className="text-center py-10 text-slate-500">Cargando...</div>;
    }

    return (
        <>
            {/* ✨ MEJORA: Contenedor de tabla coherente */}
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-slate-200">
                <div className="relative overflow-x-auto">
                    
                    {/* Overlay de carga (para recargas) */}
                    {isLoading && clientes && clientes.length > 0 && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                            <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                            <span className="ml-3 text-indigo-700 font-medium text-sm">Actualizando lista...</span>
                        </div>
                    )}
                    
                    <table className="min-w-full divide-y divide-slate-200">
                        {/* ✨ MEJORA: Cabecera slate */}
                        <thead className="bg-slate-50">
                            <tr>
                                {/* ✨ MEJORA: Columnas actualizadas */}
                                <th scope="col" className="w-5/12 px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Cliente</th>
                                <th scope="col" className="w-3/12 px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Teléfono</th>
                                <th scope="col" className="w-2/12 px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Dirección</th>
                                <th scope="col" className="w-2/12 px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {clientes?.length > 0 ? (
                                clientes.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors duration-150">
                                        
                                        {/* ✨ MEJORA: Celda "Cliente" combinada */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900" title={`${c.nombre} ${c.apellido}`}>{c.nombre} {c.apellido}</div>
                                            <div className="text-sm text-slate-500 truncate" title={c.email}>{c.email}</div>
                                        </td>
                                        
                                        <td className="px-4 py-4 text-sm text-slate-600" title={c.telefono}>
                                            {c.telefono || <span className="text-slate-400 italic">N/A</span>}
                                        </td>

                                        <td className="px-4 py-4 text-sm text-slate-600 truncate" title={c.direccion}>
                                            {c.direccion || <span className="text-slate-400 italic">N/A</span>}
                                        </td>
                                        
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => onEdit(c)} 
                                                    className="p-2 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" 
                                                    title="Editar Cliente"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenDelete(c)} 
                                                    className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                    title="Eliminar Cliente"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <NoResultsState searchTerm={searchTerm} />
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ✨ MEJORA: Modal de borrado ahora es parte de la lista */}
            {isDeleteModalOpen && (
                <ConfirmDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseDelete}
                    onConfirm={handleDeleteConfirm}
                    usuario={{
                        username: `${clienteToDelete?.nombre} ${clienteToDelete?.apellido}`,
                        email: clienteToDelete?.email,
                    }}
                    isDeleting={isDeleting}
                />
            )}
        </>
    );
};

export default ClienteList;