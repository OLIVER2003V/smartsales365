// src/api/analitica.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthConfig = (token) => ({
    headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
    },
});

export const getDashboardKPIs = async (token) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/kpis/`, getAuthConfig(token));
        return response.data;
    } catch (error) {
        console.error("Error fetching dashboard KPIs:", error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getPrediccionesVentas = async (token, dias = 30) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/predicciones/ventas/?dias=${dias}`, 
            getAuthConfig(token)
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching sales predictions:", error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const triggerModelTraining = async (token) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/predicciones/entrenar/`, 
            {}, 
            getAuthConfig(token)
        );
        return response.data;
    } catch (error) {
        console.error("Error triggering model training:", error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getHistorialResumen = async (token, filtros = {}) => {
    try {
        const params = new URLSearchParams();
        if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
        if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
        if (filtros.producto) params.append('producto_id', filtros.producto);
        
        // --- ¡CAMBIO CORREGIDO! ---
        // El backend espera 'categoria_id'
        if (filtros.categoria) params.append('categoria_id', filtros.categoria);
        
        const queryString = params.toString();
        const url = `${API_BASE_URL}/api/historial/resumen/${queryString ? `?${queryString}` : ''}`;
        
        const response = await axios.get(url, getAuthConfig(token));
        return response.data;
    } catch (error) {
        console.error("Error fetching sales history:", error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// --- ¡NUEVA FUNCIÓN AÑADIDA! ---
export const getProductosBajaRotacion = async (token, periodo = '90', limite = 5) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/reportes/baja-rotacion/`,
            {
                headers: { 'Authorization': `Token ${token}` },
                params: { periodo, limite }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching low rotation products:", error);
        throw error.response?.data || new Error("Error al obtener productos de baja rotación.");
    }
};

// Esta función NO debe estar aquí. Bórrala de este archivo.
// export const getProductos = async (token) => { ... };