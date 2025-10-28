// src/main.jsx (Correcto)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { CartProvider } from './context/CartContext'; // Importa

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider> {/* <-- Envuelve App */}
      <App />
    </CartProvider>
  </React.StrictMode>,
);