// src/login/Login.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, User, Lock, LogIn } from 'lucide-react'; // ✨ Iconos importados

// --- ✨ MEJORA: Estilos de Formulario Estándar ---
const inputBaseStyles = `
    block w-full px-4 py-3 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-slate-50 disabled:text-slate-500
`;

const Login = () => {
    // La lógica de AuthContext es perfecta
    const { login, loading } = useAuth();
    
    const [formData, setFormData] = useState({ username: '', password: '' });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        // La llamada al contexto es perfecta
        await login(formData.username, formData.password);
    };

    return (
        // ✨ MEJORA: Paleta de colores slate
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            {/* ✨ MEJORA: Estilo de "card" coherente */}
            <form onSubmit={handleLogin} className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-200 space-y-6">
                
                {/* --- Encabezado --- */}
                <div className="text-center">
                    {/* ✨ MEJORA: Identidad de marca */}
                    <Link to="/" className="flex justify-center items-center gap-2 text-2xl font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                        <LogIn size={28} className="text-indigo-600" />
                        SmartSales<span className="text-indigo-600">365</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mt-4">Iniciar Sesión</h1>
                    <p className="text-sm text-slate-500 mt-2">Bienvenido de nuevo.</p>
                </div>

                {/* Los toasts de AuthContext manejan los errores */}

                {/* --- Formulario --- */}
                <div className="space-y-4">
                    {/* Campo de Usuario */}
                    <div>
                        <label htmlFor="username" className="sr-only">Nombre de Usuario</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-400" />
                            </div>
                            <input 
                                id="username"
                                type="text" 
                                name="username" 
                                placeholder="Nombre de Usuario" 
                                value={formData.username} 
                                onChange={handleChange} 
                                required 
                                disabled={loading}
                                className={`${inputBaseStyles} pl-10`} // Padding para el icono
                            />
                        </div>
                    </div>
                    
                    {/* Campo de Contraseña */}
                    <div>
                        <label htmlFor="password" className="sr-only">Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input 
                                id="password"
                                type="password" 
                                name="password" 
                                placeholder="Contraseña" 
                                value={formData.password} 
                                onChange={handleChange} 
                                required 
                                disabled={loading}
                                className={`${inputBaseStyles} pl-10`} // Padding para el icono
                            />
                        </div>
                    </div>
                </div>
                
                <div className="text-right text-sm">
                    <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                {/* --- Botón de Acción --- */}
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Iniciar Sesión'}
                </button>

                <p className="text-center text-sm text-slate-500">
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" className="text-indigo-600 hover:underline font-medium">
                        Registrarme
                    </Link>
                </p>
            </form>
        </div>
    );
};

export default Login;