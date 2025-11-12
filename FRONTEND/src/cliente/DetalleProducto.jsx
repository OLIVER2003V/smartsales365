import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// ✨ 1. Importa la API de reclamo
import { iniciarReclamoGarantia } from '../api/garantia'; 
// Asumimos que tienes una función para obtener la venta en 'api/venta.js'
import { getVentaById } from '../api/venta'; 
import { getResenasPorProducto } from '../api/resena';
import { getProducts } from '../api/producto';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, Star, Edit, Package, ShieldAlert } from 'lucide-react'; // ✨ 2. Añade ShieldAlert
import ResenaModal from './ResenaModal'; 

// --- ✨ NUEVO: Modal para Iniciar Reclamo ---
// (Componente interno para este archivo)
const ReclamoModal = ({ garantia, onClose, onReclamoExitoso, token }) => {
    const [motivo, setMotivo] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!motivo.trim()) {
            return toast.error("Debes explicar el motivo del reclamo.");
        }
        setIsLoading(true);
        try {
            // Llama a la API con el token
            await iniciarReclamoGarantia(token, garantia.id, motivo);
            toast.success("Reclamo iniciado. Nuestro equipo lo revisará.");
            onReclamoExitoso(); // Llama a la función para refrescar
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold text-slate-900">Iniciar Reclamo de Garantía</h3>
                {/* Asumimos que la 'garantia' tiene esta info anidada */}
                <p className="text-sm text-slate-600 mt-2">
                    Producto: <span className="font-medium text-slate-800">{garantia.detalle_venta.producto.nombre}</span>
                </p>
                <p className="text-sm text-slate-500">
                    Código: <span className="font-mono">{garantia.codigo_garantia.substring(0, 8)}...</span>
                </p>
                
                <div className="mt-4">
                    <label htmlFor="motivo" className="block text-sm font-medium text-slate-700 mb-1">
                        Describe la falla o el problema
                    </label>
                    <textarea
                        id="motivo"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ej: El producto no enciende, hace un ruido extraño, etc."
                        className="w-full border border-slate-300 rounded-lg p-2 mt-1 h-32 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isLoading}
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        onClick={onClose} 
                        disabled={isLoading} 
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isLoading} 
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:bg-indigo-300"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                        {isLoading ? "Enviando..." : "Enviar Reclamo"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Utilidades de Formato (Sin cambios) ---
const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });
const formatDate = (dateString) => {
    // ... (tu código de formato)
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha Inválida';
    return date.toLocaleString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric', 
        hour: '2-digit', minute: '2-digit'
    });
};

// --- Icono de Carga (Sin cambios) ---
const SpinnerIcon = () => (
    <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
    </div>
);

// --- Componente de Fila de Producto (Sin cambios) ---
// Este componente solo maneja la info del producto y la reseña
const ProductRow = ({ detalle, productMap, resenasUsuario, ventaEstado, onResenaClick }) => {
    
    const productoId = detalle.producto;
    const productoCompleto = productMap.get(productoId);
    
    const productoNombre = detalle.nombre_producto || productoCompleto?.nombre || "Producto Desconocido";
    const productoImagen = productoCompleto?.imagen_url;

    const yaResenado = resenasUsuario.some(r => r.producto === productoId);
    const puedeResenar = ventaEstado === 'OK' && !yaResenado;

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-slate-200 rounded-lg bg-white">
            
            {/* ... (Imagen del producto) ... */}
            <div className="flex-shrink-0 h-24 w-24 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
                {productoImagen ? (
                    <img src={productoImagen} alt={productoNombre} className="h-full w-full object-contain" />
                ) : (
                    <Package size={32} className="text-slate-400" />
                )}
            </div>
            
            {/* ... (Info del producto) ... */}
            <div className="flex-1 text-center sm:text-left">
                <Link to={`/producto/${productoId}`} className="font-semibold text-lg text-slate-900 hover:text-indigo-600 hover:underline">
                    {productoNombre}
                </Link>
                <p className="text-sm text-slate-500">
                    {detalle.cantidad} {detalle.cantidad > 1 ? 'unidades' : 'unidad'} x {formatPrice(detalle.precio_unitario)}
                </p>
                <p className="text-base font-semibold text-slate-800 mt-1">
                    Subtotal: {formatPrice(detalle.subtotal)}
                </p>
            </div>
            
            {/* ... (Botón de Reseña) ... */}
            <div className="w-full sm:w-auto sm:min-w-[180px] flex justify-center">
                {ventaEstado !== 'OK' && (
                    <span className="text-sm text-slate-500 italic text-center sm:text-right">Podrás dejar tu reseña cuando el pedido sea entregado.</span>
                )}
                {yaResenado && (
                    <span className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg">
                        <Star size={16} /> Reseña enviada
                    </span>
                )}
                {puedeResenar && (
                    <button
                        onClick={() => onResenaClick({ id: productoId, nombre: productoNombre })}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        <Edit size={16} /> Dejar Reseña
                    </button>
                )}
            </div>
        </div>
    );
};


// --- Componente Principal (ACTUALIZADO) ---
const DetalleCompra = () => {
    const { ventaId } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [venta, setVenta] = useState(null);
    const [resenasUsuario, setResenasUsuario] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [productMap, setProductMap] = useState(new Map());
    
    // Hooks para el modal de Reseña
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productoAResenar, setProductoAResenar] = useState(null);
    
    // --- ✨ 3. Hooks para el modal de Garantía ---
    const [modalGarantia, setModalGarantia] = useState(null);

    // loadDatos (Sin cambios, tu lógica original está bien)
    const loadDatos = useCallback(async () => {
        if (!token || !ventaId) {
            navigate('/mis-compras');
            return;
        }
        setIsLoading(true);
        try {
            // Asumimos que getVentaById devuelve la venta con detalles y garantías anidadas
            // y que getProducts(token) es necesario para las imágenes.
            const [dataVenta, dataResenas, dataProductos] = await Promise.all([
                getVentaById(token, ventaId),
                getResenasPorProducto(null), // Asumimos que esto busca las reseñas DEL USUARIO LOGUEADO
                getProducts(token)
            ]);
            
            const map = new Map();
            dataProductos.forEach(prod => {
                map.set(prod.id, prod); 
            });
            
            setVenta(dataVenta);
            setResenasUsuario(dataResenas);
            setProductMap(map); 

        } catch (error) {
            console.error("Error al cargar datos:", error);
            toast.error("No se pudo cargar la compra o no tienes permiso.");
            navigate('/mis-compras');
        } finally {
            setIsLoading(false);
        }
    }, [token, ventaId, navigate]);

    useEffect(() => {
        loadDatos();
    }, [loadDatos]);

    // --- Manejadores de Modal (Reseña) ---
    const handleOpenModal = (producto) => {
        setProductoAResenar(producto); 
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setProductoAResenar(null);
    };
    const handleResenaSuccess = () => {
        handleCloseModal();
        loadDatos(); // Refresca los datos
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100">
                <SpinnerIcon />
            </div>
        );
    }

    if (!venta) return null;

    return (
        <>
            {/* Modal de Reseña */}
            {isModalOpen && (
                <ResenaModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSuccess={handleResenaSuccess}
                    producto={productoAResenar} 
                />
            )}
            
            {/* --- ✨ 4. Modal de Garantía --- */}
            {modalGarantia && (
                <ReclamoModal 
                    garantia={modalGarantia}
                    token={token} // Pasa el token
                    onClose={() => setModalGarantia(null)}
                    onReclamoExitoso={() => {
                        setModalGarantia(null); // Cierra el modal
                        loadDatos(); // Refresca los datos para mostrar el nuevo estado
                    }}
                />
            )}

            <div className="min-h-screen bg-slate-100 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    
                    {/* Botón de Volver (Sin cambios) */}
                    <Link
                        to="/mis-compras"
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
                    >
                        <ArrowLeft size={18} />
                        Volver a Mis Compras
                    </Link>
                    
                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">
                        {/* Encabezado del Pedido (Sin cambios) */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-slate-200">
                            {/* ... (tu código de encabezado) ... */}
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">Detalle del Pedido</h1>
                                <p className="text-slate-500">
                                    Pedido <span className="font-semibold text-indigo-700">#{venta.id}</span>
                                </p>
                            </div>
                            <div className="flex-shrink-0 flex flex-col items-start sm:items-end">
                                <p className="text-sm text-slate-500">Comprado el: {formatDate(venta.fecha_venta)}</p>
                                <p className="text-2xl font-bold text-slate-900">{formatPrice(venta.total)}</p>
                            </div>
                        </div>

                        {/* Lista de Productos */}
                        <div className="mt-8 space-y-6">
                            <h2 className="text-xl font-semibold text-slate-800">Productos en este pedido</h2>
                            
                            <div className="space-y-6"> {/* ✨ Aumentado el space-y */}
                                {venta.detalles.map(detalle => (
                                    // Cada "item" ahora es un bloque que contiene el producto Y sus garantías
                                    <div key={detalle.id} className="bg-slate-50/70 border border-slate-200 rounded-lg">
                                        {/* Fila del Producto (Reseña) */}
                                        <ProductRow
                                            detalle={detalle}
                                            productMap={productMap}
                                            resenasUsuario={resenasUsuario}
                                            ventaEstado={venta.estado}
                                            onResenaClick={handleOpenModal}
                                        />

                                        {/* --- ✨ 5. NUEVA SECCIÓN DE GARANTÍAS --- */}
                                        {/* Asumimos que 'detalle.garantias' viene de la API */}
                                        {detalle.garantias && detalle.garantias.length > 0 && (
                                            <div className="mt-2 p-4 border-t border-slate-200">
                                                <h4 className="text-sm font-medium text-slate-600 mb-2">Garantías Asociadas:</h4>
                                                <div className="space-y-2">
                                                    {detalle.garantias.map(garantia => (
                                                        <div key={garantia.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-white rounded-lg border border-slate-300">
                                                            <div>
                                                                <span className="text-sm font-mono font-medium text-slate-700">{garantia.codigo_garantia.substring(0, 8)}...</span>
                                                                {/* Badge de estado de la garantía */}
                                                                <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                                    garantia.estado === 'ACT' ? 'bg-green-100 text-green-700 ring-1 ring-green-200' : 
                                                                    garantia.estado === 'EXP' ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200' :
                                                                    'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                                                                }`}>
                                                                    {garantia.get_estado_display} 
                                                                </span>
                                                            </div>
                                                            {/* Botón para Reclamar */}
                                                            {garantia.estado === 'ACT' && (
                                                                <button
                                                                    onClick={() => setModalGarantia(garantia)}
                                                                    className="flex mt-2 sm:mt-0 items-center justify-center gap-1.5 w-full sm:w-auto px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition shadow-sm"
                                                                >
                                                                    <ShieldAlert size={14} /> Reclamar Garantía
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* --- FIN DE LA SECCIÓN DE GARANTÍAS --- */}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DetalleCompra;