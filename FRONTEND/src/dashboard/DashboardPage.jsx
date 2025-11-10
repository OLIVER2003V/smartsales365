// src/dashboard/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    getPrediccionesVentas, 
    triggerModelTraining, 
    getDashboardKPIs,
    getHistorialResumen,
    getProductosBajaRotacion 
} from '../api/analitica';
import { getCategorias } from '../api/categoria';
import { getProductos } from '../api/producto';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, BarChart, Bar
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import toast from 'react-hot-toast';

// --- Iconos de Lucide ---
import { 
    Loader2, Train, Download, DollarSign, Box, List, Calendar, 
    BarChart3, History, TrendingDown, AlertTriangle, CheckCircle, 
    Info, SlidersHorizontal, X
} from 'lucide-react';

// --- Colores de Tailwind para Gráficos ---
const colorIndigo = '#6366F1';       // indigo-500
const colorIndigoLight = '#C7D2FE';  // indigo-200
const colorEmerald = '#10B981';      // emerald-500

const SpinnerIcon = (props) => (
    <Loader2 className={`animate-spin ${props.className || 'h-5 w-5'}`} {...props} />
);

// --- ✨ KpiCard Rediseñada ---
const KpiCard = ({ title, value, icon, isLoading }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 flex items-center justify-between transition hover:shadow-xl">
        {isLoading ? (
            <>
                <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-3 animate-pulse"></div>
                    <div className="h-8 bg-slate-300 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse"></div>
            </>
        ) : (
            <>
                <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                    <p className="text-3xl font-bold text-slate-900">{value}</p>
                </div>
                <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full">
                    {React.cloneElement(icon, { size: 24 })}
                </div>
            </>
        )}
    </div>
);

// --- ✨ AlertMessage Rediseñada ---
const AlertMessage = ({ msg, type = 'error' }) => {
    let config = {
        icon: <Info size={18} />,
        styles: 'bg-blue-50 text-blue-700 border-blue-200'
    };
    if (type === 'error') {
        config = { icon: <AlertTriangle size={18} />, styles: 'bg-red-50 text-red-700 border-red-200' };
    } else if (type === 'success') {
        config = { icon: <CheckCircle size={18} />, styles: 'bg-green-50 text-green-700 border-green-200' };
    }
    return (
        <div className={`border p-4 rounded-lg flex items-center gap-3 ${config.styles}`} role="alert">
            <div className="flex-shrink-0">{config.icon}</div>
            <p className="text-sm font-medium">{msg}</p>
        </div>
    );
};

// --- Formateador y Tooltips ---
const formatPrice = (price) =>
    Number(price).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });

const formatYAxis = (tickItem) =>
    `Bs ${new Intl.NumberFormat('es-BO').format(tickItem)}`;

const CustomAreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-200 rounded-md shadow-lg opacity-90">
                <p className="font-semibold text-sm text-slate-700">{`Periodo: ${label}`}</p>
                <p className="text-indigo-600 text-sm">{`Venta Prevista: ${formatPrice(payload[0].value)}`}</p>
            </div>
        );
    }
    return null;
};

const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-200 rounded-md shadow-lg opacity-90">
                <p className="font-semibold text-sm text-slate-700">{`Periodo: ${label}`}</p>
                <p style={{ color: colorEmerald }} className="text-sm">
                    {`Total Vendido: ${formatPrice(payload[0].value)}`}
                </p>
            </div>
        );
    }
    return null;
};

// --- ✨ DataTable Estilizada ---
const DataTable = ({ data, columns, isLoading, emptyMessage = 'No hay datos disponibles para mostrar.' }) => {
    if (isLoading) {
        return (
            <div className="text-center py-4">
                <SpinnerIcon className="text-slate-500 inline-block" />
                <span className="ml-2 text-slate-500">Cargando tabla...</span>
            </div>
        );
    }
    if (!data || data.length === 0) {
        return <AlertMessage msg={emptyMessage} type="info" />;
    }
    return (
        <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {data.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors duration-150">
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className="px-6 py-4 whitespace-nowrap text-sm text-slate-800"
                                >
                                    {col.formatter ? col.formatter(item[col.key]) : item[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- ✨ BajaRotacionWidget en tabla ---
const BajaRotacionWidget = ({ data, isLoading }) => {
    const columns = [
        {
            key: 'producto',
            header: 'Producto',
            formatter: (prod) => (
                <div className="flex items-center gap-3 min-w-0">
                    <img
                        src={
                            prod.imagen_url ||
                            'https://placehold.co/80x80/EFEFEF/AAAAAA?text=Sin+Imagen'
                        }
                        alt={prod.nombre}
                        className="h-10 w-10 object-contain rounded-md border border-slate-200 bg-slate-50"
                    />
                    <div className="min-w-0">
                        <p
                            className="text-sm font-semibold text-slate-800 truncate"
                            title={prod.nombre}
                        >
                            {prod.nombre}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{prod.marca}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'stock',
            header: 'Stock Actual',
            formatter: (stock) => (
                <span className="text-sm font-medium text-slate-700">{stock}</span>
            )
        },
        {
            key: 'total_vendido',
            header: 'Ventas (90d)',
            formatter: (total) => (
                <span className="text-sm font-bold text-red-600">
                    {total} {total === 1 ? 'vendido' : 'vendidos'}
                </span>
            )
        }
    ];

    const tableData = data
        ? data.map((item) => ({
              producto: {
                  imagen_url: item.imagen_url,
                  nombre: item.nombre,
                  marca: item.marca
              },
              stock: item.stock,
              total_vendido: item.total_vendido
          }))
        : [];

    return (
        <div className="mt-10">
            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingDown className="text-amber-500" />
                Productos de Baja Rotación (Últimos 90 días)
            </h3>
            <DataTable
                data={tableData}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="¡Buenas noticias! Todos los productos han rotado."
            />
        </div>
    );
};

// ================================
// --- VISTA #1: PREDICCIONES ---
// ================================
const VistaFuturo = ({ onTrainModel, isTraining, kpis }) => {
    const { token } = useAuth();
    const [predicciones, setPredicciones] = useState(null);
    const [diasAPredecir, setDiasAPredecir] = useState(30);
    const [isLoadingChart, setIsLoadingChart] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [xAxisConfig, setXAxisConfig] = useState({
        angle: 0,
        height: 30,
        textAnchor: 'middle',
        interval: 'auto'
    });

    const loadPredictions = useCallback(
        async (dias) => {
            if (!token) return;
            setIsLoadingChart(true);
            setMessage(`Generando predicción para ${dias} días...`);
            setMessageType('info');
            setPredicciones(null);

            try {
                const data = await getPrediccionesVentas(token, dias);
                let formattedData;

                if (dias > 90) {
                    // Agrupar por mes-año
                    const monthlyData = {};
                    data.forEach((item) => {
                        const monthYear = item.fecha.substring(0, 7);
                        if (!monthlyData[monthYear]) {
                            monthlyData[monthYear] = 0;
                        }
                        monthlyData[monthYear] += item.prediccion_total_bs;
                    });

                    formattedData = Object.keys(monthlyData)
                        .sort()
                        .map((monthYear) => {
                            const [year, month] = monthYear.split('-');
                            const dateObj = new Date(year, parseInt(month) - 1, 1);
                            const monthName = dateObj
                                .toLocaleString('es-BO', { month: 'short' })
                                .replace('.', '');
                            const yearShort = dateObj.toLocaleString('es-BO', { year: '2-digit' });
                            return {
                                fecha: `${monthName}-${yearShort}`,
                                Ventas_Previstas:
                                    Math.round(monthlyData[monthYear] * 100) / 100
                            };
                        });

                    setXAxisConfig({
                        angle: 0,
                        height: 30,
                        textAnchor: 'middle',
                        interval: 0
                    });
                } else {
                    formattedData = data.map((item) => ({
                        fecha: item.fecha.substring(dias > 30 ? 5 : 0),
                        Ventas_Previstas: item.prediccion_total_bs
                    }));

                    if (dias > 30) {
                        setXAxisConfig({
                            angle: -35,
                            height: 50,
                            textAnchor: 'end',
                            interval: 'auto'
                        });
                    } else {
                        setXAxisConfig({
                            angle: 0,
                            height: 30,
                            textAnchor: 'middle',
                            interval: 'auto'
                        });
                    }
                }

                setPredicciones(formattedData);
                setMessage('');
            } catch (error) {
                console.error('Error al cargar predicciones:', error);
                setMessage(error.error || 'Error al cargar predicciones.');
                setMessageType('error');
            } finally {
                setIsLoadingChart(false);
            }
        },
        [token]
    );

    useEffect(() => {
        loadPredictions(diasAPredecir);
    }, [diasAPredecir, loadPredictions]);

    const setRange = (dias) => {
        setDiasAPredecir(dias);
    };

    const generatePDF_Futuro = () => {
        if (!predicciones || !kpis) {
            toast.error('Los datos aún no están listos.');
            return;
        }

        const doc = new jsPDF();
        const fechaGeneracion = new Date().toLocaleString('es-BO');
        let finalY = 0;

        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Reporte de Predicción de Ventas', 14, 22);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generado el: ${fechaGeneracion}`, 14, 30);

        const rangoTexto =
            diasAPredecir === 90
                ? '3 Meses'
                : diasAPredecir === 180
                ? '6 Meses'
                : diasAPredecir === 365
                ? '1 Año'
                : `${diasAPredecir} Días`;

        doc.text(`Periodo de Predicción: Próximos ${rangoTexto}`, 14, 35);
        finalY = 40;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Indicadores Clave (KPIs)', 14, finalY + 15);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const kpiText = [
            `Ventas Totales (Histórico): ${formatPrice(kpis.total_historico_bs)}`,
            `Ventas del Día (Hoy): ${formatPrice(kpis.total_hoy_bs)}`,
            `Total de Productos Activos: ${kpis.total_productos}`,
            `Total de Órdenes Completadas: ${kpis.total_ordenes}`
        ];
        doc.text(kpiText, 16, finalY + 23);
        finalY = finalY + 23 + kpiText.length * 5;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Tabla de Predicción (${rangoTexto})`, 14, finalY + 15);

        const predColumns = ['Periodo', 'Ventas Previstas (Bs)'];
        const predRows = predicciones.map((item) => [
            item.fecha,
            formatPrice(item.Ventas_Previstas)
        ]);

        autoTable(doc, {
            head: [predColumns],
            body: predRows,
            startY: finalY + 18,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] } // indigo
        });

        finalY = doc.lastAutoTable.finalY;

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(
                `Página ${i} de ${pageCount}`,
                doc.internal.pageSize.width - 25,
                doc.internal.pageSize.height - 10
            );
        }

        doc.save(
            `Reporte_Prediccion_${rangoTexto.replace(' ', '_')}_${new Date()
                .toISOString()
                .split('T')[0]}.pdf`
        );
        toast.success('Generando PDF de Predicciones...');
    };

    const tableColumns = [
        { key: 'fecha', header: 'Periodo' },
        {
            key: 'Ventas_Previstas',
            header: 'Ventas Previstas (Bs)',
            formatter: formatPrice
        }
    ];

    return (
        <div className="space-y-6">
            {/* Controles y Botones */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-2xl font-semibold text-slate-900">
                    Predicción de Ventas Futuras
                </h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => onTrainModel(false)}
                        disabled={isTraining || isLoadingChart}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-white shadow-sm w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
                    >
                        {isTraining ? (
                            <SpinnerIcon className="text-white" />
                        ) : (
                            <Train size={18} />
                        )}
                        {isTraining ? 'Entrenando...' : 'Re-entrenar'}
                    </button>
                    <button
                        onClick={generatePDF_Futuro}
                        disabled={!predicciones || !kpis}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-white shadow-sm w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
                    >
                        <Download size={18} /> Descargar PDF
                    </button>
                </div>
            </div>

            {/* Rango de Fechas */}
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-200">
                <span className="text-sm font-medium text-slate-600 mr-2">
                    Ver predicción para:
                </span>
                {[30, 90, 180, 365].map((dias) => (
                    <button
                        key={dias}
                        onClick={() => setRange(dias)}
                        disabled={isLoadingChart || isTraining}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                            diasAPredecir === dias
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-slate-200 text-slate-700 hover:bg-indigo-100 disabled:opacity-50'
                        } transition`}
                    >
                        {dias === 30 && '30 Días'}
                        {dias === 90 && '3 Meses'}
                        {dias === 180 && '6 Meses'}
                        {dias === 365 && '1 Año'}
                    </button>
                ))}
            </div>

            {message && messageType === 'error' && (
                <AlertMessage msg={message} type="error" />
            )}

            {/* Gráfico */}
            <div className="relative h-[400px]">
                {(isLoadingChart || isTraining) && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/75 rounded-lg">
                        <div className="text-center">
                            <SpinnerIcon className="text-indigo-600 inline-block w-8 h-8" />
                            <p className="text-slate-600 mt-2">
                                {isTraining
                                    ? 'Entrenando modelo...'
                                    : message || 'Cargando...'}
                            </p>
                        </div>
                    </div>
                )}

                {!isLoadingChart &&
                    !isTraining &&
                    predicciones &&
                    predicciones.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={predicciones}
                                margin={{
                                    top: 10,
                                    right: 10,
                                    left: 20,
                                    bottom: xAxisConfig.height - 10
                                }}
                            >
                                <defs>
                                    <linearGradient
                                        id="colorVentas"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor={colorIndigo}
                                            stopOpacity={0.8}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor={colorIndigoLight}
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="fecha"
                                    tick={{ fontSize: 11 }}
                                    {...xAxisConfig}
                                    axisLine={false}
                                    tickLine={false}
                                    stroke="#64748B"
                                />
                                <YAxis
                                    tickFormatter={formatYAxis}
                                    tick={{ fontSize: 11 }}
                                    width={90}
                                    axisLine={false}
                                    tickLine={false}
                                    stroke="#64748B"
                                />
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e5e7eb"
                                    vertical={false}
                                />
                                <Tooltip content={<CustomAreaTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Area
                                    type="monotone"
                                    dataKey="Ventas_Previstas"
                                    stroke={colorIndigo}
                                    fillOpacity={1}
                                    fill="url(#colorVentas)"
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 5, strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}

                {!isLoadingChart &&
                    !isTraining &&
                    (!predicciones || predicciones.length === 0) && (
                        <div className="flex items-center justify-center h-full">
                            <AlertMessage
                                msg="No hay datos de predicción para mostrar."
                                type="info"
                            />
                        </div>
                    )}
            </div>

            {/* Tabla de Datos */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold text-slate-700 mb-3">
                    Datos Detallados de la Predicción
                </h3>
                <DataTable
                    data={predicciones}
                    columns={tableColumns}
                    isLoading={isLoadingChart || isTraining}
                    emptyMessage="No hay datos de predicción para mostrar."
                />
            </div>
        </div>
    );
};

// ================================
// --- VISTA #2: HISTÓRICO ---
// ================================
const VistaHistorico = ({ kpis, bajaRotacionData, bajaRotacionLoading }) => {
    const { token } = useAuth();
    const [historialVentas, setHistorialVentas] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [productos, setProductos] = useState([]);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [filtros, setFiltros] = useState({
        fecha_inicio: '',
        fecha_fin: '',
        producto: '',
        categoria: ''
    });

    // Filtros ocultos por defecto
    const [showFilters, setShowFilters] = useState(false);

    const labelStyles = 'block text-sm font-medium text-slate-700 mb-1';
    const inputStyles =
        'block w-full px-3 py-2 border border-slate-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm';

    // Cargar datos para selects
    useEffect(() => {
        const loadFilterData = async () => {
            if (!token) return;
            try {
                const [prodsData, catData] = await Promise.all([
                    getProductos(token),
                    getCategorias(token)
                ]);
                setProductos(prodsData);
                setProductosFiltrados(prodsData);
                setCategorias(catData);
            } catch (error) {
                console.error('Error al cargar filtros:', error);
            }
        };
        loadFilterData();
    }, [token]);

    // Re-filtrado de productos cuando cambia la categoría
    useEffect(() => {
        if (filtros.categoria === '') {
            setProductosFiltrados(productos);
        } else {
            const catIdSeleccionado = Number(filtros.categoria);
            const categoriaSeleccionada = categorias.find(
                (c) => c.id === catIdSeleccionado
            );

            if (categoriaSeleccionada) {
                // 🔁 Mantengo la lógica original que ya te funcionaba:
                // productos.filter(p => p.categoria === categoriaSeleccionada.nombre)
                const filtrados = productos.filter(
                    (p) => p.categoria === categoriaSeleccionada.nombre
                );

                setProductosFiltrados(filtrados);

                const productoActualValido = filtrados.some(
                    (p) => p.id.toString() === filtros.producto
                );
                if (!productoActualValido) {
                    setFiltros((prev) => ({ ...prev, producto: '' }));
                }
            } else {
                setProductosFiltrados(productos);
            }
        }
    }, [filtros.categoria, productos, filtros.producto, categorias]);

    const loadHistory = useCallback(
        async (currentFilters) => {
            if (!token) return;
            setIsLoading(true);
            setMessage('');
            try {
                const data = await getHistorialResumen(token, currentFilters);
                setHistorialVentas(data);
            } catch (error) {
                console.error('Error al cargar historial:', error);
                setMessage('Error al cargar historial de ventas.');
            } finally {
                setIsLoading(false);
            }
        },
        [token]
    );

    // Carga inicial SIN filtros (una sola vez)
    useEffect(() => {
        if (token) {
            loadHistory({});
        }
    }, [loadHistory, token]);

    const handleApplyFilters = () => {
        loadHistory(filtros);
    };

    const handleFilterChange = (e) => {
        setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const generatePDF_Historico = () => {
        if (!historialVentas || !kpis || !categorias || !productos) {
            toast.error('Los datos aún no están listos para exportar.');
            return;
        }

        const doc = new jsPDF();
        const fechaGeneracion = new Date().toLocaleString('es-BO');
        let finalY = 0;

        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Reporte de Análisis Histórico', 14, 22);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generado el: ${fechaGeneracion}`, 14, 30);
        finalY = 35;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Filtros Aplicados', 14, finalY + 15);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const filtroText = [];
        filtroText.push(
            `- Fechas: ${filtros.fecha_inicio || 'Inicio'} al ${
                filtros.fecha_fin || 'Fin'
            }`
        );
        const catSeleccionada = categorias.find(
            (c) => c.id.toString() === filtros.categoria
        );
        filtroText.push(
            `- Categoría: ${catSeleccionada ? catSeleccionada.nombre : 'Todas'}`
        );
        const prodSeleccionado = productos.find(
            (p) => p.id.toString() === filtros.producto
        );
        filtroText.push(
            `- Producto: ${prodSeleccionado ? prodSeleccionado.nombre : 'Todos'}`
        );

        doc.text(filtroText, 16, finalY + 23);
        finalY = finalY + 23 + filtroText.length * 5;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Indicadores Clave (KPIs)', 14, finalY + 15);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const kpiText = [
            `Ventas Totales (Histórico): ${formatPrice(kpis.total_historico_bs)}`,
            `Ventas del Día (Hoy): ${formatPrice(kpis.total_hoy_bs)}`,
            `Productos Activos: ${kpis.total_productos}`,
            `Órdenes Completadas: ${kpis.total_ordenes}`
        ];
        doc.text(kpiText, 16, finalY + 23);
        finalY = finalY + 23 + kpiText.length * 5;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Tabla de Ventas Históricas (Filtradas)', 14, finalY + 15);

        const histColumns = ['Periodo', 'Total Vendido (Bs)', 'Nro. Ventas'];
        const histRows = historialVentas.map((item) => [
            item.periodo,
            formatPrice(item.Total_Vendido),
            item.Numero_de_Ventas
        ]);

        autoTable(doc, {
            head: [histColumns],
            body: histRows,
            startY: finalY + 18,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] } // emerald
        });

        finalY = doc.lastAutoTable.finalY;
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(
                `Página ${i} de ${pageCount}`,
                doc.internal.pageSize.width - 25,
                doc.internal.pageSize.height - 10
            );
        }

        doc.save(
            `Reporte_Historico_Filtrado_${new Date()
                .toISOString()
                .split('T')[0]}.pdf`
        );
        toast.success('Generando PDF Histórico...');
    };

    const tableColumns = [
        { key: 'periodo', header: 'Periodo' },
        {
            key: 'Total_Vendido',
            header: 'Total Vendido (Bs)',
            formatter: formatPrice
        },
        { key: 'Numero_de_Ventas', header: 'Nro. Ventas' }
    ];

    return (
        <div className="space-y-6">
            {/* Controles y Botones */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-2xl font-semibold text-slate-900">
                    Análisis de Ventas Históricas
                </h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {/* Botón de Filtros */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold shadow-sm w-full sm:w-auto transition ${
                            showFilters
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        {showFilters ? <X size={18} /> : <SlidersHorizontal size={18} />}
                        {showFilters ? 'Ocultar Filtros' : 'Filtros Avanzados'}
                    </button>
                    {/* Botón de PDF */}
                    <button
                        onClick={generatePDF_Historico}
                        disabled={!historialVentas || !kpis || isLoading}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-white shadow-sm w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
                    >
                        <Download size={18} /> Descargar PDF
                    </button>
                </div>
            </div>

            {/* Panel de Filtros */}
            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50 shadow-sm items-end">
                    <div>
                        <label htmlFor="fecha_inicio" className={labelStyles}>
                            Desde
                        </label>
                        <input
                            type="date"
                            name="fecha_inicio"
                            id="fecha_inicio"
                            value={filtros.fecha_inicio}
                            onChange={handleFilterChange}
                            className={inputStyles}
                        />
                    </div>
                    <div>
                        <label htmlFor="fecha_fin" className={labelStyles}>
                            Hasta
                        </label>
                        <input
                            type="date"
                            name="fecha_fin"
                            id="fecha_fin"
                            value={filtros.fecha_fin}
                            onChange={handleFilterChange}
                            className={inputStyles}
                        />
                    </div>
                    <div>
                        <label htmlFor="categoria" className={labelStyles}>
                            Categoría
                        </label>
                        <select
                            name="categoria"
                            id="categoria"
                            value={filtros.categoria}
                            onChange={handleFilterChange}
                            className={inputStyles}
                        >
                            <option value="">Todas</option>
                            {categorias.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="producto" className={labelStyles}>
                            Producto
                        </label>
                        <select
                            name="producto"
                            id="producto"
                            value={filtros.producto}
                            onChange={handleFilterChange}
                            className={inputStyles}
                        >
                            <option value="">Todos</option>
                            {productosFiltrados.map((prod) => (
                                <option key={prod.id} value={prod.id}>
                                    {prod.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleApplyFilters}
                        disabled={isLoading}
                        className="flex justify-center items-center w-full px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <SpinnerIcon className="text-white w-5 h-5" />
                        ) : (
                            'Aplicar Filtros'
                        )}
                    </button>
                </div>
            )}

            {message && <AlertMessage msg={message} type="error" />}

            {/* Gráfico */}
            <div className="relative h-[400px]">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/75 rounded-lg">
                        <div className="text-center">
                            <SpinnerIcon className="text-emerald-600 inline-block w-8 h-8" />
                            <p className="text-slate-600 mt-2">
                                Cargando historial...
                            </p>
                        </div>
                    </div>
                )}

                {!isLoading &&
                    historialVentas &&
                    historialVentas.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={historialVentas}
                                margin={{ top: 10, right: 10, left: 20, bottom: 50 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e5e7eb"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="periodo"
                                    tick={{ fontSize: 11 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                    interval={0}
                                    axisLine={false}
                                    tickLine={false}
                                    stroke="#64748B"
                                />
                                <YAxis
                                    tickFormatter={formatYAxis}
                                    tick={{ fontSize: 11 }}
                                    width={90}
                                    axisLine={false}
                                    tickLine={false}
                                    stroke="#64748B"
                                />
                                <Tooltip
                                    content={<CustomBarTooltip />}
                                    cursor={{ fill: 'rgba(209, 250, 229, 0.5)' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar
                                    dataKey="Total_Vendido"
                                    fill={colorEmerald}
                                    name="Total Vendido (Bs)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}

                {!isLoading &&
                    (!historialVentas || historialVentas.length === 0) && (
                        <div className="flex items-center justify-center h-full">
                            <AlertMessage
                                msg="No se encontraron ventas para los filtros seleccionados."
                                type="info"
                            />
                        </div>
                    )}
            </div>

            {/* Tabla de Datos */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold text-slate-700 mb-3">
                    Datos Detallados del Historial (Filtrados)
                </h3>
                <DataTable
                    data={historialVentas}
                    columns={tableColumns}
                    isLoading={isLoading}
                    emptyMessage="No hay datos de historial para mostrar."
                />
            </div>

            {/* Baja rotación dentro de la vista histórica */}
            <BajaRotacionWidget
                data={bajaRotacionData}
                isLoading={bajaRotacionLoading}
            />
        </div>
    );
};

// --- Botón de pestañas ---
const TabButton = ({ label, icon, isActive, onClick }) => {
    const Icon = icon;
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 w-full
                ${
                    isActive
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
        >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
            {label}
        </button>
    );
};

// ================================
// --- PÁGINA PRINCIPAL ---
// ================================
const DashboardPage = () => {
    const { token, user } = useAuth();
    const [kpis, setKpis] = useState(null);
    const [isLoadingKpis, setIsLoadingKpis] = useState(true);
    const [isTraining, setIsTraining] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const navigate = useNavigate();
    const [vistaActiva, setVistaActiva] = useState('historico');

    const [bajaRotacion, setBajaRotacion] = useState(null);
    const [isLoadingBajaRotacion, setIsLoadingBajaRotacion] = useState(true);

    useEffect(() => {
        // Protección de ruta
        if (!user || (user.rol !== 'ADM' && user.rol !== 'VEN')) {
            toast.error('Acceso denegado. Solo Admin o Vendedores.');
            navigate('/');
            return;
        }

        if (token) {
            const loadKpis = async () => {
                setIsLoadingKpis(true);
                try {
                    const kpisData = await getDashboardKPIs(token);
                    setKpis(kpisData);
                } catch (error) {
                    console.error('Error al cargar KPIs:', error);
                    setMessage(error.message || 'Error al cargar KPIs.');
                    setMessageType('error');
                } finally {
                    setIsLoadingKpis(false);
                }
            };

            const loadBajaRotacion = async () => {
                setIsLoadingBajaRotacion(true);
                try {
                    const bajaRotacionData = await getProductosBajaRotacion(
                        token,
                        '90',
                        5
                    );
                    setBajaRotacion(bajaRotacionData);
                } catch (error) {
                    console.error('Error al cargar Baja Rotación:', error);
                    // no mostramos mensaje global
                } finally {
                    setIsLoadingBajaRotacion(false);
                }
            };

            loadKpis();
            loadBajaRotacion();
        }
    }, [token, user, navigate]);

    const handleTrainModel = async () => {
        setIsTraining(true);
        setMessage('Iniciando re-entrenamiento del modelo...');
        setMessageType('info');
        try {
            const result = await triggerModelTraining(token);
            setMessage(result.message || '¡Modelo re-entrenado exitosamente!');
            setMessageType('success');
        } catch (error) {
            setMessage(error.error || `Error al re-entrenar: ${error.message}`);
            setMessageType('error');
        } finally {
            setIsTraining(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 lg:p-8">
            <div className="container mx-auto max-w-7xl space-y-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    Dashboard de Analíticas
                </h1>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Ventas Totales"
                        value={
                            kpis ? formatPrice(kpis.total_historico_bs) : '...'
                        }
                        icon={<DollarSign />}
                        isLoading={isLoadingKpis}
                    />
                    <KpiCard
                        title="Ventas de Hoy"
                        value={kpis ? formatPrice(kpis.total_hoy_bs) : '...'}
                        icon={<Calendar />}
                        isLoading={isLoadingKpis}
                    />
                    <KpiCard
                        title="Productos Activos"
                        value={kpis ? kpis.total_productos : '...'}
                        icon={<Box />}
                        isLoading={isLoadingKpis}
                    />
                    <KpiCard
                        title="Órdenes Entregadas"
                        value={kpis ? kpis.total_ordenes : '...'}
                        icon={<List />}
                        isLoading={isLoadingKpis}
                    />
                </div>

                {/* Alertas de entrenamiento / error */}
                {message &&
                    (messageType === 'error' ||
                        messageType === 'success' ||
                        (isTraining && messageType === 'info')) && (
                        <AlertMessage msg={message} type={messageType} />
                    )}

                {/* Contenedor principal con Tabs */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8">
                    {/* Tabs */}
                    <div className="mb-8 max-w-md">
                        <div className="flex w-full space-x-2 rounded-xl bg-slate-100 p-1.5">
                            <TabButton
                                label="Análisis Histórico"
                                icon={History}
                                isActive={vistaActiva === 'historico'}
                                onClick={() => setVistaActiva('historico')}
                            />
                            <TabButton
                                label="Predicción Futura"
                                icon={BarChart3}
                                isActive={vistaActiva === 'futuro'}
                                onClick={() => setVistaActiva('futuro')}
                            />
                        </div>
                    </div>

                    {/* Contenido */}
                    <div>
                        {vistaActiva === 'futuro' && (
                            <VistaFuturo
                                onTrainModel={handleTrainModel}
                                isTraining={isTraining}
                                kpis={kpis}
                            />
                        )}
                        {vistaActiva === 'historico' && (
                            <VistaHistorico
                                kpis={kpis}
                                bajaRotacionData={bajaRotacion}
                                bajaRotacionLoading={isLoadingBajaRotacion}
                            />
                        )}
                    </div>
                </div>

                <footer className="text-center mt-4 text-slate-500 text-sm">
                    SmartSales365 Analytics Dashboard © {new Date().getFullYear()}
                </footer>
            </div>
        </div>
    );
};

export default DashboardPage;
