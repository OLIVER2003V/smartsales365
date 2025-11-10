// src/ventas/HistorialVentas.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getVentas, descargarComprobanteVenta } from '../api/venta';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
    Receipt,
    Search,
    CalendarDays,
    DollarSign,
    ListFilter,
    RotateCcw,
    Package,
    Loader2,
    Inbox,
    Download
} from 'lucide-react';

// --- Icono de Carga ---
const SpinnerIcon = () => (
    <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
    </div>
);

// --- Componente para Estado Vacío ---
const EmptyState = ({ message, isSearchResult }) => (
    <div className="text-center py-20 px-6 bg-white rounded-lg border-2 border-dashed border-slate-300">
        <Inbox size={48} className="mx-auto text-slate-400" strokeWidth={1.5} />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">
            {isSearchResult ? "No hay resultados" : "No hay ventas"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        {!isSearchResult && (
            <Link
                to="/catalogo" // Asumiendo que Admin/Vendedor también pueden ver el catálogo
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition"
            >
                Ir al Catálogo
            </Link>
        )}
    </div>
);

// --- Estilos de Formulario Estándar ---
const inputBaseStyles = `
    block w-full px-3 py-2.5 text-sm text-slate-900 bg-white 
    border border-slate-300 rounded-lg shadow-sm 
    placeholder:text-slate-400 
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
`;
const inputWithIconStyles = `${inputBaseStyles} pl-10`;

// --- Componente Principal ---
const HistorialVentas = () => {
    const [allVentas, setAllVentas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);
    const navigate = useNavigate();
    const { token, user } = useAuth();

    const [filters, setFilters] = useState({
        searchTerm: '',
        startDate: '',
        endDate: '',
        minTotal: '',
        maxTotal: '',
    });

    // --- Utilidades de Formato ---
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };
    const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

    // --- Carga Inicial de Ventas ---
    const loadVentas = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setMessage('');
        const loadingToast = toast.loading('Cargando historial de ventas...');
        try {
            const data = await getVentas(token);
            data.sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta));
            setAllVentas(data);
            if (data.length === 0) {
                setMessage('ℹ️ Aún no hay ventas registradas.');
                toast.success('No hay ventas aún.', { id: loadingToast });
            } else {
                toast.success(`Se cargaron ${data.length} ventas.`, { id: loadingToast });
            }
        } catch (error) {
            setMessage('❌ Error al cargar el historial.');
            toast.error('Error al cargar historial.', { id: loadingToast });
            if (error.response?.status === 401) {
                setTimeout(() => navigate('/', { replace: true }), 1500);
            }
        } finally {
            setIsLoading(false);
        }
    }, [token, navigate]);

    useEffect(() => {
        if (!user) { navigate('/', { replace: true }); return; }
        // Esta página es para Admin/Vendedor, no para Cliente
        if (user.rol === 'CLI') {
            toast.error('Acceso denegado.');
            navigate('/catalogo');
            return;
        }
        loadVentas();
    }, [token, user, navigate, loadVentas]);

    // --- Lógica de Filtrado (Memoizada) ---
    const filteredVentas = useMemo(() => {
        return allVentas.filter(venta => {
            const lowerSearchTerm = filters.searchTerm.toLowerCase();
            const matchesSearch = filters.searchTerm === '' ||
                venta.id.toString().includes(filters.searchTerm) ||
                (venta.cliente_info && `${venta.cliente_info.nombre} ${venta.cliente_info.apellido}`.toLowerCase().includes(lowerSearchTerm)) ||
                (venta.detalles && venta.detalles.some(d => d.nombre_producto?.toLowerCase().includes(lowerSearchTerm)));
            const matchesStartDate = filters.startDate === '' || new Date(venta.fecha_venta) >= new Date(filters.startDate + 'T00:00:00');
            const matchesEndDate = filters.endDate === '' || new Date(venta.fecha_venta) <= new Date(filters.endDate + 'T23:59:59');
            const matchesMinTotal = filters.minTotal === '' || parseFloat(venta.total) >= parseFloat(filters.minTotal);
            const matchesMaxTotal = filters.maxTotal === '' || parseFloat(venta.total) <= parseFloat(filters.maxTotal);
            return matchesSearch && matchesStartDate && matchesEndDate && matchesMinTotal && matchesMaxTotal;
        });
    }, [allVentas, filters]);

    // --- Manejadores para los Filtros ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleResetFilters = () => {
        setFilters({ searchTerm: '', startDate: '', endDate: '', minTotal: '', maxTotal: '' });
        toast('Filtros reiniciados.', { icon: '🧹' });
    };

    // --- Lógica de Descarga ---
    const handleDescargarComprobante = async (ventaId) => {
        if (downloadingId === ventaId) return;
        setDownloadingId(ventaId);
        const toastId = toast.loading('Descargando comprobante...');
        
        try {
            // Asumiendo que la API de 'venta' tiene 'descargarComprobanteVenta'
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
            console.error("Error al descargar el PDF:", error);
            toast.error("Error al descargar el comprobante.", { id: toastId });
        } finally {
            setDownloadingId(null);
        }
    };

    // --- Renderizado ---
    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-xl border border-slate-200">
                
                {/* --- Encabezado --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6 mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Receipt size={30} className="text-indigo-600" />
                        Bitácora de Ventas
                    </h1>
                </div>

                {/* --- Sección de Filtros --- */}
                <div className="mb-8 p-5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                            <ListFilter size={20} /> Filtros
                        </h2>
                        <button
                            onClick={handleResetFilters}
                            className="px-3 py-1.5 bg-white text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-100 transition text-xs flex items-center gap-1.5 font-medium shadow-sm"
                            title="Reiniciar Filtros"
                        >
                            <RotateCcw size={14} /> Reset
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        
                        <div className="relative lg:col-span-2">
                            <label htmlFor="searchTerm" className="block text-sm font-medium text-slate-700 mb-1">Buscar</label>
                            <div className="absolute inset-y-0 left-0 pt-7 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text" id="searchTerm" name="searchTerm"
                                value={filters.searchTerm} onChange={handleFilterChange}
                                placeholder="ID Venta, Cliente, Producto..."
                                className={inputWithIconStyles}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
                                <input
                                    type="date" id="startDate" name="startDate"
                                    value={filters.startDate} onChange={handleFilterChange}
                                    className={inputBaseStyles}
                                />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
                                <input
                                    type="date" id="endDate" name="endDate"
                                    value={filters.endDate} onChange={handleFilterChange}
                                    min={filters.startDate || undefined}
                                    className={inputBaseStyles}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="minTotal" className="block text-sm font-medium text-slate-700 mb-1">Total Mín.</label>
                                <div className="relative">
                                    <input
                                        type="number" id="minTotal" name="minTotal"
                                        value={filters.minTotal} onChange={handleFilterChange}
                                        min="0" step="0.01" placeholder="0.00"
                                        className={`${inputBaseStyles} pl-8`}
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500 text-sm">Bs</div>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="maxTotal" className="block text-sm font-medium text-slate-700 mb-1">Total Máx.</label>
                                <div className="relative">
                                    <input
                                        type="number" id="maxTotal" name="maxTotal"
                                        value={filters.maxTotal} onChange={handleFilterChange}
                                        min={filters.minTotal || 0} step="0.01" placeholder="-"
                                        className={`${inputBaseStyles} pl-8`}
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500 text-sm">Bs</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Resultados (Tabla o Estados) --- */}
                {isLoading && allVentas.length === 0 ? (
                    <SpinnerIcon />
                ) : !isLoading && allVentas.length === 0 ? (
                    <EmptyState message={message.substring(2).trim()} isSearchResult={false} />
                ) : !filteredVentas.length ? (
                    <EmptyState message="Ninguna venta coincide con los filtros aplicados." isSearchResult={true} />
                ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">ID</th>
                                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Fecha</th>
                                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Cliente</th>
                                        <th className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Items</th>
                                        <th className="px-4 py-3.5 text-right text-sm font-semibold text-slate-700">Total</th>
                                        <th className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Comprobante</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {filteredVentas.map(venta => (
                                        <tr key={venta.id} className="hover:bg-slate-50 transition-colors duration-150 text-sm">
                                            <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-700 font-medium text-left">#{venta.id}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-left">{formatDate(venta.fecha_venta)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-800 font-medium text-left">
                                                {venta.cliente_info ? `${venta.cliente_info.nombre} ${venta.cliente_info.apellido}` : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200">
                                                    <Package size={14} /> {venta.detalles?.length || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-indigo-700">{formatPrice(venta.total)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleDescargarComprobante(venta.id)}
                                                    disabled={downloadingId === venta.id}
                                                    title="Descargar Comprobante PDF"
                                                    className="inline-flex items-center justify-center p-2 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:text-slate-300"
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

export default HistorialVentas;