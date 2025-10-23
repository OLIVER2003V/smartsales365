// src/login/Profile.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Profile = ({ token, setToken }) => {
    const [profileData, setProfileData] = useState(null);
    const [message, setMessage] = useState('Cargando datos...');
    const navigate = useNavigate();

    const getConfig = () => ({
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
        },
    });

    // ----------------------------------------------------
    // 1. Obtener Datos del Perfil y Verificar Token
    // ----------------------------------------------------
    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                setMessage("Error: No hay token. Redirigiendo a Login.");
                navigate('/', { replace: true });
                return;
            }
            
            try {
                // Endpoint protegido: /api/profile/
                const response = await axios.get(`${API_BASE_URL}/api/profile/`, getConfig());
                setProfileData(response.data);
                setMessage("✅ Conexión con Backend Exitosa. Token Válido.");
            } catch (error) {
                // Token inválido (401), forzamos logout local y redirigimos.
                setMessage("❌ Sesión Inválida. Por favor, vuelve a iniciar sesión.");
                setToken('');
                localStorage.removeItem('token');
                navigate('/', { replace: true });
            }
        };

        fetchProfile();
    }, [token, navigate, setToken]);

    // ----------------------------------------------------
    // 2. Caso de Uso: Cerrar Sesión (POST /api/auth/logout/)
    // ----------------------------------------------------
    const handleLogout = async () => {
        try {
            // Elimina el token del lado del backend
            await axios.post(`${API_BASE_URL}/api/auth/logout/`, null, getConfig());
            setMessage("✅ Sesión cerrada exitosamente.");
        } catch (error) {
            // El token ya podría haber sido eliminado (ej. si cierras 2 veces), 
            // pero siempre limpiamos localmente para asegurar el cierre.
            setMessage("⚠️ Cierre local forzado.");
        } finally {
            setToken('');
            localStorage.removeItem('token');
            navigate('/', { replace: true });
        }
    };

    if (!profileData) {
        return (
            <div className="flex justify-center items-start pt-20">
                <div className="p-4 bg-white shadow-lg rounded-lg text-gray-700 font-medium">
                    {message}
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-start pt-20 bg-gray-100 min-h-screen">
            <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-2xl space-y-6">
                <h1 className="text-3xl font-extrabold text-blue-800 text-center">
                    Mi Perfil - {profileData.rol === 'ADM' ? 'ADMINISTRADOR' : profileData.rol === 'VEN' ? 'VENDEDOR' : 'CLIENTE'}
                </h1>
                
                <p className="text-center text-sm text-green-600 font-medium">{message}</p>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-700 font-semibold mb-2">Detalles del Usuario:</p>
                    <pre className="text-xs bg-gray-200 p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(profileData, null, 2)}
                    </pre>
                </div>
                
                <div className="flex justify-center">
                    <button 
                        onClick={handleLogout} 
                        className="bg-red-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-red-700 transition duration-200 shadow-md"
                    >
                        Cerrar Sesión (Logout)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;