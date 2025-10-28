// src/ventas/HistorialVentas.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVentas } from '../api/venta';
import toast from 'react-hot-toast';

// Iconos "Pro" de Lucide
import {
    Receipt,
    Search,
    CalendarDays,
    DollarSign,
    ListFilter,
    RotateCcw,
    Package,
    Loader2, // Spinner
    Inbox
} from 'lucide-react';

// --- Icono de Carga ---
const SpinnerIcon = () => (
    <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
);

// --- Componente para Estado Vacío ---
const EmptyState = ({ message }) => (
    <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
        <Inbox size={48} className="mx-auto text-gray-400" strokeWidth={1.5} />
        <h3 className="mt-4 text-lg font-medium text-gray-800">No hay resultados</h3>
        <p className="mt-1 text-sm">{message}</p>
    </div>
);

// --- Componente Principal ---
const HistorialVentas = ({ token }) => {
    const [allVentas, setAllVentas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // Estado para los filtros
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
        try {
            const date = new Date(dateString);
            return date.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Fecha inválida';
        }
    };
    const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

    // --- Carga Inicial de Ventas ---
    const loadVentas = useCallback(async () => {
        setIsLoading(true);
        setMessage('');
        const loadingToast = toast.loading('Cargando historial...');
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
        if (!token) { navigate('/', { replace: true }); return; }
        loadVentas();
    }, [token, navigate, loadVentas]);

    // --- Lógica de Filtrado (Memoizada) ---
    const filteredVentas = useMemo(() => {
        return allVentas.filter(venta => {
            const lowerSearchTerm = filters.searchTerm.toLowerCase();

            const matchesSearch = filters.searchTerm === '' ||
                venta.id.toString().includes(filters.searchTerm) ||
                (venta.cliente_info &&
                 `${venta.cliente_info.nombre} ${venta.cliente_info.apellido}`.toLowerCase().includes(lowerSearchTerm)) ||
                (venta.detalles && venta.detalles.some(d =>
                    d.nombre_producto?.toLowerCase().includes(lowerSearchTerm)));

            const matchesStartDate = filters.startDate === '' ||
                new Date(venta.fecha_venta) >= new Date(filters.startDate + 'T00:00:00');

            const matchesEndDate = filters.endDate === '' ||
                new Date(venta.fecha_venta) <= new Date(filters.endDate + 'T23:59:59');

            const matchesMinTotal = filters.minTotal === '' ||
                parseFloat(venta.total) >= parseFloat(filters.minTotal);

            const matchesMaxTotal = filters.maxTotal === '' ||
                parseFloat(venta.total) <= parseFloat(filters.maxTotal);

            return matchesSearch && matchesStartDate && matchesEndDate && matchesMinTotal && matchesMaxTotal;
        });
    }, [allVentas, filters]);

    // --- Manejadores para los Filtros ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleResetFilters = () => {
        setFilters({
            searchTerm: '',
            startDate: '',
            endDate: '',
            minTotal: '',
            maxTotal: '',
        });
        toast('Filtros reiniciados.');
    };

    // --- Renderizado ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-xl border border-gray-200">
                {/* --- Encabezado --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6 mb-6">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <Receipt size={32} />
                        Bitácora de Ventas
                    </h1>
                </div>

                {/* --- Sección de Filtros --- */}
                <div className="mb-8 p-5 bg-gray-50 rounded-lg border border-gray-200">
                     <div className="flex justify-between items-center mb-5">
                        <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                            <ListFilter size={20} /> Filtros
                        </h2>
                        <button
                            onClick={handleResetFilters}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-xs flex items-center gap-1 font-medium"
                            title="Reiniciar Filtros"
                        >
                            <RotateCcw size={14} /> Reset
                        </button>
                     </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        {/* Búsqueda General */}
                        <div className="relative lg:col-span-2">
                             <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                             <input
                                type="text"
                                id="searchTerm"
                                name="searchTerm"
                                value={filters.searchTerm}
                                onChange={handleFilterChange}
                                placeholder="ID Venta, Cliente, Producto..."
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                             <div className="absolute inset-y-0 left-0 pt-7 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        {/* Rango de Fechas */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                                <input
                                    type="date"
                                    id="startDate"
                                    name="startDate"
                                    value={filters.startDate}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                             <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                                <input
                                    type="date"
                                    id="endDate"
                                    name="endDate"
                                    value={filters.endDate}
                                    onChange={handleFilterChange}
                                    min={filters.startDate || undefined}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        
                        {/* Rango de Total */}
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="minTotal" className="block text-sm font-medium text-gray-700 mb-1">Total Mín.</label>
                                <div className="relative">
                                     <input
                                        type="number"
                                        id="minTotal"
                                        name="minTotal"
                                        value={filters.minTotal}
                                        onChange={handleFilterChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500 text-sm">Bs</div>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="maxTotal" className="block text-sm font-medium text-gray-700 mb-1">Total Máx.</label>
                                 <div className="relative">
                                    <input
                                        type="number"
                                        id="maxTotal"
                                        name="maxTotal"
                                        value={filters.maxTotal}
                                        onChange={handleFilterChange}
                                        min={filters.minTotal || 0}
                                        step="0.01"
                                        placeholder="-"
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                     <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500 text-sm">Bs</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Resultados (Tabla o Estados) --- */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-60">
                        <SpinnerIcon />
                    </div>
                ) : message && !allVentas.length ? (
                     <EmptyState message={message.substring(2).trim()} />
                ) : !filteredVentas.length ? (
                     <EmptyState message="Ninguna venta coincide con los filtros aplicados." />
                ) : (
                    // --- Tabla de Ventas ---
                    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    {/* Alineación Izquierda */}
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                                    {/* Centro */}
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                                    {/* Derecha */}
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredVentas.map(venta => (
                                    <tr key={venta.id} className="hover:bg-gray-50 transition-colors duration-150 text-sm">
                                        {/* *** CORRECCIÓN AQUÍ: Añadido text-left *** */}
                                        <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-700 text-left">{venta.id}</td>
                                        {/* *** CORRECCIÓN AQUÍ: Añadido text-left *** */}
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-left">{formatDate(venta.fecha_venta)}</td>
                                        {/* *** CORRECCIÓN AQUÍ: Añadido text-left *** */}
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-800 font-medium text-left">
                                            {venta.cliente_info ? `${venta.cliente_info.nombre} ${venta.cliente_info.apellido}` : 'N/A'}
                                        </td>
                                        {/* Centro (ya estaba bien) */}
                                        <td className="px-4 py-3 whitespace-nowrap text-center text-gray-600">
                                             <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                                <Package size={12} /> {venta.detalles?.length || 0}
                                             </span>
                                        </td>
                                        {/* Derecha (ya estaba bien) */}
                                        <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-blue-700">{formatPrice(venta.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistorialVentas;