// src/api/favorito.js
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getConfig = (token) => ({
    headers: {
        'Authorization': `Token ${token}`
    }
});

/**
 * Obtiene la lista de objetos 'Favorito' del usuario.
 * (La API devuelve: [{ id: 1, producto: {...} }, ...])
 */
export const getFavoritos = async (token) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/favoritos/`, getConfig(token));
        return response.data; 
    } catch (error) {
        console.error("Error al obtener favoritos:", error.response?.data || error.message);
        throw error.response?.data || new Error('Error al obtener favoritos.');
    }
};

/**
 * Llama a la acción 'toggle-favorito' en el backend.
 * Esta es la única función necesaria para añadir O quitar.
 */
export const toggleFavoritoStatus = async (token, productoId) => {
    try {
        // Llama a: POST /api/productos/{productoId}/toggle-favorito/
        const response = await axios.post(
            `${API_BASE_URL}/api/productos/${productoId}/toggle-favorito/`, 
            {}, // No necesita body, solo el token y el ID en la URL
            getConfig(token)
        );
        // Devuelve la respuesta del backend (ej: { status: 'agregado', es_favorito: true })
        return response.data;
    } catch (error) {
        console.error("Error al cambiar estado de favorito:", error.response?.data || error.message);
        throw error.response?.data || new Error('Error al cambiar estado de favorito.');
    }
};