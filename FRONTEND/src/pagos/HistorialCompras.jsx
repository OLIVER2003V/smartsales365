// src/cliente/HistorialCompras.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getVentas, descargarComprobanteVenta } from '../api/venta';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
    Receipt, 
    Loader2, 
    Inbox, 
    Download, 
    Package, 
    Truck, 
    Check, 
    XCircle,
    ArrowUpDown // ✨ Icono para el selector
} from 'lucide-react';

// --- Icono de Carga ---
const SpinnerIcon = () => (
    <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
    </div>
);

// --- ✨ MEJORA: Componente de Estado Vacío ---
const EmptyState = ({ message }) => (
    <div className="text-center py-20 px-6 bg-white rounded-lg border-2 border-dashed border-slate-300">
        <Inbox size={48} className="mx-auto text-slate-400" strokeWidth={1.5} />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">No tienes compras</h3>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        <Link
            to="/catalogo"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition"
        >
            Empezar a Comprar
        </Link>
    </div>
);

// --- ✨ MEJORA: Componente de Badge de Estado (Estilo Pro) ---
const EstadoBadge = ({ estado, estadoDisplay }) => {
    const styles = {
        'PAG': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
        'ENT': 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20',
        'OK': 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
        'CAN': 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
    };
    const icon = {
        'PAG': <Receipt size={14} strokeWidth={2} />,
        'ENT': <Truck size={14} strokeWidth={2} />,
        'OK': <Check size={14} strokeWidth={2} />,
        'CAN': <XCircle size={14} strokeWidth={2} />,
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${styles[estado] || 'bg-slate-100 text-slate-800'}`}>
            {icon[estado]}
            {estadoDisplay}
        </span>
    );
};


// --- Componente Principal ---
const HistorialCompras = () => {
    const [ventas, setVentas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const [sortOrder, setSortOrder] = useState('fecha_desc');

    // --- Utilidades de Formato ---
    const formatDate = (dateString) => new Date(dateString).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

    // --- Carga de Datos ---
    const loadVentas = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        const loadingToast = toast.loading('Cargando tu historial...');
        try {
            const data = await getVentas(token);
            setVentas(data);
            if (data.length === 0) {
                toast.success('Aún no tienes compras registradas.', { id: loadingToast });
            } else {
                toast.success(`Se cargaron ${data.length} compras.`, { id: loadingToast });
            }
        } catch (error) {
            toast.error('Error al cargar tu historial.', { id: loadingToast });
            if (error.response?.status === 401) {
                setTimeout(() => navigate('/', { replace: true }), 1500);
            }
        } finally {
            setIsLoading(false);
        }
    }, [token, navigate]);

    // --- Protección de Ruta ---
    useEffect(() => {
        if (!user) {
            navigate('/', { replace: true }); 
            return; 
        }
        if (user.rol !== 'CLI') {
            toast.error('Acceso denegado.');
            navigate('/catalogo');
            return;
        }
        loadVentas();
    }, [token, user, navigate, loadVentas]);

    // --- Ordenamiento ---
    const sortedVentas = useMemo(() => {
        const [key, direction] = sortOrder.split('_');
        return [...ventas].sort((a, b) => {
            let valA, valB;
            switch (key) {
                case 'fecha':
                    valA = new Date(a.fecha_venta);
                    valB = new Date(b.fecha_venta);
                    break;
                case 'total':
                    valA = Number(a.total);
                    valB = Number(b.total);
                    break;
                case 'items':
                    valA = a.detalles.reduce((sum, item) => sum + item.cantidad, 0);
                    valB = b.detalles.reduce((sum, item) => sum + item.cantidad, 0);
                    break;
                default:
                    return 0;
            }
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [ventas, sortOrder]);

    // --- Descarga de Comprobante ---
    const handleDescargarComprobante = async (e, ventaId) => {
        e.stopPropagation(); 
        e.preventDefault(); 
        
        if (downloadingId === ventaId) return;
        setDownloadingId(ventaId);
        
        const toastId = toast.loading('Descargando comprobante...');
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
            toast.success('Descarga iniciada.', { id: toastId });
        } catch (error) {
            toast.error("Error al descargar el comprobante.", { id: toastId });
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        // ✨ MEJORA: Fondo slate
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-5xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-xl border border-slate-200">
                
                {/* Encabezado CON FILTRO */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 pb-6 mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Receipt size={30} className="text-indigo-600" />
                        Mi Historial de Compras
                    </h1>
                    {/* ✨ MEJORA: Selector de ordenamiento estilizado */}
                    <div className="relative w-full md:w-auto">
                        <label htmlFor="sort-order" className="sr-only">Ordenar por:</label>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <ArrowUpDown className="h-5 w-5 text-slate-400" />
                        </div>
                        <select
                            id="sort-order"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            disabled={isLoading || ventas.length === 0}
                            className="appearance-none block w-full md:w-auto pl-10 pr-8 py-2.5 border border-slate-300 rounded-lg shadow-sm bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                        >
                            <option value="fecha_desc">Más Recientes</option>
                            <option value="fecha_asc">Más Antiguos</option>
                            <option value="total_desc">Mayor Monto</option>
                            <option value="total_asc">Menor Monto</option>
                            <option value="items_desc">Más Items</option>
                            <option value="items_asc">Menos Items</option>
                        </select>
                    </div>
                </div>

                {/* Contenido */}
                {isLoading && ventas.length === 0 ? (
                    <SpinnerIcon />
                ) : !isLoading && ventas.length === 0 ? (
                    <EmptyState message="Aquí aparecerán todas tus compras completadas." />
                ) : (
                    // ✨ MEJORA: Estilo de tabla profesional
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">ID Pedido</th>
                                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Fecha</th>
                                        <th className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Items</th>
                                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Estado</th>
                                        <th className="px-4 py-3.5 text-right text-sm font-semibold text-slate-700">Total</th>
                                        <th className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {sortedVentas.map(venta => (
                                        <tr key={venta.id} className="hover:bg-slate-50 transition-colors duration-150 text-sm">
                                            
                                            <td className="px-4 py-3 whitespace-nowrap font-mono text-left">
                                                <Link 
                                                    to={`/mis-compras/${venta.id}`} 
                                                    className="text-indigo-600 font-semibold hover:underline"
                                                    title="Ver detalle del pedido"
                                                >
                                                    #{venta.id}
                                                </Link>
                                            </td>
                                            
                                            <td className="px-4 py-3 text-slate-500 text-left whitespace-nowrap">{formatDate(venta.fecha_venta)}</td>
                                            
                                            <td className="px-4 py-3 text-slate-600 text-center">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200">
                                                    <Package size={14} /> 
                                                    {venta.detalles?.reduce((sum, item) => sum + item.cantidad, 0) || 0}
                                                </span>
                                            </td>
                                            
                                            <td className="px-4 py-3 text-left">
                                                <EstadoBadge estado={venta.estado} estadoDisplay={venta.estado_display} />
                                            </td>
                                            
                                            <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">{formatPrice(venta.total)}</td>
                                            
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <button
                                                    onClick={(e) => handleDescargarComprobante(e, venta.id)}
                                                    disabled={downloadingId === venta.id}
                                                    title="Descargar Comprobante PDF"
                                                    className="inline-flex items-center justify-center p-2 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:text-slate-300"
                                                >
                                                    {downloadingId === venta.id ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : (
                                                        <Download size={18} />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistorialCompras;