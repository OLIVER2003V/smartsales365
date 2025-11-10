// src/pagos/PagoExitoso.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVentaById, descargarComprobanteVenta } from '../api/venta';
import { Loader2, CheckCircle, Download, ShoppingBag, ArrowLeft, Package } from 'lucide-react';
import toast from 'react-hot-toast';

// --- ✨ MEJORA: Utilidades de Formato ---
const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });
const formatDate = (dateString) => new Date(dateString).toLocaleString('es-ES', {
    day: '2-digit', 
    month: 'long', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit'
});

// --- ✨ MEJORA: Spinner de Carga de Página Completa ---
const Spinner = ({ text }) => (
    <div className="min-h-screen bg-slate-100 flex justify-center items-center p-4">
        <div className="flex flex-col items-center">
            <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
            <span className="mt-3 text-lg font-medium text-slate-700">{text}</span>
        </div>
    </div>
);

// --- ✨ MEJORA: Componente para Fila de Información ---
const InfoRow = ({ label, value, children }) => (
    <div>
        <p className="text-sm font-medium text-slate-500">{label}:</p>
        {children || <p className="font-semibold text-slate-800">{value}</p>}
    </div>
);

const PagoExitoso = () => {
    const { ventaId } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [venta, setVenta] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (!token || !ventaId) {
            navigate('/catalogo');
            return;
        }
        
        const fetchVenta = async () => {
            setIsLoading(true);
            try {
                const data = await getVentaById(token, ventaId);
                setVenta(data);
            } catch (error) {
                console.error("Error al cargar la venta:", error);
                toast.error("No se pudo cargar el resumen de tu compra.");
                navigate('/catalogo');
            } finally {
                setIsLoading(false);
            }
        };

        fetchVenta();
    }, [token, ventaId, navigate]);

    const handleDownload = async () => {
        setIsDownloading(true);
        const toastId = toast.loading("Generando PDF...");
        try {
            const blob = await descargarComprobanteVenta(token, ventaId);
            
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `comprobante_venta_#${ventaId}.pdf`);
            document.body.appendChild(link);
            link.click();
            
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success("Comprobante descargado.", { id: toastId });
        } catch (error) {
            console.error("Error al descargar PDF:", error);
            toast.error("No se pudo descargar el comprobante.", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    if (isLoading) {
        return <Spinner text="Cargando resumen de tu compra..." />;
    }

    if (!venta) {
        return null; // O un mensaje de error si la carga falló
    }

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                
                {/* --- Tarjeta de Éxito --- */}
                <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl border border-slate-200 text-center">
                    <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto" strokeWidth={1.5} />
                    <h1 className="text-4xl font-bold text-slate-900 mt-6">¡Pago Exitoso!</h1>
                    <p className="text-lg text-slate-600 mt-2">Gracias por tu compra, {venta.cliente_info?.nombre || 'cliente'}.</p>
                    <p className="text-sm text-slate-500 mt-1">
                        Tu pedido ha sido registrado con el ID: <span className="font-semibold text-slate-700">#{venta.id}</span>
                    </p>
                </div>

                {/* --- Resumen del Comprobante --- */}
                <div className="bg-white p-8 md:p-10 rounded-xl shadow-lg border border-slate-200 mt-8 space-y-6">
                    <h2 className="text-2xl font-semibold text-slate-800 border-b border-slate-200 pb-4">
                        Resumen de la Compra
                    </h2>
                    
                    {/* Info Cliente */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <InfoRow label="Cliente" value={`${venta.cliente_info.nombre} ${venta.cliente_info.apellido}`} />
                        <InfoRow label="Email" value={venta.cliente_info.email} />
                        <InfoRow label="Fecha" value={formatDate(venta.fecha_venta)} />
                        <InfoRow label="Estado">
                            {/* ✨ MEJORA: Badge de estado coherente */}
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                                <CheckCircle size={14} />
                                {venta.estado_display}
                            </span>
                        </InfoRow>
                    </div>

                    {/* Items Comprados */}
                    <div className="space-y-4 border-t border-slate-200 pt-6">
                        {venta.detalles.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-left">
                                <div>
                                    <p className="font-semibold text-slate-800">{item.nombre_producto}</p>
                                    <p className="text-sm text-slate-500">{item.cantidad} x {formatPrice(item.precio_unitario)}</p>
                                </div>
                                <p className="font-semibold text-slate-900">{formatPrice(item.subtotal)}</p>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="flex justify-end items-center border-t border-slate-200 pt-6">
                        <span className="text-xl font-medium text-slate-600 mr-4">Total Pagado:</span>
                        <span className="text-3xl font-bold text-indigo-700">{formatPrice(venta.total)}</span>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200">
                        <Link
                            to="/catalogo"
                            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white text-base font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            <ArrowLeft size={20} />
                            Seguir Comprando
                        </Link>
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 text-base font-semibold rounded-lg border border-slate-300 shadow-sm hover:bg-slate-50 transition disabled:bg-slate-50 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                            {isDownloading ? "Generando..." : "Descargar PDF"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PagoExitoso;