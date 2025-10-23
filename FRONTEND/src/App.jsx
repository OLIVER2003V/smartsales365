// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LoginRegister from './login/Login'; // <-- ¡AJUSTAR LA RUTA!
import Register from './login/Register';
import ForgotPassword from './login/ForgotPassword';
import Profile from './login/Profile';             // <-- ¡AJUSTAR LA RUTA!
import ProtectedRoute from './login/ProtectedRoute';
import './App.css';
import PasswordResetConfirm from './login/PasswordResetConfirm';



function App() {
  // Estado del token, compartido con todos los componentes
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  // Función para pasar a los componentes de Login/Profile
  const tokenProps = { token, setToken };

  return (
    <BrowserRouter>
      <div className="App">
        <header>
          <nav>
            <Link to="/">Inicio / Login</Link>
            {token && (
              <>
                | <Link to="/dashboard">Dashboard (Futuro)</Link>
                | <Link to="/profile">Mi Perfil</Link>
              </>
            )}
          </nav>
        </header>

        <main>
          <Routes>
            {/* 1. Ruta Pública: Login y Registro */}
            <Route path="/" element={<LoginRegister {...tokenProps} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
    
    {/* La ruta de confirmación ahora lee los códigos de la URL */}
            <Route path="/reset-password/:uid/:token" element={<PasswordResetConfirm />} />
            {/* 2. Ruta Protegida: Perfil */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute token={token}>
                  <Profile {...tokenProps} />
                </ProtectedRoute>
              } 
            />
            
            {/* 3. Ruta Futura Protegida (Dashboard) */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute token={token}>
                  <div><h2>Dashboard de SmartSales365 (¡Aquí irá la IA!)</h2></div>
                </ProtectedRoute>
              } 
            />

            {/* Ruta no encontrada */}
            <Route path="*" element={<h2>404 - Página No Encontrada</h2>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;