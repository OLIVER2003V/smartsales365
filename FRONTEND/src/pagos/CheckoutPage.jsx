// src/pagos/CheckoutPage.jsx
import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';

// Carga Stripe con tu clave publicable (leída desde .env)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Componente "Contenedor" para el Checkout.
 * * Su única responsabilidad es cargar Stripe y proveer el contexto <Elements>.
 * Toda la UI (fondo, padding, título, etc.) es manejada por el componente hijo <CheckoutForm />
 * para evitar duplicación de layouts y mantener un diseño limpio.
 */
const CheckoutPage = () => {
    
    // Opciones para Stripe Elements (apariencia, etc.)
    // Puedes definir una 'appearance' aquí para que coincida con tu marca.
    // Ver: https://stripe.com/docs/elements/appearance-api
    const options = {
        // Ejemplo de apariencia:
        // appearance: {
        //   theme: 'stripe',
        //   variables: {
        //     colorPrimary: '#6366F1', // indigo-500
        //     colorBackground: '#ffffff',
        //     colorText: '#1e293b', // slate-800
        //     colorDanger: '#ef4444', // red-500
        //     borderRadius: '8px',
        //   }
        // }
    };

    return (
        <Elements stripe={stripePromise} options={options}>
            {/* CheckoutForm ahora maneja el 100% de la UI,
              incluyendo el min-h-screen y bg-slate-100.
            */}
            <CheckoutForm />
        </Elements>
    );
};

export default CheckoutPage;