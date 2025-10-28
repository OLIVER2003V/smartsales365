// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext'; // <-- 1. Importa useCart

// --- Iconos ---
// Icono de Usuario (puedes mantener el tuyo de Heroicons si lo prefieres)
const UserCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0012 11z" clipRule="evenodd" /></svg>;
// Icono del Carrito
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
// --- Fin Iconos ---

function Navbar({ token, setToken, userRole }) { // Recibe userRole
    const navigate = useNavigate();
    const { itemCount, clearCart } = useCart();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleLogout = () => {
        clearCart();
        setToken('');
        localStorage.removeItem('token');
        setDropdownOpen(false);
        navigate('/', { replace: true });
    };

    // Cierra el dropdown si se hace clic fuera
    useEffect(() => {
        // ... (Tu lógica de cerrar dropdown está bien)
    }, [dropdownRef]);

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
            <div className="container mx-auto flex justify-between items-center px-4 h-16"> {/* Ajuste padding y altura */}

                {/* Logo y Navegación Principal */}
                <div className="flex items-center space-x-8">
                    <Link to={token ? "/catalogo" : "/"} className="text-xl font-bold text-slate-800 hover:text-blue-600 transition">
                        SmartSales<span className="text-blue-600">365</span>
                    </Link>

                    {/* Enlaces de Navegación Principal (solo si está logueado) */}
                    <nav className="hidden md:flex items-center space-x-6">
                        {token && (
                            <>
                                {/* Enlaces Comunes */}
                                <Link to="/catalogo" className="nav-link">Catálogo</Link>

                                {/* Enlaces Admin/Vendedor */}
                                {(userRole === 'ADM' || userRole === 'VEN') && (
                                    <>
                                        <Link to="/dashboard" className="nav-link">Dashboard</Link>
                                        <Link to="/productos" className="nav-link">Productos</Link>
                                        <Link to="/clientes" className="nav-link">Clientes</Link>
                                        <Link to="/pos" className="nav-link">Punto de Venta</Link>
                                        <Link to="/historial-ventas" className="nav-link">Historial Ventas</Link>
                                        <Link to="/reportes" className="nav-link">Reportes</Link>
                                    </>
                                )}
                            </>
                        )}
                    </nav>
                </div>

                {/* Acciones del Usuario (Carrito y Login/Perfil) */}
                <div className="flex items-center space-x-4">
                    {/* --- 3. Icono del Carrito (Visible siempre si está logueado) --- */}
                    {token && (
                        <Link
                            to="/carrito"
                            className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition"
                            aria-label={`Carrito de compras con ${itemCount} items`}
                        >
                            <CartIcon />
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                                    {itemCount}
                                </span>
                            )}
                        </Link>
                    )}

                    {/* Menú de Usuario o Botones de Login/Registro */}
                    {token ? (
                        // Menú desplegable para usuario logueado
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="rounded-full hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition focus:outline-none">
                                <UserCircleIcon />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-20">
                                    <Link to="/profile" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition">
                                        Mi Perfil
                                    </Link>
                                    {/* --- ENLACE HISTORIAL COMPRAS (Cliente) --- */}
                                    {userRole === 'CLI' && (
                                         <Link to="/historial-ventas" onClick={() => setDropdownOpen(false)} className="dropdown-item">
                                            Mis Compras
                                         </Link>
                                    )}
                                    {/* Botón Cerrar Sesión */}
                                    <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-slate-100 transition">
                                        Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Botones para visitante
                        <div className="flex items-center space-x-2">
                            <Link to="/" className="px-4 py-2 text-sm text-slate-600 font-semibold hover:text-blue-600 transition">
                                Login
                            </Link>
                            <Link to="/register" className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm">
                                Registrarse
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Navbar;

