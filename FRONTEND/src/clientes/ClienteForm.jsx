// src/clientes/ClienteForm.jsx
import React, { useState, useEffect } from 'react';
import { createCliente, updateCliente } from '../api/cliente';
import { useAuth } from '../context/AuthContext';
import { Loader2, Save } from 'lucide-react'; // ✨ Iconos importados

const initialFormData = { nombre: '', apellido: '', email: '', telefono: '', direccion: '' };

// --- ✨ MEJORA: Estilos de Formulario Estándar ---
const inputBaseStyles = `
    block w-full px-3 py-2.5 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-slate-50 disabled:text-slate-500
`;
const textareaBaseStyles = `
    ${inputBaseStyles} resize-none
`;
const errorInputStyles = "border-red-500 text-red-900 placeholder:text-red-400 focus:ring-red-500 focus:border-red-500";
const normalInputStyles = "border-slate-300 focus:ring-indigo-500 focus:border-indigo-500";

/**
 * ✨ MEJORA: Componente de campo de formulario reutilizable (coherente con otros modales)
 */
const InputGroup = ({ id, label, type = 'text', value, onChange, error, placeholder, required, isOptional, rows }) => {
    
    const inputClasses = `${type === 'textarea' ? textareaBaseStyles : inputBaseStyles} ${error ? errorInputStyles : normalInputStyles}`;
    const InputComponent = type === 'textarea' ? 'textarea' : 'input';

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium text-slate-700">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
                {isOptional && <span className="text-slate-500 text-xs ml-1">(Opcional)</span>}
            </label>
            <InputComponent
                id={id}
                name={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                rows={rows}
                className={inputClasses}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
            />
            {error && (
                <p className="mt-1 text-xs text-red-600" id={`${id}-error`}>
                    {error}
                </p>
            )}
        </div>
    );
};

// --- Componente Principal del Formulario ---
const ClienteForm = ({ cliente, onSuccess, onCancel, setMessage }) => {
    const isEditing = !!cliente;
    const [formData, setFormData] = useState(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { token } = useAuth();

    useEffect(() => {
        if (isEditing && cliente) {
            setFormData({
                nombre: cliente.nombre || '',
                apellido: cliente.apellido || '',
                email: cliente.email || '',
                telefono: cliente.telefono || '',
                direccion: cliente.direccion || '',
            });
        } else {
            setFormData(initialFormData);
        }
        setErrors({}); 
    }, [cliente, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.nombre.trim()) newErrors.nombre = "El nombre es requerido.";
        if (!formData.apellido.trim()) newErrors.apellido = "El apellido es requerido.";
        if (!formData.email.trim()) {
            newErrors.email = "El email es requerido.";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "El formato del email es inválido.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage?.(''); 

        if (!validate()) {
            setMessage?.("⚠️ Por favor, corrige los errores en el formulario.");
            return;
        }

        setIsLoading(true);
        
        // Filtra claves vacías o nulas para no enviar data "sucia"
        const dataToSend = Object.fromEntries(
            Object.entries(formData).filter(([_, v]) => v !== null && v.trim() !== '')
        );

        try {
            if (isEditing) {
                await updateCliente(token, cliente.id, dataToSend);
            } else {
                await createCliente(token, dataToSend);
            }
            onSuccess?.(); 
        } catch (error) {
            const apiErrors = error?.response?.data;
            if (apiErrors && typeof apiErrors === 'object') {
                // Mapea errores de API (ej. "email": ["Este email ya existe."])
                const flatErrors = Object.entries(apiErrors).reduce((acc, [key, value]) => {
                    acc[key] = Array.isArray(value) ? value.join(' ') : value;
                    return acc;
                }, {});
                setErrors(prev => ({ ...prev, ...flatErrors }));
                setMessage?.(`❌ Error de validación del servidor.`);
            } else {
                setMessage?.(`❌ Error al guardar: ${apiErrors?.detail || error.message || "Intenta nuevamente."}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // ✨ MEJORA: Eliminado el 'div' contenedor. El padre (AdministrarCliente) ya provee el fondo blanco.
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
            
            {isEditing && (
                <p className="mb-6 text-sm text-slate-600 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    Editando a: <strong className="font-medium text-indigo-800">{cliente.nombre} {cliente.apellido}</strong> (ID: {cliente.id})
                </p>
            )}

            <div className="space-y-6">
                {/* Fila Nombre y Apellido */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputGroup
                        id="nombre"
                        label="Nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        error={errors.nombre}
                        placeholder="Juan"
                        required
                    />
                    <InputGroup
                        id="apellido"
                        label="Apellido"
                        value={formData.apellido}
                        onChange={handleChange}
                        error={errors.apellido}
                        placeholder="Pérez"
                        required
                    />
                </div>

                {/* Fila Email y Teléfono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputGroup
                        id="email"
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                        placeholder="juan.perez@email.com"
                        required
                    />
                    <InputGroup
                        id="telefono"
                        label="Teléfono"
                        type="tel"
                        value={formData.telefono}
                        onChange={handleChange}
                        error={errors.telefono}
                        placeholder="71234567"
                        isOptional
                    />
                </div>

                {/* Campo Dirección */}
                <InputGroup
                    id="direccion"
                    label="Dirección"
                    type="textarea"
                    rows="3"
                    value={formData.direccion}
                    onChange={handleChange}
                    error={errors.direccion}
                    placeholder="Av. Siempre Viva #123, Zona Norte..."
                    isOptional
                />

                {/* Botones */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 mt-8">
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        disabled={isLoading} 
                        className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
                        {isLoading ? 'Guardando…' : (isEditing ? 'Guardar Cambios' : 'Crear Cliente')}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default ClienteForm;