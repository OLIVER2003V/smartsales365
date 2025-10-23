// src/api/auth.js
import axios from 'axios';

// Lee la URL base de tu archivo .env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LOGIN_ENDPOINT = '/auth/login/';
const REGISTER_ENDPOINT = '/api/auth/register/';

// 1. Función para Iniciar Sesión
export const loginUser = async (username, password) => {
    // Nota: El login solo necesita username y password
    const response = await axios.post(`${API_BASE_URL}${LOGIN_ENDPOINT}`, {
        username,
        password,
    });
    return response.data.token; 
};

// 2. Función para Registrar un Usuario (AÑADIDOS: first_name, last_name)
export const registerUser = async (username, email, password, first_name, last_name, edad) => {
    // Usamos axios para enviar los datos de registro
    const response = await axios.post(`${API_BASE_URL}${REGISTER_ENDPOINT}`, {
        username,
        email,
        password,
        first_name, // Enviando el nombre
        last_name,
        edad,  // Enviando el apellido
        // NO se envía el 'rol' para mantener la seguridad del backend
    });
    // Puedes retornar la data completa del nuevo usuario si es necesario
    return response.data;
};

// 3. Función para SOLICITAR el reseteo de contraseña (modo desarrollo)
export const requestPasswordReset = async (email) => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/password/reset/`, {
        email,
    });
    // Devuelve el objeto completo que ahora contiene uid y token
    return response.data; 
};

// 4. Función para CONFIRMAR la nueva contraseña
export const confirmPasswordReset = async (uid, token, new_password) => {
    // 👇 CAMBIO AQUÍ: Enviamos new_password1 y new_password2
    const response = await axios.post(`${API_BASE_URL}/api/auth/password/reset/confirm/`, {
        uid,
        token,
        new_password1: new_password,
        new_password2: new_password, // Le pasamos el mismo valor dos veces
    });
    return response.data;
};