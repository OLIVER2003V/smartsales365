// src/login/PasswordResetConfirm.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '../api/auth';

const PasswordResetConfirm = () => {
    const { uid, token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setMessage('❌ Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        setMessage('Restableciendo contraseña...');

        try {
            await confirmPasswordReset(uid, token, password);
            setMessage('✅ ¡Contraseña restablecida con éxito! Serás redirigido para iniciar sesión.');
            
            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (error) {
            // MODIFICACIÓN CLAVE: Manejo de errores más específico
            let errorDetail = 'Ocurrió un error desconocido.';
            
            // Django DRF a menudo devuelve errores en 'error.response.data'
            if (error.response?.data) {
                const errors = error.response.data;
                // Buscamos errores generales (no asociados a un campo)
                if (errors.non_field_errors) {
                    errorDetail = errors.non_field_errors[0];
                } 
                // Buscamos errores específicos del campo 'new_password'
                else if (errors.new_password) {
                    errorDetail = errors.new_password[0];
                }
                // Si no, mostramos el fallback
                else {
                    errorDetail = 'El enlace de reseteo es inválido o ha expirado.';
                }
            }
            
            setMessage(`❌ Error: ${errorDetail}`);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl">
                <h1 className="text-2xl font-bold text-center text-blue-800 mb-6">Establecer Nueva Contraseña</h1>
                
                {message && (
                    <div className={`p-3 mb-4 text-sm rounded-lg font-medium text-center ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        placeholder="Nueva Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                        type="password"
                        placeholder="Confirmar Nueva Contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                    >
                        {isLoading ? 'Guardando...' : 'Guardar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PasswordResetConfirm;