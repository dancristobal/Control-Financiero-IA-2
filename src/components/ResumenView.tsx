import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Building2,
  AlertTriangle,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Filter,
  FileText,
  DollarSign,
  Layers,
  ChevronRight,
  Printer
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { Factura, Proveedor, Alerta, DatosNegocio, DEFAULT_DATOS_NEGOCIO } from '../types';

interface ResumenViewProps {
  facturas: Factura[];
  proveedores: Proveedor[];
  alertas: Alerta[];
  datosNegocio?: DatosNegocio;
  onNavigate: (tab: string) => void;
  onOpenUpload: () => void;
  onOpenAnalysis: () => void;
  onOpenPdfReport: () => void;
}

type PeriodFilter = '7d' | '30d' | 'trimestre' | 'ano' | 'personalizado';

const CATEGORY_COLORS: Record<string, string> = {
  'Materias Primas': '#f43f5e', // coral/rose
  'Suministros y Energía': '#0ea5e9', // sky blue
  'Envases y Embalajes': '#f59e0b', // amber
  'Logística y Transporte': '#10b981', // emerald
  'Mantenimiento y Maquinaria': '#8b5cf6', // purple
  'Servicios y Gestión': '#ec4899', // pink
};

export const ResumenView: React.FC<ResumenViewProps> = ({
  facturas,
  proveedores,
  alertas,
  datosNegocio,
  onNavigate,
  onOpenUpload,
  onOpenAnalysis,
  onOpenPdfReport,
}) => {
  const nombreNegocio = datosNegocio?.nombre || DEFAULT_DATOS_NEGOCIO.nombre;
  const [periodo, setPeriodo] = useState<PeriodFilter>('ano');
  const [customStart, setCustomStart] = useState('2026-01-01');
  const [customEnd, setCustomEnd] = useState('2026-08-31');

  // Filter facturas based on period
  const facturasFiltradas = useMemo(() => {
    const now = new Date('2026-08-31T23:59:59'); // Baseline benchmark in 2026
    return facturas.filter((f) => {
      const fDate = new Date(f.fechaEmision);
      if (periodo === '7d') {
        const diffDays = (now.getTime() - fDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (periodo === '30d') {
        const diffDays = (now.getTime() - fDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      if (periodo === 'trimestre') {
        // Trimestre 3 (Julio - Septiembre)
        return fDate.getMonth() >= 6 && fDate.getMonth() <= 8;
      }
      if (periodo === 'ano') {
        return fDate.getFullYear() === 2026;
      }
      if (periodo === 'personalizado') {
        return (
          f.fechaEmision >= customStart &&
          f.fechaEmision <= customEnd
        );
      }
      return true;
    });
  }, [facturas, periodo, customStart, customEnd]);

  // KPIs Calculations
  const gastoTotal = useMemo(
    () => facturasFiltradas.reduce((sum, f) => sum + f.total, 0),
    [facturasFiltradas]
  );

  const numFacturas = facturasFiltradas.length;

  const gastoMedio = numFacturas > 0 ? gastoTotal / numFacturas : 0;

  const ivaTotal = useMemo(
    () => facturasFiltradas.reduce((sum, f) => sum + f.cuotaIVA, 0),
    [facturasFiltradas]
  );

  const proveedoresActivos = useMemo(() => {
    const ids = new Set(facturasFiltradas.map((f) => f.idProveedor));
    return ids.size;
  }, [facturasFiltradas]);

  const alertasActivasCount = useMemo(
    () => alertas.filter((a) => a.estado === 'activa').length,
    [alertas]
  );

  const alertasCriticasCount = useMemo(
    () => alertas.filter((a) => a.estado === 'activa' && a.nivel === 'critica').length,
    [alertas]
  );

  // Evolución Mensual de Gastos (Enero - Agosto)
  const datosEvolucionMensual = useMemo(() => {
    const meses = [
      { mes: 'Ene', num: 0, gasto: 0, iva: 0, facturas: 0 },
      { mes: 'Feb', num: 1, gasto: 0, iva: 0, facturas: 0 },
      { mes: 'Mar', num: 2, gasto: 0, iva: 0, facturas: 0 },
      { mes: 'Abr', num: 3, gasto: 0, iva: 0, facturas: 0 },
      { mes: 'May', num: 4, gasto: 0, iva: 0, facturas: 0 },
      { mes: 'Jun', num: 5, gasto: 0, iva: 0, facturas: 0 },
      { mes: 'Jul', num: 6, gasto: 0, iva: 0, facturas: 0 },
      { mes: 'Ago', num: 7, gasto: 0, iva: 0, facturas: 0 },
    ];

    facturas.forEach((f) => {
      const m = new Date(f.fechaEmision).getMonth();
      if (m >= 0 && m < 8) {
        meses[m].gasto += f.total;
        meses[m].iva += f.cuotaIVA;
        meses[m].facturas += 1;
      }
    });

    return meses.map((m) => ({
      ...m,
      gasto: Math.round(m.gasto * 100) / 100,
      iva: Math.round(m.iva * 100) / 100,
    }));
  }, [facturas]);

  // Gastos por Categoría
  const datosPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    facturasFiltradas.forEach((f) => {
      map[f.categoriaGasto] = (map[f.categoriaGasto] || 0) + f.total;
    });

    return Object.keys(map).map((cat) => ({
      name: cat,
      value: Math.round(map[cat] * 100) / 100,
      color: CATEGORY_COLORS[cat] || '#94a3b8',
    }));
  }, [facturasFiltradas]);

  // Principales Proveedores (Top 5)
  const datosTopProveedores = useMemo(() => {
    const map: Record<string, { total: number; facturas: number }> = {};
    facturasFiltradas.forEach((f) => {
      const p = f.nombreProveedor || f.idProveedor;
      if (!map[p]) map[p] = { total: 0, facturas: 0 };
      map[p].total += f.total;
      map[p].facturas += 1;
    });

    return Object.entries(map)
      .map(([nombre, d]) => ({
        nombre: nombre.length > 22 ? nombre.substring(0, 20) + '...' : nombre,
        nombreCompleto: nombre,
        total: Math.round(d.total * 100) / 100,
        facturas: d.facturas,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [facturasFiltradas]);

  // Alerta Crítica Principal si existe
  const alertaCritica = useMemo(() => {
    return alertas.find((a) => a.estado === 'activa' && a.nivel === 'critica');
  }, [alertas]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
              Control Ejecutivo
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {nombreNegocio}
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Resumen Financiero
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Métricas clave de aprovisionamiento, costes de producción y control tributario
          </p>
        </div>

        {/* Filter Buttons & Action Triggers */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-[#0d131f] p-1 rounded-xl border border-slate-800/80 text-xs font-medium">
            <button
              id="filter-7d"
              onClick={() => setPeriodo('7d')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                periodo === '7d'
                  ? 'bg-rose-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 días
            </button>
            <button
              id="filter-30d"
              onClick={() => setPeriodo('30d')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                periodo === '30d'
                  ? 'bg-rose-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              30 días
            </button>
            <button
              id="filter-trimestre"
              onClick={() => setPeriodo('trimestre')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                periodo === 'trimestre'
                  ? 'bg-rose-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trimestre
            </button>
            <button
              id="filter-ano"
              onClick={() => setPeriodo('ano')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                periodo === 'ano'
                  ? 'bg-rose-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Año 2026
            </button>
            <button
              id="filter-custom"
              onClick={() => setPeriodo('personalizado')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                periodo === 'personalizado'
                  ? 'bg-rose-500 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rango
            </button>
          </div>

          <button
            id="btn-quick-upload"
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold tracking-wide shadow-md shadow-rose-950/40 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>SUBIR FACTURAS</span>
          </button>

          <button
            id="btn-quick-pdf"
            onClick={onOpenPdfReport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101726] hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold tracking-wide transition-colors cursor-pointer"
            title="Generar informe ejecutivo imprimible de 9 páginas"
          >
            <Printer className="w-4 h-4 text-rose-400" />
            <span>GENERAR INFORME PDF (9 PÁG.)</span>
          </button>

          <button
            id="btn-quick-ia"
            onClick={onOpenAnalysis}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>ANALIZAR CON IA</span>
          </button>
        </div>
      </div>

      {/* Date Pickers for Custom Range */}
      {periodo === 'personalizado' && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0e1626] border border-slate-800 text-xs text-slate-300">
          <Calendar className="w-4 h-4 text-rose-400" />
          <span>Desde:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
          />
          <span>Hasta:</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
          />
        </div>
      )}

      {/* Critical Alert Banner if Present */}
      {alertaCritica && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start justify-between gap-4 shadow-lg shadow-red-950/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 uppercase tracking-wide">
                  Alerta Crítica
                </span>
                <span className="text-xs text-slate-300">
                  {alertaCritica.fecha}
                </span>
              </div>
              <h4 className="text-sm font-bold text-red-200 mt-1">
                {alertaCritica.titulo}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {alertaCritica.descripcion}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('alertas')}
            className="px-3 py-1.5 text-xs font-semibold text-red-300 hover:text-white bg-red-900/40 hover:bg-red-800/60 rounded-lg border border-red-700/50 shrink-0 transition-colors"
          >
            Ver Detalles
          </button>
        </div>
      )}

      {/* KPI Grid: 6 Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Gasto Total Acumulado */}
        <div
          id="kpi-gasto-total"
          className="p-5 rounded-2xl bg-gradient-to-br from-[#121a2d] to-[#0c121e] border border-slate-800/90 flex flex-col justify-between relative overflow-hidden shadow-xl shadow-black/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Gasto Total
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight">
              {gastoTotal.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
              Total periodo seleccionado
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+14.2%</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {facturasFiltradas.length} ops
            </span>
          </div>
        </div>

        {/* KPI 2: Número de Facturas */}
        <div
          id="kpi-facturas"
          onClick={() => onNavigate('facturas')}
          className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. Facturas
            </span>
            <FileText className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
          </div>
          <div className="my-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-100">
              {numFacturas.toLocaleString('es-ES')}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Documentos registrados
            </p>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>100% auditadas</span>
            </div>
            <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">
              Ver lista
            </span>
          </div>
        </div>

        {/* KPI 3: Gasto Medio por Factura */}
        <div
          id="kpi-gasto-medio"
          className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              3. Gasto Medio
            </span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-100">
              {gastoMedio.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Por factura emitida
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span className="text-[11px]">Ticket medio operativo</span>
          </div>
        </div>

        {/* KPI 4: IVA Soportado */}
        <div
          id="kpi-iva-soportado"
          onClick={() => onNavigate('iva')}
          className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 hover:border-sky-500/40 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              4. IVA Soportado
            </span>
            <Receipt className="w-4 h-4 text-sky-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-sky-400">
              {ivaTotal.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Cuota deducible registrada
            </p>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-300">4%, 10% y 21%</span>
            <span className="text-[11px] text-slate-400 group-hover:text-sky-300 transition-colors">
              Ver modelo
            </span>
          </div>
        </div>

        {/* KPI 5: Proveedores */}
        <div
          id="kpi-proveedores"
          onClick={() => onNavigate('proveedores')}
          className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              5. Proveedores
            </span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl lg:text-3xl font-extrabold text-slate-100">
              {proveedoresActivos.toLocaleString('es-ES')}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Proveedores con compras
            </p>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 text-[11px] group-hover:text-amber-300 transition-colors">
              Ver directorio
            </span>
            <span className="text-[11px] text-slate-400">
              {proveedores.length} en total
            </span>
          </div>
        </div>

        {/* KPI 6: Alertas Activas (Directamente después de Proveedores) */}
        <div
          id="kpi-alertas-activas"
          onClick={() => onNavigate('alertas')}
          className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 hover:border-rose-500/40 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              6. Alertas Activas
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                alertasActivasCount > 0
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div
              className={`text-2xl lg:text-3xl font-extrabold ${
                alertasActivasCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {alertasActivasCount.toLocaleString('es-ES')}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {alertasActivasCount === 1
                ? 'Anomalía detectada'
                : 'Anomalías pendientes'}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 text-[11px] group-hover:text-rose-300 transition-colors">
              Ver alertas
            </span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                alertasCriticasCount > 0
                  ? 'bg-red-500/25 text-red-300'
                  : alertasActivasCount > 0
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {alertasCriticasCount > 0
                ? `${alertasCriticasCount} crítica${alertasCriticasCount > 1 ? 's' : ''}`
                : alertasActivasCount > 0
                ? `${alertasActivasCount} pendientes`
                : 'Todo normal'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Section (Asymmetric Modern Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Evolución Mensual de Gastos (Large, 2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#101726] border border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                1. Evolución Mensual de Gastos e IVA (2026)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Volumen acumulado de facturación (€) y cuota fiscal por mes
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500"></span>
                <span className="text-slate-300">Gasto Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-sky-400"></span>
                <span className="text-slate-300">Cuota IVA</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datosEvolucionMensual} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorIva" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="mes" stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k€`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`]}
                />
                <Area type="monotone" dataKey="gasto" name="Gasto Total" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGasto)" />
                <Area type="monotone" dataKey="iva" name="Cuota IVA" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorIva)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Gastos por Categoría (Donut Chart) */}
        <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              2. Gastos por Categoría
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Distribución porcentual del presupuesto
            </p>

            <div className="h-52 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {datosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(v: any) => [`${Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Categories Legend */}
          <div className="space-y-1.5 mt-2 text-xs border-t border-slate-800/80 pt-3">
            {datosPorCategoria.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                  <span className="truncate max-w-[140px]">{cat.name}</span>
                </div>
                <span className="font-semibold text-slate-200">
                  {cat.value.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Principales Proveedores */}
        <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                3. Principales Proveedores (Top 5)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Volumen acumulado de compra directa
              </p>
            </div>
            <button
              onClick={() => onNavigate('proveedores')}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={datosTopProveedores}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k€`}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(v: any) => [`${Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 'Total Gasto']}
                />
                <Bar dataKey="total" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Número de Facturas por Mes */}
        <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                5. Número de Facturas Procesadas por Mes
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Ritmo operativo de emisión y recepción contable
              </p>
            </div>
            <button
              onClick={() => onNavigate('facturas')}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <span>Ir a Facturas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosEvolucionMensual} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="mes" stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(v: any) => [`${v} facturas`, 'Total']}
                />
                <Bar dataKey="facturas" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
