// src/api/promocion.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthConfig = (token) => ({
    headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
    },
});

/**
 * Obtiene la lista de todas las promociones.
 * @param {string} token - Token del Admin/Vendedor.
 */
export const getPromociones = async (token) => {
    const response = await axios.get(
        `${API_BASE_URL}/api/admin/promociones/`, 
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Crea una nueva promoción.
 * @param {string} token - Token del Admin/Vendedor.
 * @param {object} promocionData - Datos de la nueva promoción.
 */
export const createPromocion = async (token, promocionData) => {
    const response = await axios.post(
        `${API_BASE_URL}/api/admin/promociones/`, 
        promocionData, 
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Actualiza una promoción (parcialmente con PATCH).
 * @param {string} token - Token del Admin/Vendedor.
 * @param {number} id - ID de la promoción a actualizar.
 * @param {object} promocionData - Datos a actualizar.
 */
export const updatePromocion = async (token, id, promocionData) => {
    const response = await axios.patch(
        `${API_BASE_URL}/api/admin/promociones/${id}/`, 
        promocionData, 
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Elimina una promoción.
 * @param {string} token - Token del Admin/Vendedor.
 * @param {number} id - ID de la promoción a eliminar.
 */
export const deletePromocion = async (token, id) => {
    await axios.delete(
        `${API_BASE_URL}/api/admin/promociones/${id}/`, 
        getAuthConfig(token)
    );
    return id; 
};