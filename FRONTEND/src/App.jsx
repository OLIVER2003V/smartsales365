// src/App.jsx
import React, { useState, useEffect } from 'react'; // Asegúrate de importar useEffect
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios'; // Importa Axios
import { useCart } from './context/CartContext'; // Para el Navbar (si lo integra aquí)

// Importa tus componentes de página/vista
import LoginRegister from './login/Login';
import Register from './login/Register';
import ForgotPassword from './login/ForgotPassword';
import PasswordResetConfirm from './login/PasswordResetConfirm';
import Profile from './login/Profile';
import ProtectedRoute from './login/ProtectedRoute';
import AdministrarProducto from './productos/AdministrarProducto';
import Navbar from './components/Navbar'; // Asegúrate que la ruta sea correcta
import AdministrarCliente from './clientes/AdministrarCliente';
import PuntoDeVenta from './ventas/PuntoDeVenta';
import ProductCatalog from './cliente/ProductCatalog';
import ShoppingCart from './cliente/ShoppingCart';
import './App.css'; // Asegúrate que App.css existe o elimina la importación
import CheckoutPage from './pagos/CheckoutPage';
import { Toaster } from 'react-hot-toast';
import HistorialVentas from './ventas/HistorialVentas';
import GeneradorReportes from './reportes/GeneradorReportes';
function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [userRole, setUserRole] = useState(null); // Estado para el rol
    const tokenProps = { token, setToken }; // Props para pasar a componentes hijos

    // Efecto para obtener el perfil y rol del usuario cuando el token cambie
    useEffect(() => {
        const fetchUserProfile = async () => {
             if (token) {
                 try {
                     // --- LLAMADA REAL A LA API ---
                     const response = await axios.get(
                         `${import.meta.env.VITE_API_BASE_URL}/api/profile/`, // Endpoint de perfil
                         { headers: {'Authorization': `Token ${token}`}} // Envía el token
                     );
                     setUserRole(response.data.rol); // Guarda el rol obtenido
                     console.log("Rol de usuario obtenido:", response.data.rol); // Para depuración

                 } catch (error) {
                     console.error("Error al obtener perfil de usuario:", error.response?.data || error.message);
                     // Si el token es inválido (ej. 401), limpia el estado local
                     if (error.response?.status === 401) {
                         localStorage.removeItem('token');
                         setToken('');
                         setUserRole(null);
                     } else {
                         setUserRole(null); // Limpia el rol si hay otro error
                     }
                 }
             } else {
                 // Si no hay token, no hay rol
                 setUserRole(null);
             }
        };

        fetchUserProfile(); // Ejecuta la función

    }, [token]); // Dependencia: se ejecuta cada vez que el 'token' cambie

    return (
        <BrowserRouter>
          <Toaster 
          position="top-center"
          reverseOrder={false}
        />
            {/* Renderiza Navbar pasando las props necesarias */}
            <Navbar token={token} setToken={setToken} userRole={userRole} />

            {/* Contenido principal con padding para compensar la navbar fija */}
            <main className="pt-16"> {/* Ajusta pt-16 según la altura de tu Navbar */}
                <Routes>
                    {/* --- Rutas Públicas --- */}
                    {/* Si ya tienes componentes separados para Login y Register, úsalos */}
                    <Route path="/" element={<LoginRegister {...tokenProps} />} />
                     <Route path="/register" element={<Register />} />
                     <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:uid/:token" element={<PasswordResetConfirm />} />
                    <Route path="/carrito" element={<ShoppingCart />} />
                    
                    {/* --- Rutas Protegidas (Comunes a todos los roles logueados) --- */}
                    <Route path="/profile" element={<ProtectedRoute token={token}><Profile {...tokenProps} userRole={userRole} /></ProtectedRoute>} />
                    <Route path="/catalogo" element={<ProtectedRoute token={token}><ProductCatalog token={token} /></ProtectedRoute>} />
                    <Route
                        path="/checkout"
                        element={
                            <ProtectedRoute token={token}>
                                <CheckoutPage token={token} />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/historial-ventas" // O "/mis-compras" para clientes
                        element={
                            <ProtectedRoute token={token}>
                                <HistorialVentas token={token} />
                            </ProtectedRoute>
                        }
                    />
                    {/* --- Rutas Condicionales (Solo para Admin/Vendedor) --- */}
                    {/* Renderiza estas rutas SOLO si el rol es ADM o VEN */}
                    {(userRole === 'ADM' || userRole === 'VEN') && (
                        <>
                            {/* Ruta Dashboard (Ejemplo) */}
                            <Route path="/dashboard" element={<ProtectedRoute token={token}><div className="p-8"><h2>Dashboard (Admin/Vendedor)</h2></div></ProtectedRoute>} />
                            {/* Ruta Gestión de Productos */}
                            <Route path="/productos" element={<ProtectedRoute token={token}><AdministrarProducto token={token} /></ProtectedRoute>} />
                             {/* Ruta Gestión de Clientes */}
                            <Route path="/clientes" element={<ProtectedRoute token={token}><AdministrarCliente token={token} /></ProtectedRoute>} />
                             {/* Ruta Punto de Venta */}
                            <Route path="/pos" element={<ProtectedRoute token={token}><PuntoDeVenta token={token} userRole={userRole} /></ProtectedRoute>} />

                            <Route
                                path="/reportes"
                                element={
                                    <ProtectedRoute token={token}>
                                        <GeneradorReportes />
                                    </ProtectedRoute>
                                }
                            />
                        </>
                    )}

                    {/* --- Ruta No Encontrada (404) --- */}
                    <Route path="*" element={
                        <div className='text-center p-10'>
                            <h2 className='text-3xl font-bold text-red-600 mb-4'>404</h2>
                            <p className='text-xl text-gray-700'>Página No Encontrada</p>
                            <Link to="/" className="mt-6 inline-block text-blue-600 hover:underline">Volver al inicio</Link>
                        </div>
                    } />
                </Routes>
            </main>
        </BrowserRouter>
    );
}

export default App;