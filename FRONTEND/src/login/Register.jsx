// src/login/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/auth';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '', email: '', password: '',
        first_name: '', last_name: '', edad: '',
    });
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            await registerUser(formData.username, formData.email, formData.password, formData.first_name, formData.last_name, formData.edad);
            setMessage('✅ Registro exitoso. Ahora serás redirigido para iniciar sesión.');
            setTimeout(() => navigate('/'), 2000);
        } catch (error) {
            const errorDetail = error.response?.data?.username?.[0] || error.response?.data?.email?.[0] || 'Verifica tus datos.';
            setMessage(`❌ Error: ${errorDetail}`);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <form onSubmit={handleRegister} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-blue-800">Crear Cuenta</h1>
                    <p className="text-sm text-gray-500 mt-2">Únete a SmartSales365.</p>
                </div>

                {message && <div className={`p-3 text-sm rounded-lg font-medium ${message.includes('✅') ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>{message}</div>}

                <div className="space-y-4">
                    <input type="text" name="username" placeholder="Nombre de Usuario" value={formData.username} onChange={handleChange} required disabled={isLoading} className="w-full px-4 py-2 border rounded-lg" />
                    <input type="email" name="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleChange} required disabled={isLoading} className="w-full px-4 py-2 border rounded-lg" />
                    <div className='flex space-x-4'>
                        <input type="text" name="first_name" placeholder="Nombre" value={formData.first_name} onChange={handleChange} className="w-1/2 px-4 py-2 border rounded-lg" />
                        <input type="text" name="last_name" placeholder="Apellido" value={formData.last_name} onChange={handleChange} className="w-1/2 px-4 py-2 border rounded-lg" />
                    </div>
                    <input type="number" name="edad" placeholder="Edad" value={formData.edad} onChange={handleChange} required min="18" disabled={isLoading} className="w-full px-4 py-2 border rounded-lg" />
                    <input type="password" name="password" placeholder="Contraseña" value={formData.password} onChange={handleChange} required disabled={isLoading} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                
                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                    {isLoading ? 'Registrando...' : 'Registrarse'}
                </button>

                <p className="text-center text-sm">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/" className="text-blue-600 hover:underline font-medium">Iniciar Sesión</Link>
                </p>
            </form>
        </div>
    );
};

export default Register;