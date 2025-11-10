// src/api/admin.js
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
 * Obtiene la lista de todos los usuarios (requiere token de Admin).
 * (Usado en GestionUsuarios.jsx)
 * @param {string} token - Token del Admin.
 */
export const getUsuarios = async (token) => {
    const response = await axios.get(
        `${API_BASE_URL}/api/admin/usuarios/`, 
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Crea un nuevo usuario (requiere token de Admin).
 * (Usado en UsuarioModal.jsx)
 * @param {string} token - Token del Admin.
 * @param {object} usuarioData - Datos del nuevo usuario (username, email, password, rol, etc.)
 */
export const createUsuario = async (token, usuarioData) => {
    const response = await axios.post(
        `${API_BASE_URL}/api/admin/usuarios/`, 
        usuarioData, 
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Actualiza un usuario existente (requiere token de Admin).
 * (Usado en UsuarioModal.jsx)
 * @param {string} token - Token del Admin.
 * @param {number} id - ID del usuario a actualizar.
 * @param {object} usuarioData - Datos a actualizar (email, rol, is_active, etc.)
 */
export const updateUsuario = async (token, id, usuarioData) => {
    // Usamos PATCH para actualizaciones parciales
    const response = await axios.patch(
        `${API_BASE_URL}/api/admin/usuarios/${id}/`, 
        usuarioData, 
        getAuthConfig(token)
    );
    return response.data;
};

/**
 * Elimina un usuario (requiere token de Admin).
 * (Usado en GestionUsuarios.jsx)
 * @param {string} token - Token del Admin.
 * @param {number} id - ID del usuario a eliminar.
 */
export const deleteUsuario = async (token, id) => {
    await axios.delete(
        `${API_BASE_URL}/api/admin/usuarios/${id}/`, 
        getAuthConfig(token)
    );
    return id; 
};


// --- ¡NUEVA FUNCIÓN AÑADIDA! ---

/**
 * Actualiza el estado de un pedido/venta (requiere token de Admin/Vendedor).
 * (Usado en GestionPedidos.jsx)
 * @param {string} token - Token del Admin/Vendedor.
 * @param {number} ventaId - ID de la venta/pedido a actualizar.
 * @param {string} nuevoEstado - El nuevo código de estado (ej: "ENT", "OK", "CAN").
 */
export const updateEstadoVenta = async (token, ventaId, nuevoEstado) => {
    const response = await axios.patch(
        `${API_BASE_URL}/api/ventas/${ventaId}/actualizar-estado/`,
        { estado: nuevoEstado }, // Body de la petición: { "estado": "ENT" }
        getAuthConfig(token)
    );
    return response.data; // Devuelve la venta actualizada
};