// src/admin/GestionPedidos.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVentas, descargarComprobanteVenta } from '../api/venta';
import { updateEstadoVenta } from '../api/admin'; 
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
    Receipt, 
    Loader2, 
    Inbox, 
    Download, 
    Truck, 
    CheckCircle2,
    XCircle, 
    PackageSearch,
    Search,
    ChevronDown,
    ChevronUp,
    ArrowUpDown
} from 'lucide-react';

// --- Icono de Carga ---
const SpinnerIcon = () => (
    <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
    </div>
);

// --- Componente para Estado Vacío ---
const EmptyState = ({ message }) => (
    <div className="text-center py-20 px-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <PackageSearch size={48} className="mx-auto text-gray-400" strokeWidth={1.5} />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No se encontraron pedidos</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
);

// --- Componente de Badge de Estado ---
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
        'OK': <CheckCircle2 size={14} strokeWidth={2} />,
        'CAN': <XCircle size={14} strokeWidth={2} />,
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${styles[estado] || 'bg-gray-100 text-gray-800'}`}>
            {icon[estado]}
            {estadoDisplay || estado}
        </span>
    );
};

// --- Componente para Pestaña de Filtro ---
const FilterTab = ({ label, estado, activeTab, onClick, count }) => {
    const isActive = activeTab === estado;
    return (
        <button
            onClick={() => onClick(estado)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${isActive
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }
            `}
        >
            {label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold 
                ${isActive 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-300 text-slate-700'
                }`}
            >
                {count}
            </span>
        </button>
    );
}

// --- Componente de Fila de Detalle de Pedido (CORREGIDO) ---
const PedidoDetalleRow = ({ venta, formatPrice }) => {
    
    // Asumimos que el array de detalles se llama "detalles" en el objeto "venta"
    // (venta.detalles). Si se llama diferente (ej. "items"), cambia aquí.
    const detallesDelPedido = venta.detalles || []; 

    return (
        <tr className="bg-slate-50">
            {/* Colspan="7" (1 para expandir + 6 de datos) */}
            <td colSpan="7" className="p-0">
                <div className="px-6 py-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Detalles del Pedido #{venta.id}</h4>
                    <table className="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Producto</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 uppercase">Cantidad</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Precio Unit.</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {/* --- CORRECCIONES APLICADAS ---
                              1. key={detalle.id}
                              2. detalle.nombre_producto
                              3. formatPrice(detalle.subtotal)
                              4. Sin espacios entre <tr> y <td>
                            */}
                            {detallesDelPedido.map(detalle => (
                                <tr key={detalle.id}>
                                    <td className="px-3 py-3 text-sm text-gray-800">{detalle.nombre_producto}</td>
                                    <td className="px-3 py-3 text-center text-sm text-gray-600">{detalle.cantidad}</td>
                                    <td className="px-3 py-3 text-right text-sm text-gray-600">{formatPrice(detalle.precio_unitario)}</td>
                                    <td className="px-3 py-3 text-right text-sm font-medium text-gray-800">{formatPrice(detalle.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
    );
};


// --- Componente Principal ---
const GestionPedidos = () => {
    const [ventas, setVentas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const navigate = useNavigate();
    const { token, user } = useAuth();
    
    // --- Estados de UI ---
    const [filtroEstado, setFiltroEstado] = useState('PAG');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortCriteria, setSortCriteria] = useState('fecha_desc');
    const [expandedRowId, setExpandedRowId] = useState(null);

    // --- Utilidades de Formato ---
    const formatDate = (dateString) => new Date(dateString).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

    // Carga Inicial de Ventas
    const loadVentas = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const data = await getVentas(token);
            setVentas(data);
        } catch (error) {
            toast.error('Error al cargar pedidos.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!user || (user.rol !== 'ADM' && user.rol !== 'VEN')) {
            toast.error('Acceso denegado.');
            navigate('/catalogo');
            return;
        }
        loadVentas();
    }, [token, user, navigate, loadVentas]);

    // Función de Descarga
    const handleDescargarComprobante = async (ventaId) => {
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
            toast.error("Error al descargar.", { id: toastId });
        } finally {
            setDownloadingId(null);
        }
    };

    // Función para Actualizar Estado
    const handleEstadoChange = async (ventaId, nuevoEstado) => {
        const toastId = toast.loading(`Actualizando pedido #${ventaId}...`);
        try {
            const responseData = await updateEstadoVenta(token, ventaId, nuevoEstado);
            setVentas(prevVentas =>
                prevVentas.map(venta =>
                    venta.id === ventaId ? responseData : venta
                )
            );
            toast.success(`Pedido #${ventaId} actualizado a: ${responseData.estado_display}`, { id: toastId });
        } catch (error) {
            toast.error(error.message || "No se pudo actualizar el estado.", { id: toastId });
        }
    };

    // Toggle para expandir fila
    const handleToggleRow = (ventaId) => {
        setExpandedRowId(prevId => (prevId === ventaId ? null : ventaId));
    };

    // useMemo: Filtra, Busca y Ordena
    const { processedVentas, counts } = useMemo(() => {
        const counts = { PAG: 0, ENT: 0, OK: 0, CAN: 0, TODOS: ventas.length };
        
        let filtered = [];
        
        // 1. Contar (sobre todos los datos)
        ventas.forEach(v => {
            if (counts[v.estado] !== undefined) {
                counts[v.estado]++;
            }
        });

        // 2. Filtrar por Pestaña
        filtered = (filtroEstado === 'TODOS')
            ? ventas
            : ventas.filter(v => v.estado === filtroEstado);

        // 3. Filtrar por Búsqueda
        const lowerSearchTerm = searchTerm.toLowerCase();
        if (lowerSearchTerm) {
            filtered = filtered.filter(v => {
                const clienteNombre = v.cliente_info ? `${v.cliente_info.nombre} ${v.cliente_info.apellido}` : '';
                return (
                    v.id.toString().includes(lowerSearchTerm) ||
                    clienteNombre.toLowerCase().includes(lowerSearchTerm)
                );
            });
        }
        
        // 4. Ordenar
        const sorted = [...filtered].sort((a, b) => {
            switch (sortCriteria) {
                case 'fecha_asc':
                    return new Date(a.fecha_venta) - new Date(b.fecha_venta);
                case 'total_desc':
                    return b.total - a.total;
                case 'total_asc':
                    return a.total - b.total;
                case 'cliente_asc':
                    return (a.cliente_info?.nombre || '').localeCompare(b.cliente_info?.nombre || '');
                case 'cliente_desc':
                    return (b.cliente_info?.nombre || '').localeCompare(a.cliente_info?.nombre || '');
                case 'fecha_desc':
                default:
                    return new Date(b.fecha_venta) - new Date(a.fecha_venta);
            }
        });
            
        return { processedVentas: sorted, counts };
    }, [ventas, filtroEstado, searchTerm, sortCriteria]);

    // --- Renderizado ---
    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
                
                {/* Encabezado */}
                <div className="border-b border-gray-200 pb-5 mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <Truck size={30} className="text-gray-900" />
                        Gestión de Pedidos y Envíos
                    </h1>
                </div>

                {/* Pestañas de Filtro */}
                <div className="mb-6 overflow-hidden">
                    <div className="overflow-x-auto pb-2 scrollbar-hide">
                        <div className="flex w-full space-x-2 rounded-xl bg-slate-100 p-1.5">
                            <FilterTab label="Pendientes" estado="PAG" activeTab={filtroEstado} onClick={setFiltroEstado} count={counts.PAG} />
                            <FilterTab label="En Tránsito" estado="ENT" activeTab={filtroEstado} onClick={setFiltroEstado} count={counts.ENT} />
                            <FilterTab label="Entregados" estado="OK" activeTab={filtroEstado} onClick={setFiltroEstado} count={counts.OK} />
                            <FilterTab label="Cancelados" estado="CAN" activeTab={filtroEstado} onClick={setFiltroEstado} count={counts.CAN} />
                            <FilterTab label="Todos" estado="TODOS" activeTab={filtroEstado} onClick={setFiltroEstado} count={counts.TODOS} />
                        </div>
                    </div>
                </div>

                {/* Barra de Búsqueda y Ordenamiento */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    {/* Barra de Búsqueda */}
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por ID de pedido o nombre de cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    {/* Selector de Ordenamiento */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <ArrowUpDown className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            value={sortCriteria}
                            onChange={(e) => setSortCriteria(e.target.value)}
                            className="appearance-none w-full md:w-auto block pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="fecha_desc">Más Recientes</option>
                            <option value="fecha_asc">Más Antiguos</option>
                            <option value="total_desc">Total (Mayor a Menor)</option>
                            <option value="total_asc">Total (Menor a Mayor)</option>
                            <option value="cliente_asc">Cliente (A-Z)</option>
                            <option value="cliente_desc">Cliente (Z-A)</option>
                        </select>
                    </div>
                </div>

                {/* Contenido (Tabla) */}
                {isLoading ? (
                    <SpinnerIcon />
                ) : !ventas.length ? (
                    <EmptyState message="Cuando se registre un nuevo pedido, aparecerá aquí." />
                ) : !processedVentas.length ? (
                    <EmptyState message={`No hay pedidos que coincidan con los filtros aplicados.`} />
                ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {/* Columna para expandir */}
                                        <th className="w-12 px-3 py-3.5 text-center text-sm font-semibold text-slate-700"></th>
                                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">ID</th>
                                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Fecha</th>
                                        <th className="px-4 py-3.5 text-left text-sm font-semibold text-slate-700">Cliente</th>
                                        <th className="px-4 py-3.5 text-right text-sm font-semibold text-slate-700">Total</th>
                                        <th className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Estado</th>
                                        <th className="px-4 py-3.5 text-center text-sm font-semibold text-slate-700">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {processedVentas.map(venta => (
                                        <React.Fragment key={venta.id}>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                {/* Botón para expandir */}
                                                <td className="px-3 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleRow(venta.id)}
                                                        className="p-1 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                        title={expandedRowId === venta.id ? "Ocultar detalles" : "Mostrar detalles"}
                                                    >
                                                        {expandedRowId === venta.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-600">#{venta.id}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(venta.fecha_venta)}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {venta.cliente_info ? `${venta.cliente_info.nombre} ${venta.cliente_info.apellido}` : 'N/A'}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowGrap text-right text-sm font-semibold text-indigo-700">{formatPrice(venta.total)}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <EstadoBadge estado={venta.estado} estadoDisplay={venta.estado_display} />
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <select
                                                            value={venta.estado}
                                                            onChange={(e) => handleEstadoChange(venta.id, e.target.value)}
                                                            className="py-1.5 pl-3 pr-8 text-sm font-medium border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                            disabled={venta.estado === 'OK' || venta.estado === 'CAN'}
                                                        >
                                                            <option value="PAG">Pagado</option>
                                                            <option value="ENT">En Tránsito</option>
                                                            <option value="OK">Entregado</option>
                                                            <option value="CAN">Cancelar</option>
                                                        </select>
                                                        <button
                                                            onClick={() => handleDescargarComprobante(venta.id)}
                                                            disabled={downloadingId === venta.id}
                                                            title="Descargar Comprobante PDF"
                                                            className="p-2 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:text-gray-300 disabled:hover:bg-transparent"
                                                        >
                                                            {downloadingId === venta.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Fila de detalles condicional */}
                                            {expandedRowId === venta.id && <PedidoDetalleRow venta={venta} formatPrice={formatPrice} />}
                                        </React.Fragment>
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

export default GestionPedidos;