import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  PieChart as PieIcon,
  HelpCircle,
  CheckCircle2
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
import { Factura, DesgloseIVA } from '../types';

interface IvaViewProps {
  facturas: Factura[];
}

type PeriodoIVA = 'T1' | 'T2' | 'T3' | 'T4' | 'ANUAL';

export const IvaView: React.FC<IvaViewProps> = ({ facturas }) => {
  const [periodo, setPeriodo] = useState<PeriodoIVA>('ANUAL');

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

  // IVA Calculations
  const desglose = useMemo<DesgloseIVA>(() => {
    let base21 = 0;
    let cuota21 = 0;
    let fact21 = 0;

    let base10 = 0;
    let cuota10 = 0;
    let fact10 = 0;

    let base4 = 0;
    let cuota4 = 0;
    let fact4 = 0;

    let baseTotal = 0;
    let cuotaTotal = 0;
    let totalAcumulado = 0;

    facturasPeriodo.forEach((f) => {
      baseTotal += f.baseImponible;
      cuotaTotal += f.cuotaIVA;
      totalAcumulado += f.total;

      const tIva = (f.tiposIVA || '').toLowerCase();

      if (tIva.includes('21')) {
        base21 += f.baseImponible;
        cuota21 += f.cuotaIVA;
        fact21 += 1;
      } else if (tIva.includes('10')) {
        base10 += f.baseImponible;
        cuota10 += f.cuotaIVA;
        fact10 += 1;
      } else if (tIva.includes('4')) {
        base4 += f.baseImponible;
        cuota4 += f.cuotaIVA;
        fact4 += 1;
      } else {
        // Default general
        base21 += f.baseImponible;
        cuota21 += f.cuotaIVA;
        fact21 += 1;
      }
    });

    return {
      periodo,
      numeroFacturas: facturasPeriodo.length,
      baseImponibleTotal: baseTotal,
      cuotaIvaTotal: cuotaTotal,
      totalFacturas: totalAcumulado,
      desgloseTipos: [
        { tipo: '21% General (Energía, envases, transporte)', tipoNum: 21, base: base21, cuota: cuota21, total: base21 + cuota21, count: fact21 },
        { tipo: '10% Reducido (Lácteos, mantequilla, confitería)', tipoNum: 10, base: base10, cuota: cuota10, total: base10 + cuota10, count: fact10 },
        { tipo: '4% Superreducido (Harinas, panificación)', tipoNum: 4, base: base4, cuota: cuota4, total: base4 + cuota4, count: fact4 },
      ],
    };
  }, [facturasPeriodo, periodo]);

  // Chart data
  const chartData = useMemo(() => {
    return desglose.desgloseTipos.map((d) => ({
      tipo: `${d.tipoNum}%`,
      nombreCorto: d.tipoNum === 21 ? 'General 21%' : d.tipoNum === 10 ? 'Reducido 10%' : 'Superreducido 4%',
      base: Math.round(d.base * 100) / 100,
      cuota: Math.round(d.cuota * 100) / 100,
    }));
  }, [desglose]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
              Control Tributario
            </span>
            <span className="text-xs text-slate-300">
              IVA Soportado Deducible Registrado
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Resumen de IVA Registrado
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Liquidación acumulada de IVA soportado y desglose por tipos impositivos (21%, 10% y 4%)
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
            Esta aplicación tiene finalidad de gestión, análisis y demostración. Para la presentación de los modelos 303 y 390 ante la Agencia Tributaria, consulta con tu gestor colegiado.
          </p>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Facturas Registradas
          </span>
          <div className="text-3xl font-extrabold text-slate-100 mt-2 font-mono">
            {desglose.numeroFacturas.toLocaleString('es-ES')}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            En el periodo {desglose.periodo}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Base Imponible Total
          </span>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-200 mt-2 font-mono">
            {desglose.baseImponibleTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <p className="text-xs text-slate-300 mt-1">Gasto neto deducible</p>
        </div>

        <div
          id="kpi-cuota-iva"
          className="p-5 rounded-2xl bg-gradient-to-br from-[#111e33] to-[#0c1424] border border-sky-500/40 shadow-lg shadow-sky-950/20"
        >
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
            Cuota IVA Soportado
          </span>
          <div className="text-2xl lg:text-3xl font-extrabold text-sky-300 mt-2 font-mono">
            {desglose.cuotaIvaTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <p className="text-xs text-slate-300 mt-1">Total IVA a compensar</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Importe Total Bruto
          </span>
          <div className="text-2xl lg:text-3xl font-extrabold text-rose-400 mt-2 font-mono">
            {desglose.totalFacturas.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <p className="text-xs text-slate-300 mt-1">Base + Impuestos totales</p>
        </div>
      </div>

      {/* Breakdown by VAT Rate (21%, 10%, 4%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {desglose.desgloseTipos.map((item) => (
          <div
            key={item.tipoNum}
            className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Tipo {item.tipoNum}%
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {item.count} facturas
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100 mt-3">{item.tipo}</h3>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Base Imponible:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {item.base.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Cuota IVA ({item.tipoNum}%):</span>
                  <span className="font-mono font-bold text-sky-400">
                    +{item.cuota.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">Total con IVA:</span>
              <span className="font-mono font-bold text-rose-400 text-sm">
                {item.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Chart: Base vs Cuota */}
      <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Distribución de Base Imponible vs Cuota Fiscal por Tipo de IVA
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Comparativa proporcional del impacto impositivo en el obrador
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-600"></span>
              <span className="text-slate-300">Base Imponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-sky-400"></span>
              <span className="text-slate-300">Cuota IVA</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="nombreCorto" stroke="#64748b" tick={{ fontSize: 12 }} />
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
                formatter={(v: any) => [`${Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`]}
              />
              <Bar dataKey="base" name="Base Imponible" fill="#475569" radius={[4, 4, 0, 0]} barSize={36} />
              <Bar dataKey="cuota" name="Cuota IVA" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
