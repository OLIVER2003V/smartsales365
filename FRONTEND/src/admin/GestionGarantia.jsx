import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAdminGarantias, gestionarReclamoGarantia } from '../api/garantia';
import { Loader2, Edit, Filter, ShieldCheck, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

// Modal de gestión para el Admin
const GestionModal = ({ garantia, onClose, onGestionExitosa, token }) => {
    // Los estados válidos para que el admin gestione
    const estadosAdmin = [
        // --- ✨ CORRECCIÓN CLAVE AQUÍ ---
        // Los 'value' ahora son los CÓDIGOS CORTOS del modelo de Django
        { value: 'REC', label: 'Reclamo Iniciado (Pendiente)' },
        { value: 'REV', label: 'Recepcionado (En Revisión)' },
        { value: 'APR', label: 'Aprobada (Resolver)' },
        { value: 'RZD', label: 'Rechazada (Cerrar)' },
    ];
    
    // El estado 'garantia.estado' ya es el código corto (ej. 'REC')
    const [estado, setEstado] = useState(garantia.estado); 
    const [observacion, setObservacion] = useState(garantia.observacion_admin || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        // --- ✨ CORRECCIÓN AQUÍ ---
        // La validación ahora usa el código corto 'RZD'
        if (estado === 'RZD' && !observacion.trim()) {
            return toast.error("Debe añadir una observación si rechaza la garantía.");
        }
        setIsLoading(true);
        try {
            // --- ✨ CORRECCIÓN AQUÍ ---
            // Se envía el 'estado' (que ahora es un código corto: 'REV', 'APR', etc.)
            await gestionarReclamoGarantia(token, garantia.id, estado, observacion);
            toast.success("Garantía actualizada.");
            onGestionExitosa(); // Llama a la función para refrescar y cerrar
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Gestionar Reclamo</h3>
                {/* Asumiendo que la data viene anidada como la definimos en el serializer */}
                <p className="text-sm text-slate-600">
                    Producto: <span className="font-medium text-slate-800">{garantia.detalle_venta.producto.nombre}</span>
                </p>
                <p className="text-sm text-slate-600">
                    Cliente: <span className="font-medium text-slate-800">{garantia.detalle_venta.venta.cliente.email}</span>
                </p>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Motivo del Cliente:</p>
                    <p className="text-sm italic text-blue-700">"{garantia.motivo_reclamo || '(El cliente no especificó un motivo)'}"</p>
                </div>
                
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700">Actualizar Estado:</label>
                    <select
                        value={estado} // El 'value' es el código corto (ej. 'REC')
                        onChange={(e) => setEstado(e.target.value)}
                        className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {/* ✨ CORRECCIÓN AQUÍ --- */}
                        {/* El 'value' del <option> es el código corto */}
                        {estadosAdmin.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700">Observación (Admin):</label>
                    <textarea
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                        placeholder="Añadir notas de revisión o motivo de rechazo..."
                        className="w-full mt-1 border border-slate-300 rounded-lg p-2 h-24 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:bg-indigo-300">
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                        {isLoading ? "Actualizando..." : "Actualizar Garantía"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Página principal de Gestión de Garantías
const GestionGarantias = () => {
    const { token } = useAuth(); // Obtiene el token para la API
    const [garantias, setGarantias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalGarantia, setModalGarantia] = useState(null); 
    const [filtro, setFiltro] = useState('PENDIENTES'); // PENDIENTES, ACTIVAS, TODAS

    // Usamos useCallback para evitar que fetchGarantias se recree en cada render
    const fetchGarantias = useCallback(async () => {
        if (!token) return; // No hacer nada si el token no ha cargado
        setLoading(true);
        try {
            // Llama a la API (GET /api/garantias/)
            const data = await getAdminGarantias(token); 
            setGarantias(data);
        } catch (error) {
            toast.error("No se pudieron cargar las garantías.");
        } finally {
            setLoading(false);
        }
    }, [token]); // La dependencia es el token

    useEffect(() => {
        fetchGarantias();
    }, [fetchGarantias]); // Ejecuta el efecto cuando fetchGarantias cambia (o al inicio)

    const garantiasFiltradas = useMemo(() => {
        if (filtro === 'PENDIENTES') {
            // --- ✨ CORRECCIÓN AQUÍ ---
            // Filtra por los códigos cortos que requieren acción del admin
            return garantias.filter(g => g.estado === 'REC' || g.estado === 'REV');
        }
        if (filtro === 'ACTIVAS') {
             // --- ✨ CORRECCIÓN AQUÍ ---
            return garantias.filter(g => g.estado === 'ACT');
        }
        return garantias; // 'TODAS'
    }, [garantias, filtro]);

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto p-4 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={32} className="text-indigo-600" />
                        <h1 className="text-3xl font-bold text-slate-900">Gestión de Garantías</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-500" />
                        <select 
                            value={filtro} 
                            onChange={(e) => setFiltro(e.target.value)}
                            className="p-2 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="PENDIENTES">Reclamos Pendientes</option>
                            <option value="ACTIVAS">Garantías Activas</option>
                            <option value="TODAS">Todas las Garantías</option>
                        </select>
                    </div>
                </div>
                
                {loading && <div className="flex justify-center p-10"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>}

                {!loading && (
                    <div className="bg-white shadow-md rounded-lg overflow-hidden border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Producto</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {garantiasFiltradas.length === 0 && (
                                        <tr><td colSpan="5" className="text-center p-6 text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Inbox size={40} className="text-slate-400" />
                                                <span className="font-medium">No se encontraron garantías</span>
                                                <span className="text-sm">No hay garantías que coincidan con el filtro seleccionado.</span>
                                            </div>
                                        </td></tr>
                                    )}
                                    {garantiasFiltradas.map(g => (
                                        <tr key={g.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{g.detalle_venta.producto.nombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{g.detalle_venta.venta.cliente.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{g.codigo_garantia.substring(0, 8)}...</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {/* El 'g.get_estado_display' viene del serializer */}
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                    g.estado === 'REC' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' : 
                                                    g.estado === 'REV' ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' :
                                                    g.estado === 'APR' ? 'bg-green-100 text-green-700 ring-1 ring-green-200' :
                                                    g.estado === 'RZD' ? 'bg-red-100 text-red-700 ring-1 ring-red-200' :
                                                    g.estado === 'ACT' ? 'bg-green-100 text-green-700 ring-1 ring-green-200' :
                                                    'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                                                }`}>
                                                    {g.get_estado_display}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                <button 
                                                    onClick={() => setModalGarantia(g)}
                                                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 flex items-center gap-1.5"
                                                >
                                                    <Edit size={14} /> Gestionar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {modalGarantia && (
                    <GestionModal 
                        garantia={modalGarantia}
                        token={token} // Pasa el token al modal
                        onClose={() => setModalGarantia(null)}
                        onGestionExitosa={() => {
                            setModalGarantia(null); // Cierra el modal
                            fetchGarantias(); // Refresca la lista
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default GestionGarantias;