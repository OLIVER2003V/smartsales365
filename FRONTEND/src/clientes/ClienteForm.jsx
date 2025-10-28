// src/clientes/ClienteForm.jsx
import React, { useState, useEffect } from 'react';
import { createCliente, updateCliente } from '../api/cliente';

const initialFormData = { nombre: '', apellido: '', email: '', telefono: '', direccion: '' };

/**
 * Componente de campo de formulario reutilizable.
 * Maneja la etiqueta, el input, los estados de error y los indicadores de campo opcional/requerido.
 */
const FormField = ({ id, label, type = 'text', value, onChange, error, placeholder, required, isOptional, rows }) => {
  const baseClasses = "block w-full mt-1 border rounded-md shadow-sm py-2 px-3 sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-2";
  const errorClasses = "border-red-500 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500";
  const normalClasses = "border-gray-300 focus:ring-blue-500 focus:border-blue-500";
  
  const inputClasses = `${baseClasses} ${error ? errorClasses : normalClasses}`;
  const InputComponent = type === 'textarea' ? 'textarea' : 'input';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {isOptional && <span className="text-gray-500 text-xs ml-1">(Opcional)</span>}
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


const ClienteForm = ({ token, cliente, onSuccess, onCancel, setMessage }) => {
  const isEditing = !!cliente;
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    setErrors({}); // Limpiar errores al cambiar de modo o de cliente
  }, [cliente, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar error específico al escribir
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
    // Añadir más validaciones si es necesario (ej. teléfono)
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage?.(''); // Limpiar mensajes globales

    if (!validate()) {
      setMessage?.("⚠️ Por favor, corrige los errores en el formulario.");
      return;
    }

    setIsLoading(true);
    
    // Enviar solo los campos que tienen valor
    const dataToSend = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== null && v.trim() !== '')
    );

    try {
      if (isEditing) {
        await updateCliente(token, cliente.id, dataToSend);
      } else {
        await createCliente(token, dataToSend);
      }
      onSuccess?.(); // Notificar éxito (esto debería refrescar y cambiar de vista)
    } catch (error) {
      const apiErrors = error?.response?.data;
      if (apiErrors && typeof apiErrors === 'object') {
        // Errores de validación del backend (ej. email duplicado)
        setErrors(prev => ({ ...prev, ...apiErrors }));
        setMessage?.(`❌ Error de validación del servidor.`);
      } else {
        // Errores generales
        setMessage?.(`❌ Error al guardar: ${apiErrors?.detail || error.message || "Intenta nuevamente."}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 border-b border-gray-200 pb-4 mb-6">
        {isEditing ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
      </h2>
      
      {isEditing && (
        <p className="mb-5 text-sm text-gray-600">
          Editando a: <strong className="font-medium">{cliente.nombre} {cliente.apellido}</strong>
        </p>
      )}

      <div className="space-y-5">
        {/* Fila Nombre y Apellido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="nombre"
            label="Nombre"
            value={formData.nombre}
            onChange={handleChange}
            error={errors.nombre}
            placeholder="Juan"
            required
          />
          <FormField
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="juan.perez@email.com"
            required
          />
          <FormField
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
        <FormField
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
        <div className="flex items-center justify-end gap-4 pt-5 border-t border-gray-200 mt-6">
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={isLoading} 
            className="btn-secondary-outline" // Asumo que tienes esta clase base
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={isLoading} 
            className="btn-primary" // Asumo que tienes esta clase base
          >
            {isLoading ? 'Guardando…' : (isEditing ? 'Guardar Cambios' : 'Crear Cliente')}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ClienteForm;