// src/App.jsx
import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext'; 

// --- Imports (Asegúrate de tenerlos todos) ---
import LoginRegister from './login/Login';
import Register from './login/Register';
import ForgotPassword from './login/ForgotPassword';
import PasswordResetConfirm from './login/PasswordResetConfirm';
import Profile from './login/Profile';
import ProtectedRoute from './login/ProtectedRoute'; 
import AdministrarProducto from './productos/AdministrarProducto';
import Navbar from './components/Navbar';
import AdministrarCliente from './clientes/AdministrarCliente';
import PuntoDeVenta from './ventas/PuntoDeVenta';
import ProductCatalog from './cliente/ProductCatalog';
import ShoppingCart from './cliente/ShoppingCart';
import CheckoutPage from './pagos/CheckoutPage';
import HistorialVentas from './ventas/HistorialVentas';
import GeneradorReportes from './reportes/GeneradorReportes';
import DashboardPage from './dashboard/DashboardPage';
import GestionUsuarios from './admin/GestionUsuarios';
import GestionCategorias from './categoria/GestionCategorias';
import PagoExitoso from './pagos/PagoExitoso';
import HistorialCompras from './pagos/HistorialCompras';
import GestionPedidos from './admin/GestionPedidos';
import { Loader2 } from 'lucide-react'; 
import ConsultarGarantia from './cliente/ConsultarGarantia';
import ReglasGarantia from './cliente/ReglasGarantia';
import GestionPromociones from './admin/GestionPromociones';
import GestionResenas from './admin/GestionResenas';
import DetalleCompra from './cliente/DetalleCompra';
import DetalleProducto from './cliente/DetalleProducto';
import Favoritos from './cliente/Favoritos';

// --- ✨ AÑADIR ESTE IMPORT ---
import GestionGarantias from './admin/GestionGarantia';

function App() {
    const { user, isAuthenticated, isLoading } = useAuth(); 
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
            </div>
        );
    }

    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            <Navbar /> 

            <main className="pt-16"> {/* Asumiendo que pt-16 es la altura de tu Navbar */}
                <Routes>
                    {/* --- RUTAS PÚBLICAS (Sin cambios) --- */}
                    <Route 
                        path="/" 
                        element={!isAuthenticated ? <Navigate to="/login" replace /> : <Navigate to="/catalogo" replace />} 
                    />
                    <Route 
                        path="/login" 
                        element={!isAuthenticated ? <LoginRegister /> : <Navigate to="/catalogo" replace />} 
                    />
                    <Route 
                        path="/register" 
                        element={!isAuthenticated ? <Register /> : <Navigate to="/catalogo" replace />} 
                    />
                    <Route 
                        path="/forgot-password" 
                        element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/catalogo" replace />} 
                    />
                    <Route 
                        path="/reset-password/:uid/:token" 
                        element={!isAuthenticated ? <PasswordResetConfirm /> : <Navigate to="/catalogo" replace />} 
                    />
                    
                    {/* --- RUTAS PROTEGIDAS (COMUNES) --- */}
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/catalogo" element={<ProtectedRoute><ProductCatalog /></ProtectedRoute>} />
                    <Route path="/producto/:id" element={<ProtectedRoute><DetalleProducto /></ProtectedRoute>} />
                    <Route path="/carrito" element={<ProtectedRoute><ShoppingCart /></ProtectedRoute>} />
                    <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                    <Route path="/pago-exitoso/:ventaId" element={<ProtectedRoute><PagoExitoso /></ProtectedRoute>} />
                    <Route path="/mis-compras" element={<ProtectedRoute><HistorialCompras /></ProtectedRoute>} />
                    <Route path="/mis-compras/:ventaId" element={<ProtectedRoute><DetalleCompra /></ProtectedRoute>} />
                    <Route path="/favoritos" element={<ProtectedRoute><Favoritos /></ProtectedRoute>} />

                    {/* Rutas Públicas (Garantía) - Cualquiera puede verlas */}
                    <Route path="/consultar-garantia" element={<ConsultarGarantia />} />
                    <Route path="/reglas-garantia" element={<ReglasGarantia />} />

                    {/* --- RUTAS CONDICIONALES (ADMIN/VENDEDOR) --- */}
                    {(user?.rol === 'ADM' || user?.rol === 'VEN') && (
                        <>
                            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                            <Route path="/pedidos" element={<ProtectedRoute><GestionPedidos /></ProtectedRoute>} />
                            <Route path="/historial-ventas" element={<ProtectedRoute><HistorialVentas /></ProtectedRoute>} />
                            <Route path="/productos" element={<ProtectedRoute><AdministrarProducto /></ProtectedRoute>} />
                            <Route path="/categorias" element={<ProtectedRoute><GestionCategorias /></ProtectedRoute>} />
                            <Route path="/admin/promociones" element={<ProtectedRoute><GestionPromociones /></ProtectedRoute>} />
                            <Route path="/clientes" element={<ProtectedRoute><AdministrarCliente /></ProtectedRoute>} />
                            <Route path="/admin/resenas" element={<ProtectedRoute><GestionResenas /></ProtectedRoute>} />
                            <Route path="/pos" element={<ProtectedRoute><PuntoDeVenta /></ProtectedRoute>} />
                            <Route path="/reportes" element={<ProtectedRoute><GeneradorReportes /></ProtectedRoute>} />

                            {/* ✨ AÑADIR ESTA LÍNEA */}
                            <Route path="/admin/garantias" element={<ProtectedRoute><GestionGarantias /></ProtectedRoute>} />
                        </>
                    )}

                    {/* --- RUTA CONDICIONAL (SOLO ADMIN) --- */}
                    {(user?.rol === 'ADM') && (
                        <Route path="/admin/usuarios" element={<ProtectedRoute><GestionUsuarios /></ProtectedRoute>} />
                    )}

                    {/* --- RUTA NO ENCONTRADA (404) --- */}
                    <Route path="*" element={
                        <div className='text-center p-10'>
                            <h2 className='text-3xl font-bold text-red-600 mb-4'>404</h2>
                            <p className='text-xl text-gray-700'>Página No Encontrada</p>
                            <Link to={isAuthenticated ? "/catalogo" : "/"} className="mt-6 inline-block text-blue-600 hover:underline">
                                Volver al inicio
                            </Link>
                        </div>
                    } />
                </Routes>
            </main>
        </>
    );
}

export default App;