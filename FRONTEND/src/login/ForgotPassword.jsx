// src/login/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/auth';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedCodes, setGeneratedCodes] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Procesando solicitud...');
        setIsLoading(true);
        setGeneratedCodes(null);

        try {
            const data = await requestPasswordReset(email);
            if (data.uid && data.token) {
                setMessage('✅ Códigos generados. Haz clic en el enlace de abajo para continuar.');
                setGeneratedCodes(data);
            } else {
                setMessage('✅ Si tu correo está registrado, hemos procesado la solicitud.');
            }
        } catch (error) {
            setMessage('❌ Ocurrió un error. Verifica el correo e inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-blue-800">Recuperar Contraseña</h1>
                    <p className="text-sm text-gray-500 mt-2">Ingresa tu email para recibir el enlace de recuperación.</p>
                </div>

                {message && (
                    <div className={`p-3 text-sm rounded-lg font-medium border-l-4 ${message.includes('✅') ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Ingresa tu Correo Electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-yellow-500 text-white font-semibold py-2 rounded-lg hover:bg-yellow-600 disabled:bg-yellow-300"
                    >
                        {isLoading ? 'Enviando...' : 'Solicitar Recuperación'}
                    </button>
                </form>

                {generatedCodes && (
                    <div className="p-4 bg-gray-100 rounded-lg text-center">
                        <Link 
                            to={`/reset-password/${generatedCodes.uid}/${generatedCodes.token}`} 
                            className="text-blue-600 font-semibold hover:underline"
                        >
                            → Continuar a la página de reseteo
                        </Link>
                    </div>
                )}

                <p className="text-center text-sm">
                    <Link to="/" className="text-blue-600 hover:underline">Volver a Iniciar Sesión</Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;