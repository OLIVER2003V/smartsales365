// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth'; // Importamos tu archivo auth.js
import toast from 'react-hot-toast';

// 1. Crear el Contexto
const AuthContext = createContext();

// 2. Crear el Hook para consumirlo
export const useAuth = () => useContext(AuthContext);

// 3. Crear el Proveedor
export const AuthProvider = ({ children }) => {
    // Estado para el token y los datos del usuario
    const [token, setToken] = useState(() => localStorage.getItem('authToken'));
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('authUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Efecto para cargar el estado desde localStorage al iniciar
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('authUser');
        if (token && user) {
            setToken(token);
            setUser(JSON.parse(user));
        }
    }, []);

    /**
     * Función de Login: Llama a la API y guarda el estado
     */
    const login = async (username, password) => {
        setLoading(true);
        try {
            // 1. Llama a tu API para obtener el token
            const authToken = await authApi.loginUser(username, password);
            
            // 2. Llama a tu API para obtener los datos del perfil
            const userData = await authApi.getUserProfile(authToken);

            // 3. Guarda todo en localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('authUser', JSON.stringify(userData));

            // 4. Actualiza el estado de React
            setToken(authToken);
            setUser(userData);
            
            toast.success(`¡Bienvenido, ${userData.username}!`);
            navigate('/'); // Redirige al inicio (o al dashboard)

        } catch (error) {
            console.error("Error en login:", error);
            toast.error(error.response?.data?.detail || "Usuario o contraseña incorrectos.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Función de Logout: Llama a la API y limpia el estado
     */
    const logout = async () => {
        setLoading(true);
        try {
            if (token) {
                // Llama a la API para invalidar el token en el backend
                await authApi.logoutUser(token);
            }
        } catch (error) {
            console.error("Error en logout (API):", error);
            // No detenemos el logout del frontend incluso si la API falla
        } finally {
            // 1. Limpia el estado de React
            setToken(null);
            setUser(null);

            // 2. Limpia el localStorage
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            
            setLoading(false);
            toast.success("Sesión cerrada.");
            navigate('/login'); // Redirige al login
        }
    };

    // (Opcional) Función de registro
    const register = async (userData) => {
        setLoading(true);
        try {
            await authApi.registerUser(
                userData.username,
                userData.email,
                userData.password,
                userData.first_name,
                userData.last_name,
                userData.edad
            );
            toast.success("¡Registro exitoso! Por favor, inicia sesión.");
            navigate('/login');
        } catch (error) {
            console.error("Error en registro:", error.response?.data);
            const errorMsg = Object.values(error.response.data).join(', ');
            toast.error(`Error al registrar: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    // 4. Valor que proveerá el contexto
    const value = {
        token,
        user,
        loading,
        isAuthenticated: !!token, // Un booleano útil
        login,
        logout,
        register,
        // (Puedes añadir aquí updateUserProfile, changePassword, etc. si lo deseas)
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};