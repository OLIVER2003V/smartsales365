// src/api/venta.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Configuración de cabecera (reutilizada)
const getConfig = (token) => ({
    headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
    },
});

/**
 * 1. CREAR VENTA: Envía los datos del carrito y el cliente al backend.
 * @param {string} token - Token de autenticación.
 * @param {object} ventaData - Datos de la venta ({ cliente: id, detalles: [{ producto: id, cantidad: n }] }).
 * @returns {Promise<object>} La venta creada.
 */
export const createVenta = async (token, ventaData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/ventas/`, ventaData, getConfig(token));
        return response.data;
    } catch (error) {
        console.error("Error creating venta:", error.response?.data || error.message);
        throw error; // Propaga el error para que el componente lo maneje
    }
};

/**
 * 2. LISTAR VENTAS: Obtiene el historial de ventas (filtrado por rol en el backend).
 * @param {string} token - Token de autenticación.
 * @returns {Promise<Array>} Lista de objetos Venta.
 */
export const getVentas = async (token) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/ventas/`, getConfig(token));
        return response.data;
    } catch (error) {
        console.error("Error fetching ventas:", error.response?.data || error.message);
        throw error;
    }
};

// Puedes añadir getVentaById(token, id) si necesitas ver detalles específicos