// src/categorias/CategoriaModal.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
    Loader2, 
    Save, 
    X, 
    MessageSquareText,
    PlusCircle, // ✨ Importado
    Edit        // ✨ Importado
} from 'lucide-react';
import { createCategoria, updateCategoria } from '../api/categoria';
import { useAuth } from '../context/AuthContext';

// --- Helpers de Estilo (Consistentes con otros modales) ---

// ✨ MEJORA: Componente para agrupar Label + Input
const InputGroup = ({ label, htmlFor, children, required = false }) => (
    <div className="flex flex-col gap-1.5">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

// ✨ MEJORA: Estilos base para inputs
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


// --- Componente Principal del Modal ---

const CategoriaModal = ({ isOpen, onClose, categoriaToEdit, onSuccess }) => {
    const getInitialState = () => ({
        nombre: '',
        descripcion: '',
    });

    const { token } = useAuth();
    const [formData, setFormData] = useState(getInitialState());
    const [isSaving, setIsSaving] = useState(false);
    const isEditing = Boolean(categoriaToEdit);

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setFormData({
                    nombre: categoriaToEdit.nombre || '',
                    descripcion: categoriaToEdit.descripcion || '',
                });
            } else {
                setFormData(getInitialState());
            }
        }
    }, [isOpen, isEditing, categoriaToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const promise = isEditing
            ? updateCategoria(token, categoriaToEdit.id, formData)
            : createCategoria(token, formData);

        toast
            .promise(promise, {
                loading: isEditing ? 'Actualizando categoría...' : 'Creando categoría...',
                success: (data) => {
                    onSuccess();
                    return `Categoría ${isEditing ? 'actualizada' : 'creada'} exitosamente.`;
                },
                error: (error) => {
                    const errors = error.response?.data;
                    if (errors?.nombre) return `Nombre: ${errors.nombre[0]}`;
                    if (Array.isArray(errors.non_field_errors)) return errors.non_field_errors[0];
                    if (typeof errors.detail === 'string') return errors.detail;
                    return `Error al ${isEditing ? 'actualizar' : 'crear'} la categoría.`;
                },
            })
            .finally(() => setIsSaving(false));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start z-50 p-4 transition-opacity duration-300 overflow-y-auto">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg my-8 transform transition-all duration-300">
                
                {/* Encabezado del Modal */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        {isEditing ? <Edit size={22}/> : <PlusCircle size={22}/>}
                        {isEditing ? 'Editar Categoría' : 'Crear Nueva Categoría'}
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <InputGroup label="Nombre de la Categoría" htmlFor="nombre-cat" required={true}>
                        <input
                            id="nombre-cat"
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            required
                            className={inputBaseStyles} // ✨ Estilo aplicado
                            placeholder="Ej: Refrigeración"
                        />
                    </InputGroup>

                    <InputGroup label="Descripción (Opcional)" htmlFor="desc-cat">
                        <textarea
                            id="desc-cat"
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={handleChange}
                            rows="4"
                            className={textareaBaseStyles} // ✨ Estilo aplicado
                            placeholder="Ej: Productos para la conservación de alimentos."
                        />
                    </InputGroup>

                    {/* Botones de Acción */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CategoriaModal;