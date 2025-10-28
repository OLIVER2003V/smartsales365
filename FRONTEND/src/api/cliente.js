// src/api/cliente.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Función de utilidad para generar la configuración de la cabecera
// (Puedes moverla a un archivo utils/apiConfig.js si la usas en varios módulos)
const getConfig = (token) => ({
    headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json', // Clientes no manejan archivos por ahora
    },
});

/**
 * 1. LISTAR: Obtiene la lista de todos los clientes.
 */
export const getClientes = async (token) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/clientes/`, getConfig(token));
        return response.data;
    } catch (error) {
        console.error("Error fetching clientes:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * 2. CREAR: Envía los datos de un nuevo cliente.
 */
export const createCliente = async (token, clienteData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/clientes/`, clienteData, getConfig(token));
        return response.data;
    } catch (error) {
        console.error("Error creating cliente:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * 3. EDITAR: Actualiza los datos de un cliente existente.
 */
export const updateCliente = async (token, clienteId, clienteData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/api/clientes/${clienteId}/`, clienteData, getConfig(token));
        return response.data;
    } catch (error) {
        console.error("Error updating cliente:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * 4. ELIMINAR: Borra un cliente por su ID.
 */
export const deleteCliente = async (token, clienteId) => {
    try {
        await axios.delete(`${API_BASE_URL}/api/clientes/${clienteId}/`, getConfig(token));
    } catch (error) {
        console.error("Error deleting cliente:", error.response?.data || error.message);
        throw error;
    }
};