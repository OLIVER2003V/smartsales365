// src/clientes/AdministrarCliente.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientes } from '../api/cliente'; // <-- API de Cliente
import ClienteList from './ClienteList'; // <-- Componente de lista
import ClienteForm from './ClienteForm'; // <-- Componente de formulario

// --- Iconos (Definiciones de ejemplo) ---
// (En un proyecto real, estos vendrían de 'lucide-react', 'heroicons', etc.)
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const SpinnerIcon = () => (
  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);
const UserGroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-2.29l-1.123.63M17 20v-2m0 2H5.472c-1.33 0-2.522-.68-3.22-1.79C1.135 14.996 1 13.73 1 12.43V10a3 3 0 013-3h12a3 3 0 013 3v2.43c0 1.3-.135 2.566-1.252 3.78C21.043 17.5 19.5 18 18 18H7m10 2v-2a3 3 0 00-5.356-2.29l-1.123.63M17 20H7" />
  </svg>
);

// --- Componentes de UI (Definiciones de ejemplo) ---
const AlertMessage = ({ msg, onDismiss }) => {
  if (!msg) return null;
  const isError = msg.startsWith('❌') || msg.startsWith('⚠️');
  const isSuccess = msg.startsWith('✅');
  
  let classes = "w-full p-3 rounded-lg text-sm font-medium flex justify-between items-center";
  if (isError) classes += " bg-red-100 text-red-800";
  else if (isSuccess) classes += " bg-green-100 text-green-800";
  else classes += " bg-blue-100 text-blue-800"; // Info

  return (
    <div className={classes} role="alert">
      <span>{msg}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-2 font-bold text-lg">&times;</button>
      )}
    </div>
  );
};

const LoadingIndicator = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
    <SpinnerIcon />
    <p className="mt-3 text-lg font-medium">Cargando clientes...</p>
  </div>
);

// --- Constantes ---
const VIEW_MODES = { LIST: 'LIST', CREATE: 'CREATE', EDIT: 'EDIT' };

const AdministrarCliente = ({ token }) => {
  const [allClientes, setAllClientes] = useState(null);
  const [filteredClientes, setFilteredClientes] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Función para refrescar clientes
  const refreshClientes = useCallback(async () => {
    setIsLoading(true);
    // setMessage(''); // No limpiar mensaje aquí para que los de éxito se vean
    try {
      const clienteList = await getClientes(token);
      setAllClientes(clienteList);
      setFilteredClientes(clienteList);
      // Solo mostrar mensaje de carga si no hay otro mensaje
      if (!message) {
        setMessage(`✅ ${clienteList.length} clientes cargados.`);
        setTimeout(() => setMessage(''), 3000); // Autocerrar mensaje de éxito
      }
    } catch (error) {
      setAllClientes([]);
      setFilteredClientes([]);
      if (error.response?.status === 403) {
        setMessage("❌ Acceso Denegado (403): Rol no permitido.");
      } else if (error.response?.status === 401) {
        setMessage("❌ Sesión expirada. Redirigiendo al inicio...");
        setTimeout(() => navigate('/', { replace: true }), 2000);
      } else {
        setMessage("❌ Error al conectar con el API de clientes.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, navigate, message]); // Añadir 'message' para evitar sobreescritura

  // Carga inicial
  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    refreshClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]); // Solo ejecutar en la carga inicial

  // Filtrado por búsqueda
  useEffect(() => {
    if (!allClientes) return;
    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = allClientes.filter(c =>
      c.nombre.toLowerCase().includes(lowerCaseSearch) ||
      c.apellido.toLowerCase().includes(lowerCaseSearch) ||
      c.email.toLowerCase().includes(lowerCaseSearch) ||
      (c.telefono && c.telefono.includes(searchTerm))
    );
    setFilteredClientes(filtered);
  }, [searchTerm, allClientes]);

  // Manejar edición
  const handleEdit = (cliente) => {
    setSelectedCliente(cliente);
    setViewMode(VIEW_MODES.EDIT);
    setMessage(''); // Limpiar mensaje al entrar a editar
  };

  // Manejar éxito de formulario
  const handleFormSuccess = (successMessage) => {
    refreshClientes();
    setViewMode(VIEW_MODES.LIST);
    setMessage(successMessage); // Mostrar mensaje de éxito en la lista
    setTimeout(() => setMessage(''), 3000); // Autocerrar
  };

  // Manejar cancelación de formulario
  const handleFormCancel = () => {
    setViewMode(VIEW_MODES.LIST);
    setSelectedCliente(null);
    setMessage(''); // Limpiar mensajes
  };

  // Renderizado condicional
  const renderContent = () => {
    if (isLoading && viewMode === VIEW_MODES.LIST && !allClientes) {
      return <LoadingIndicator />;
    }

    switch (viewMode) {
      case VIEW_MODES.CREATE:
        return (
          <ClienteForm
            token={token}
            cliente={null}
            onSuccess={() => handleFormSuccess('✅ Cliente creado exitosamente.')}
            onCancel={handleFormCancel}
            setMessage={setMessage}
          />
        );
      case VIEW_MODES.EDIT:
        return (
          <ClienteForm
            token={token}
            cliente={selectedCliente}
            onSuccess={() => handleFormSuccess('✅ Cliente actualizado exitosamente.')}
            onCancel={handleFormCancel}
            setMessage={setMessage}
          />
        );
      case VIEW_MODES.LIST:
      default:
        return (
          <ClienteList
            clientes={filteredClientes}
            onEdit={handleEdit}
            refreshClientes={refreshClientes}
            token={token}
            setMessage={setMessage}
            isLoading={isLoading} // Pasar estado de carga a la lista
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-xl space-y-6">
        
        {/* --- Encabezado --- */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 pb-5">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center gap-3">
            <UserGroupIcon />
            Gestión de Clientes
          </h1>
          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {viewMode === VIEW_MODES.LIST && (
              <button 
                onClick={() => { setViewMode(VIEW_MODES.CREATE); setMessage(''); }} 
                className="btn-primary" // Asumo clase base
              >
                <PlusIcon /> Nuevo Cliente
              </button>
            )}
            {viewMode !== VIEW_MODES.LIST && (
              <button 
                onClick={handleFormCancel} 
                className="btn-secondary-outline" // Asumo clase base
              >
                <ArrowLeftIcon /> Volver a la Lista
              </button>
            )}
          </div>
        </div>

        {/* --- Barra de Herramientas (Mensaje y Búsqueda) --- */}
        <div className="space-y-4">
          {/* Mensaje Global (siempre visible) */}
          <AlertMessage msg={message} onDismiss={() => setMessage('')} />
        
          {viewMode === VIEW_MODES.LIST && (
            <div className="flex justify-start">
              {/* Buscador */}
              <div className="relative w-full md:w-2/5">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm placeholder-gray-400"
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