// src/login/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/auth';
import { 
    Loader2, 
    Mail, 
    KeyRound, 
    ArrowLeft, 
    AlertTriangle, 
    CheckCircle, 
    Info 
} from 'lucide-react';
import toast from 'react-hot-toast'; // Importamos toast para un feedback más robusto

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

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(null); // { text: string, type: 'success' | 'error' | 'info' }
    const [isLoading, setIsLoading] = useState(false);
    const [generatedCodes, setGeneratedCodes] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null); // Limpia mensajes anteriores
        setIsLoading(true);
        setGeneratedCodes(null);
        
        // Usamos toast.promise para el feedback de carga
        const promise = requestPasswordReset(email);

        toast.promise(promise, {
            loading: 'Procesando solicitud...',
            success: (data) => {
                setIsLoading(false);
                if (data.uid && data.token) {
                    // Modo Dev: Muestra el enlace directamente
                    setMessage({ text: 'Códigos generados. Haz clic en el enlace de abajo.', type: 'success' });
                    setGeneratedCodes(data);
                } else {
                    // Modo Prod: Mensaje genérico
                    setMessage({ text: 'Si tu correo está registrado, hemos procesado la solicitud.', type: 'info' });
                }
                return 'Solicitud procesada.'; // Texto del toast
            },
            error: (error) => {
                setIsLoading(false);
                setMessage({ text: error.message || 'Ocurrió un error. Verifica el correo e inténtalo de nuevo.', type: 'error' });
                return 'Error en la solicitud.'; // Texto del toast
            }
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-200 space-y-6">
                
                {/* --- Encabezado --- */}
                <div className="text-center">
                    <Link to="/" className="flex justify-center items-center gap-2 text-2xl font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                        <KeyRound size={28} className="text-indigo-600" />
                        SmartSales<span className="text-indigo-600">365</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mt-4">Recuperar Contraseña</h1>
                    <p className="text-sm text-slate-500 mt-2">Ingresa tu email para recibir el enlace de recuperación.</p>
                </div>

                {/* --- Alerta de Estado --- */}
                {message && (
                    <AlertMessage msg={message.text} type={message.type} />
                )}

                {/* --- Formulario --- */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="sr-only">Correo Electrónico</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="email"
                                type="email"
                                placeholder="Ingresa tu Correo Electrónico"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className={`${inputBaseStyles} pl-10`} // Padding izquierdo para el icono
                            />
                        </div>
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Solicitar Recuperación'}
                    </button>
                </form>

                {/* --- Enlace de Desarrollo (Opcional) --- */}
                {generatedCodes && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                        <p className="text-xs text-slate-500 mb-2">Modo Desarrollo: Haz clic para continuar.</p>
                        <Link 
                            to={`/reset-password/${generatedCodes.uid}/${generatedCodes.token}`} 
                            className="text-indigo-600 font-semibold hover:underline"
                        >
                            → Continuar a la página de reseteo
                        </Link>
                    </div>
                )}

                {/* --- Vínculo para Volver --- */}
                <p className="text-center text-sm">
                    <Link to="/" className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                        <ArrowLeft size={16} />
                        Volver a Iniciar Sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;