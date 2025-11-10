// src/context/FavoritesContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getFavoritos, toggleFavoritoStatus } from '../api/favorito';
import toast from 'react-hot-toast';

// 1. Crear el Contexto
const FavoritesContext = createContext();

// 2. Crear el Hook
export const useFavorites = () => useContext(FavoritesContext);

// 3. Crear el Provider
export const FavoritesProvider = ({ children }) => {
    const { token } = useAuth();
    
    // Almacena solo los IDs de los productos favoritos para búsquedas rápidas
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);

    // Cargar favoritos cuando el usuario inicia sesión
    const fetchFavorites = useCallback(async () => {
        if (!token) {
            setFavoriteIds(new Set()); // Limpiar al cerrar sesión
            return;
        }
        setIsLoading(true);
        try {
            const favoritos = await getFavoritos(token); // API Devuelve: [{ id: 1, producto: {id: 10, ...} }, ...]
            // Extraemos solo los IDs de los productos
            const ids = new Set(favoritos.map(fav => fav.producto.id));
            setFavoriteIds(ids);
        } catch (error) {
            console.error("Error al cargar favoritos:", error);
            toast.error("No se pudo cargar tu lista de favoritos.");
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]); // Se ejecuta cuando el 'token' cambia

    /**
     * Función para añadir o quitar un producto de favoritos.
     * Es llamada por los botones de "corazón".
     */
    const toggleFavorite = useCallback(async (productoId) => {
        if (!token) {
            toast.error("Debes iniciar sesión para añadir favoritos.");
            return;
        }

        const isCurrentlyFavorite = favoriteIds.has(productoId);
        
        // Actualización optimista: Cambia el estado de la UI al instante
        setFavoriteIds(prevIds => {
            const newIds = new Set(prevIds);
            if (isCurrentlyFavorite) {
                newIds.delete(productoId);
            } else {
                newIds.add(productoId);
            }
            return newIds;
        });

        // Llamada a la API en segundo plano
        try {
            const response = await toggleFavoritoStatus(token, productoId);
            // Muestra el toast del backend
            toast.success(response.status === 'agregado a favoritos' ? 'Añadido a favoritos' : 'Quitado de favoritos', { icon: '❤️' });
        } catch (error) {
            // Si la API falla, revierte el cambio en la UI
            toast.error("Error al actualizar favoritos.");
            setFavoriteIds(prevIds => {
                const newIds = new Set(prevIds);
                if (isCurrentlyFavorite) {
                    newIds.add(productoId); // Vuelve a añadirlo
                } else {
                    newIds.delete(productoId); // Vuelve a quitarlo
                }
                return newIds;
            });
        }
    }, [token, favoriteIds]);

    /**
     * Función para comprobar si un ID es favorito.
     */
    const isFavorite = (productoId) => favoriteIds.has(productoId);

    const value = {
        favoriteIds,
        toggleFavorite,
        isFavorite,
        isLoadingFavorites: isLoading, // Renombrado para evitar colisiones
    };

    return (
        <FavoritesContext.Provider value={value}>
            {children}
        </FavoritesContext.Provider>
    );
};