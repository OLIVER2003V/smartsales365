// src/api/carrito.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthConfig = (token) => ({
    headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
    },
});

/**
 * Obtiene el carrito de compras actual del usuario.
 */
export const getCart = async (token) => {
    const response = await axios.get(
        // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
        `${API_BASE_URL}/api/carrito/`, // <-- Asegúrate que dice /api/carrito/
        getAuthConfig(token)
    );
    return response.data;
};

// --- Y VERIFICA TODAS LAS DEMÁS ---

export const addItemToCart = async (token, producto_id, cantidad) => {
    const data = { producto_id, cantidad };
    const response = await axios.post(
        `${API_BASE_URL}/api/carrito/add-item/`, // <-- /api/
        data,
        getAuthConfig(token)
    );
    return response.data;
};

export const updateItemQuantity = async (token, producto_id, cantidad) => {
    const data = { producto_id, cantidad };
    const response = await axios.post(
        `${API_BASE_URL}/api/carrito/update-quantity/`, // <-- /api/
        data,
        getAuthConfig(token)
    );
    return response.data;
};

// ... (Haz lo mismo para remove, clear y command) ...

export const removeItemFromCart = async (token, producto_id) => {
    const data = { producto_id };
    const response = await axios.post(
        `${API_BASE_URL}/api/carrito/remove-item/`, // <-- /api/
        data,
        getAuthConfig(token)
    );
    return response.data;
};

export const clearCartApi = async (token) => {
    const response = await axios.post(
        `${API_BASE_URL}/api/carrito/clear/`, // <-- /api/
        {}, 
        getAuthConfig(token)
    );
    return response.data;
};

export const sendCartCommandApi = async (token, comando) => {
    const data = { comando };
    const response = await axios.post(
        `${API_BASE_URL}/api/carrito/command/`, // <-- /api/
        data,
        getAuthConfig(token)
    );
    return response.data;
};