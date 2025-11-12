import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- Helper de Configuración de Auth (para peticiones protegidas) ---
const getAuthConfig = (token) => ({
    headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
    },
});

/**
 * (Pública) Consulta el estado de una garantía usando su código UUID.
 * No requiere token.
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
        const message = error.response?.data?.error || error.message || "Ocurrió un error desconocido";
        throw new Error(message);
    }
};

// --- ✨ NUEVA FUNCIÓN (Protegida) ---
/**
 * (Admin) Obtiene la lista de todas las garantías para gestionar.
 * @param {string} token - El token de autenticación del admin.
 */
export const getAdminGarantias = async (token) => {
    try {
        // Asumimos que /api/garantias/ es un nuevo endpoint en tu Django
        const response = await axios.get(
            `${API_BASE_URL}/api/garantias/`, 
            getAuthConfig(token)
        );
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || "Error al cargar garantías";
        throw new Error(message);
    }
};

// --- ✨ NUEVA FUNCIÓN (Protegida) ---
/**
 * (Cliente) Inicia un reclamo para una garantía específica.
 * @param {string} token - El token de autenticación del cliente.
 * @param {number} garantiaId - El ID (PK) de la garantía.
 * @param {string} motivoReclamo - La descripción del cliente sobre la falla.
 */
export const iniciarReclamoGarantia = async (token, garantiaId, motivoReclamo) => {
    try {
        // Llama al endpoint de tu urls.py
        const response = await axios.post(
            `${API_BASE_URL}/api/garantias/${garantiaId}/reclamar/`, 
            { motivo_reclamo: motivoReclamo }, // El body de la petición
            getAuthConfig(token) // La configuración con el token
        );
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || "Error al iniciar el reclamo";
        throw new Error(message);
    }
};

// --- ✨ NUEVA FUNCIÓN (Protegida) ---
/**
 * (Admin) Gestiona (aprueba, recepciona, rechaza) un reclamo.
 * @param {string} token - El token de autenticación del admin.
 * @param {number} garantiaId - El ID (PK) de la garantía.
 * @param {string} estado - El nuevo estado (ej. 'EN_REVISION', 'APROBADA', 'RECHAZADA').
 * @param {string} observacionAdmin - La justificación del admin.
 */
export const gestionarReclamoGarantia = async (token, garantiaId, estado, observacionAdmin) => {
    try {
        // Llama al endpoint de tu urls.py
        const response = await axios.patch(
            `${API_BASE_URL}/api/garantias/${garantiaId}/gestionar/`,
            { 
                estado: estado,
                observacion_admin: observacionAdmin 
            }, // El body
            getAuthConfig(token) // La config
        );
        return response.data;
    } catch (error) {
        const message = error.response?.data?.error || "Error al gestionar el reclamo";
        throw new Error(message);
    }
};