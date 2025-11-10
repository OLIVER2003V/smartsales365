// src/admin/ConfirmDeleteModal.jsx
import React from 'react';
import { Loader2, AlertTriangle, X } from 'lucide-react';

// Nota: 'isDeleting' no es necesario si se usa toast.promise,
// ya que el toast maneja el estado de carga.
// Lo mantendré por si acaso lo usas para deshabilitar botones.
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, usuario, isDeleting }) => {
  if (!isOpen) return null;

  return (
    // ✨ MEJORA: Fondo con backdrop-blur para un efecto de desenfoque moderno
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300">
      
      {/* ✨ MEJORA: Bordes más suaves (rounded-xl) y sombra más pronunciada (shadow-2xl) */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md">
        
        {/* ✨ MEJORA: Botón 'X' con mejor área de clic y feedback */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          {/* ✨ MEJORA: Icono de alerta más fuerte */}
          <AlertTriangle className="h-16 w-16 text-red-600 mb-4" />
          
          {/* ✨ MEJORA: Título más limpio (semibold) */}
          <h2 className="text-2xl font-semibold text-gray-900 text-center">
            ¿Estás seguro?
          </h2>
          <p className="text-gray-600 text-center my-2">
            Estás a punto de eliminar permanentemente a:
          </p>
          <p className="font-bold text-lg text-red-600 break-words text-center">
            {usuario?.username} ({usuario?.email})
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Esta acción no se puede deshacer.
          </p>

          <div className="flex flex-col-reverse sm:flex-row justify-center gap-3 mt-8 w-full">
            {/* ✨ MEJORA: Botón Cancelar con mejor contraste (blanco) y focus-visible */}
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            
            {/* ✨ MEJORA: Botón Eliminar con focus-visible y estado disabled más claro */}
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:bg-red-400 disabled:cursor-not-allowed"
            >
              {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Sí, Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;