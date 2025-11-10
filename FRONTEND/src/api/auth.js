// src/api/auth.js
import axios from 'axios';

// Lee la URL base de tu archivo .env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- Helper para la Configuración de Auth ---
/**
 * Crea el objeto de configuración de cabeceras para solicitudes autenticadas.
 * @param {string} token - El token de autenticación del usuario.
 * @returns {object} Objeto de configuración de Axios.
 */
const getAuthConfig = (token) => ({
    headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
    },
});

// --- Funciones de Autenticación (Existentes) ---

// 1. Función para Iniciar Sesión
export const loginUser = async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login/`, {
        username,
        password,
    });
    return response.data.token; 
};

// 2. Función para Registrar un Usuario
export const registerUser = async (username, email, password, first_name, last_name, edad) => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register/`, {
        username,
        email,
        password,
        first_name,
        last_name,
        edad,
    });
    return response.data;
};

// 3. Función para SOLICITAR el reseteo de contraseña
export const requestPasswordReset = async (email) => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/password/reset/`, {
        email,
    });
    return response.data; 
};

// 4. Función para CONFIRMAR la nueva contraseña
export const confirmPasswordReset = async (uid, token, new_password) => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/password/reset/confirm/`, {
        uid,
        token,
        new_password1: new_password,
        new_password2: new_password,
    });
    return response.data;
};


// --- INICIO: NUEVAS FUNCIONES (CU4: Gestionar Perfil) ---

/**
 * 5. (CU4) Obtiene los datos del perfil del usuario autenticado.
 */
export const getUserProfile = async (token) => {
    const response = await axios.get(`${API_BASE_URL}/api/profile/`, getAuthConfig(token));
    return response.data;
};

/**
 * 6. (CU4) Actualiza los datos del perfil del usuario (usa PATCH).
 * @param {string} token - El token de autenticación.
 * @param {object} profileData - Objeto con los campos a actualizar (ej: { first_name, last_name, email, edad }).
 */
export const updateUserProfile = async (token, profileData) => {
    // Usamos PATCH para actualizaciones parciales
    const response = await axios.patch(`${API_BASE_URL}/api/profile/`, profileData, getAuthConfig(token));
    return response.data;
};

/**
 * 7. (CU4) Cambia la contraseña del usuario autenticado.
 * @param {string} token - El token de autenticación.
 * @param {object} passwordData - Objeto con { old_password, new_password1, new_password2 }.
 */
export const changeUserPassword = async (token, passwordData) => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/password/change/`, passwordData, getAuthConfig(token));
    return response.data;
};

/**
 * 8. (CU4) Cierra la sesión del usuario en el servidor.
 */
export const logoutUser = async (token) => {
    // El 'null' es porque no enviamos body, pero sí la config
    const response = await axios.post(`${API_BASE_URL}/api/auth/logout/`, null, getAuthConfig(token));
    return response.data;
};
// --- FIN: NUEVAS FUNCIONES ---