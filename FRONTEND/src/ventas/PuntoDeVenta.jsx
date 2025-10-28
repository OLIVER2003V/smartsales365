// src/ventas/PuntoDeVenta.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/producto'; // API para obtener productos
import { getClientes } from '../api/cliente';   // API para obtener clientes (para Vendedor)
import { createVenta } from '../api/venta';     // API para crear la venta

// Iconos simples
const SearchIcon = () => {/* SVG Lupa */};
const PlusIcon = () => {/* SVG + */};
const MinusIcon = () => {/* SVG - */};
const TrashIcon = () => {/* SVG Papelera */};
const SpinnerIcon = () => {/* SVG Spinner */};
const UserIcon = () => {/* SVG Usuario */};
const CartIcon = () => {/* SVG Carrito */};

const PuntoDeVenta = ({ token, userRole }) => { // Recibe el rol del usuario logueado
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [clientesDisponibles, setClientesDisponibles] = useState([]); // Solo para Vendedor/Admin
    const [carrito, setCarrito] = useState([]); // { producto: {}, cantidad: n }
    const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('');
    const [searchTermProductos, setSearchTermProductos] = useState('');
    const [searchTermClientes, setSearchTermClientes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // Carga inicial de productos y clientes (si es Vendedor/Admin)
    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        setMessage('');
        try {
            const [listaProductos, listaClientes] = await Promise.all([
                getProducts(token),
                (userRole === 'VEN' || userRole === 'ADM') ? getClientes(token) : Promise.resolve([]) // Solo carga clientes si es Vendedor/Admin
            ]);
            setProductosDisponibles(listaProductos);
            setClientesDisponibles(listaClientes);
            setMessage(`✅ Datos cargados: ${listaProductos.length} productos.`);
        } catch (error) {
            setMessage('❌ Error al cargar datos iniciales.');
             if (error.response?.status === 401) { setTimeout(() => navigate('/', { replace: true }), 1500); }
        } finally {
            setIsLoading(false);
        }
    }, [token, userRole, navigate]);

    useEffect(() => {
        if (!token) { navigate('/', { replace: true }); return; }
        loadInitialData();
    }, [token, navigate, loadInitialData]);

    // Productos filtrados para mostrar
    const filteredProductos = useMemo(() => {
        if (!productosDisponibles) return [];
        const lowerSearch = searchTermProductos.toLowerCase();
        return productosDisponibles.filter(p =>
            p.nombre.toLowerCase().includes(lowerSearch) ||
            p.marca.toLowerCase().includes(lowerSearch) ||
            p.categoria.toLowerCase().includes(lowerSearch)
        );
    }, [searchTermProductos, productosDisponibles]);

    // Clientes filtrados para mostrar (Vendedor/Admin)
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
                // Aumentar cantidad si hay stock
                if (existente.cantidad < producto.stock) {
                    return prev.map(item =>
                        item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
                    );
                } else {
                    setMessage(`⚠️ Stock máximo alcanzado para ${producto.nombre}`);
                    return prev; // No añadir más si no hay stock
                }
            } else {
                 // Añadir nuevo producto si hay stock
                 if (producto.stock > 0) {
                     return [...prev, { producto: producto, cantidad: 1 }];
                 } else {
                     setMessage(`⚠️ ${producto.nombre} está agotado.`);
                     return prev; // No añadir si no hay stock
                 }
            }
        });
        setMessage(''); // Limpiar mensaje al añadir
    };

    const quitarDelCarrito = (productoId) => {
        setCarrito(prev => prev.filter(item => item.producto.id !== productoId));
    };

    const actualizarCantidad = (productoId, nuevaCantidad) => {
        setCarrito(prev => prev.map(item => {
            if (item.producto.id === productoId) {
                const cantidadValidada = Math.max(1, Math.min(nuevaCantidad, item.producto.stock)); // Asegura cantidad >= 1 y <= stock
                if (nuevaCantidad > item.producto.stock) setMessage(`⚠️ Stock máximo (${item.producto.stock}) para ${item.producto.nombre}`);
                return { ...item, cantidad: cantidadValidada };
            }
            return item;
        }));
         if(nuevaCantidad <=0) quitarDelCarrito(productoId); // Eliminar si la cantidad llega a 0 o menos
    };

    // Calcular total del carrito
    const totalCarrito = useMemo(() => {
        return carrito.reduce((sum, item) => sum + (item.cantidad * item.producto.precio), 0);
    }, [carrito]);

    // --- Lógica de Finalizar Venta ---
    const handleFinalizarVenta = async () => {
        if (carrito.length === 0) {
            setMessage('🛒 El carrito está vacío.');
            return;
        }
        // Validar selección de cliente si es Vendedor/Admin
        if ((userRole === 'VEN' || userRole === 'ADM') && !clienteSeleccionadoId) {
            setMessage('👤 Por favor, selecciona un cliente para la venta.');
            return;
        }

        setIsLoading(true);
        setMessage('Procesando venta...');

        // Preparar datos para la API
        const ventaData = {
            // Si es Cliente, el backend asociará la venta (no necesitamos enviar 'cliente')
            // Si es Vendedor/Admin, enviamos el ID del cliente seleccionado
            cliente: (userRole === 'VEN' || userRole === 'ADM') ? clienteSeleccionadoId : null,
            detalles: carrito.map(item => ({
                producto: item.producto.id,
                cantidad: item.cantidad
                // precio_unitario se toma del producto en el backend al momento de crear
            }))
        };

        try {
            const ventaCreada = await createVenta(token, ventaData);
            setMessage(`✅ Venta #${ventaCreada.id} registrada exitosamente! Total: Bs ${ventaCreada.total}`);
            // Limpiar estado después de la venta
            setCarrito([]);
            setClienteSeleccionadoId('');
            // Podríamos refrescar la lista de productos para actualizar stock,
            // pero es mejor hacerlo al salir/volver a entrar a la vista por eficiencia.
            // refreshProducts();
        } catch (error) {
            const errorMsg = error.response?.data?.detail || Object.values(error.response?.data || {})[0]?.[0] || 'Error al procesar la venta.';
            setMessage(`❌ Error: ${errorMsg}`);
        } finally {
            setIsLoading(false);
        }
    };
const AlertMessage = ({ msg }) => {
    if (!msg) return null;
    const isError = msg.includes('❌') || msg.includes('⚠️'); // Incluye advertencias
    const bgColor = isError ? 'bg-red-50' : 'bg-green-50';
    const textColor = isError ? 'text-red-700' : 'text-green-700';
    const borderColor = isError ? 'border-red-500' : 'border-green-500';
    return (
        <div className={`p-3 text-sm rounded-lg font-medium border-l-4 ${bgColor} ${textColor} ${borderColor} shadow-sm`}>
            {msg}
        </div>
    );
};
    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* --- Columna 1 y 2: Selección de Productos y Clientes --- */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md space-y-6">
                {/* Buscador de Productos */}
                <div className="relative">
                    <input type="text" placeholder="Buscar productos..." value={searchTermProductos} onChange={(e) => setSearchTermProductos(e.target.value)} className="input-base w-full pl-10 pr-4 py-2"/>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
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
                                    <p className="text-sm text-blue-600 font-medium">Bs {Number(p.precio).toFixed(2)}</p>
                                    <p className={`text-xs ${p.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>Stock: {p.stock}</p>
                                </div>
                                <button
                                    onClick={() => agregarAlCarrito(p)}
                                    disabled={p.stock <= 0}
                                    className="btn-icon bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed px-3 py-1 rounded-full text-sm"
                                >
                                    <PlusIcon /> Añadir
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
                            <input type="text" placeholder="Buscar cliente por nombre, apellido, email..." value={searchTermClientes} onChange={(e) => setSearchTermClientes(e.target.value)} className="input-base w-full pl-10 pr-4 py-2"/>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon /></div>
                        </div>
                        <select
                            value={clienteSeleccionadoId}
                            onChange={(e) => setClienteSeleccionadoId(e.target.value)}
                            className="input-base w-full"
                        >
                            <option value="">-- Selecciona un cliente --</option>
                            {filteredClientes.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre} {c.apellido} ({c.email})</option>
                            ))}
                        </select>
                        {/* Podrías añadir un botón "+ Nuevo Cliente" que abra un modal/formulario */}
                    </div>
                )}
            </div>

            {/* --- Columna 3: Carrito de Compras --- */}
            <div className="bg-white p-6 rounded-lg shadow-md space-y-4 flex flex-col">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 border-b pb-3"><CartIcon /> Carrito de Compra</h2>

                {/* Mensaje de feedback */}
                {message && <AlertMessage msg={message} />}

                {/* Lista de Items en el Carrito */}
                <div className="flex-grow overflow-y-auto max-h-[50vh] pr-2 space-y-4">
                    {carrito.length > 0 ? (
                        carrito.map(item => (
                            <div key={item.producto.id} className="flex justify-between items-start border-b pb-3">
                                <div>
                                    <p className="font-medium text-gray-800">{item.producto.nombre}</p>
                                    <p className="text-xs text-gray-500">Bs {Number(item.producto.precio).toFixed(2)} x {item.cantidad}</p>
                                    <p className="text-sm font-semibold text-blue-700">Subtotal: Bs {(item.cantidad * item.producto.precio).toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                     {/* Controles de cantidad */}
                                     <button onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)} className="btn-icon-round bg-red-100 text-red-700 hover:bg-red-200"><MinusIcon /></button>
                                     <span className="w-8 text-center font-medium">{item.cantidad}</span>
                                     <button onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)} disabled={item.cantidad >= item.producto.stock} className="btn-icon-round bg-green-100 text-green-700 hover:bg-green-200 disabled:bg-gray-200 disabled:text-gray-400"><PlusIcon /></button>
                                     <button onClick={() => quitarDelCarrito(item.producto.id)} className="btn-icon-round bg-gray-200 text-gray-600 hover:bg-gray-300 ml-2" title="Quitar del carrito"><TrashIcon /></button>
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
                            <span className="text-xl font-bold text-blue-700">Bs {totalCarrito.toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handleFinalizarVenta}
                            disabled={isLoading || carrito.length === 0 || ((userRole === 'VEN' || userRole === 'ADM') && !clienteSeleccionadoId)}
                            className="w-full btn btn-success flex items-center justify-center gap-2 disabled:bg-gray-400"
                        >
                            {isLoading ? <SpinnerIcon /> : <CartIcon />}
                            {isLoading ? 'Procesando...' : 'Finalizar Venta'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PuntoDeVenta;

