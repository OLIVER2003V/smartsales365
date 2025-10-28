// src/api/reporte.js
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
 * Genera un reporte dinámico basado en un prompt de texto.
 * @param {string} token - Token de autenticación.
 * @param {string} prompt - La solicitud del usuario en lenguaje natural.
 * @param {string} formatoDeseado - 'pantalla', 'pdf', 'excel'. Ayuda al backend a priorizar.
 * @returns {Promise<object|Blob>} - Retorna datos JSON o un Blob (archivo).
 */
export const generarReporte = async (token, prompt, formatoDeseado = 'pantalla') => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/reportes/generar/`,
            { prompt: prompt },
            {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                    // Opcional: Indicar el formato preferido si el prompt no lo especifica
                    'Accept': formatoDeseado === 'pdf' ? 'application/pdf' :
                              formatoDeseado === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                              'application/json'
                },
                // IMPORTANTE: Define responseType para manejar archivos binarios
                responseType: (formatoDeseado === 'pdf' || formatoDeseado === 'excel') ? 'blob' : 'json',
            }
        );

        // Si la respuesta es un archivo (Blob) o JSON
        return response.data;

    } catch (error) {
        console.error("Error generando reporte:", error.response?.data || error.message);
        // Intenta decodificar el error si es un Blob (puede contener JSON de error)
        if (error.response && error.response.data instanceof Blob && error.response.data.type === 'application/json') {
             try {
                 const errorJson = JSON.parse(await error.response.data.text());
                 throw new Error(errorJson.error || errorJson.detail || 'Error en la respuesta del servidor.');
             } catch (parseError) {
                  throw new Error('Error desconocido del servidor al generar reporte.');
             }
        } else if (error.response?.data) {
             throw new Error(error.response.data.error || error.response.data.detail || 'Error en la solicitud del reporte.');
        } else {
            throw new Error('Error de conexión al generar reporte.');
        }
    }
};