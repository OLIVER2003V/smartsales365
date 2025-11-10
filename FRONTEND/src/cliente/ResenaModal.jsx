// src/cliente/ResenaModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createResena } from '../api/resena';
import toast from 'react-hot-toast';
import { Loader2, Save, X, Star, MessageSquare } from 'lucide-react';

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

// --- ✨ MEJORA: Componente de Estrellas Interactivas (Accesible) ---
const StarInput = ({ rating, setRating }) => {
    return (
        <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    type="button" // Evita que envíe el formulario
                    key={star}
                    className={`rounded-full p-1 transition-colors ${
                        star <= rating 
                        ? 'text-yellow-400' 
                        : 'text-slate-300 hover:text-yellow-300'
                    } focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
                    onClick={() => setRating(star)}
                    aria-label={`Calificar con ${star} ${star > 1 ? 'estrellas' : 'estrella'}`}
                >
                    <Star
                        size={30}
                        fill="currentColor"
                    />
                </button>
            ))}
        </div>
    );
};


// --- Componente Principal del Modal ---

// ✨ MEJORA: Props actualizadas para recibir un objeto 'producto'
const ResenaModal = ({ isOpen, onClose, producto, onSuccess }) => {
    const { token } = useAuth();
    const [calificacion, setCalificacion] = useState(0);
    const [titulo, setTitulo] = useState('');
    const [comentario, setComentario] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // ✨ MEJORA: Resetea el estado antes de cerrar
    const handleClose = () => {
        if (isSaving) return;
        setCalificacion(0);
        setTitulo('');
        setComentario('');
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (calificacion === 0) {
            toast.error("Por favor, selecciona una calificación (1-5 estrellas).");
            return;
        }
        if (!titulo.trim()) {
            toast.error("Por favor, escribe un título para tu reseña.");
            return;
        }
        if (!comentario.trim()) {
            toast.error("Por favor, escribe un comentario.");
            return;
        }

        setIsSaving(true);
        const resenaData = {
            producto: producto.id, // ✨ Usa producto.id
            calificacion,
            titulo,
            comentario,
        };

        const promise = createResena(token, resenaData);

        toast.promise(promise, {
            loading: 'Enviando reseña...',
            success: () => {
                onSuccess(); // El padre (DetalleCompra) cierra el modal y recarga
                setCalificacion(0); // Resetea el estado local
                setTitulo('');
                setComentario('');
                return '¡Gracias por tu reseña!';
            },
            error: (err) => {
                return err.response?.data?.detail || err.message || "No se pudo enviar la reseña.";
            }
        }).finally(() => setIsSaving(false));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start z-50 p-4 transition-opacity duration-300 overflow-y-auto">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg my-8 transform transition-all duration-300">
                
                {/* Encabezado del Modal */}
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare size={22} />
                        Escribe tu reseña
                    </h2>
                    <button
                        onClick={handleClose}
                        disabled={isSaving}
                        className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-slate-600 mb-6 text-sm">
                    ¿Qué opinas de <strong>{producto.nombre}</strong>?
                </p>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <InputGroup label="Tu Calificación" required={true}>
                        <StarInput rating={calificacion} setRating={setCalificacion} />
                    </InputGroup>

                    <InputGroup label="Título de tu reseña" htmlFor="titulo" required={true}>
                        <input
                            id="titulo"
                            type="text"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            placeholder="Ej: ¡El mejor refrigerador!"
                            required
                            className={inputBaseStyles} // ✨ Estilo aplicado
                        />
                    </InputGroup>

                    <InputGroup label="Tu reseña" htmlFor="comentario" required={true}>
                        <textarea
                            id="comentario"
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            rows="4"
                            className={textareaBaseStyles} // ✨ Estilo aplicado
                            placeholder="Describe tu experiencia con el producto, por qué te gustó o no..."
                            required
                        />
                    </InputGroup>

                    {/* Botones de Acción */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={handleClose}
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
                            {isSaving ? 'Enviando...' : 'Enviar Reseña'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResenaModal;