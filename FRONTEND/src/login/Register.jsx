// src/login/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/auth';
import { 
    Loader2, 
    User, 
    Lock, 
    Mail, 
    Hash, 
    UserPlus, 
    ArrowLeft,
    Eye,
    EyeOff,
    AlertTriangle,
    CheckCircle,
    Info
} from 'lucide-react';
import toast from 'react-hot-toast'; // Importamos toast por si es necesario

// --- ✨ MEJORA: Componente de Alerta Coherente ---
const AlertMessage = ({ msg, type = 'error' }) => {
    let config = {
        icon: <Info size={18} />,
        styles: "bg-blue-50 text-blue-700 border-blue-200"
    };
    if (type === 'error') {
        config = { icon: <AlertTriangle size={18} />, styles: "bg-red-50 text-red-700 border-red-200" };
    } else if (type === 'success') {
        config = { icon: <CheckCircle size={18} />, styles: "bg-green-50 text-green-700 border-green-200" };
    }
    return (
        <div className={`border p-4 rounded-lg flex items-center gap-3 ${config.styles}`} role="alert">
            <div className="flex-shrink-0">{config.icon}</div>
            <p className="text-sm font-medium">{msg}</p>
        </div>
    );
};

// --- ✨ MEJORA: Estilos de Formulario Estándar ---
const inputBaseStyles = `
    block w-full px-4 py-3 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-slate-50 disabled:text-slate-500
`;

const Register = () => {
    const [formData, setFormData] = useState({
        username: '', email: '', password: '',
        first_name: '', last_name: '', edad: '',
    });
    const [message, setMessage] = useState(null); // { text: string, type: 'success' | 'error' }
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // ✨ NUEVO: Estado para ver contraseña
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData({ 
            ...formData, 
            [name]: type === 'number' ? (value === '' ? '' : parseInt(value, 10)) : value 
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);
        try {
            await registerUser(
                formData.username, 
                formData.email, 
                formData.password, 
                formData.first_name, 
                formData.last_name, 
                formData.edad
            );
            setMessage({ text: 'Registro exitoso. Serás redirigido para iniciar sesión.', type: 'success' });
            toast.success('¡Registro exitoso!'); // Usamos toast para un feedback más global
            setTimeout(() => navigate('/login'), 2000); // Redirige a login, no a /
        } catch (error) {
            const errorData = error.response?.data;
            let errorDetail = 'Verifica tus datos e inténtalo de nuevo.';
            if (errorData) {
                if (errorData.username) errorDetail = `Usuario: ${errorData.username[0]}`;
                else if (errorData.email) errorDetail = `Email: ${errorData.email[0]}`;
                else if (errorData.password) errorDetail = `Contraseña: ${errorData.password[0]}`;
            }
            
            setMessage({ text: `Error: ${errorDetail}`, type: 'error' });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <form onSubmit={handleRegister} className="w-full max-w-lg bg-white p-8 rounded-xl shadow-lg border border-slate-200 space-y-6">
                
                {/* --- Encabezado --- */}
                <div className="text-center">
                    <Link to="/" className="flex justify-center items-center gap-2 text-2xl font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                        <UserPlus size={28} className="text-indigo-600" />
                        SmartSales<span className="text-indigo-600">365</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mt-4">Crear Cuenta</h1>
                    <p className="text-sm text-slate-500 mt-2">Únete a nuestra plataforma.</p>
                </div>

                {message && <AlertMessage msg={message.text} type={message.type} />}

                {/* --- Formulario con Grid --- */}
                <div className="space-y-4">
                    
                    {/* Fila Nombre y Apellido */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="first_name" className="sr-only">Nombre</label>
                            <input type="text" name="first_name" id="first_name" placeholder="Nombre" value={formData.first_name} onChange={handleChange} disabled={isLoading} className={inputBaseStyles} />
                        </div>
                        <div>
                            <label htmlFor="last_name" className="sr-only">Apellido</label>
                            <input type="text" name="last_name" id="last_name" placeholder="Apellido" value={formData.last_name} onChange={handleChange} disabled={isLoading} className={inputBaseStyles} />
                        </div>
                    </div>

                    {/* Fila Email y Edad */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <input type="email" name="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleChange} required disabled={isLoading} className={`${inputBaseStyles} pl-10`} />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Hash className="h-5 w-5 text-slate-400" />
                            </div>
                            <input type="number" name="edad" placeholder="Edad" value={formData.edad} onChange={handleChange} required min="18" disabled={isLoading} className={`${inputBaseStyles} pl-10`} />
                        </div>
                    </div>

                    {/* Fila Username */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-slate-400" />
                        </div>
                        <input type="text" name="username" placeholder="Nombre de Usuario" value={formData.username} onChange={handleChange} required disabled={isLoading} className={`${inputBaseStyles} pl-10`} />
                    </div>

                    {/* Fila Contraseña */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            type={showPassword ? 'text' : 'password'} 
                            name="password" 
                            placeholder="Contraseña" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            disabled={isLoading} 
                            className={`${inputBaseStyles} pl-10 pr-10`} 
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
                
                <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Registrarse'}
                </button>

                <p className="text-center text-sm text-slate-500">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/" className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                        <ArrowLeft size={16} />
                        Volver a Iniciar Sesión
                    </Link>
                </p>
            </form>
        </div>
    );
};

export default Register;