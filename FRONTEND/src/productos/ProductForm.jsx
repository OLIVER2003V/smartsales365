// src/productos/ProductForm.jsx
import React, { useState, useEffect, useRef } from "react";
import { createProduct, updateProduct } from "../api/producto";
import { useAuth } from '../context/AuthContext';
import { 
    Upload, 
    Loader2, 
    Save, 
    X,
    PackagePlus // ✨ Icono para el título
} from "lucide-react"; // ✨ Iconos de Lucide

// --- ✨ MEJORA: Estilos de Formulario Estándar ---
// (Puedes moverlos a un archivo 'FormComponents.jsx' compartido)
// ---
const inputBaseStyles = `
    block w-full px-3 py-2.5 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    disabled:bg-slate-50
`;
const errorInputStyles = "border-red-500 text-red-900 placeholder:text-red-400 focus:ring-red-500 focus:border-red-500";
const normalInputStyles = "border-slate-300 focus:ring-indigo-500 focus:border-indigo-500";

const InputGroup = ({ id, label, error, required, isOptional, children }) => (
    <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
            {isOptional && <span className="text-slate-500 text-xs ml-1">(Opcional)</span>}
        </label>
        {children}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
);

const FormInput = ({ id, name, type = 'text', value, onChange, placeholder, error }) => (
    <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputBaseStyles} ${error ? errorInputStyles : normalInputStyles}`}
        step={type === 'number' ? '0.01' : undefined}
        min={type === 'number' ? '0' : undefined}
    />
);
// --- Fin de Componentes de Formulario ---


const initialFormData = {
    nombre: "", marca: "", modelo: "", 
    categoria_id: "", 
    precio: "", stock: "", garantia_meses: "12",
};

const ProductForm = ({ product, categorias, onSuccess, onCancel, setMessage }) => {
    const isEditing = !!product;
    const objectUrlRef = useRef(null); 
    const { token } = useAuth();

    const [formData, setFormData] = useState(initialFormData);
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [isDragging, setIsDragging] = useState(false); 

    useEffect(() => {
        if (isEditing && product) {
            const matchingCategoria = categorias.find(c => c.nombre === product.categoria_nombre); // Asume 'categoria_nombre'
            const CategoriaIdDelProducto = matchingCategoria ? matchingCategoria.id : "";

            setFormData({
                nombre: product.nombre || "", 
                marca: product.marca || "",
                modelo: product.modelo || "", 
                categoria_id: CategoriaIdDelProducto, 
                precio: product.precio ?? "", 
                stock: product.stock ?? "",
                garantia_meses: product.garantia_meses ?? "12",
            });
            setPreviewUrl(product.imagen_url || "");
        } else {
            setFormData(initialFormData);
            setPreviewUrl("");
        }
        setErrors({}); 
    }, [product, isEditing, categorias]);

    useEffect(() => {
        return () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); };
    }, []);

    const setPreviewFromFile = (file) => {
        if (!file) return;
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); 
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setPreviewUrl(url);
    };

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === "file" && files?.[0]) {
            setImageFile(files[0]);
            setPreviewFromFile(files[0]);
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
            const errorKey = name === 'categoria_id' ? 'categoria_id' : name;
            if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: undefined }));
        }
    };

    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) { setImageFile(file); setPreviewFromFile(file); } };
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

    const validate = () => {
        const newErrors = {};
        if (!formData.nombre.trim()) newErrors.nombre = "Nombre requerido.";
        if (!formData.marca.trim()) newErrors.marca = "Marca requerida.";
        if (!formData.categoria_id) newErrors.categoria_id = "Categoría requerida."; 
        if (formData.precio === '' || Number(formData.precio) < 0) newErrors.precio = "Precio debe ser >= 0.";
        if (formData.stock === '' || Number(formData.stock) < 0) newErrors.stock = "Stock debe ser >= 0.";
        if (formData.garantia_meses === '' || Number(formData.garantia_meses) < 0) newErrors.garantia_meses = "Garantía debe ser >= 0.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setImageFile(null);
        setPreviewUrl('');
        setErrors({});
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        const fileInput = document.getElementById('imagen_file');
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage?.("");
        if (!validate()) {
            setMessage?.("⚠️ Por favor, corrige los errores en el formulario.");
            return;
        }

        setIsLoading(true);
        const dataToSend = new FormData();
        
        Object.keys(formData).forEach((key) => {
            let value = formData[key];
            if (['precio', 'stock', 'garantia_meses'].includes(key) && value === '') value = '0';
            dataToSend.append(key, value);
        });
        if (imageFile) dataToSend.append("imagen_file", imageFile);

        try {
            if (isEditing) {
                await updateProduct(token, product.id, dataToSend);
            } else {
                await createProduct(token, dataToSend);
                resetForm(); 
            }
            onSuccess?.(); 
        } catch (error) {
            const apiErrors = error?.response?.data;
            if (apiErrors && typeof apiErrors === 'object') {
                const backendErrors = {};
                for (const field in apiErrors) {
                    const errorKey = (field === 'categoria' || field === 'categoria_id') ? 'categoria_id' : field;
                    backendErrors[errorKey] = apiErrors[field][0]; 
                }
                setErrors(prev => ({ ...prev, ...backendErrors }));
                setMessage?.(`❌ Error de validación del servidor. Revisa los campos.`);
            } else {
                setMessage?.(`❌ Error al guardar: ${apiErrors || "Error desconocido."}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // ✨ MEJORA: Layout limpio, sin fondo ni borde (el padre lo provee)
        <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto space-y-6">

            {/* Encabezado */}
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <PackagePlus size={28} className="text-indigo-600" />
                    {isEditing ? `Editar Producto` : "Crear Nuevo Producto"}
                </h2>
                {isLoading && (
                    <div className="inline-flex items-center gap-2 text-sm text-indigo-600" aria-live="polite">
                        <Loader2 className="animate-spin h-5 w-5" />
                        Guardando…
                    </div>
                )}
            </div>

            {/* Grid principal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Columna izquierda: datos */}
                <div className="md:col-span-2 space-y-5">
                    
                    <InputGroup id="nombre" label="Nombre del Producto" error={errors.nombre} required>
                        <FormInput id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Televisor Smart 55 pulgadas QLED" error={errors.nombre} />
                    </InputGroup>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputGroup id="marca" label="Marca" error={errors.marca} required>
                            <FormInput id="marca" name="marca" value={formData.marca} onChange={handleChange} placeholder="Samsung" error={errors.marca} />
                        </InputGroup>
                        <InputGroup id="modelo" label="Modelo" error={errors.modelo} isOptional>
                            <FormInput id="modelo" name="modelo" value={formData.modelo} onChange={handleChange} placeholder="QN55Q80AAGXZB" error={errors.modelo} />
                        </InputGroup>
                    </div>

                    <InputGroup id="categoria_id" label="Categoría" error={errors.categoria_id} required>
                        <select
                            id="categoria_id"
                            name="categoria_id" 
                            required
                            value={formData.categoria_id} 
                            onChange={handleChange}
                            className={`${inputBaseStyles} ${errors.categoria_id ? errorInputStyles : normalInputStyles}`}
                        >
                            <option value="">-- Seleccione una categoría --</option>
                            {categorias.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.nombre}
                                </option>
                            ))}
                        </select>
                    </InputGroup>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <InputGroup id="precio" label="Precio (Bs.)" error={errors.precio} required>
                            <FormInput id="precio" name="precio" type="number" value={formData.precio} onChange={handleChange} placeholder="5500.50" error={errors.precio} />
                        </InputGroup>
                        <InputGroup id="stock" label="Stock" error={errors.stock} required>
                            <FormInput id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} placeholder="15" error={errors.stock} />
                        </InputGroup>
                        <InputGroup id="garantia_meses" label="Garantía (meses)" error={errors.garantia_meses} required>
                            <FormInput id="garantia_meses" name="garantia_meses" type="number" value={formData.garantia_meses} onChange={handleChange} placeholder="12" error={errors.garantia_meses} />
                        </InputGroup>
                    </div>
                </div>

                {/* Columna derecha: imagen */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">Imagen del producto</label>
                    <label 
                        htmlFor="imagen_file"
                        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                        className={`relative flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed transition-colors p-6 text-center 
                            ${isDragging 
                                ? 'border-indigo-500 bg-indigo-50' 
                                : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                            }
                            ${previewUrl ? 'border-solid' : ''}
                        `}
                    >
                        {previewUrl ? (
                            <img src={previewUrl} alt="Vista previa" className="absolute inset-0 w-full h-full object-contain p-2" />
                        ) : (
                            <div className="pointer-events-none select-none space-y-2">
                                <Upload size={36} className="mx-auto text-slate-400" strokeWidth={1.5} />
                                <p className="text-sm text-slate-700">
                                    Arrastra una imagen o <span className="font-medium text-indigo-600">haz clic</span>
                                </p>
                                <p className="text-xs text-slate-500">JPG, PNG, WEBP • Máx. 10MB</p>
                            </div>
                        )}
                        <input id="imagen_file" name="imagen_file" type="file" accept="image/*" onChange={handleChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </label>
                    {previewUrl && (
                        <button 
                            type="button" 
                            onClick={() => { 
                                setImageFile(null); 
                                setPreviewUrl(product?.imagen_url || ''); 
                                if(objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); 
                                objectUrlRef.current = null; 
                                const fileInput = document.getElementById('imagen_file'); 
                                if(fileInput) fileInput.value = ''; 
                            }}
                            className="text-xs font-medium text-red-600 hover:text-red-800 transition"
                        >
                            Quitar imagen seleccionada
                        </button>
                    )}
                    {errors.imagen_file && <p className="mt-1 text-xs text-red-600">{errors.imagen_file}</p>}
                </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
                <button 
                    type="button" 
                    onClick={onCancel} 
                    disabled={isLoading}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 transition"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {isLoading ? 'Guardando…' : (isEditing ? 'Guardar Cambios' : 'Crear Producto')}
                </button>
            </div>
        </form>
    );
};

export default ProductForm;