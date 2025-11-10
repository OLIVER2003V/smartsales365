// src/login/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Importa el hook
import { Loader2 } from 'lucide-react'; // Spinner

const ProtectedRoute = ({ children }) => {
    // 1. Obtiene el estado del contexto
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // 2. Si está cargando, muestra spinner
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
            </div>
        );
    }

    // 3. Si no está autenticado, redirige al login
    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // 4. Si todo está bien, muestra el componente hijo
    return children;
};

export default ProtectedRoute;