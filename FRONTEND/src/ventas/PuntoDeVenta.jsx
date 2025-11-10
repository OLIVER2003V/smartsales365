// src/ventas/PuntoDeVenta.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/producto'; // API para obtener productos
import { getClientes } from '../api/cliente';   // API para obtener clientes
import { createVenta } from '../api/venta';     // API para crear la venta
import { useAuth } from '../context/AuthContext'; // <-- CAMBIO: Importar hook
import toast from 'react-hot-toast'; // <-- CAMBIO: Usar toast para mensajes

// Iconos (Asumo que los tienes o usas Lucide)
import { 
    Search, Plus, Minus, Trash2, Loader2, User, ShoppingCart 
} from 'lucide-react';

// --- CAMBIO: Mover AlertMessage al scope local o importarlo ---
const AlertMessage = ({ msg }) => {
    if (!msg) return null;
    const isError = msg.includes('❌') || msg.includes('⚠️');
    const bgColor = isError ? 'bg-red-50' : 'bg-green-50';
    const textColor = isError ? 'text-red-700' : 'text-green-700';
    const borderColor = isError ? 'border-red-500' : 'border-green-500';
    return (
        <div className={`p-3 text-sm rounded-lg font-medium border-l-4 ${bgColor} ${textColor} ${borderColor} shadow-sm`}>
            {msg}
        </div>
    );
};

// --- CAMBIO: Quitar { token, userRole } de las props ---
const PuntoDeVenta = () => {
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [clientesDisponibles, setClientesDisponibles] = useState([]); 
    const [carrito, setCarrito] = useState([]); 
    const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('');
    const [searchTermProductos, setSearchTermProductos] = useState('');
    const [searchTermClientes, setSearchTermClientes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // --- CAMBIO: Obtener token y user del contexto ---
    const { token, user } = useAuth();
    const userRole = user?.rol; // Obtener el rol desde el 'user' del contexto

    // Carga inicial de productos y clientes
    const loadInitialData = useCallback(async () => {
        if (!token) return; // No hacer nada si no hay token
        setIsLoading(true);
        setMessage('');
        const loadingToast = toast.loading('Cargando datos...');
        try {
            const [listaProductos, listaClientes] = await Promise.all([
                getProducts(token),
                (userRole === 'VEN' || userRole === 'ADM') ? getClientes(token) : Promise.resolve([]) 
            ]);
            setProductosDisponibles(listaProductos);
            setClientesDisponibles(listaClientes);
            toast.success(`Datos cargados: ${listaProductos.length} productos.`, { id: loadingToast });
        } catch (error) {
            toast.error('Error al cargar datos iniciales.', { id: loadingToast });
            if (error.response?.status === 401) { 
                setTimeout(() => navigate('/', { replace: true }), 1500); 
            }
        } finally {
            setIsLoading(false);
        }
    }, [token, userRole, navigate]);

    useEffect(() => {
        // Protección de ruta (user ya viene del contexto)
        if (!user || (user.rol !== 'ADM' && user.rol !== 'VEN')) {
            toast.error('Acceso denegado. Solo Admin o Vendedores.');
            navigate('/');
            return;
        }
        if (token) {
            loadInitialData();
        }
    }, [token, user, navigate, loadInitialData]);

    // Productos filtrados
    const filteredProductos = useMemo(() => {
        if (!productosDisponibles) return [];
        const lowerSearch = searchTermProductos.toLowerCase();
        return productosDisponibles.filter(p =>
            p.nombre.toLowerCase().includes(lowerSearch) ||
            p.marca.toLowerCase().includes(lowerSearch) ||
            (p.categoria && p.categoria.toLowerCase().includes(lowerSearch))
        );
    }, [searchTermProductos, productosDisponibles]);

    // Clientes filtrados
    const filteredClientes = useMemo(() => {
        if (!clientesDisponibles) return [];
        const lowerSearch = searchTermClientes.toLowerCase();
        return clientesDisponibles.filter(c =>
            c.nombre.toLowerCase().includes(lowerSearch) ||
            c.apellido.toLowerCase().includes(lowerSearch) ||
            c.email.toLowerCase().includes(lowerSearch)
        );
    }, [searchTermClientes, clientesDisponibles]);

    // --- Lógica del Carrito ---
    const agregarAlCarrito = (producto) => {
        setCarrito(prev => {
            const existente = prev.find(item => item.producto.id === producto.id);
            if (existente) {
                if (existente.cantidad < producto.stock) {
                    return prev.map(item =>
                        item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
                    );
                } else {
                    toast.error(`Stock máximo alcanzado para ${producto.nombre}`);
                    return prev; 
                }
            } else {
                if (producto.stock > 0) {
                    toast.success(`${producto.nombre} añadido.`);
                    return [...prev, { producto: producto, cantidad: 1 }];
                } else {
                    toast.error(`${producto.nombre} está agotado.`);
                    return prev; 
                }
            }
        });
        setMessage(''); // Limpiar mensajes de error/éxito
    };

    const quitarDelCarrito = (productoId) => {
        setCarrito(prev => prev.filter(item => item.producto.id !== productoId));
    };

    const actualizarCantidad = (productoId, nuevaCantidad) => {
        if(nuevaCantidad <= 0) {
            quitarDelCarrito(productoId); // Eliminar si la cantidad es 0 o menos
            return;
        }
        setCarrito(prev => prev.map(item => {
            if (item.producto.id === productoId) {
                const cantidadValidada = Math.min(nuevaCantidad, item.producto.stock); // No permite más que el stock
                if (nuevaCantidad > item.producto.stock) {
                    toast.error(`Stock máximo (${item.producto.stock}) para ${item.producto.nombre}`);
                }
                return { ...item, cantidad: cantidadValidada };
            }
            return item;
        }));
    };

    // Calcular total del carrito
    const totalCarrito = useMemo(() => {
        return carrito.reduce((sum, item) => sum + (item.cantidad * item.producto.precio), 0);
    }, [carrito]);

    // --- Lógica de Finalizar Venta ---
    const handleFinalizarVenta = async () => {
        if (carrito.length === 0) {
            toast.error('El carrito está vacío.');
            return;
        }
        if ((userRole === 'VEN' || userRole === 'ADM') && !clienteSeleccionadoId) {
            toast.error('Por favor, selecciona un cliente para la venta.');
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading('Procesando venta...');

        const ventaData = {
            cliente: (userRole === 'VEN' || userRole === 'ADM') ? clienteSeleccionadoId : null,
            detalles: carrito.map(item => ({
                producto: item.producto.id,
                cantidad: item.cantidad
            }))
        };

        try {
            // 'token' viene del contexto
            const ventaCreada = await createVenta(token, ventaData);
            toast.success(`¡Venta #${ventaCreada.id} registrada! Total: ${formatPrice(ventaCreada.total)}`, { id: loadingToast, duration: 4000 });
            setCarrito([]);
            setClienteSeleccionadoId('');
            // Opcional: Refrescar productos para stock actualizado
            loadInitialData(); 
        } catch (error) {
            const errorMsg = error.response?.data?.detail || Object.values(error.response?.data || {})[0]?.[0] || 'Error al procesar la venta.';
            toast.error(`Error: ${errorMsg}`, { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Formato de precio local
    const formatPrice = (price) => Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* --- Columna 1 y 2: Selección de Productos y Clientes --- */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md space-y-6">
                {/* Buscador de Productos */}
                <div className="relative">
                    <input type="text" placeholder="Buscar productos..." value={searchTermProductos} onChange={(e) => setSearchTermProductos(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={20} className="text-gray-400" /></div>
                </div>

                {/* Lista de Productos Disponibles */}
                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                    {isLoading && !productosDisponibles.length ? (
                        <div className="text-center py-10 text-gray-500">Cargando productos...</div>
                    ) : filteredProductos.length > 0 ? (
                        filteredProductos.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 transition">
                                <div>
                                    <p className="font-semibold text-gray-800">{p.nombre} <span className="text-xs text-gray-500">({p.marca})</span></p>
                                    <p className="text-sm text-blue-600 font-medium">{formatPrice(p.precio)}</p>
                                    <p className={`text-xs ${p.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>Stock: {p.stock}</p>
                                </div>
                                <button
                                    onClick={() => agregarAlCarrito(p)}
                                    disabled={p.stock <= 0}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    <Plus size={16} /> Añadir
                                </button>
                            </div>
                        ))
                    ) : (
                         <div className="text-center py-10 text-gray-500">No se encontraron productos.</div>
                    )}
                </div>

                {/* Selección de Cliente (Solo Vendedor/Admin) */}
                {(userRole === 'VEN' || userRole === 'ADM') && (
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">Seleccionar Cliente</h3>
                         <div className="relative mb-3">
                            <input type="text" placeholder="Buscar cliente por nombre, apellido, email..." value={searchTermClientes} onChange={(e) => setSearchTermClientes(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={20} className="text-gray-400"/></div>
                        </div>
                        <select
                            value={clienteSeleccionadoId}
                            onChange={(e) => setClienteSeleccionadoId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Selecciona un cliente --</option>
                            {filteredClientes.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre} {c.apellido} ({c.email})</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* --- Columna 3: Carrito de Compras --- */}
            <div className="bg-white p-6 rounded-lg shadow-md space-y-4 flex flex-col">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 border-b pb-3"><ShoppingCart size={24} /> Carrito de Compra</h2>

                {/* Mensaje de feedback (reemplaza el AlertMessage local) */}
                {message && <AlertMessage msg={message} />}

                {/* Lista de Items en el Carrito */}
                <div className="flex-grow overflow-y-auto max-h-[50vh] pr-2 space-y-4">
                    {carrito.length > 0 ? (
                        carrito.map(item => (
                            <div key={item.producto.id} className="flex justify-between items-start border-b pb-3">
                                <div>
                                    <p className="font-medium text-gray-800">{item.producto.nombre}</p>
                                    <p className="text-xs text-gray-500">{formatPrice(item.producto.precio)} x {item.cantidad}</p>
                                    <p className="text-sm font-semibold text-blue-700">Subtotal: {formatPrice(item.cantidad * item.producto.precio)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                     {/* Controles de cantidad */}
                                     <button onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)} className="p-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200"><Minus size={16} /></button>
                                     <span className="w-8 text-center font-medium">{item.cantidad}</span>
                                     <button onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)} disabled={item.cantidad >= item.producto.stock} className="p-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 disabled:bg-gray-200 disabled:text-gray-400"><Plus size={16} /></button>
                                     <button onClick={() => quitarDelCarrito(item.producto.id)} className="p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 ml-2" title="Quitar del carrito"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-10">Tu carrito está vacío.</p>
                    )}
                </div>

                {/* Total y Botón Finalizar */}
                {carrito.length > 0 && (
                    <div className="border-t pt-4 mt-auto">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-lg font-semibold text-gray-800">Total:</span>
                            <span className="text-xl font-bold text-blue-700">{formatPrice(totalCarrito)}</span>
                        </div>
                        <button
                            onClick={handleFinalizarVenta}
                            disabled={isLoading || carrito.length === 0 || ((userRole === 'VEN' || userRole === 'ADM') && !clienteSeleccionadoId)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ShoppingCart size={20} />}
                            {isLoading ? 'Procesando...' : 'Finalizar Venta'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PuntoDeVenta;