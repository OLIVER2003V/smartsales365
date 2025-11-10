// src/cliente/ConsultarGarantia.jsx
import React, { useState } from 'react';
import { consultarGarantia } from '../api/garantia';
import { 
    Search, 
    Loader2, 
    ShieldCheck, 
    ShieldOff, 
    AlertTriangle, 
    CalendarX, 
    QrCode,
    Package // ✨ Icono para producto
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// --- ✨ MEJORA: Formato de Fecha Legible ---
const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Fecha Inválida';
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// --- ✨ MEJORA: Badge de Estado Rediseñado (Premium) ---
const EstadoBadge = ({ estado }) => {
    let config = {
        icon: <AlertTriangle size={20} />,
        color: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20",
        text: "Desconocido"
    };

    if (estado === 'Activa') {
        config = { icon: <ShieldCheck size={20} />, color: "bg-green-100 text-green-700 ring-1 ring-inset ring-green-600/20", text: "Garantía Activa" };
    } else if (estado === 'Expirada') {
        config = { icon: <CalendarX size={20} />, color: "bg-yellow-100 text-yellow-700 ring-1 ring-inset ring-yellow-600/20", text: "Garantía Expirada" };
    } else if (estado === 'Reclamada') {
        config = { icon: <ShieldOff size={20} />, color: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20", text: "Garantía Reclamada" };
    }

    return (
        <div className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full ${config.color}`}>
            {config.icon}
            <span className="text-base font-semibold">{config.text}</span>
        </div>
    );
};

// --- ✨ MEJORA: Componente para Fila de Información ---
const InfoRow = ({ label, value, isHighlight = false }) => (
    <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className={`font-semibold ${
            isHighlight 
            ? 'text-lg font-bold text-red-600' 
            : 'text-slate-800'
        }`}>
            {value}
        </p>
    </div>
);

// --- Componente Principal ---
const ConsultarGarantia = () => {
    const [codigo, setCodigo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resultado, setResultado] = useState(null); // Almacena los datos o el error

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!codigo.trim()) {
            toast.error("Por favor, ingresa un código de garantía.");
            return;
        }

        setIsLoading(true);
        setResultado(null);
        const toastId = toast.loading("Consultando garantía...");

        try {
            const data = await consultarGarantia(codigo.trim());
            setResultado(data);
            toast.success("Garantía encontrada.", { id: toastId });
        } catch (error) {
            console.error(error);
            setResultado({ error: error.message || "No se pudo encontrar la garantía." });
            toast.error(error.message || "No se pudo encontrar la garantía.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // ✨ MEJORA: Paleta de colores slate
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                
                {/* Formulario de Búsqueda */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        {/* ✨ MEJORA: Icono y color indigo */}
                        <QrCode size={30} className="text-indigo-600" />
                        <h1 className="text-3xl font-bold text-slate-900">Consultar Garantía</h1>
                    </div>
                    <p className="text-slate-600 mb-6">
                        Ingresa el código único de tu producto para verificar su estado. Lo encontrarás en tu comprobante de compra.
                    </p>
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value)}
                            placeholder="Ingresa tu código de garantía..."
                            // ✨ MEJORA: Estilo de input coherente
                            className="flex-1 w-full px-4 py-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            // ✨ MEJORA: Estilo de botón coherente
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-w-[150px]"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={18} />}
                            {isLoading ? "Buscando..." : "Consultar"}
                        </button>
                    </form>
                    <p className="text-center text-sm text-slate-500 mt-4">
                        ¿No sabes cómo? Revisa las{' '}
                        <Link to="/reglas-garantia" className="text-indigo-600 hover:underline font-medium">
                            reglas de garantía
                        </Link>.
                    </p>
                </div>

                {/* --- Resultados --- */}
                {resultado && (
                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200 mt-10">
                        {resultado.error ? (
                            // --- ✨ MEJORA: Estado de Error ---
                            <div className="text-center flex flex-col items-center gap-4">
                                <AlertTriangle size={48} className="text-red-500" />
                                <div className="space-y-1">
                                    <h2 className="text-xl font-semibold text-red-700">Garantía no encontrada</h2>
                                    <p className="text-slate-600">{resultado.error}</p>
                                    <p className="text-sm text-slate-500 pt-2">Por favor, verifica el código e inténtalo de nuevo.</p>
                                </div>
                            </div>
                        ) : (
                            // --- ✨ MEJORA: Estado de Éxito ---
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                
                                {/* Columna de Producto */}
                                <div className="flex flex-col items-center md:items-start">
                                    <div className="w-full h-60 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 mb-4 overflow-hidden">
                                        <img
                                            src={resultado.producto.imagen_url || 'https://placehold.co/400x400/EFEFEF/AAAAAA?text=Sin+Imagen'}
                                            alt={resultado.producto.nombre}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 text-center md:text-left">{resultado.producto.nombre}</h3>
                                    <p className="text-slate-500 text-center md:text-left">{resultado.producto.marca} {resultado.producto.modelo}</p>
                                </div>
                                
                                {/* Columna de Estado */}
                                <div className="flex flex-col items-center md:items-start space-y-6">
                                    <EstadoBadge estado={resultado.estado} />
                                    
                                    <div className="text-left space-y-4 w-full pt-4 border-t border-slate-200">
                                        {/* ✨ MEJORA: Uso de InfoRow y formatDate */}
                                        <InfoRow 
                                            label="Fecha de Compra:" 
                                            value={formatDate(resultado.venta.fecha_compra)} 
                                        />
                                        <InfoRow 
                                            label="Vencimiento de Garantía:" 
                                            value={formatDate(resultado.fecha_vencimiento)} 
                                            isHighlight={resultado.estado !== 'Activa'}
                                        />
                                        <InfoRow 
                                            label="Comprado por:" 
                                            value={resultado.venta.cliente} 
                                        />
                                        <InfoRow 
                                            label="Comprobante de Venta:" 
                                            value={`#${resultado.venta.id}`} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConsultarGarantia;