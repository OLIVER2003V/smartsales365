// src/clientes/ClienteList.jsx
import React from 'react';
import { deleteCliente } from '../api/cliente';

// --- Iconos (Asumo que ya los tienes definidos) ---
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
  </svg>
);
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const EmptyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
// --- Fin Iconos ---

const ClienteList = ({ clientes, onEdit, refreshClientes, token, setMessage, isLoading }) => {

  const handleDelete = async (id, nombreCompleto) => {
    if (!window.confirm(`¿Seguro que deseas eliminar a "${nombreCompleto}"?`)) return;
    setMessage('⏳ Eliminando cliente...');
    try {
      await deleteCliente(token, id);
      setMessage('✅ Cliente eliminado.');
      refreshClientes();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Intenta nuevamente.';
      setMessage(`❌ Error al eliminar: ${errorMsg}`);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  if (isLoading && !clientes) {
    return <div className="text-center py-10 text-gray-500">Cargando...</div>;
  }

  if (clientes && clientes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <EmptyIcon />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No se encontraron clientes</h3>
        <p className="mt-1 text-sm text-gray-500">
          Intenta ajustar tu búsqueda o añade un nuevo cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
      <div className="relative">
        
        {isLoading && clientes && clientes.length > 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <span className="text-blue-600 font-medium text-sm">Actualizando lista...</span>
          </div>
        )}
        
        {/* Mantenemos table-fixed y los anchos fraccionales */}
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="w-4/12 px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre Completo</th>
              <th className="w-4/12 px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
              <th className="w-2/12 px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teléfono</th>
              <th className="w-2/12 px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clientes?.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors duration-150">
                
                {/* *** LA SOLUCIÓN ***
                  Añadimos 'text-left' para forzar la alineación.
                */}
                <td className="px-6 py-4 truncate text-left">
                  <div className="text-sm font-medium text-gray-900" title={`${c.nombre} ${c.apellido}`}>{c.nombre} {c.apellido}</div>
                  {c.username && <div className="text-xs text-gray-500 truncate text-left" title={c.username}>Usuario: {c.username}</div>}
                </td>
                
                {/* AÑADIDO 'text-left' */}
                <td className="px-6 py-4 truncate text-sm text-gray-600 text-left" title={c.email}>
                  {c.email}
                </td>
                
                {/* AÑADIDO 'text-left' */}
                <td className="px-6 py-4 text-sm text-gray-600 text-left" title={c.telefono}>
                  {c.telefono || '-'}
                </td>
                
                {/* Este ya estaba 'text-center', lo cual es correcto */}
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                  <button 
                    onClick={() => onEdit(c)} 
                    className="p-2 rounded-full text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors" 
                    title="Editar Cliente"
                  >
                    <EditIcon />
                  </button>
                  <button 
                    onClick={() => handleDelete(c.id, `${c.nombre} ${c.apellido}`)} 
                    className="p-2 rounded-full text-red-600 hover:bg-red-100 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors" 
                    title="Eliminar Cliente"
                  >
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClienteList;