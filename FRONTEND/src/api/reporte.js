// src/api/reporte.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const GENERAR_ENDPOINT = `${API_BASE_URL}/api/reportes/generar/`;
const EXPORTAR_ENDPOINT = `${API_BASE_URL}/api/reportes/exportar/`;

/**
 * 1. Llama a la API de IA para interpretar el prompt y devolver los datos JSON.
 * @param {string} token - Token de autenticación.
 * @param {string} prompt - La solicitud del usuario en lenguaje natural.
 * @returns {Promise<object>} - Retorna la data (JSON) del reporte.
 */
export const generarReporteIA = async (token, prompt) => {
    try {
        const response = await axios.post(
            GENERAR_ENDPOINT,
            { prompt: prompt },
            {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
                responseType: "json", // Siempre esperamos JSON
                validateStatus: (s) => s >= 200 && s < 500
            }
        );

        if (response.status >= 400) {
            throw new Error(response.data?.error || response.data?.message || `Error ${response.status}`);
        }
        return response.data; // Devuelve el JSON

    } catch (error) {
        console.error("Error en generarReporteIA:", error);
        throw error; // Lanza el error para que el componente lo atrape
    }
};

/**
 * 2. Envía los datos JSON al backend para convertirlos en un archivo (PDF/Excel).
 * @param {string} token - Token de autenticación.
 * @param {string} formato - 'pdf' o 'excel'.
 * @param {object} data - El JSON del reporte (reportData).
 * @param {string} prompt - El prompt original (para el título del archivo).
 * @returns {Promise<Blob>} - Retorna el archivo como un Blob.
 */
export const exportarReporte = async (token, formato, data, prompt) => {
    try {
        const response = await axios.post(
            EXPORTAR_ENDPOINT,
            {
                data: data,
                formato: formato,
                prompt: prompt
            },
            {
                headers: { 'Authorization': `Token ${token}` },
                responseType: "blob", // Esperamos un archivo
            }
        );
        return response.data; // Devuelve el Blob

    } catch (error) {
        console.error("Error en exportarReporte:", error);
        
        // Intenta decodificar el error si es un Blob (puede contener JSON de error)
        if (error.response && error.response.data instanceof Blob && error.response.data.type === 'application/json') {
            try {
                const errorJson = JSON.parse(await error.response.data.text());
                throw new Error(errorJson.error || errorJson.detail || 'Error en la respuesta del servidor.');
            } catch (parseError) {
                throw new Error('Error desconocido del servidor al exportar.');
            }
        } else if (error.response?.data) {
            throw new Error(error.response.data.error || error.response.data.detail || 'Error en la solicitud de exportación.');
        } else {
            throw new Error('Error de conexión al exportar.');
        }
    }
};