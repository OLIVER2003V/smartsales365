// src/cliente/CheckoutPage.jsx (NUEVO ARCHIVO)
import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';
// Carga Stripe con tu clave publicable (leída desde .env)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutPage = ({ token }) => { // Recibe el token para pasarlo al form
    const options = {
        // Opciones de apariencia, etc. Ver docs de Stripe
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
             <h1 className="text-3xl font-bold text-center mb-8">Finalizar Compra</h1>
             {/* Envuelve el formulario con Elements */}
             <Elements stripe={stripePromise} options={options}>
                 <CheckoutForm token={token} />
             </Elements>
        </div>
    );
};

export default CheckoutPage;