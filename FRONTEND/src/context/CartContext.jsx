// src/context/CartContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext'; // Importamos el hook de autenticación
import * as cartApi from '../api/carrito'; // Importamos el servicio de API del carrito

// 1. Crear el Contexto
const CartContext = createContext();

// 2. Crear el Hook (Esto es lo que tu Navbar.jsx necesita)
export const useCart = () => {
    return useContext(CartContext);
};

// 3. Crear el Provider
export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [cartTotal, setCartTotal] = useState(0);
    const [itemCount, setItemCount] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // Obtenemos el token desde el AuthContext
    const { token } = useAuth(); 

    // Función interna para actualizar el estado local
    const updateCartState = (cartData) => {
        setCartItems(cartData?.items || []);
        setCartTotal(cartData?.subtotal || 0);
        setItemCount(cartData?.total_items || 0);
    };

    // --- FUNCIONES PÚBLICAS DEL HOOK ---

    // 1. Cargar el carrito desde la BD
    const fetchCart = async () => {
        if (!token) {
            updateCartState(null); // No hay usuario, resetea el carrito
            return;
        }
        setLoading(true);
        try {
            // Pasamos el token a la función de la API
            const data = await cartApi.getCart(token);
            updateCartState(data);
        } catch (error) {
            toast.error(`Error al cargar carrito: ${error.message}`);
            updateCartState(null); 
        } finally {
            setLoading(false);
        }
    };

    // 2. Añadir un item
    const addToCart = async (producto, cantidad = 1) => {
        if (!token) return toast.error("Debes iniciar sesión para añadir productos.");
        
        setLoading(true);
        try {
            // Pasamos el token
            const data = await cartApi.addItemToCart(token, producto.id, cantidad);
            updateCartState(data);
            toast.success(`"${producto.nombre}" añadido al carrito.`);
        } catch (error) {
            toast.error(error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    // 3. Actualizar cantidad (¡Esta es una de las funciones que faltaban!)
    const updateQuantity = async (productoId, newQuantity) => {
        if (!token) return; // No hay token, no hacer nada
        setLoading(true);
        try {
            // Pasamos el token
            const data = await cartApi.updateItemQuantity(token, productoId, newQuantity);
            updateCartState(data);
        } catch (error) {
            toast.error(error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    // 4. Quitar un item (¡Esta es una de las funciones que faltaban!)
    const removeFromCart = async (productoId) => {
        if (!token) return;
        setLoading(true);
        try {
            // Pasamos el token
            const data = await cartApi.removeItemFromCart(token, productoId);
            updateCartState(data);
            // El toast de "eliminado" lo pones en tu componente ShoppingCart
        } catch (error) {
            toast.error(error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    // 5. Vaciar el carrito (¡Esta es una de las funciones que faltaban!)
    const clearCart = async () => {
        if (!token) return;
        setLoading(true);
        try {
            // Pasamos el token
            const data = await cartApi.clearCartApi(token);
            updateCartState(data);
            // El toast de "vaciado" lo pones en tu componente ShoppingCart
        } catch (error) {
            toast.error(error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    // 6. ¡LA FUNCIÓN DE COMANDO DE VOZ!
    const sendCartCommand = async (comandoTexto) => {
        if (!token) return toast.error("Debes iniciar sesión para usar comandos.");

        setLoading(true);
        const toastId = toast.loading(`Procesando: "${comandoTexto}"...`);
        
        try {
            // Pasamos el token
            const data = await cartApi.sendCartCommandApi(token, comandoTexto);
            updateCartState(data);
            toast.success(data.mensaje_confirmacion, { id: toastId });
        } catch (error)
        {
            toast.error(error.response?.data?.error || error.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    // Efecto para (re)cargar el carrito cuando el 'token' cambia (login/logout)
    useEffect(() => {
        fetchCart();
    }, [token]);

    // 5. Exponer los valores
    const value = {
        cartItems,
        cartTotal,
        itemCount,
        loading,
        addToCart,
        updateQuantity,   // <-- Ahora existe
        removeFromCart, // <-- Ahora existe
        clearCart,        // <-- Ahora existe
        sendCartCommand
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};