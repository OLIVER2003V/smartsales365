// src/api/producto.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Función de utilidad para generar la configuración de la cabecera
const getConfig = (token, isFormData = false) => ({
    headers: {
        'Authorization': `Token ${token}`,
        // Si enviamos archivos, el Content-Type es 'multipart/form-data'
        // Si no, es 'application/json'
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
    },
});

/**
 * 1. LISTAR: Obtiene la lista de todos los productos.
 */
export const getProducts = async (token) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/productos/`, getConfig(token));
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 2. CREAR: Envía los datos de un nuevo producto, incluyendo la imagen.
 */
export const createProduct = async (token, productData) => {
    // productData debe ser un objeto FormData
    try {
        const response = await axios.post(`${API_BASE_URL}/api/productos/`, productData, getConfig(token, true));
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 3. EDITAR: Actualiza los datos de un producto existente.
 */
export const updateProduct = async (token, productId, productData) => {
    // productData también debe ser un objeto FormData si se puede cambiar la imagen
    try {
        const response = await axios.put(`${API_BASE_URL}/api/productos/${productId}/`, productData, getConfig(token, true));
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 4. ELIMINAR: Borra un producto por su ID.
 */
export const deleteProduct = async (token, productId) => {
    try {
        await axios.delete(`${API_BASE_URL}/api/productos/${productId}/`, getConfig(token));
    } catch (error) {
        throw error;
    }
};

/**
 * 5. CARGA MASIVA: Sube un archivo Excel para la carga masiva.
 */
export const uploadMassiveProducts = async (token, fileData) => {
    // fileData es un objeto FormData que contiene el archivo
    try {
        const response = await axios.post(`${API_BASE_URL}/api/productos/upload_masivo/`, fileData, getConfig(token, true));
        return response.data;
    } catch (error) {
        throw error;
    }
};