// src/login/Profile.jsx
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Iconos "Pro"
import { 
    UserCircle, 
    Mail, 
    ShieldCheck, 
    LogOut, 
    Loader2, // Spinner
    Building, // Para datos de cliente
    Phone,
    MapPin,
    Hash // Para NIT/CI
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- Icono de Carga ---
const Spinner = () => (
    <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
        <span className="ml-3 text-lg font-medium text-gray-600">Cargando perfil...</span>
    </div>
);

// --- Componente para mostrar un campo del perfil ---
const ProfileField = ({ icon: Icon, label, value }) => (
    <div className="flex items-center space-x-3">
        <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
        <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-gray-800 font-semibold">{value || '-'}</p>
        </div>
    </div>
);

const Profile = ({ token, setToken }) => {
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const getConfig = useCallback(() => ({
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
        },
    }), [token]);

    // --- Obtener Datos del Perfil ---
    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                // No mostrar toast aquí, simplemente redirigir
                navigate('/', { replace: true });
                return;
            }
            
            setIsLoading(true);
            const profilePromise = axios.get(`${API_BASE_URL}/api/profile/`, getConfig());

            toast.promise(
                profilePromise,
                {
                    loading: 'Cargando datos del perfil...',
                    success: (response) => {
                        setProfileData(response.data);
                        return 'Perfil cargado exitosamente.';
                    },
                    error: (error) => {
                        console.error("Error al obtener perfil:", error.response?.data || error.message);
                        if (error.response?.status === 401) {
                            // Token inválido, forzar logout local
                            setToken('');
                            localStorage.removeItem('token');
                            navigate('/', { replace: true });
                            return 'Sesión inválida. Por favor, inicia sesión de nuevo.';
                        }
                        return 'Error al cargar el perfil.';
                    }
                },
                { // Opciones del toast
                  success: { duration: 2000 },
                  error: { duration: 4000 }
                }
            ).finally(() => setIsLoading(false));
        };

        fetchProfile();
    }, [token, navigate, setToken, getConfig]); // Incluir getConfig como dependencia

    // --- Cerrar Sesión ---
    const handleLogout = useCallback(async () => {
        if (!window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
            return;
        }

        const logoutPromise = axios.post(`${API_BASE_URL}/api/auth/logout/`, null, getConfig());

        toast.promise(
            logoutPromise,
            {
                loading: 'Cerrando sesión...',
                success: 'Sesión cerrada exitosamente.',
                error: 'Error al cerrar sesión en el servidor (cierre local forzado).' 
            },
            { // Opciones del toast
              success: { duration: 1500 },
              error: { duration: 3000 }
            }
        ).finally(() => {
            // Siempre limpiar localmente, incluso si la API falla
            setToken('');
            localStorage.removeItem('token');
            navigate('/', { replace: true });
        });
    }, [token, setToken, navigate, getConfig]); // Incluir getConfig como dependencia

    // Mapeo de Rol a Texto legible
    const getRolDisplay = (rol) => {
        switch (rol) {
            case 'ADM': return 'Administrador';
            case 'VEN': return 'Vendedor';
            case 'CLI': return 'Cliente';
            default: return 'Desconocido';
        }
    };
    
    // --- Renderizado ---

    if (isLoading) {
        return <Spinner />;
    }

    if (!profileData) {
        // Este caso usualmente se maneja por la redirección en useEffect si hay error
        // Pero es bueno tener un fallback
        return (
             <div className="flex justify-center items-start pt-20">
                <div className="p-6 bg-white shadow-lg rounded-lg text-red-600 font-medium border border-red-200">
                    No se pudieron cargar los datos del perfil. Intenta recargar la página.
                </div>
            </div>
        );
    }

    // Datos del cliente asociado (si existen)
    const clienteProfile = profileData.cliente_profile;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-xl border border-gray-200 space-y-8">
                
                {/* --- Encabezado --- */}
                <div className="text-center">
                    <UserCircle className="mx-auto h-16 w-16 text-blue-600" strokeWidth={1.5} />
                    <h1 className="mt-3 text-3xl font-extrabold text-gray-900 tracking-tight">
                        Mi Perfil
                    </h1>
                     <p className="mt-1 text-sm text-gray-500">
                        Bienvenido, {profileData.first_name || profileData.username}
                     </p>
                </div>

                {/* --- Datos del Usuario --- */}
                <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Información de Cuenta</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <ProfileField icon={UserCircle} label="Username" value={profileData.username} />
                        <ProfileField icon={Mail} label="Email" value={profileData.email} />
                        <ProfileField icon={UserCircle} label="Nombre" value={profileData.first_name} />
                        <ProfileField icon={UserCircle} label="Apellido" value={profileData.last_name} />
                        <ProfileField icon={ShieldCheck} label="Rol" value={getRolDisplay(profileData.rol)} />
                    </div>
                </div>

                {/* --- Datos del Cliente Asociado (si existe) --- */}
                {clienteProfile && (
                    <div className="border-t border-gray-200 pt-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                             <Building size={20} /> Información de Cliente
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                             <ProfileField icon={UserCircle} label="Nombre Cliente" value={clienteProfile.nombre} />
                             <ProfileField icon={UserCircle} label="Apellido Cliente" value={clienteProfile.apellido} />
                             <ProfileField icon={Phone} label="Teléfono" value={clienteProfile.telefono} />
                             <ProfileField icon={Hash} label="NIT/CI" value={clienteProfile.nit_ci} />
                             <div className="sm:col-span-2"> 
                                <ProfileField icon={MapPin} label="Dirección" value={clienteProfile.direccion} />
                             </div>
                             {/* Puedes añadir un botón "Editar Datos de Cliente" aquí que redirija */}
                        </div>
                    </div>
                )}
                
                 {/* --- Acciones --- */}
                 <div className="border-t border-gray-200 pt-6 flex justify-center">
                    <button 
                        onClick={handleLogout} 
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                    {/* Puedes añadir botones para "Cambiar Contraseña", "Editar Perfil" aquí */}
                </div>
            </div>
        </div>
    );
};

export default Profile;