// src/api/categoria.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

/**
 * Obtiene la lista de todas las categorías.
 * @param {string} token - Token del Admin/Vendedor.
 */
export const getCategorias = async (token) => {
    const response = await axios.get(
        `${API_BASE_URL}/api/categorias/`, 
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Crea una nueva categoría.
 * @param {string} token - Token del Admin/Vendedor.
 * @param {object} categoriaData - Datos de la nueva categoría (nombre, descripcion).
 */
export const createCategoria = async (token, categoriaData) => {
    const response = await axios.post(
        `${API_BASE_URL}/api/categorias/`, 
        categoriaData, 
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Actualiza una categoría (parcialmente con PATCH).
 * @param {string} token - Token del Admin/Vendedor.
 * @param {number} id - ID de la categoría a actualizar.
 * @param {object} categoriaData - Datos a actualizar.
 */
export const updateCategoria = async (token, id, categoriaData) => {
    const response = await axios.patch(
        `${API_BASE_URL}/api/categorias/${id}/`, 
        categoriaData, 
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Elimina una categoría.
 * @param {string} token - Token del Admin/Vendedor.
 * @param {number} id - ID de la categoría a eliminar.
 */
export const deleteCategoria = async (token, id) => {
    await axios.delete(
        `${API_BASE_URL}/api/categorias/${id}/`, 
        getAuthConfig(token)
    );
    // DELETE no devuelve contenido, solo status 204
    return id; 
};