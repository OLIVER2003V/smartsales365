// src/context/CartContext.jsx
import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';

// 1. Crear el Contexto
const CartContext = createContext();

// Hook personalizado para usar el contexto fácilmente
export const useCart = () => useContext(CartContext);

// 2. Crear el Proveedor del Contexto
export const CartProvider = ({ children }) => {
    // Estado del carrito: [{ producto: {}, cantidad: n }]
    // Carga inicial desde localStorage para persistencia básica
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem('shoppingCart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    // Guarda el carrito en localStorage cada vez que cambie
    useEffect(() => {
        localStorage.setItem('shoppingCart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Función para añadir un producto al carrito
    const addToCart = (product, quantity = 1) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.producto.id === product.id);
            if (existingItem) {
                // Actualizar cantidad si ya existe, respetando el stock
                const newQuantity = Math.min(existingItem.cantidad + quantity, product.stock);
                if (newQuantity > existingItem.cantidad) { // Solo actualiza si hay stock
                    return prevItems.map(item =>
                        item.producto.id === product.id ? { ...item, cantidad: newQuantity } : item
                    );
                } else {
                     // Podrías mostrar un mensaje aquí si el stock está al límite
                     console.warn(`Stock máximo alcanzado para ${product.nombre}`);
                     return prevItems; // No hacer nada si no se puede añadir más
                }
            } else {
                // Añadir nuevo item si hay stock
                if (product.stock >= quantity) {
                    return [...prevItems, { producto: product, cantidad: quantity }];
                } else {
                    console.warn(`${product.nombre} está agotado o no hay suficiente stock.`);
                    return prevItems; // No añadir si no hay stock suficiente
                }
            }
        });
    };

    // Función para actualizar la cantidad de un item
    const updateQuantity = (productId, newQuantity) => {
        setCartItems(prevItems => {
            return prevItems.map(item => {
                if (item.producto.id === productId) {
                    // Asegura que la cantidad sea válida (>= 1 y <= stock)
                    const validatedQuantity = Math.max(1, Math.min(newQuantity, item.producto.stock));
                    return { ...item, cantidad: validatedQuantity };
                }
                return item;
            }).filter(item => item.cantidad > 0); // Elimina si la cantidad es 0 o menos
        });
    };

    // Función para eliminar un item del carrito
    const removeFromCart = (productId) => {
        setCartItems(prevItems => prevItems.filter(item => item.producto.id !== productId));
    };

    // Función para vaciar el carrito (útil después de una compra)
    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem('shoppingCart');
    };

    // Calcular total y número de items (memoizado para eficiencia)
    const cartTotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + (item.cantidad * item.producto.precio), 0);
    }, [cartItems]);

    const itemCount = useMemo(() => {
         return cartItems.reduce((sum, item) => sum + item.cantidad, 0);
    }, [cartItems]);

    // 3. Valor que proveerá el contexto
    const value = {
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        itemCount,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};