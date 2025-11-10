// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // 1. Necesario para useNavigate
import App from './App.jsx';
import './index.css';

// 2. Importa AMBOS proveedores
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
// 3. Importa el Toaster para las notificaciones
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 4. Envuelve todo en el Router */}
    <BrowserRouter> 
      {/* 5. AuthProvider (el padre) */}
      <AuthProvider>
        {/* 6. CartProvider (el hijo) */}
        <CartProvider> 
          <FavoritesProvider>
          <App />
          
          {/* 7. Añade el componente Toaster aquí */}
          <Toaster 
            position="top-center"
            reverseOrder={false}
          />
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);