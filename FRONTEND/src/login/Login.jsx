// src/login/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/auth';

const Login = ({ setToken, token }) => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (token) {
            navigate('/profile', { replace: true });
        }
    }, [token, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            const newToken = await loginUser(formData.username, formData.password);
            setToken(newToken);
            localStorage.setItem('token', newToken);
        } catch (error) {
            setMessage('❌ Credenciales inválidas o usuario no existe.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <form onSubmit={handleLogin} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-blue-800">Iniciar Sesión</h1>
                    <p className="text-sm text-gray-500 mt-2">Bienvenido a SmartSales365.</p>
                </div>

                {message && <div className="p-3 text-sm rounded-lg font-medium text-red-700 bg-red-50">{message}</div>}

                <div className="space-y-4">
                    <input type="text" name="username" placeholder="Nombre de Usuario" value={formData.username} onChange={handleChange} required disabled={isLoading} className="w-full px-4 py-2 border rounded-lg" />
                    <input type="password" name="password" placeholder="Contraseña" value={formData.password} onChange={handleChange} required disabled={isLoading} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                
                <div className="text-right text-sm">
                    <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-800">
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                    {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                </button>

                <p className="text-center text-sm">
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" className="text-blue-600 hover:underline font-medium">Registrarme</Link>
                </p>
            </form>
        </div>
    );
};

export default Login;