// src/login/MassUploadForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const MassUploadForm = ({ token, onSuccess, onCancel, setMessage }) => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setMessage('❌ Por favor, selecciona un archivo Excel/CSV.');
            return;
        }

        setIsLoading(true);
        setMessage('Subiendo y procesando archivo...');

        // Crear FormData para enviar archivos (crucial)
        const dataToSend = new FormData();
        dataToSend.append('file', file); // 'file' debe coincidir con el backend: request.data.get('file')

        try {
            await axios.post(`${API_BASE_URL}/api/productos/upload_masivo/`, dataToSend, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'multipart/form-data', // Importante para archivos
                },
            });
            setMessage('✅ Carga masiva completada exitosamente.');
            console.log("Calling onSuccess from MassUpload...");
            onSuccess();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Error desconocido al subir el archivo.';
            setMessage(`❌ Error de procesamiento: ${errorMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-6 border border-gray-300 rounded-lg bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-800">Carga Masiva de Inventario</h2>
            <p className="text-sm text-gray-600">Sube un archivo Excel (xlsx/csv) para cargar múltiples productos al instante.</p>
            
            <input 
                type="file" 
                onChange={(e) => setFile(e.target.files[0])}
                required
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
            />

            <div className="flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-400" disabled={isLoading}>
                    Cancelar
                </button>
                <button type="submit" className="bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 disabled:bg-yellow-400" disabled={isLoading}>
                    {isLoading ? 'Procesando...' : 'Subir y Procesar'}
                </button>
            </div>
        </form>
    );
};

export default MassUploadForm;