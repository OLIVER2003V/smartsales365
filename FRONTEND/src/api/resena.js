// src/api/resena.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthConfig = (token) => ({
    headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
    },
});

/**
 * Obtiene las reseñas para un producto específico (público).
 * @param {number} productoId - ID del producto.
 */
export const getResenasPorProducto = async (productoId) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/resenas/`,
            { params: { producto_id: productoId } } // Envía como ?producto_id=1
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Obtiene TODAS las reseñas (para moderación de Admin).
 * @param {string} token - Token del Admin.
 */
export const getTodasResenas = async (token) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/resenas/`,
            getAuthConfig(token)
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Crea una nueva reseña (requiere token de Cliente).
 * @param {string} token - Token del Cliente.
 * @param {object} resenaData - { producto, calificacion, titulo, comentario }
 */
export const createResena = async (token, resenaData) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/resenas/`,
            resenaData,
            getAuthConfig(token)
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

/**
 * Elimina una reseña (requiere token de Admin o del dueño).
 * @param {string} token - Token de autenticación.
 * @param {number} resenaId - ID de la reseña a eliminar.
 */
export const deleteResena = async (token, resenaId) => {
    try {
        await axios.delete(
            `${API_BASE_URL}/api/resenas/${resenaId}/`,
            getAuthConfig(token)
        );
        return resenaId; // Devuelve el ID para filtrarlo del estado
    } catch (error) {
        throw error.response?.data || error;
    }
};

