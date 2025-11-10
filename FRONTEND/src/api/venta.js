// src/api/venta.js
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
 * Obtiene TODAS las ventas (para Admins) o SOLO las ventas
 * del cliente logueado (para Clientes).
 * El backend (VentaViewSet) maneja este filtro automáticamente.
 */
export const getVentas = async (token) => {
    const response = await axios.get(
        `${API_BASE_URL}/api/ventas/`,
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Obtiene los detalles de UNA SOLA venta por su ID.
 * Usado para la página de "Pago Exitoso" y detalles.
 */
export const getVentaById = async (token, ventaId) => {
    const response = await axios.get(
        `${API_BASE_URL}/api/ventas/${ventaId}/`,
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Crea una nueva venta.
 * Usado por el CheckoutForm.
 */
export const createVenta = async (token, ventaData) => {
    const response = await axios.post(
        `${API_BASE_URL}/api/ventas/`,
        ventaData,
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Descarga el comprobante en PDF de una venta específica.
 * NOTA: Esta función es especial, devuelve un 'blob' (archivo).
 */
export const descargarComprobanteVenta = async (token, ventaId) => {
    const response = await axios.get(
        `${API_BASE_URL}/api/ventas/${ventaId}/comprobante/`,
        {
            headers: { 'Authorization': `Token ${token}` },
            responseType: 'blob' // ¡Muy importante!
        }
    );
    return response.data; // Esto será el archivo PDF como un blob
};