// src/login/PasswordResetConfirm.jsx
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { confirmPasswordReset } from '../api/auth';
import { 
    Loader2, 
    Lock, 
    KeyRound, 
    Eye, 
    EyeOff, 
    ArrowLeft,
    AlertTriangle, 
    CheckCircle, 
    Info 
} from 'lucide-react';

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

const PasswordResetConfirm = () => {
    const { uid, token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState(null); // { text: string, type: 'success' | 'error' }
    const [isLoading, setIsLoading] = useState(false);
    
    // --- ✨ MEJORA UX: Estado para ver contraseña ---
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        
        if (password !== confirmPassword) {
            setMessage({ text: 'Las contraseñas no coinciden.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setMessage({ text: 'Restableciendo contraseña...', type: 'info' });

        try {
            await confirmPasswordReset(uid, token, password);
            setMessage({ text: '¡Contraseña restablecida con éxito! Serás redirigido para iniciar sesión.', type: 'success' });
            
            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (error) {
            let errorDetail = 'Ocurrió un error desconocido.';
            
            if (error.response?.data) {
                const errors = error.response.data;
                if (errors.non_field_errors) {
                    errorDetail = errors.non_field_errors[0];
                } 
                else if (errors.new_password) {
                    errorDetail = errors.new_password[0];
                }
                // Captura el error de 'token inválido' de djoser
                else if (errors.token) {
                     errorDetail = 'El enlace de reseteo es inválido o ha expirado.';
                }
                else if (errors.uid) {
                     errorDetail = 'El enlace de reseteo es inválido.';
                }
                else {
                    errorDetail = 'El enlace de reseteo es inválido o ha expirado.';
                }
            }
            
            setMessage({ text: `Error: ${errorDetail}`, type: 'error' });
            setIsLoading(false);
        }
    };

    return (
        // ✨ MEJORA: Paleta slate
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-200 space-y-6">
                
                {/* --- Encabezado --- */}
                <div className="text-center">
                    <Link to="/" className="flex justify-center items-center gap-2 text-2xl font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                        <KeyRound size={28} className="text-indigo-600" />
                        SmartSales<span className="text-indigo-600">365</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mt-4">Establecer Nueva Contraseña</h1>
                    <p className="text-sm text-slate-500 mt-2">Ingresa y confirma tu nueva contraseña.</p>
                </div>
                
                {message && (
                    <AlertMessage msg={message.text} type={message.type} />
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Campo Nueva Contraseña */}
                    <div>
                        <label htmlFor="password" className="sr-only">Nueva Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Nueva Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className={`${inputBaseStyles} pl-10 pr-10`} // Padding para iconos en ambos lados
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

                    {/* Campo Confirmar Contraseña */}
                    <div>
                        <label htmlFor="confirmPassword" className="sr-only">Confirmar Nueva Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Confirmar Nueva Contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className={`${inputBaseStyles} pl-10 pr-10`}
                            />
                        </div>
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Guardar Nueva Contraseña'}
                    </button>
                </form>

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

export default PasswordResetConfirm;