// src/admin/PromocionModal.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createPromocion, updatePromocion } from '../api/promocion';
import { getProducts } from '../api/producto';
import { getCategorias } from '../api/categoria';
import toast from 'react-hot-toast';
import { Loader2, Save, X, Percent, Tag, PlusCircle, Edit } from 'lucide-react';
import Select from 'react-select'; // ¡Necesitas: npm install react-select!

// --- Helpers de Estilo y Formato ---

/**
 * ✨ MEJORA: Formatea un string de fecha (potencialmente UTC) 
 * al formato 'YYYY-MM-DDTHH:mm' que requiere <input type="datetime-local">
 */
const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return ''; // Maneja 'Invalid Date'

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
        console.error("Error al formatear fecha:", e);
        return '';
    }
};

// ✨ MEJORA: Componente para un Toggle Switch moderno
const ToggleSwitch = ({ label, checked, onChange, name }) => (
    <label className="flex items-center justify-between cursor-pointer py-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="relative inline-flex items-center">
            <input 
                type="checkbox" 
                name={name} 
                checked={checked} 
                onChange={onChange} 
                className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer 
                            peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 
                            peer-checked:bg-indigo-600 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:border-slate-300 after:border after:rounded-full 
                            after:h-5 after:w-5 after:transition-all 
                            peer-checked:after:translate-x-full peer-checked:after:border-white"
            ></div>
        </div>
    </label>
);

// ✨ MEJORA: Componente para agrupar Label + Input
const InputGroup = ({ label, htmlFor, children }) => (
    <div className="flex flex-col gap-1.5">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
            {label}
        </label>
        {children}
    </div>
);

// ✨ MEJORA: Estilos base para inputs
const inputBaseStyles = `
    block w-full px-3 py-2 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none
`;

// ✨ MEJORA: Clases de Tailwind para react-select
const selectClassNames = {
    control: ({ isFocused }) =>
      `flex !min-h-[42px] w-full items-center rounded-lg border bg-white text-sm shadow-sm transition-colors ${
        isFocused
          ? 'border-indigo-500 ring-2 ring-indigo-500'
          : 'border-slate-300'
      }`,
    valueContainer: () => 'px-3 py-0.5',
    placeholder: () => 'text-slate-400',
    option: ({ isFocused, isSelected }) =>
      `px-4 py-2 text-sm cursor-pointer ${
        isFocused ? 'bg-indigo-50' : 'bg-white'
      } ${isSelected ? 'font-semibold text-indigo-700' : 'text-slate-900'}`,
    menu: () => 'bg-white rounded-lg shadow-lg border border-slate-200 mt-1 py-1 z-20',
    multiValue: () => 'bg-indigo-100 text-indigo-800 rounded-md px-2 py-0.5 text-sm font-medium flex items-center',
    multiValueLabel: () => 'text-indigo-800',
    multiValueRemove: () => 'ml-1 text-indigo-500 hover:bg-indigo-200 hover:text-indigo-800 rounded-full p-0.5',
};

// --- Componente Principal del Modal ---

const PromocionModal = ({ isOpen, onClose, promocionToEdit, onSuccess }) => {
    const { token } = useAuth();
    const isEditing = Boolean(promocionToEdit);

    const getInitialState = () => ({
        nombre: '',
        tipo_descuento: 'PCT',
        valor_descuento: '',
        fecha_inicio: '',
        fecha_fin: '',
        activo: true,
        productos: [], // IDs
        categorias: [], // IDs
    });

    const [formData, setFormData] = useState(getInitialState());
    const [isSaving, setIsSaving] = useState(false);
    
    const [productOptions, setProductOptions] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);

    // Cargar productos y categorías
    useEffect(() => {
        if (!isOpen) return;
        
        const loadOptions = async () => {
            setIsLoadingOptions(true);
            try {
                const [prods, cats] = await Promise.all([
                    getProducts(token),
                    getCategorias(token)
                ]);
                
                setProductOptions(prods.map(p => ({ value: p.id, label: `${p.nombre} (${p.marca || 'N/A'})` })));
                setCategoryOptions(cats.map(c => ({ value: c.id, label: c.nombre })));
                
            } catch (e) {
                toast.error("Error al cargar productos/categorías.");
            }
            setIsLoadingOptions(false);
        };
        
        loadOptions();
    }, [isOpen, token]);

    // Cargar datos al editar
    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setFormData({
                    nombre: promocionToEdit.nombre || '',
                    tipo_descuento: promocionToEdit.tipo_descuento || 'PCT',
                    valor_descuento: promocionToEdit.valor_descuento || '',
                    // ✨ MEJORA: Uso del helper de formato de fecha robusto
                    fecha_inicio: formatDateForInput(promocionToEdit.fecha_inicio),
                    fecha_fin: formatDateForInput(promocionToEdit.fecha_fin),
                    activo: promocionToEdit.activo ?? true, // Maneja 'undefined' o 'null'
                    productos: promocionToEdit.productos || [],
                    categorias: promocionToEdit.categorias || [],
                });
            } else {
                setFormData(getInitialState());
            }
        }
    }, [isOpen, isEditing, promocionToEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };
    
    const handleSelectChange = (name, selectedOptions) => {
        const ids = selectedOptions ? selectedOptions.map(option => option.value) : [];
        setFormData(prev => ({ ...prev, [name]: ids }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        const promise = isEditing
            ? updatePromocion(token, promocionToEdit.id, formData)
            : createPromocion(token, formData);

        toast.promise(promise, {
            loading: isEditing ? 'Actualizando promoción...' : 'Creando promoción...',
            success: () => {
                onSuccess();
                return `Promoción ${isEditing ? 'actualizada' : 'creada'} con éxito.`;
            },
            error: (err) => {
                // Manejo de errores de validación del backend
                const errors = err.response?.data;
                if (errors) {
                    if (errors.nombre) return `Nombre: ${errors.nombre[0]}`;
                    if (errors.fecha_fin) return `Fecha Fin: ${errors.fecha_fin[0]}`;
                    if (errors.valor_descuento) return `Valor: ${errors.valor_descuento[0]}`;
                }
                return `Error: ${err.message || 'No se pudo guardar.'}`;
            }
        }).finally(() => setIsSaving(false));
    };
    
    if (!isOpen) return null;

    // Convertir IDs a objetos {value, label} para react-select
    const selectedProducts = productOptions.filter(opt => formData.productos.includes(opt.value));
    const selectedCategories = categoryOptions.filter(opt => formData.categorias.includes(opt.value));

    // ✨ MEJORA UX: Deshabilitar productos si se eligen categorías
    const areCategoriesSelected = formData.categorias.length > 0;

    return (
        // ✨ MEJORA: Permite scroll en pantallas pequeñas (items-start)
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start z-50 p-4 overflow-y-auto">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl my-8 transform transition-all">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        {isEditing ? <Edit size={22}/> : <PlusCircle size={22}/>}
                        {isEditing ? 'Editar Promoción' : 'Crear Nueva Promoción'}
                    </h2>
                    <button 
                        onClick={onClose} 
                        disabled={isSaving}
                        className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                {isLoadingOptions ? (
                    <div className="h-96 flex justify-center items-center">
                        <Loader2 className="animate-spin h-10 w-10 text-indigo-600" />
                        <span className="ml-3 text-slate-600">Cargando productos y categorías...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <InputGroup label="Nombre de la Promoción" htmlFor="nombre">
                            <input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej: Venta de Verano 20%" required className={inputBaseStyles} />
                        </InputGroup>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <InputGroup label="Tipo de Descuento" htmlFor="tipo_descuento">
                                <select id="tipo_descuento" name="tipo_descuento" value={formData.tipo_descuento} onChange={handleChange} className={inputBaseStyles}>
                                    <option value="PCT">Porcentaje (%)</option>
                                    <option value="FIJ">Monto Fijo (Bs)</option>
                                </select>
                            </InputGroup>
                            <InputGroup label="Valor del Descuento" htmlFor="valor_descuento">
                                <input id="valor_descuento" name="valor_descuento" value={formData.valor_descuento} onChange={handleChange} type="number" step="0.01" min="0" placeholder={formData.tipo_descuento === 'PCT' ? 'Ej: 15 (para 15%)' : 'Ej: 50.00 (para 50 Bs)'} required className={inputBaseStyles} />
                            </InputGroup>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <InputGroup label="Fecha y Hora de Inicio" htmlFor="fecha_inicio">
                                <input id="fecha_inicio" name="fecha_inicio" value={formData.fecha_inicio} onChange={handleChange} type="datetime-local" required className={inputBaseStyles} />
                            </InputGroup>
                            <InputGroup label="Fecha y Hora de Fin" htmlFor="fecha_fin">
                                <input id="fecha_fin" name="fecha_fin" value={formData.fecha_fin} onChange={handleChange} type="datetime-local" required className={inputBaseStyles} />
                            </InputGroup>
                        </div>

                        <InputGroup label="Aplicar a Categorías (Opcional)">
                            <Select
                                isMulti
                                name="categorias"
                                options={categoryOptions}
                                value={selectedCategories}
                                onChange={(opts) => handleSelectChange('categorias', opts)}
                                placeholder="Seleccionar categorías..."
                                classNames={selectClassNames} // ✨ MEJORA: Estilos Tailwind
                                noOptionsMessage={() => 'No se encontraron categorías'}
                                isDisabled={isSaving}
                            />
                        </InputGroup>
                        
                        <InputGroup label="Aplicar a Productos Específicos (Opcional)">
                            <Select
                                isMulti
                                name="productos"
                                options={productOptions}
                                value={selectedProducts}
                                onChange={(opts) => handleSelectChange('productos', opts)}
                                placeholder={areCategoriesSelected ? "Ignorado (categorías seleccionadas)" : "Seleccionar productos..."}
                                classNames={selectClassNames} // ✨ MEJORA: Estilos Tailwind
                                noOptionsMessage={() => 'No se encontraron productos'}
                                isDisabled={isSaving || areCategoriesSelected} // ✨ MEJORA UX
                            />
                            {areCategoriesSelected && (
                                <p className="text-xs text-slate-500 -mt-1">
                                    Se priorizará la selección de categorías. Para activar este campo, quita las categorías.
                                </p>
                            )}
                        </InputGroup>

                        <ToggleSwitch
                            label="Activar promoción al guardar"
                            name="activo"
                            checked={formData.activo}
                            onChange={handleChange}
                        />
                        
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
                                {isSaving ? (isEditing ? 'Guardando Cambios...' : 'Creando...') : (isEditing ? 'Guardar Cambios' : 'Crear Promoción')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PromocionModal;