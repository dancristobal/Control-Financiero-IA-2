import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  PieChart as PieIcon,
  HelpCircle,
  CheckCircle2,
  Filter,
  Layers,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Landmark,
  Wheat,
  Sparkles,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Factura, ParametrosSistema, TipoImpositivoConfigurable, TIPOS_IMPOSITIVOS_PREDETERMINADOS } from '../types';
import {
  procesarDesgloseFiscalCompleto,
  CATALOGO_TIPOS_IMPOSITIVOS,
  TABLA_RECARGO_EQUIVALENCIA,
  RegimenFiscalTipo
} from '../utils/fiscalidad';
import { obtenerParametrosSistema } from '../utils/parametrosSistema';

interface IvaViewProps {
  facturas: Factura[];
  onOpenConfiguracion?: (tab?: string) => void;
}

type PeriodoIVA = 'T1' | 'T2' | 'T3' | 'T4' | 'ANUAL';
type FiltroRegimen = 'TODOS' | 'IVA_GENERAL' | 'IVA_TEMPORAL' | 'IGIC_CANARIAS' | 'IPSI_CEUTA_MELILLA' | 'RECARGO_EQUIVALENCIA';

export const IvaView: React.FC<IvaViewProps> = ({ facturas, onOpenConfiguracion }) => {
  const [periodo, setPeriodo] = useState<PeriodoIVA>('ANUAL');
  const [filtroRegimen, setFiltroRegimen] = useState<FiltroRegimen>('TODOS');
  const [mostrarGuiaLegal, setMostrarGuiaLegal] = useState<boolean>(false);

  // Parámetros fiscales configurables del sistema
  const [parametros, setParametros] = useState<ParametrosSistema>(() => obtenerParametrosSistema());
  const [tiposConfigurados, setTiposConfigurados] = useState<TipoImpositivoConfigurable[]>(() => {
    const p = obtenerParametrosSistema();
    return Array.isArray(p.tiposImpositivos) && p.tiposImpositivos.length > 0
      ? p.tiposImpositivos
      : TIPOS_IMPOSITIVOS_PREDETERMINADOS;
  });

  React.useEffect(() => {
    const handleActualizar = () => {
      const p = obtenerParametrosSistema();
      setParametros(p);
      if (Array.isArray(p.tiposImpositivos) && p.tiposImpositivos.length > 0) {
        setTiposConfigurados(p.tiposImpositivos);
      }
    };
    window.addEventListener('parametrosSistemaActualizados', handleActualizar);
    window.addEventListener('storage', handleActualizar);
    return () => {
      window.removeEventListener('parametrosSistemaActualizados', handleActualizar);
      window.removeEventListener('storage', handleActualizar);
    };
  }, []);

  // Filter facturas based on period
  const facturasPeriodo = useMemo(() => {
    return facturas.filter((f) => {
      const d = new Date(f.fechaEmision);
      const m = d.getMonth(); // 0 to 11
      if (periodo === 'T1') return m >= 0 && m <= 2; // Ene, Feb, Mar
      if (periodo === 'T2') return m >= 3 && m <= 5; // Abr, May, Jun
      if (periodo === 'T3') return m >= 6 && m <= 8; // Jul, Ago, Sep
      if (periodo === 'T4') return m >= 9 && m <= 11; // Oct, Nov, Dic
      return true; // ANUAL
    });
  }, [facturas, periodo]);

  // Overall tax summary for the period with dynamic catalog
  const balancePeriodo = useMemo(() => {
    return procesarDesgloseFiscalCompleto(facturasPeriodo, tiposConfigurados);
  }, [facturasPeriodo, tiposConfigurados]);

  // Facturas filtered by both Period and Tax Regime
  const facturasFiltradas = useMemo(() => {
    if (filtroRegimen === 'TODOS') return facturasPeriodo;
    if (filtroRegimen === 'RECARGO_EQUIVALENCIA') {
      return facturasPeriodo.filter(
        (f) =>
          f.aplicaRecargoEquivalencia ||
          (f.cuotaRecargoEquivalencia && f.cuotaRecargoEquivalencia > 0) ||
          f.tiposIVA?.toLowerCase().includes('re') ||
          f.tiposIVA?.toLowerCase().includes('recargo')
      );
    }
    if (filtroRegimen === 'IVA_TEMPORAL') {
      return facturasPeriodo.filter((f) => {
        const t = (f.tiposIVA || '').toLowerCase();
        const r = (f.regimenFiscal || '').toLowerCase();
        return (
          r.includes('temporal') ||
          t.includes('temp') ||
          t.includes('0%') ||
          t.includes('5%') ||
          t.includes('2%') ||
          t.includes('7.5%')
        );
      });
    }
    if (filtroRegimen === 'IGIC_CANARIAS') {
      return facturasPeriodo.filter((f) => {
        const t = (f.tiposIVA || '').toLowerCase();
        const r = (f.regimenFiscal || '').toLowerCase();
        return t.includes('igic') || r.includes('igic') || r.includes('canar');
      });
    }
    if (filtroRegimen === 'IPSI_CEUTA_MELILLA') {
      return facturasPeriodo.filter((f) => {
        const t = (f.tiposIVA || '').toLowerCase();
        const r = (f.regimenFiscal || '').toLowerCase();
        return t.includes('ipsi') || r.includes('ipsi') || r.includes('ceuta') || r.includes('melilla');
      });
    }
    if (filtroRegimen === 'IVA_GENERAL') {
      return facturasPeriodo.filter((f) => {
        const t = (f.tiposIVA || '').toLowerCase();
        const r = (f.regimenFiscal || '').toLowerCase();
        if (t.includes('igic') || r.includes('igic') || t.includes('ipsi') || r.includes('ipsi')) return false;
        if (t.includes('temp') || r.includes('temporal') || t.includes('0%') || t.includes('5%') || t.includes('2%')) return false;
        return t.includes('21') || t.includes('10') || t.includes('4') || r.includes('general');
      });
    }
    return facturasPeriodo;
  }, [facturasPeriodo, filtroRegimen]);

  // Active breakdown for current filter with dynamic catalog
  const desgloseActivo = useMemo(() => {
    return procesarDesgloseFiscalCompleto(facturasFiltradas, tiposConfigurados);
  }, [facturasFiltradas, tiposConfigurados]);

  // Recharts preparation
  const chartData = useMemo(() => {
    return desgloseActivo.grupos.map((g) => ({
      nombre: g.nombre,
      tipoNum: `${g.tipoNum}%`,
      base: Math.round(g.base * 100) / 100,
      cuotaImpuesto: Math.round(g.cuota * 100) / 100,
      cuotaRE: Math.round(g.cuotaRE * 100) / 100,
      total: Math.round(g.total * 100) / 100,
    }));
  }, [desgloseActivo]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
              Control Tributario & Impuestos Indirectos
            </span>
            <span className="text-xs text-slate-300">
              Liquidación multi-régimen España (IVA, Temporales 0%/5%, IGIC y R.E.)
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Resumen de Impuestos y Tipos Impositivos
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Liquidación acumulada de IVA peninsular (21%, 10%, 4%), tipos temporales para alimentos/aceite (0%, 5%), IGIC canario (7%, 3%) y Recargo de Equivalencia
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center bg-[#0d131f] p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setPeriodo('T1')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              periodo === 'T1'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            T1 (Ene-Mar)
          </button>
          <button
            onClick={() => setPeriodo('T2')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              periodo === 'T2'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            T2 (Abr-Jun)
          </button>
          <button
            onClick={() => setPeriodo('T3')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              periodo === 'T3'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            T3 (Jul-Sep)
          </button>
          <button
            onClick={() => setPeriodo('T4')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              periodo === 'T4'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            T4 (Oct-Dic)
          </button>
          <button
            onClick={() => setPeriodo('ANUAL')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              periodo === 'ANUAL'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Año 2026
          </button>
        </div>
      </div>

      {/* Regimen Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0f18] p-2 rounded-2xl border border-slate-800/90">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 px-2">
          <Filter className="w-3.5 h-3.5 text-rose-400" />
          <span>Filtrar por Régimen:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFiltroRegimen('TODOS')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filtroRegimen === 'TODOS'
                ? 'bg-slate-700 text-white shadow-sm font-semibold'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Todos ({balancePeriodo.numFacturas})
          </button>

          <button
            onClick={() => setFiltroRegimen('IVA_GENERAL')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filtroRegimen === 'IVA_GENERAL'
                ? 'bg-sky-600 text-white shadow-sm font-semibold'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            IVA General (21%, 10%, 4%)
          </button>

          <button
            onClick={() => setFiltroRegimen('IVA_TEMPORAL')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
              filtroRegimen === 'IVA_TEMPORAL'
                ? 'bg-amber-600 text-white shadow-sm font-semibold'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Wheat className="w-3.5 h-3.5 text-amber-300" />
            <span>Temporales Alimentos (0%, 5%)</span>
          </button>

          <button
            onClick={() => setFiltroRegimen('IGIC_CANARIAS')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
              filtroRegimen === 'IGIC_CANARIAS'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-emerald-300" />
            <span>IGIC Canario (7%, 3%)</span>
          </button>

          <button
            onClick={() => setFiltroRegimen('RECARGO_EQUIVALENCIA')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
              filtroRegimen === 'RECARGO_EQUIVALENCIA'
                ? 'bg-purple-600 text-white shadow-sm font-semibold'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
            <span>Recargo de Equivalencia (R.E.)</span>
          </button>

          {(parametros.mostrarTiposIpsi ||
            parametros.regimenFiscalEmpresa === 'IPSI_CEUTA_MELILLA' ||
            facturasPeriodo.some(
              (f) =>
                (f.tiposIVA || '').toUpperCase().includes('IPSI') ||
                (f.regimenFiscal || '').toUpperCase().includes('IPSI')
            )) && (
            <button
              onClick={() => setFiltroRegimen('IPSI_CEUTA_MELILLA')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                filtroRegimen === 'IPSI_CEUTA_MELILLA'
                  ? 'bg-teal-600 text-white shadow-sm font-semibold'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-teal-300" />
              <span>IPSI Ceuta & Melilla</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenConfiguracion && (
            <button
              id="btn-abrir-config-fiscal"
              onClick={() => onOpenConfiguracion('fiscalidad')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:text-white hover:bg-rose-900/50 flex items-center gap-1.5 transition-colors"
              title="Configurar catálogo de tipos impositivos y régimen de la empresa"
            >
              <Percent className="w-3.5 h-3.5 text-rose-400" />
              <span>Configuración Fiscal ({tiposConfigurados.filter((t) => t.habilitado).length})</span>
            </button>
          )}

          <button
            onClick={() => setMostrarGuiaLegal(!mostrarGuiaLegal)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>{mostrarGuiaLegal ? 'Ocultar Guía Legal' : 'Ver Guía de Tipos & R.E.'}</span>
            {mostrarGuiaLegal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* COMPREHENSIVE TAX REVENUE REFERENCE GUIDE (Collapsible) */}
      {mostrarGuiaLegal && (
        <div className="p-5 rounded-2xl bg-[#0e1626] border border-sky-500/30 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Normativa Tributaria y Tipos Impositivos Soportados</span>
              </div>
              <h3 className="text-base font-bold text-slate-100 mt-1">
                Guía de Tipos Impositivos Vigentes en España y Regímenes Especiales
              </h3>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800/80 font-mono">
              Actualizado 2026
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-1 text-xs">
            {/* 1. Régimen General */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-sky-400 text-sm">
                <span>Régimen General Peninsular</span>
              </div>
              <ul className="space-y-1.5 text-slate-300 leading-relaxed">
                <li><strong className="text-slate-100 font-mono">21% General:</strong> Electricidad, envases, maquinaria, transporte, consultoría y suministros industriales.</li>
                <li><strong className="text-slate-100 font-mono">10% Reducido:</strong> Alimentos procesados, mantequillas, nata, azúcar, hostelería y aguas.</li>
                <li><strong className="text-slate-100 font-mono">4% Superreducido:</strong> Pan común, harinas panificables, leche, huevos, frutas y legumbres.</li>
              </ul>
            </div>

            {/* 2. Tipos Temporales Alimentos */}
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 text-sm">
                <Wheat className="w-4 h-4" />
                <span>Tipos Temporales / Alimentos</span>
              </div>
              <ul className="space-y-1.5 text-slate-300 leading-relaxed">
                <li><strong className="text-slate-100 font-mono">0% Superreducido Temporal:</strong> Aceite de oliva virgen extra, pan común, harinas y alimentos de primera necesidad (RDL 4/2024).</li>
                <li><strong className="text-slate-100 font-mono">2% Transitorio:</strong> Tramo escalonado de normalización en alimentos básicos.</li>
                <li><strong className="text-slate-100 font-mono">5% / 7.5% Reducido Temporal:</strong> Pastas alimenticias y aceites de semillas comestibles.</li>
              </ul>
            </div>

            {/* 3. IGIC Canario */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-sm">
                <Landmark className="w-4 h-4" />
                <span>Régimen Autonómico Canario (IGIC)</span>
              </div>
              <ul className="space-y-1.5 text-slate-300 leading-relaxed">
                <li><strong className="text-slate-100 font-mono">7% Tipo General:</strong> Gravamen estándar para la gran mayoría de suministros y servicios canarios.</li>
                <li><strong className="text-slate-100 font-mono">3% Tipo Reducido:</strong> Industria alimentaria elaborada en Canarias, embalajes y textil.</li>
                <li><strong className="text-slate-100 font-mono">0% Tipo Cero:</strong> Agua, productos sanitarios, libros y productos hortofrutícolas.</li>
                <li><strong className="text-slate-100 font-mono">9.5% / 15%:</strong> Tipos incrementado y especial (bebidas alcohólicas y vehículos).</li>
              </ul>
            </div>

            {/* 4. Recargo de Equivalencia */}
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-purple-400 text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Recargo de Equivalencia (R.E.)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Aplicable a comerciantes minoristas autónomos:
              </p>
              <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                <li>• IVA 21% &rarr; <strong className="text-purple-300">+5,20% R.E.</strong></li>
                <li>• IVA 10% &rarr; <strong className="text-purple-300">+1,40% R.E.</strong></li>
                <li>• IVA 4% &rarr; <strong className="text-purple-300">+0,50% R.E.</strong></li>
                <li>• IVA 5% &rarr; <strong className="text-purple-300">+0,62% R.E.</strong></li>
                <li>• IGIC 7% &rarr; <strong className="text-purple-300">+0,70% Minorista</strong></li>
              </ul>
            </div>

            {/* 5. IPSI Ceuta y Melilla */}
            <div className="p-4 rounded-xl bg-teal-950/20 border border-teal-500/30 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-teal-400 text-sm">
                <Landmark className="w-4 h-4" />
                <span>IPSI Ceuta y Melilla</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Impuesto local indirecto con tipos reducidos y específicos:
              </p>
              <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                <li>• <strong className="text-teal-300 font-mono">0.5% - 1%:</strong> Tipos reducidos alimentos y medicamentos.</li>
                <li>• <strong className="text-teal-300 font-mono">2% - 4%:</strong> Servicios básicos, hostelería y energía.</li>
                <li>• <strong className="text-teal-300 font-mono">8% - 10%:</strong> Tipo general de servicios e importaciones.</li>
                <li>• <strong className="text-teal-300 font-mono">Personalizable:</strong> Configurable al 100% en el panel fiscal.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY LEGAL DISCLAIMER NOTICE */}
      <div className="p-4 rounded-xl bg-amber-950/30 border-2 border-amber-500/50 flex items-start gap-3 shadow-lg shadow-black/20">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-amber-300 uppercase tracking-wide">
            Aviso de Finalidad Contable y Fiscal:
          </span>
          <p className="text-amber-100/90 mt-0.5 font-medium leading-relaxed">
            &quot;Resumen orientativo basado en las facturas registradas. No sustituye el cálculo fiscal realizado por un profesional.&quot;
          </p>
          <p className="text-amber-300/70 text-[11px] mt-1">
            Esta aplicación computa automáticamente IVA peninsular, tipos temporales de alimentos, IGIC y Recargo de Equivalencia. Para la liquidación oficial de modelos (303, 390, 420 o 425), consulta con tu asesor o gestoría colegiada.
          </p>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Facturas Registradas
          </span>
          <div className="text-3xl font-extrabold text-slate-100 mt-2 font-mono">
            {desgloseActivo.numFacturas.toLocaleString('es-ES')}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Periodo {periodo} {filtroRegimen !== 'TODOS' ? `(${filtroRegimen})` : ''}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Base Imponible Total
          </span>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-200 mt-2 font-mono">
            {desgloseActivo.baseTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <p className="text-xs text-slate-300 mt-1">Gasto neto deducible</p>
        </div>

        <div
          id="kpi-cuota-iva"
          className="p-5 rounded-2xl bg-gradient-to-br from-[#111e33] to-[#0c1424] border border-sky-500/40 shadow-lg shadow-sky-950/20"
        >
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
            Cuota IVA / IGIC / IPSI Soportado
          </span>
          <div className="text-2xl lg:text-3xl font-extrabold text-sky-300 mt-2 font-mono">
            {desgloseActivo.cuotaImpuestoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <p className="text-xs text-slate-300 mt-1">Impuesto deducible ordinario</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1c1228] to-[#120a1c] border border-purple-500/40 shadow-lg shadow-purple-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Recargo Equivalencia
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
              R.E.
            </span>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-purple-300 mt-2 font-mono">
            {desgloseActivo.cuotaRETotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <p className="text-xs text-slate-300 mt-1">Recargo minorista soportado</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Importe Total Bruto
          </span>
          <div className="text-2xl lg:text-3xl font-extrabold text-rose-400 mt-2 font-mono">
            {desgloseActivo.totalAcumulado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <p className="text-xs text-slate-300 mt-1">Base + IVA/IGIC + R.E.</p>
        </div>
      </div>

      {/* Dynamic Cards Grid: All Distinct Tax Rates & Regimes detected */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100">
              Desglose Detallado por Tipos Impositivos y Regímenes
            </h3>
            <span className="text-xs font-mono text-slate-400">
              ({desgloseActivo.grupos.length} gravámenes detectados)
            </span>
          </div>
          {desgloseActivo.grupos.length === 0 && (
            <span className="text-xs text-slate-400">No hay facturas en este filtro</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {desgloseActivo.grupos.map((item) => {
            const esCanario = item.esCanario;
            const esTemporal = item.esTemporal;
            const tieneRE = item.tieneRE;
            const esIpsi = (item as any).esIpsi || item.id.toLowerCase().includes('ipsi');

            let badgeBg = 'bg-sky-500/15 text-sky-300 border-sky-500/30';
            if (esCanario) badgeBg = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
            if (esIpsi) badgeBg = 'bg-teal-500/15 text-teal-300 border-teal-500/30';
            if (esTemporal) badgeBg = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
            if (tieneRE) badgeBg = 'bg-purple-500/15 text-purple-300 border-purple-500/30';

            return (
              <div
                key={item.id}
                className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border font-mono ${badgeBg}`}>
                        {item.nombre}
                      </span>
                    </div>
                    <span className="text-xs text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      {item.count} {item.count === 1 ? 'factura' : 'facturas'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      {item.regimenEtiqueta}
                    </span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {esTemporal && 'Tipo reducido/cero por medidas temporales de apoyo a la cadena alimentaria.'}
                      {esCanario && 'Gravamen insular correspondiente al Régimen Económico y Fiscal de Canarias (IGIC).'}
                      {esIpsi && 'Impuesto sobre la Producción, los Servicios y la Importación (Ceuta y Melilla).'}
                      {tieneRE && 'Suministro con recargo de equivalencia repercutido para comerciante minorista.'}
                      {!esTemporal && !esCanario && !esIpsi && !tieneRE && item.tipoNum === 21 && 'Régimen general: suministros, energía, embalajes y servicios.'}
                      {!esTemporal && !esCanario && !esIpsi && !tieneRE && item.tipoNum === 10 && 'Régimen reducido: materias primas alimentarias y hostelería.'}
                      {!esTemporal && !esCanario && !esIpsi && !tieneRE && item.tipoNum === 4 && 'Régimen superreducido: panificación, harinas y productos básicos.'}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Base Imponible:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {item.base.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span>Cuota {esCanario ? 'IGIC' : esIpsi ? 'IPSI' : 'IVA'} ({item.tipoNum}%):</span>
                      <span className="font-mono font-bold text-sky-400">
                        +{item.cuota.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                    </div>

                    {item.cuotaRE > 0 && (
                      <div className="flex items-center justify-between text-purple-300 bg-purple-950/20 px-2 py-1 rounded-lg border border-purple-800/40">
                        <span>Recargo de Equivalencia:</span>
                        <span className="font-mono font-bold text-purple-300">
                          +{item.cuotaRE.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Total Facturas:</span>
                  <span className="font-mono font-bold text-rose-400 text-sm">
                    {item.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Chart: Base vs Cuota Impuesto vs Cuota RE */}
      <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Distribución Comparativa por Tipos Impositivos
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Comparativa de Base Imponible, Cuota de IVA/IGIC y Recargo de Equivalencia acumulados
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-600"></span>
              <span className="text-slate-300">Base Imponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-sky-400"></span>
              <span className="text-slate-300">Cuota IVA / IGIC</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-purple-400"></span>
              <span className="text-slate-300">Recargo Equivalencia</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="nombre" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
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
                  formatter={(v: any, name: string) => [
                    `${Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`,
                    name === 'base' ? 'Base Imponible' : name === 'cuotaImpuesto' ? 'Cuota IVA/IGIC' : 'Recargo Equivalencia',
                  ]}
                />
                <Bar dataKey="base" name="Base Imponible" fill="#475569" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="cuotaImpuesto" name="Cuota IVA/IGIC" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="cuotaRE" name="Recargo Equivalencia" fill="#c084fc" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No hay datos para mostrar en este periodo y régimen seleccionado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
