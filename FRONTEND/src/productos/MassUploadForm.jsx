// src/productos/MassUploadForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader2, Upload, FileText } from 'lucide-react'; // ✨ Iconos importados

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const MassUploadForm = ({ onSuccess, onCancel, setMessage }) => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    // ✨ NUEVO: Estado para mostrar el nombre del archivo
    const [fileName, setFileName] = useState('Ningún archivo seleccionado');
    const { token } = useAuth();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        } else {
            setFile(null);
            setFileName('Ningún archivo seleccionado');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setMessage('❌ Por favor, selecciona un archivo Excel/CSV.');
            return;
        }

        setIsLoading(true);
        setMessage('ℹ️ Subiendo y procesando archivo...');

        const dataToSend = new FormData();
        dataToSend.append('file', file); 

        try {
            await axios.post(`${API_BASE_URL}/api/productos/upload_masivo/`, dataToSend, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'multipart/form-data', 
                },
            });
            // El mensaje de éxito se pasa al padre, que lo mostrará
            onSuccess(); 
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Error desconocido al subir el archivo.';
            // El mensaje de error se pasa al padre
            setMessage(`❌ Error de procesamiento: ${errorMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // ✨ MEJORA: Layout limpio que se adapta al contenedor padre
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Upload size={24} className="text-emerald-600" />
                    Carga Masiva de Inventario
                </h2>
                <p className="text-sm text-slate-600">
                    Sube un archivo Excel (xlsx/csv) para cargar múltiples productos al instante.
                </p>
            </div>
            
            {/* --- ✨ MEJORA: Componente de Input de Archivo Profesional --- */}
            <div>
                <label 
                    htmlFor="file-upload"
                    className="relative flex flex-col items-center justify-center w-full h-36 px-4 py-6 bg-white border-2 border-slate-300 border-dashed rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 transition"
                >
                    <FileText size={32} className="text-slate-400" />
                    <span className="mt-2 text-sm font-semibold text-indigo-600">
                        Haz clic para seleccionar un archivo
                    </span>
                    <span className="text-xs text-slate-500">
                        (XLSX, XLS, o CSV)
                    </span>
                </label>
                <input 
                    id="file-upload"
                    type="file" 
                    onChange={handleFileChange}
                    required
                    accept=".xlsx, .xls, .csv" 
                    className="sr-only" // El input real está oculto
                />
                
                {/* Muestra el nombre del archivo seleccionado */}
                <div className="mt-3 text-sm text-slate-600">
                    <span className="font-medium">Archivo:</span> {fileName}
                </div>
            </div>
            {/* --- Fin del Componente de Input de Archivo --- */}

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                {/* ✨ MEJORA: Botón de Cancelar estándar */}
                <button 
                    type="button" 
                    onClick={onCancel} 
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50"
                    disabled={isLoading}
                >
                    Cancelar
                </button>
                
                {/* ✨ MEJORA: Botón de Subida estándar (color esmeralda) */}
                <button 
                    type="submit" 
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 disabled:bg-emerald-400" 
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    {isLoading ? 'Procesando...' : 'Subir y Procesar'}
                </button>
            </div>
        </form>
    );
};

export default MassUploadForm;