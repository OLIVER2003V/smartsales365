// src/login/ProductForm.jsx
import React, { useState, useEffect, useRef } from "react";
import { createProduct, updateProduct } from "../api/producto";

// Icono simple para el área de subida
const UploadIcon = () => (
    <svg aria-hidden="true" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

// Estado inicial del formulario (vacío para placeholders)
const initialFormData = {
    nombre: "", marca: "", modelo: "", categoria: "",
    precio: "", stock: "", garantia_meses: "12",
};

const ProductForm = ({ token, product, onSuccess, onCancel, setMessage }) => {
    const isEditing = !!product;
    const objectUrlRef = useRef(null); // Ref para gestionar la memoria de la previsualización

    const [formData, setFormData] = useState(initialFormData);
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [isDragging, setIsDragging] = useState(false); // Para feedback visual en drag & drop

    // Carga los datos del producto cuando se entra en modo de edición
    useEffect(() => {
        if (isEditing && product) {
            setFormData({
                nombre: product.nombre || "", marca: product.marca || "",
                modelo: product.modelo || "", categoria: product.categoria || "",
                precio: product.precio ?? "", stock: product.stock ?? "",
                garantia_meses: product.garantia_meses ?? "12",
            });
            setPreviewUrl(product.imagen_url || "");
        } else {
            // Limpia el formulario para el modo de creación
            setFormData(initialFormData);
            setPreviewUrl("");
        }
        setErrors({}); // Limpia errores al cambiar de modo
    }, [product, isEditing]);

    // Gestión de memoria para la previsualización de la imagen
    useEffect(() => {
        // Libera la memoria del object URL cuando el componente se desmonta.
        return () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); };
    }, []);

    const setPreviewFromFile = (file) => {
        if (!file) return;
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); // Limpia la URL anterior
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
            // Limpia el error específico si el usuario empieza a corregir
            if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    // Funciones para Drag & Drop con feedback visual
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) { setImageFile(file); setPreviewFromFile(file); } };
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

    // Validación del lado del cliente
    const validate = () => {
        const newErrors = {};
        if (!formData.nombre.trim()) newErrors.nombre = "Nombre requerido.";
        if (!formData.marca.trim()) newErrors.marca = "Marca requerida.";
        if (!formData.categoria.trim()) newErrors.categoria = "Categoría requerida."; // Añadido
        if (formData.precio === '' || Number(formData.precio) < 0) newErrors.precio = "Precio debe ser >= 0.";
        if (formData.stock === '' || Number(formData.stock) < 0) newErrors.stock = "Stock debe ser >= 0.";
        if (formData.garantia_meses === '' || Number(formData.garantia_meses) < 0) newErrors.garantia_meses = "Garantía debe ser >= 0."; // Añadido
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Función para limpiar el formulario después del éxito
    const resetForm = () => {
        setFormData(initialFormData);
        setImageFile(null);
        setPreviewUrl('');
        setErrors({});
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        // Resetea el input file
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
                resetForm(); // Limpia el formulario solo al crear
            }
            onSuccess?.(); // Notifica al padre para refrescar lista y cerrar form
        } catch (error) {
            const apiErrors = error?.response?.data;
            if (apiErrors && typeof apiErrors === 'object') {
                // Mapea errores del backend a los campos del formulario
                const backendErrors = {};
                for (const field in apiErrors) {
                    backendErrors[field] = apiErrors[field][0]; // Toma el primer mensaje de error por campo
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
        <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto p-6 md:p-8 bg-white border border-gray-200 rounded-2xl shadow-lg space-y-6">

            {/* Encabezado */}
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
                    {isEditing ? `Editar Producto` : "Crear Nuevo Producto"}
                </h2>
                {isLoading && (
                    <div className="inline-flex items-center gap-2 text-sm text-blue-600" aria-live="polite">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                        Guardando…
                    </div>
                )}
            </div>

            {/* Grid principal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Columna izquierda: datos */}
                <div className="md:col-span-2 space-y-5">
                    <div>
                        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto<span className="text-red-500">*</span></label>
                        <input id="nombre" name="nombre" type="text" required value={formData.nombre} onChange={handleChange}
                               className={`input-base ${errors.nombre ? 'border-red-500' : 'border-gray-300'} placeholder:text-gray-400`}
                               placeholder="Televisor Smart 55 pulgadas QLED" />
                        {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1">Marca<span className="text-red-500">*</span></label>
                           <input id="marca" name="marca" type="text" required value={formData.marca} onChange={handleChange}
                                  className={`input-base ${errors.marca ? 'border-red-500' : 'border-gray-300'} placeholder:text-gray-400`}
                                  placeholder="Samsung" />
                           {errors.marca && <p className="mt-1 text-xs text-red-600">{errors.marca}</p>}
                        </div>
                        <div>
                           <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-1">Modelo <span className="text-gray-500">(Opcional)</span></label>
                           <input id="modelo" name="modelo" type="text" value={formData.modelo} onChange={handleChange}
                                  className={`input-base ${errors.modelo ? 'border-red-500' : 'border-gray-300'} placeholder:text-gray-400`}
                                  placeholder="QN55Q80AAGXZB"/>
                           {errors.modelo && <p className="mt-1 text-xs text-red-600">{errors.modelo}</p>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">Categoría<span className="text-red-500">*</span></label>
                        <input id="categoria" name="categoria" type="text" required value={formData.categoria} onChange={handleChange}
                               className={`input-base ${errors.categoria ? 'border-red-500' : 'border-gray-300'} placeholder:text-gray-400`}
                               placeholder="Televisores" />
                        {errors.categoria && <p className="mt-1 text-xs text-red-600">{errors.categoria}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                           <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">Precio (Bs.)<span className="text-red-500">*</span></label>
                           <input id="precio" name="precio" type="number" step="0.01" min="0" required value={formData.precio} onChange={handleChange}
                                  className={`input-base ${errors.precio ? 'border-red-500' : 'border-gray-300'} placeholder:text-gray-400`}
                                  placeholder="5500.50" />
                           {errors.precio && <p className="mt-1 text-xs text-red-600">{errors.precio}</p>}
                        </div>
                        <div>
                           <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">Stock<span className="text-red-500">*</span></label>
                           <input id="stock" name="stock" type="number" step="1" min="0" required value={formData.stock} onChange={handleChange}
                                  className={`input-base ${errors.stock ? 'border-red-500' : 'border-gray-300'} placeholder:text-gray-400`}
                                  placeholder="15" />
                           {errors.stock && <p className="mt-1 text-xs text-red-600">{errors.stock}</p>}
                        </div>
                        <div>
                           <label htmlFor="garantia_meses" className="block text-sm font-medium text-gray-700 mb-1">Garantía (meses)<span className="text-red-500">*</span></label>
                           <input id="garantia_meses" name="garantia_meses" type="number" step="1" min="0" required value={formData.garantia_meses} onChange={handleChange}
                                  className={`input-base ${errors.garantia_meses ? 'border-red-500' : 'border-gray-300'} placeholder:text-gray-400`}
                                  placeholder="12" />
                           {errors.garantia_meses && <p className="mt-1 text-xs text-red-600">{errors.garantia_meses}</p>}
                        </div>
                    </div>
                </div>

                {/* Columna derecha: imagen con Drag & Drop mejorado */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Imagen del producto</label>
                    <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                         className={`relative flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed transition-colors p-6 text-center 
                                    ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                        {previewUrl ? (
                           <img src={previewUrl} alt="Vista previa" className="absolute inset-0 w-full h-full object-contain p-2" />
                        ) : (
                           <div className="pointer-events-none select-none space-y-2">
                               <UploadIcon />
                               <p className="text-sm text-gray-700">Arrastra una imagen o <label htmlFor="imagen_file" className="font-medium text-blue-700 underline cursor-pointer">haz clic</label></p>
                               <p className="text-xs text-gray-500">JPG, PNG, WEBP • Máx. 10MB</p>
                           </div>
                        )}
                        <input id="imagen_file" name="imagen_file" type="file" accept="image/*" onChange={handleChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                     {/* Botón para quitar imagen */}
                    {previewUrl && (
                        <button type="button" onClick={() => { setImageFile(null); setPreviewUrl(product?.imagen_url || ''); if(objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; const fileInput = document.getElementById('imagen_file'); if(fileInput) fileInput.value = ''; }}
                                className="text-xs font-medium text-red-600 hover:text-red-800 transition">
                            Quitar imagen seleccionada
                        </button>
                    )}
                    {errors.imagen_file && <p className="mt-1 text-xs text-red-600">{errors.imagen_file}</p>} {/* Mostrar error de imagen si existe */}
                </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 mt-6">
                <button type="button" onClick={onCancel} disabled={isLoading}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 transition">
                    Cancelar
                </button>
                <button type="submit" disabled={isLoading}
                        className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition flex items-center gap-2">
                    {isLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>}
                    {isLoading ? 'Guardando…' : (isEditing ? 'Guardar Cambios' : 'Crear Producto')}
                </button>
            </div>
        </form>
    );
};

export default ProductForm;

// 💡 Añade esta clase base a tu `src/index.css` si no lo has hecho
/*
@layer base {
  .input-base {
    @apply mt-1 block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 placeholder:text-gray-400 disabled:bg-gray-50;
  }
}
*/