// src/cliente/DetalleCompra.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVentaById } from '../api/venta'; 
import { getResenasPorProducto } from '../api/resena';
import { getProducts } from '../api/producto'; // Se usa para las imágenes
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, Star, Edit, Package } from 'lucide-react';
import ResenaModal from './ResenaModal'; 

// --- Utilidades de Formato ---
const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha Inválida';
    return date.toLocaleString('es-ES', {
        day: '2-digit', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
    });
};

// --- Icono de Carga Profesional ---
const SpinnerIcon = () => (
    <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
    </div>
);

// --- Componente de Fila de Producto ---
const ProductRow = ({ detalle, productMap, resenasUsuario, ventaEstado, onResenaClick }) => {
    
    const productoId = detalle.producto;
    const productoCompleto = productMap.get(productoId);
    
    const productoNombre = detalle.nombre_producto || productoCompleto?.nombre || "Producto Desconocido";
    const productoImagen = productoCompleto?.imagen_url;

    const yaResenado = resenasUsuario.some(r => r.producto === productoId);
    const puedeResenar = ventaEstado === 'OK' && !yaResenado;

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-slate-200 rounded-lg bg-white">
            
            <div className="flex-shrink-0 h-24 w-24 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
                {productoImagen ? (
                    <img 
                        src={productoImagen}
                        alt={productoNombre}
                        className="h-full w-full object-contain"
                    />
                ) : (
                    <Package size={32} className="text-slate-400" />
                )}
            </div>
            
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


// --- Componente Principal ---
const DetalleCompra = () => {
    const { ventaId } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [venta, setVenta] = useState(null);
    const [resenasUsuario, setResenasUsuario] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [productMap, setProductMap] = useState(new Map());
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productoAResenar, setProductoAResenar] = useState(null);

    // ✨ --- loadDatos CORREGIDO --- ✨
    const loadDatos = useCallback(async () => {
        if (!token || !ventaId) {
            navigate('/mis-compras');
            return;
        }
        setIsLoading(true);
        try {
            const [dataVenta, dataResenas, dataProductos] = await Promise.all([
                getVentaById(token, ventaId),
                getResenasPorProducto(null),
                getProducts(token) // <-- ✨ CORRECCIÓN: Pasar el 'token' aquí
            ]);
            
            const map = new Map();
            dataProductos.forEach(prod => {
                map.set(prod.id, prod); 
            });
            
            setVenta(dataVenta);
            setResenasUsuario(dataResenas);
            setProductMap(map); 

        } catch (error) {
            // El error 401 de getProducts también caerá aquí
            console.error("Error al cargar datos:", error);
            toast.error("No se pudo cargar la compra o no tienes permiso.");
            navigate('/mis-compras');
        } finally {
            setIsLoading(false);
        }
    }, [token, ventaId, navigate]); // Dependencias correctas

    useEffect(() => {
        loadDatos();
    }, [loadDatos]);

    // --- Manejadores de Modal ---
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
        loadDatos(); 
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
            {isModalOpen && (
                <ResenaModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSuccess={handleResenaSuccess}
                    producto={productoAResenar} 
                />
            )}

            <div className="min-h-screen bg-slate-100 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    
                    <Link
                        to="/mis-compras"
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
                    >
                        <ArrowLeft size={18} />
                        Volver a Mis Compras
                    </Link>
                    
                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">
                        {/* Encabezado del Pedido */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-slate-200">
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
                            
                            <div className="space-y-4">
                                {venta.detalles.map(detalle => (
                                    <ProductRow
                                        key={detalle.id}
                                        detalle={detalle}
                                        productMap={productMap}
                                        resenasUsuario={resenasUsuario}
                                        ventaEstado={venta.estado}
                                        onResenaClick={handleOpenModal}
                                    />
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