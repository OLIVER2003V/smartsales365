// src/admin/UsuarioModal.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save, X } from 'lucide-react';
import { createUsuario, updateUsuario } from '../api/admin';
import { useAuth } from '../context/AuthContext'; // <-- CAMBIO: Importar hook

// --- CAMBIO: Quitar { token } de las props ---
const UsuarioModal = ({ isOpen, onClose, usuarioToEdit, onSuccess }) => {
  const getInitialState = () => ({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    rol: 'CLI',
    is_active: true,
    password: '',
    edad: '',
  });

  const [formData, setFormData] = useState(getInitialState());
  const [isSaving, setIsSaving] = useState(false);

  // --- CAMBIO: Obtener token del contexto ---
  const { token } = useAuth();

  const isEditing = Boolean(usuarioToEdit);

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        setFormData({
          ...usuarioToEdit,
          password: '',
          edad: usuarioToEdit.edad || '',
        });
      } else {
        setFormData(getInitialState());
      }
    }
  }, [isOpen, isEditing, usuarioToEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const dataToSend = { ...formData };

    if (isEditing && !dataToSend.password) {
      delete dataToSend.password;
    }
    if (dataToSend.edad === '') {
      dataToSend.edad = null;
    }

    // --- CAMBIO: 'token' viene del contexto ---
    const promise = isEditing
      ? updateUsuario(token, usuarioToEdit.id, dataToSend)
      : createUsuario(token, dataToSend);

    toast
      .promise(promise, {
        loading: isEditing ? 'Actualizando usuario...' : 'Creando usuario...',
        success: (data) => {
          onSuccess();
          return `Usuario ${isEditing ? 'actualizado' : 'creado'} exitosamente.`;
        },
        error: (error) => {
          const errors = error.response?.data;
          if (errors) {
            if (errors.username) return `Username: ${errors.username[0]}`;
            if (errors.email) return `Email: ${errors.email[0]}`;
            if (errors.password) return `Password: ${errors.password[0]}`;
            if (Array.isArray(errors.non_field_errors)) return errors.non_field_errors[0];
            if (typeof errors.detail === 'string') return errors.detail;
          }
          return `Error al ${isEditing ? 'actualizar' : 'crear'} el usuario.`;
        },
      })
      .finally(() => setIsSaving(false));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start z-50 p-4 transition-opacity duration-300 overflow-y-auto">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg my-8 transform transition-all duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fila 1: Username y Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Fila 2: Nombre y Apellido */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Fila 3: Rol y Edad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                name="rol"
                value={formData.rol}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CLI">Cliente</option>
                <option value="VEN">Vendedor</option>
                <option value="ADM">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
              <input
                type="number"
                name="edad"
                value={formData.edad}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          {/* Fila 4: Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {isEditing ? 'Dejar en blanco para no cambiar la contraseña.' : 'La contraseña es requerida al crear.'}
            </p>
          </div>

          {/* Fila 5: Estado (Activo) */}
          <div className="pt-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Usuario Activo</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 pl-6">
              Desmarca esta casilla para desactivar la cuenta del usuario.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsuarioModal;