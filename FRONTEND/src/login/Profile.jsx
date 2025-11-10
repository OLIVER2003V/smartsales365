// src/login/Profile.jsx
import React, { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// --- IMPORTACIONES DE API ---
import { 
    getUserProfile, // (Aunque 'user' del contexto lo hace obsoleto, lo mantengo por si acaso)
    updateUserProfile, 
    changeUserPassword, 
} from '../api/auth';

// --- IMPORTAR CONTEXTO ---
import { useAuth } from '../context/AuthContext'; 

// --- Iconos ---
import { 
    User, Mail, ShieldCheck, LogOut, Loader2, Building, Phone, MapPin, Hash,
    Edit, Save, X, Lock, Eye, EyeOff
} from 'lucide-react';

// =================================================================================
// --- ESTILOS Y COMPONENTES DE UI MEMORIZADOS ---
// =================================================================================

// --- ✨ Estilos de Formulario Estándar ---
const inputBaseStyles = `
    block w-full px-3 py-2.5 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none
`;
const errorInputStyles = "border-red-500 text-red-900 placeholder:text-red-400 focus:ring-red-500 focus:border-red-500";
const normalInputStyles = "border-slate-300 focus:ring-indigo-500 focus:border-indigo-500";

/**
 * 🌀 Componente Spinner de Carga (Menos intrusivo)
 */
const Spinner = memo(() => (
    <div className="min-h-screen bg-slate-100 flex justify-center items-center p-4">
        <div className="flex flex-col items-center">
            <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
            <span className="mt-3 text-lg font-medium text-slate-700">Cargando perfil...</span>
        </div>
    </div>
));

/**
 * 📝 Componente de Campo Editable (Rediseñado)
 */
const EditableField = memo(({ icon: Icon, label, name, value, onChange, type = 'text', isEditing }) => (
    <div className="flex items-start gap-4">
        <Icon className="h-6 w-6 text-slate-400 flex-shrink-0 mt-8" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
            <label 
                htmlFor={name} 
                className="block text-sm font-medium text-slate-700 mb-1 text-left"
            >
                {label}
            </label>
            <input
                type={type}
                name={name}
                id={name}
                value={value || ''}
                onChange={onChange}
                disabled={!isEditing}
                className={`${inputBaseStyles} ${!isEditing ? 'cursor-default' : ''}`}
                {...(type === 'number' && { min: 0, max: 120 })}
            />
        </div>
    </div>
));

/**
 * 🔒 Componente de Campo Solo Lectura (Rediseñado)
 */
const ReadOnlyField = memo(({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4">
        <Icon className="h-6 w-6 text-slate-400 flex-shrink-0 mt-1" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
            <p className="block text-sm font-medium text-slate-500 text-left">
                {label}
            </p>
            <p className="text-base text-slate-900 font-semibold truncate text-left">{value || '-'}</p>
        </div>
    </div>
));

/**
 * 🔑 Componente Modal para Cambiar Contraseña (Rediseñado)
 */
const PasswordChangeModal = memo(({ onClose }) => {
    const { token } = useAuth(); 
    const [passwordData, setPasswordData] = useState({ old_password: '', new_password1: '', new_password2: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showPass, setShowPass] = useState({ old: false, new1: false, new2: false });
    const [errors, setErrors] = useState({}); // Para errores de campo

    const handleChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: null }));
        }
    };

    const toggleShowPass = (field) => {
        setShowPass(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        if (passwordData.new_password1 !== passwordData.new_password2) {
            setErrors({ 
                new_password1: 'Las contraseñas nuevas no coinciden.',
                new_password2: 'Las contraseñas nuevas no coinciden.' 
            });
            toast.error("Las contraseñas nuevas no coinciden.");
            return;
        }
        
        setIsLoading(true);
        const promise = changeUserPassword(token, passwordData);

        toast.promise(promise, {
            loading: 'Actualizando contraseña...',
            success: (data) => {
                setIsLoading(false);
                onClose();
                return 'Contraseña actualizada exitosamente.';
            },
            error: (error) => {
                setIsLoading(false);
                const apiErrors = error.response?.data;
                if (apiErrors) {
                    // Mapea errores de API a nuestro estado 'errors'
                    const newErrors = {};
                    if(apiErrors.old_password) newErrors.old_password = apiErrors.old_password.join(' ');
                    if(apiErrors.new_password1) newErrors.new_password1 = apiErrors.new_password1.join(' ');
                    if(apiErrors.new_password2) newErrors.new_password2 = apiErrors.new_password2.join(' ');
                    setErrors(newErrors);
                }
                return apiErrors?.non_field_errors?.[0] || "Error al actualizar. Revisa los campos.";
            }
        });
    };

    const PasswordInput = ({ name, label, value, fieldKey, error }) => (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 text-left">{label}</label>
            <div className="relative">
                <input 
                    type={showPass[fieldKey] ? 'text' : 'password'}
                    name={name}
                    id={name}
                    value={value}
                    onChange={handleChange}
                    required
                    className={`${inputBaseStyles} ${error ? errorInputStyles : normalInputStyles}`}
                />
                <button 
                    type="button" 
                    onClick={() => toggleShowPass(fieldKey)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                >
                    {showPass[fieldKey] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            {error && <p className="mt-1 text-xs text-red-600 text-left">{error}</p>}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start z-50 p-4 overflow-y-auto">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md my-8">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Cambiar Contraseña</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <PasswordInput 
                        name="old_password" 
                        label="Contraseña Actual" 
                        value={passwordData.old_password} 
                        fieldKey="old" 
                        error={errors.old_password}
                    />
                    <PasswordInput 
                        name="new_password1" 
                        label="Contraseña Nueva" 
                        value={passwordData.new_password1} 
                        fieldKey="new1"
                        error={errors.new_password1}
                    />
                    <PasswordInput 
                        name="new_password2" 
                        label="Confirmar Contraseña Nueva" 
                        value={passwordData.new_password2} 
                        fieldKey="new2" 
                        error={errors.new_password2}
                    />
                    <div className="flex justify-end gap-3 pt-5 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
});


// =================================================================================
// --- COMPONENTE PRINCIPAL DEL PERFIL ---
// =================================================================================

const Profile = () => {
    const { token, user, logout, refreshUser } = useAuth(); // ✨ Obtenemos 'refreshUser'

    const [originalData, setOriginalData] = useState(null);
    const [formData, setFormData] = useState({ email: '', first_name: '', last_name: '', edad: '' });
    const [profileInfo, setProfileInfo] = useState({ username: '', rol: '', cliente_profile: null });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const navigate = useNavigate();

    // --- Carga de Datos ---
    useEffect(() => {
        if (!token || !user) {
            navigate('/', { replace: true });
            return;
        }
        
        // Sincroniza el estado del formulario con el 'user' del contexto
        const editableData = {
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            edad: user.edad,
        };
        const readOnlyData = {
            username: user.username,
            rol: user.rol,
            cliente_profile: user.cliente_profile || null, 
        };

        setFormData(editableData);
        setOriginalData(editableData); // Guarda una copia para el "Cancelar"
        setProfileInfo(readOnlyData);
        setIsLoading(false); // Terminamos de cargar

    }, [token, user, navigate]);

    // --- Manejadores de Formulario ---
    
    const handleInputChange = useCallback((e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? '' : parseInt(value, 10)) : value,
        }));
    }, []);

    const handleCancelEdit = useCallback(() => {
        setFormData(originalData); // Restaura desde la copia original
        setIsEditing(false);
    }, [originalData]);

    const handleSubmitProfile = useCallback(async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        const promise = updateUserProfile(token, formData);

        toast.promise(promise, {
            loading: 'Guardando cambios...',
            success: (updatedData) => {
                // ✨ MEJORA: Llama a refreshUser() para actualizar el AuthContext
                refreshUser(); 
                
                // Actualiza el estado local (aunque refreshUser lo hará también)
                const newEditableData = {
                    email: updatedData.email,
                    first_name: updatedData.first_name,
                    last_name: updatedData.last_name,
                    edad: updatedData.edad,
                };
                setFormData(newEditableData);
                setOriginalData(newEditableData);
                setIsEditing(false);
                return 'Perfil actualizado exitosamente.';
            },
            error: (error) => {
                const errorMsg = error.response?.data?.email?.[0] || 'Error al guardar los cambios.';
                return errorMsg;
            }
        }).finally(() => setIsSaving(false));
    }, [token, formData, refreshUser]); // ✨ Añade refreshUser

    const handleLogout = useCallback(() => {
        // ✨ MEJORA: Feedback no bloqueante
        toast((t) => (
            <div className="flex flex-col gap-3">
                <span className="font-medium">¿Seguro que deseas cerrar sesión?</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            logout();
                        }}
                        className="w-full px-3 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-md shadow-sm"
                    >
                        Sí, Cerrar Sesión
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="w-full px-3 py-1.5 bg-slate-100 text-slate-800 text-sm font-semibold rounded-md shadow-sm border border-slate-300"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        ), { duration: 6000 });
    }, [logout]);

    const getRolDisplay = (rol) => {
        const roles = { 'ADM': 'Administrador', 'VEN': 'Vendedor', 'CLI': 'Cliente' };
        return roles[rol] || 'Desconocido';
    };
    
    // --- RENDERIZADO ---

    if (isLoading) {
        return <Spinner />;
    }

    if (!originalData) {
        return (
             <div className="min-h-screen bg-slate-100 flex justify-center items-start pt-20 p-4">
                <AlertMessage msg="No se pudieron cargar los datos del perfil." type="error" />
             </div>
        );
    }

    const clienteProfile = profileInfo.cliente_profile;
    const displayName = formData.first_name || profileInfo.username;

    return (
        <>
            {showPasswordModal && (
                <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
            )}

            {/* --- CONTENIDO PRINCIPAL --- */}
            {/* ✨ MEJORA: Paleta slate y padding */}
            <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
                <form onSubmit={handleSubmitProfile} className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200 space-y-8">
                    
                    {/* --- Encabezado --- */}
                    <div className="text-center">
                        <User size={64} className="mx-auto text-indigo-600" strokeWidth={1.5} />
                        <h1 className="mt-3 text-3xl font-bold text-slate-900 tracking-tight">
                            Mi Perfil
                        </h1>
                         <p className="mt-1 text-base text-slate-500">
                            Bienvenido, <span className="font-medium text-slate-700">{displayName}</span>
                         </p>
                    </div>

                    {/* --- Botones de Edición --- */}
                    <div className="flex justify-end gap-3">
                        {!isEditing ? (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                <Edit size={16} /> Editar Perfil
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition disabled:opacity-50"
                                >
                                    <X size={16} /> Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-emerald-700 transition disabled:bg-emerald-400"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    Guardar Cambios
                                </button>
                            </>
                        )}
                    </div>

                    {/* --- Datos del Usuario --- */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-3 text-left">
                            Información de Cuenta
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                            <ReadOnlyField icon={User} label="Username" value={profileInfo.username} />
                            <ReadOnlyField icon={ShieldCheck} label="Rol" value={getRolDisplay(profileInfo.rol)} />
                            <EditableField icon={Mail} label="Email" name="email" value={formData.email} onChange={handleInputChange} type="email" isEditing={isEditing} />
                            <EditableField icon={User} label="Nombre" name="first_name" value={formData.first_name} onChange={handleInputChange} isEditing={isEditing} />
                            <EditableField icon={User} label="Apellido" name="last_name" value={formData.last_name} onChange={handleInputChange} isEditing={isEditing} />
                            <EditableField icon={Hash} label="Edad" name="edad" value={formData.edad} onChange={handleInputChange} type="number" isEditing={isEditing} />
                        </div>
                    </div>

                    {/* --- Datos del Cliente Asociado --- */}
                    {clienteProfile && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3 text-left">
                                <Building size={20} /> Información de Cliente
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                                 <ReadOnlyField icon={User} label="Nombre Cliente" value={clienteProfile.nombre} />
                                 <ReadOnlyField icon={User} label="Apellido Cliente" value={clienteProfile.apellido} />
                                 <ReadOnlyField icon={Phone} label="Teléfono" value={clienteProfile.telefono} />
                                 <ReadOnlyField icon={Hash} label="NIT/CI" value={clienteProfile.nit_ci} />
                                 <div className="sm:col-span-2"> 
                                     <ReadOnlyField icon={MapPin} label="Dirección" value={clienteProfile.direccion} />
                                 </div>
                            </div>
                        </div>
                    )}
                    
                    {/* --- Acciones (Seguridad) --- */}
                    <div className="border-t border-slate-200 pt-8 flex flex-col sm:flex-row justify-center gap-4">
                        <button 
                            type="button"
                            onClick={() => setShowPasswordModal(true)}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
                        >
                            <Lock size={18} />
                            Cambiar Contraseña
                        </button>
                        
                        <button 
                            type="button"
                            onClick={handleLogout} 
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition"
                        >
                            <LogOut size={18} />
                            Cerrar Sesión
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default Profile;