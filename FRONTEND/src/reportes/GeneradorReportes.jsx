import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  BrainCircuit,
  Download,
  FileText,
  Table,
  BarChart3,
  Loader2,
  Send,
  Info,
  CheckCircle,
  XCircle,
  Sparkles,
  History,
  Copy,
  Sigma,
  Mic,
  Square,
  Languages,
} from "lucide-react";

// ================== CONFIG ==================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const REPORT_ENDPOINT = `${API_BASE_URL}/api/reportes/generar/`;

// ================== UTILS ==================
const SpinnerIcon = ({ className = "h-5 w-5" }) => (
  <Loader2 className={`animate-spin ${className}`} />
);
const classNames = (...c) => c.filter(Boolean).join(" ");

const isNumeric = (val) => {
  if (typeof val === "number" && isFinite(val)) return true;
  if (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val)) && isFinite(Number(val))) return true;
  return false;
};

const formatPrice = (price) => {
  const num = Number(price);
  if (isNaN(num)) return "-";
  return num.toLocaleString("es-BO", { style: "currency", currency: "BOB" });
};

const AlertMessage = ({ message, type = "info" }) => {
  const icons = { info: <Info size={18} />, success: <CheckCircle size={18} />, error: <XCircle size={18} />, warn: <Info size={18} /> };
  const colors = {
    info: "bg-blue-50 text-blue-700 border-blue-300",
    success: "bg-green-50 text-green-700 border-green-300",
    error: "bg-red-50 text-red-700 border-red-300",
    warn: "bg-yellow-50 text-yellow-700 border-yellow-300",
  };
  return (
    <div className={classNames("flex items-start gap-3 p-4 text-sm rounded-lg border-l-4", colors[type])}>
      <span className="mt-0.5">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
};

const humanize = (key) => key.split("__").pop().replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const formatCellValue = (value, headerKey = "") => {
  if (value === null || value === undefined)
    return <span className="text-gray-400 italic">N/A</span>;
  if (typeof value === "object") return <span className="text-xs text-gray-500">[Objeto]</span>;
  if (typeof value === "string" && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return value;
    }
  }
  const isCurrencyColumn = ["total", "precio", "monto", "ingreso", "valor", "subtotal"].some((c) =>
    headerKey.toLowerCase().includes(c)
  );
  if (isCurrencyColumn && isNumeric(value)) return formatPrice(value);
  if (isNumeric(value)) return Number(value).toLocaleString("es-ES", { maximumFractionDigits: 2 });
  return String(value);
};

const buildFilename = (prefix, prompt, ext) => {
  const clean = (prompt || "reporte")
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ\s_-]/g, "")
    .trim()
    .slice(0, 60)
    .replace(/\s+/g, "-");
  const ts = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  return `${prefix}_${clean || "reporte"}_${ts}.${ext}`;
};

// ================== EXPORTACIÓN CLIENT-SIDE ==================
const exportCSV = (rows, filename) => {
  if (!Array.isArray(rows) || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const raw = r[h];
          const v = typeof raw === "string" ? raw.replaceAll('"', '""') : String(raw ?? "");
          return `"${v}"`;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const exportPDF = async (rows, filename, title = "Reporte SmartSales") => {
  if (!Array.isArray(rows) || !rows.length) return;
  try {
    const jsPDFModule = await import("jspdf");
    const autoTable = await import("jspdf-autotable"); // side-effect registra autoTable
    const { jsPDF } = jsPDFModule;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;

    // Header
    doc.setFontSize(16);
    doc.text(title, marginX, 48);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(new Date().toLocaleString(), marginX, 66);

    const headers = Object.keys(rows[0]);
    const body = rows.map((r) => headers.map((h) => {
      const val = r[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "string" && val.length > 100) return val.slice(0, 100) + "…";
      return typeof val === "object" ? "[Objeto]" : String(val);
    }));

    // Totales simples (para columnas numéricas)
    const totals = {};
    headers.forEach((h) => {
      if (rows.every((r) => isNumeric(r[h]) || r[h] == null)) {
        totals[h] = rows.reduce((acc, r) => acc + (Number(r[h]) || 0), 0);
      }
    });

    // Tabla
    doc.autoTable({
      head: [headers.map(humanize)],
      body,
      startY: 84,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 }, // azul
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: (data) => {
        // Footer con paginación
        const str = `Página ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
      },
    });

    // Fila de Totales
    const totalsRow = headers.map((h, idx) => {
      if (idx === 0) return "Total";
      if (typeof totals[h] === "number") return totals[h].toLocaleString("es-ES", { maximumFractionDigits: 2 });
      return "";
    });
    // Agrega fila de totales si hay al menos un total
    if (Object.keys(totals).length > 0) {
      const lastY = doc.lastAutoTable.finalY || 84;
      doc.autoTable({
        head: [],
        body: [totalsRow],
        startY: lastY + 8,
        styles: { fontSize: 10, fontStyle: "bold" },
        theme: "plain",
      });
    }

    doc.save(filename);
  } catch (e) {
    console.error(e);
    toast.error("Falta instalar dependencias: npm i jspdf jspdf-autotable");
  }
};

// ================== TABLA (con totales y header/footers sticky) ==================
const ReportTable = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <AlertMessage message="No hay datos para mostrar en la tabla." type="info" />;
  }
  const headers = Object.keys(data[0]);

  const numericHeaders = useMemo(() => {
    const candidates = headers.filter((h) => isNumeric(data[0][h]));
    const nonId = candidates.filter((h) => !["id", "pk"].includes(h.toLowerCase()) && !h.toLowerCase().endsWith("_id"));
    return nonId.length ? nonId : candidates;
  }, [data, headers]);

  const totals = useMemo(() => {
    const sums = {};
    numericHeaders.forEach((h) => (sums[h] = data.reduce((acc, r) => acc + (Number(r[h]) || 0), 0)));
    return sums;
  }, [data, numericHeaders]);

  return (
    <div className="overflow-auto mt-4 border rounded-xl shadow-sm bg-white max-h-[70vh]">
      <table className="min-w-full divide-y divide-gray-200 relative">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
              >
                {humanize(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.map((row, idx) => (
            <tr key={idx} className={idx % 2 ? "bg-white" : "bg-slate-50/50 hover:bg-slate-100"}>
              {headers.map((h) => (
                <td key={h} className="px-5 py-3 whitespace-nowrap text-sm text-gray-800 align-top">
                  {formatCellValue(row[h], h)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-100 border-t-2 border-gray-300 sticky bottom-0 z-10">
          <tr>
            {headers.map((h, i) => (
              <td key={`total-${h}`} className="px-5 py-3 whitespace-nowrap text-sm font-bold text-gray-900 align-top">
                {i === 0 ? (
                  <span className="inline-flex items-center gap-1"><Sigma size={14} /> Total:</span>
                ) : numericHeaders.includes(h) ? (
                  formatCellValue(totals[h], h)
                ) : (
                  ""
                )}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ================== GRÁFICO (debajo de la tabla) ==================
const ReportChart = ({ data }) => {
  if (!data || !data.length) return null;
  const sample = data[0];
  const keys = Object.keys(sample);

  const findKey = (candidates, typeCheck, fallback) => {
    for (const c of candidates) {
      const k = keys.find((kk) => kk.toLowerCase().includes(c.toLowerCase()) && typeCheck(sample[kk]));
      if (k) return k;
    }
    const primary = keys.find((k) => typeCheck(sample[k]));
    if (primary) return primary;
    if (fallback) return keys.find((k) => fallback(sample[k]));
    return null;
  };

  const xCandidates = ["nombre", "cliente", "producto", "categoria", "fecha", "mes", "año", "anio", "vendedor", "dia", "username"];
  const moneyCandidates = ["total", "precio", "monto", "ingreso", "valor", "subtotal"];
  const qtyCandidates = ["cantidad", "stock", "unidades", "count", "numero"];

  const nameKey = findKey(xCandidates, (v) => typeof v === "string", (v) => isNumeric(v));
  let dataKey = findKey(moneyCandidates, isNumeric);
  if (!dataKey) dataKey = findKey(qtyCandidates, isNumeric);
  if (!dataKey) dataKey = keys.find((k) => isNumeric(sample[k]) && !["id", "pk"].includes(k.toLowerCase()) && !k.toLowerCase().endsWith("_id"));
  if (!dataKey) dataKey = keys.find((k) => isNumeric(sample[k]));

  if (!nameKey || !dataKey) return <AlertMessage message="Datos no graficables." type="warn" />;

  const isCurrency = moneyCandidates.some((c) => dataKey.toLowerCase().includes(c));
  const fmt = (n) => {
    const v = Number(n);
    if (isNaN(v)) return "-";
    return isCurrency
      ? `Bs ${v.toLocaleString("es-BO", { maximumFractionDigits: 2 })}`
      : v.toLocaleString("es-ES");
  };

  return (
    <div className="mt-6 h-96 w-full border rounded-xl shadow-sm bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 24, left: 12, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey={nameKey}
            tick={{ fontSize: 11 }}
            angle={data.length > 10 ? -40 : 0}
            textAnchor={data.length > 10 ? "end" : "middle"}
            height={data.length > 10 ? 60 : 30}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11 }} width={82} />
          <Tooltip formatter={(v) => [fmt(v), humanize(dataKey)]} labelFormatter={(l) => `${humanize(nameKey)}: ${l}`} contentStyle={{ fontSize: 13, borderRadius: 6 }} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey={dataKey} name={humanize(dataKey)} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ================== MICRÓFONO (SpeechRecognition) ==================
const useSpeechToPrompt = (onFinalText) => {
  const recRef = useRef(null);
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [lang, setLang] = useState("es-ES"); // puedes exponer selector

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    recRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interimText += t + " ";
      }
      if (interimText) setInterim(interimText.trim());
      if (finalText) {
        setInterim("");
        onFinalText(finalText.trim());
      }
    };

    rec.onerror = (ev) => {
      console.warn("Speech error", ev);
      toast.error("Error de micrófono: " + (ev.error || "desconocido"));
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    return () => {
      try { rec.stop(); } catch {}
    };
  }, [lang, onFinalText]);

  const start = () => {
    if (!recRef.current) return;
    try {
      recRef.current.lang = lang;
      recRef.current.start();
      setListening(true);
      toast.success("Grabando… habla ahora");
    } catch (e) {
      console.error(e);
    }
  };
  const stop = () => {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {}
  };

  return { supported, listening, interim, start, stop, lang, setLang };
};

// ================== PRINCIPAL ==================
const presets = [
  "Listado de todas las ventas realizadas",
  "Ventas de octubre de 2025",
  "Ventas entre el 15 y el 25 de octubre de 2025",
  "Total de ventas agrupado por cliente",
  "Cantidad y total por categoría en octubre de 2025",
  "Productos con stock menor a 5",
];

export default function GeneradorReportes() {
  const token = localStorage.getItem("token");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [lastResultType, setLastResultType] = useState(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [history, setHistory] = useState([]);

  const canExport = useMemo(() => Array.isArray(reportData) && reportData.length > 0, [reportData]);

  // Mic: cuando llega texto final, lo ponemos en prompt y disparamos reporte
  const onFinalSpeech = useCallback(
    (txt) => {
      setPrompt(txt);
      // dispara búsqueda automáticamente
      setTimeout(() => handleGenerate(txt), 50);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const mic = useSpeechToPrompt(onFinalSpeech);

  const requestReportAPI = useCallback(
    async (currentPrompt, fmt = "pantalla") => {
      const headers = { Authorization: `Token ${token}` };
      const body = { prompt: currentPrompt, formato: fmt };
      const opts = { headers, responseType: fmt === "pantalla" ? "json" : "blob", validateStatus: (s) => s >= 200 && s < 500 };
      const res = await axios.post(REPORT_ENDPOINT, body, opts);
      if (res.status >= 400) {
        if (fmt === "pantalla") throw new Error(res.data?.error || res.data?.message || `Error ${res.status}`);
        const txt = await res.data.text?.();
        throw new Error(txt || `Error ${res.status}`);
      }
      return res.data;
    },
    [token]
  );

  const handleGenerate = useCallback(
    async (forcedPrompt) => {
      const currentPrompt = (forcedPrompt ?? prompt).trim();
      if (!currentPrompt) return toast.error("Escribe tu solicitud o usa el micrófono.");
      setIsLoading(true);
      setReportData(null);
      setLastResultType(null);
      setLastPrompt("");
      const tId = toast.loading("Interpretando y generando reporte…");
      try {
        const data = await requestReportAPI(currentPrompt, "pantalla");
        setReportData(data);
        setLastPrompt(currentPrompt);
        if (Array.isArray(data) && data.length) {
          setLastResultType("data");
          setHistory((h) => [currentPrompt, ...h.filter((p) => p !== currentPrompt)].slice(0, 6));
          toast.success(`Reporte con ${data.length} filas.`, { id: tId });
        } else {
          setLastResultType("nodata");
          toast("Sin resultados para la consulta.", { id: tId, icon: "ℹ️" });
        }
      } catch (e) {
        console.error(e);
        setLastResultType("error");
        toast.error(e?.message || "Error inesperado", { id: tId });
      } finally {
        setIsLoading(false);
      }
    },
    [prompt, requestReportAPI]
  );

  const copyJSON = async () => {
    if (!canExport) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
      toast.success("JSON copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const downloadCSV = () => {
    if (!canExport) return toast.error("Nada para exportar");
    exportCSV(reportData, buildFilename("reporte_smartsales", lastPrompt, "csv"));
  };

  const downloadPDF = () => {
    if (!canExport) return toast.error("Nada para exportar");
    exportPDF(reportData, buildFilename("reporte_smartsales", lastPrompt, "pdf"), "Reporte SmartSales");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/70 p-6 md:p-8 rounded-2xl shadow-xl border border-white/40 space-y-8">
        {/* Header */}
        <div className="text-center border-b border-gray-200/80 pb-6">
          <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
            <BrainCircuit className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Generador de Reportes IA
          </h1>
          <p className="mt-2 text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
            Escribe o dicta tu consulta. Consultamos la base de datos y mostramos resultados listos para exportar.
          </p>
        </div>

        {/* Prompt + presets + mic */}
        <div className="space-y-4">
          <label htmlFor="prompt" className="block text-base font-semibold text-slate-800">
            Tu solicitud (Prompt)
          </label>
          <textarea
            id="prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej.: Ventas del último mes por cliente | Top 3 productos menos vendidos | Clientes de Cochabamba"
            className="w-full p-4 border border-slate-300 rounded-xl shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder:text-slate-400"
            disabled={isLoading}
          />

          {/* Mic controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Languages size={18} className="text-slate-600" />
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={mic.lang}
                onChange={(e) => mic.setLang(e.target.value)}
                disabled={!mic.supported || mic.listening}
              >
        
                <option value="es-BO">Español (Bolivia)*</option>
                
              </select>
              <span className="text-xs text-slate-500">(*si no existe en tu navegador, usa es-ES)</span>
            </div>

            <div className="flex items-center gap-2">
              {!mic.supported ? (
                <AlertMessage message="Tu navegador no soporta reconocimiento de voz Web Speech API." type="warn" />
              ) : mic.listening ? (
                <button
                  type="button"
                  onClick={mic.stop}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white shadow hover:bg-red-700"
                >
                  <Square size={16} /> Detener
                </button>
              ) : (
                <button
                  type="button"
                  onClick={mic.start}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white shadow hover:bg-emerald-700"
                >
                  <Mic size={16} /> Dictar
                </button>
              )}
              {mic.listening && (
                <span className="text-sm text-emerald-700 animate-pulse">Escuchando… {mic.interim}</span>
              )}
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-sm font-medium text-slate-500 self-center">Sugerencias:</span>
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrompt(p)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
                title="Usar plantilla"
              >
                <Sparkles size={14} className="text-blue-500" /> {p}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-slate-500 flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <History size={16} /> Últimos:
            {history.length ? (
              history.slice(0, 3).map((h, i) => (
                <button
                  key={`${h}-${i}`}
                  onClick={() => setPrompt(h)}
                  className="underline decoration-dotted hover:text-slate-700 truncate"
                  title={h}
                >
                  {h}
                </button>
              ))
            ) : (
              <span className="italic">Sin historial</span>
            )}
          </div>
          <button
            onClick={() => handleGenerate()}
            disabled={isLoading || !prompt.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-slate-400"
          >
            {isLoading ? <SpinnerIcon /> : <Send size={18} />} {isLoading ? "Generando…" : "Generar Reporte"}
          </button>
        </div>

        {/* Results */}
        {(isLoading || lastResultType) && (
          <div className="mt-8 pt-8 border-t border-gray-200/80 space-y-8">
            <h2 className="text-2xl font-bold text-slate-900">Resultados</h2>

            {isLoading && (
              <div className="flex justify-center items-center py-12 text-slate-600">
                <SpinnerIcon className="h-8 w-8 text-blue-600" />
                <span className="ml-3 text-lg">Generando…</span>
              </div>
            )}

            {!isLoading && lastResultType === "error" && (
              <AlertMessage message="No se pudo generar el reporte. Intenta otra solicitud." type="error" />
            )}
            {!isLoading && lastResultType === "nodata" && (
              <AlertMessage message={`La consulta "${lastPrompt.substring(0, 50)}..." no devolvió resultados.`} type="info" />
            )}

            {!isLoading && lastResultType === "data" && Array.isArray(reportData) && reportData.length > 0 && (
              <div className="space-y-10">
                {/* Tabla primero */}
                <section>
                  <h3 className="text-xl font-semibold mb-3 text-slate-900 flex items-center gap-2">
                    <Table size={20} /> Datos Completos
                  </h3>
                  <ReportTable data={reportData} />
                </section>

                {/* Botones de export (cliente) */}
                <section className="pt-2">
                  <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 mr-3">Exportar datos actuales:</span>
                    <button
                      onClick={copyJSON}
                      disabled={!canExport}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-300 bg-white text-gray-700 font-medium rounded-md hover:bg-gray-50 text-sm disabled:opacity-50"
                    >
                      <Copy size={16} /> JSON
                    </button>
                    <button
                      onClick={downloadCSV}
                      disabled={!canExport}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-300 bg-white text-gray-700 font-medium rounded-md hover:bg-gray-50 text-sm disabled:opacity-50"
                    >
                      <Download size={16} /> CSV
                    </button>
                    <button
                      onClick={downloadPDF}
                      disabled={!canExport}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
                    >
                      <FileText size={16} /> PDF
                    </button>
                  </div>
                </section>

                {/* Gráfico después de la tabla */}
                <section>
                  <h3 className="text-xl font-semibold mb-3 text-slate-900 flex items-center gap-2">
                    <BarChart3 size={20} /> Visualización
                  </h3>
                  <ReportChart data={reportData} />
                </section>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
