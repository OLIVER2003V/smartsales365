// src/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, token }) => {
  if (!token) {
    // Si no hay token, redirige a la página de login
    return <Navigate to="/" replace />;
  }

  // Si hay token, renderiza el componente hijo (ej: Profile)
  return children;
};

export default ProtectedRoute;