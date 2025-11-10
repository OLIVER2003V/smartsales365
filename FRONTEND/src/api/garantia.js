// src/api/garantia.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Consulta el estado de una garantía usando su código UUID.
 * Esta es una llamada pública (no requiere token).
 * @param {string} codigo_uuid - El código UUID de la garantía.
 */
export const consultarGarantia = async (codigo_uuid) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/consultar-garantia/`, 
            {
                params: { codigo: codigo_uuid } // Envía el código como query param
            }
        );
        return response.data;
    } catch (error) {
        // Lanza un error con el mensaje específico del backend si existe
        const message = error.response?.data?.error || error.message || "Ocurrió un error desconocido";
        throw new Error(message);
    }
};