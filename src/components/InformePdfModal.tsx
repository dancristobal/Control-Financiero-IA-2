import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Building2,
  Receipt,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Factura, Proveedor, Alerta, AnalisisEjecutivo, DatosNegocio, DEFAULT_DATOS_NEGOCIO } from '../types';
import { obtenerParametrosSistema } from '../utils/parametrosSistema';

interface InformePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  facturas: Factura[];
  proveedores: Proveedor[];
  alertas: Alerta[];
  analisis: AnalisisEjecutivo;
  datosNegocio?: DatosNegocio;
}

export const InformePdfModal: React.FC<InformePdfModalProps> = ({
  isOpen,
  onClose,
  facturas,
  proveedores,
  alertas,
  analisis,
  datosNegocio,
}) => {
  const [paginaActual, setPaginaActual] = useState(1);
  const [parametrosActivos, setParametrosActivos] = useState(() => obtenerParametrosSistema());
  const totalPaginas = 9;

  useEffect(() => {
    const handleParamsActualizados = (e: any) => {
      const nuevosParams = e?.detail || obtenerParametrosSistema();
      setParametrosActivos(nuevosParams);
    };
    window.addEventListener('fa_parametros_sistema_updated', handleParamsActualizados);
    return () => {
      window.removeEventListener('fa_parametros_sistema_updated', handleParamsActualizados);
    };
  }, []);

  const anoFiscal = parametrosActivos.anoFiscalReferencia || new Date().getFullYear();

  // Periodo auditado dinámico basado en las fechas de las facturas registradas
  const periodoAuditado = useMemo(() => {
    if (!facturas || facturas.length === 0) {
      const mesActual = new Date().toLocaleDateString('es-ES', { month: 'long' });
      return `Enero — ${mesActual.charAt(0).toUpperCase() + mesActual.slice(1)} ${anoFiscal}`;
    }

    const fechasOrdenadas = facturas
      .map((f) => new Date(f.fechaEmision))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (fechasOrdenadas.length === 0) {
      return `Ejercicio Fiscal ${anoFiscal}`;
    }

    const fechaMin = fechasOrdenadas[0];
    const fechaMax = fechasOrdenadas[fechasOrdenadas.length - 1];
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    const mesInicio = fechaMin.toLocaleDateString('es-ES', { month: 'long' });
    const mesFin = fechaMax.toLocaleDateString('es-ES', { month: 'long' });

    if (fechaMin.getFullYear() === fechaMax.getFullYear()) {
      if (mesInicio === mesFin) {
        return `${cap(mesInicio)} ${fechaMin.getFullYear()}`;
      }
      return `${cap(mesInicio)} — ${cap(mesFin)} ${fechaMin.getFullYear()}`;
    }
    return `${cap(mesInicio)} ${fechaMin.getFullYear()} — ${cap(mesFin)} ${fechaMax.getFullYear()}`;
  }, [facturas, anoFiscal]);

  const negocio = datosNegocio && datosNegocio.nombre ? datosNegocio : DEFAULT_DATOS_NEGOCIO;

  if (!isOpen) return null;

  const totalGasto = facturas.reduce((sum, f) => sum + f.total, 0);
  const baseTotal = facturas.reduce((sum, f) => sum + f.baseImponible, 0);
  const cuotaIvaTotal = facturas.reduce((sum, f) => sum + f.cuotaIVA, 0);
  const gastoMedio = facturas.length > 0 ? totalGasto / facturas.length : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[94vh]">
        {/* Modal Toolbar (No-Print) */}
        <div className="p-4 border-b border-slate-800 bg-[#111c30] flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Informe Financiero Ejecutivo (9 Páginas)
              </h3>
              <p className="text-[11px] text-slate-400">
                {negocio.nombre} • Documento Corporativo de Auditoría
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Selector Controls */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs">
              <button
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-slate-200">
                Pág. {paginaActual} de {totalPaginas}
              </span>
              <button
                disabled={paginaActual === totalPaginas}
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>IMPRIMIR / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#080c14] text-slate-200 print:bg-white print:text-black">
          {/* ========================================================================= */}
          {/* PÁGINA 1: PORTADA */}
          {/* ========================================================================= */}
          <div
            className={`min-h-[680px] p-10 rounded-2xl bg-[#0e1626] border border-slate-800/80 flex flex-col justify-between print:border-0 print:bg-white ${
              paginaActual === 1 ? 'block' : 'hidden print:block page-break'
            }`}
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white font-black flex items-center justify-center text-xl shadow-lg">
                  FA
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-100 tracking-wider">
                    FINANCE AI — CONTROL FINANCIERO
                  </h1>
                  <span className="text-xs text-rose-400 font-bold uppercase tracking-widest">
                    Auditoría Inteligente con Gemini
                  </span>
                </div>
              </div>

              <div className="mt-20">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Informe de Gestión y Control de Gastos
                </span>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight mt-2">
                  {negocio.nombre}
                </h2>
                <p className="text-sm text-slate-400 mt-2 max-w-lg leading-relaxed">
                  {negocio.actividad || 'Control Financiero y Auditoría de Gastos'} • Ejercicio Económico {anoFiscal}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-xs text-slate-400">
              <div className="space-y-1">
                <div>
                  <strong>Fecha de Emisión:</strong>{' '}
                  {new Date().toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div>
                  <strong>Periodo Auditado:</strong> {periodoAuditado}
                </div>
                <div>
                  <strong>Facturas Analizadas:</strong> {facturas.length} registros contables
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800 text-[10px] text-amber-300/90 max-w-sm">
                *Resumen orientativo basado en las facturas registradas. No sustituye el cálculo fiscal realizado por un profesional.
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PÁGINA 2: RESUMEN EJECUTIVO */}
          {/* ========================================================================= */}
          <div
            className={`min-h-[680px] p-8 rounded-2xl bg-[#0e1626] border border-slate-800/80 space-y-6 print:border-0 print:bg-white ${
              paginaActual === 2 ? 'block' : 'hidden print:block page-break'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">
                Página 2: Resumen Ejecutivo
              </h2>
              <span className="text-xs text-slate-400">FINANCE AI • {negocio.nombre}</span>
            </div>

            <div className="p-5 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Diagnóstico de la Dirección Financiera
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">
                {analisis.estadoGeneral}
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <h4 className="font-bold text-slate-200 text-sm">
                Aspectos Operativos Destacados
              </h4>
              <p>
                Durante el periodo de {anoFiscal} analizado, {negocio.nombre} ha formalizado un volumen total
                de <strong>{totalGasto.toLocaleString('es-ES')} €</strong> distribuidos en{' '}
                <strong>{facturas.length} facturas</strong> registradas y vinculadas con la hoja de
                cálculo corporativa.
              </p>
              <p>
                {facturas.length > 0 ? (
                  `La estructura de costes registrada se distribuye entre ${proveedores.length} proveedores clave y distintas partidas operativas, lo que permite evaluar la diversificación del gasto y la sensibilidad del negocio ante variaciones de precios.`
                ) : (
                  'La estructura de costes se irá consolidando a medida que se incorporen y sincronicen nuevas facturas en el sistema.'
                )}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-xs text-red-200">
              <strong>Prioridad Estratégica Inmediata:</strong> {analisis.prioridadSemana}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PÁGINA 3: KPIS PRINCIPALES */}
          {/* ========================================================================= */}
          <div
            className={`min-h-[680px] p-8 rounded-2xl bg-[#0e1626] border border-slate-800/80 space-y-6 print:border-0 print:bg-white ${
              paginaActual === 3 ? 'block' : 'hidden print:block page-break'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">
                Página 3: Indicadores Clave de Rendimiento (KPIs)
              </h2>
              <span className="text-xs text-slate-400">FINANCE AI • {negocio.nombre}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold">
                  Gasto Total Acumulado
                </span>
                <div className="text-3xl font-black text-rose-400 font-mono mt-1">
                  {totalGasto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Base imponible: {baseTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold">
                  Facturas Registradas
                </span>
                <div className="text-3xl font-black text-slate-100 font-mono mt-1">
                  {facturas.length.toLocaleString('es-ES')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  100% auditadas y extraídas mediante IA
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold">
                  Gasto Medio por Factura
                </span>
                <div className="text-3xl font-black text-slate-100 font-mono mt-1">
                  {gastoMedio.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ticket medio de compra a proveedores
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold">
                  IVA Soportado Total
                </span>
                <div className="text-3xl font-black text-sky-400 font-mono mt-1">
                  {cuotaIvaTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Cuota registrada deducible (4%, 10%, 21%)
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PÁGINA 4: GASTOS POR CATEGORÍA */}
          {/* ========================================================================= */}
          <div
            className={`min-h-[680px] p-8 rounded-2xl bg-[#0e1626] border border-slate-800/80 space-y-6 print:border-0 print:bg-white ${
              paginaActual === 4 ? 'block' : 'hidden print:block page-break'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">
                Página 4: Desglose Presupuestario por Categoría
              </h2>
              <span className="text-xs text-slate-400">FINANCE AI • {negocio.nombre}</span>
            </div>

            <div className="space-y-3">
              {analisis.principalesGastos.map((g, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800 text-xs">
                  <div className="font-bold text-slate-100 mb-0.5">Partida #{idx + 1}</div>
                  <div className="text-slate-300">{g}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PÁGINA 5: PROVEEDORES Y RIESGOS */}
          {/* ========================================================================= */}
          <div
            className={`min-h-[680px] p-8 rounded-2xl bg-[#0e1626] border border-slate-800/80 space-y-6 print:border-0 print:bg-white ${
              paginaActual === 5 ? 'block' : 'hidden print:block page-break'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">
                Página 5: Análisis de Proveedores y Dependencia
              </h2>
              <span className="text-xs text-slate-400">FINANCE AI • {negocio.nombre}</span>
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#111827] text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Proveedor</th>
                    <th className="p-3">Frecuencia</th>
                    <th className="p-3">Riesgo</th>
                    <th className="p-3 text-right">Gasto Mensual Ref.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#0a0f18]">
                  {proveedores.map((p) => (
                    <tr key={p.idProveedor}>
                      <td className="p-3 font-mono text-slate-400">{p.idProveedor}</td>
                      <td className="p-3 font-semibold text-slate-200">{p.nombreProveedor}</td>
                      <td className="p-3 text-slate-400">{p.frecuencia}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.riesgoDependencia === 'Alto'
                              ? 'text-rose-400 bg-rose-500/20'
                              : 'text-emerald-400 bg-emerald-500/20'
                          }`}
                        >
                          {p.riesgoDependencia}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-200">
                        {p.importeMensual.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PÁGINA 6: EVOLUCIÓN DE PRECIOS */}
          {/* ========================================================================= */}
          <div
            className={`min-h-[680px] p-8 rounded-2xl bg-[#0e1626] border border-slate-800/80 space-y-6 print:border-0 print:bg-white ${
              paginaActual === 6 ? 'block' : 'hidden print:block page-break'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">
                Página 6: Evolución de Precios de Productos y Subidas
              </h2>
              <span className="text-xs text-slate-400">FINANCE AI • {negocio.nombre}</span>
            </div>

            <div className="space-y-3">
              {analisis.cambiosImportantes.map((cambio, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800 text-xs">
                  <div className="font-bold text-amber-400 mb-0.5">Incremento Detectado #{idx + 1}</div>
                  <div className="text-slate-300">{cambio}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PÁGINA 7: ALERTAS Y CONTINGENCIAS */}
          {/* ========================================================================= */}
          <div
            className={`min-h-[680px] p-8 rounded-2xl bg-[#0e1626] border border-slate-800/80 space-y-6 print:border-0 print:bg-white ${
              paginaActual === 7 ? 'block' : 'hidden print:block page-break'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">
                Página 7: Alertas Financieras y Contingencias
              </h2>
              <span className="text-xs text-slate-400">FINANCE AI • {negocio.nombre}</span>
            </div>

            <div className="space-y-3">
              {alertas.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{a.titulo}</span>
                    <span className="text-[10px] uppercase font-bold text-red-400">{a.nivel}</span>
                  </div>
                  <p className="text-slate-400">{a.descripcion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PÁGINA 8: RESUMEN DE IVA */}
          {/* ========================================================================= */}
          <div
            className={`min-h-[680px] p-8 rounded-2xl bg-[#0e1626] border border-slate-800/80 space-y-6 print:border-0 print:bg-white ${
              paginaActual === 8 ? 'block' : 'hidden print:block page-break'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">
                Página 8: Resumen y Desglose de IVA
              </h2>
              <span className="text-xs text-slate-400">FINANCE AI • {negocio.nombre}</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 text-xs text-amber-200">
              *Resumen orientativo basado en las facturas registradas. No sustituye el cálculo fiscal realizado por un profesional.
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800">
                <div className="font-bold text-slate-200">Tipo General 21%</div>
                <div className="text-[11px] text-slate-400 mt-1">Suministros y envases</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800">
                <div className="font-bold text-slate-200">Tipo Reducido 10%</div>
                <div className="text-[11px] text-slate-400 mt-1">Lácteos y coberturas</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800">
                <div className="font-bold text-slate-200">Superreducido 4%</div>
                <div className="text-[11px] text-slate-400 mt-1">Harinas de fuerza y pan</div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PÁGINA 9: RECOMENDACIONES DE GEMINI Y PRIORIDAD */}
          {/* ========================================================================= */}
          <div
            className={`min-h-[680px] p-8 rounded-2xl bg-[#0e1626] border border-slate-800/80 space-y-6 print:border-0 print:bg-white ${
              paginaActual === 9 ? 'block' : 'hidden print:block page-break'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-100">
                Página 9: Plan de Acción y Prioridades Estratégicas
              </h2>
              <span className="text-xs text-slate-400">FINANCE AI • {negocio.nombre}</span>
            </div>

            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-100">
                Tres Acciones Recomendadas por Impacto
              </h3>

              {analisis.tresAcciones.map((acc, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      #{i + 1} {acc.accion}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      Impacto {acc.impacto}
                    </span>
                  </div>
                  <p className="text-slate-300">
                    <strong>Motivo:</strong> {acc.motivo}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    <strong>Datos:</strong> {acc.datos}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-xs text-red-200">
              <strong className="text-red-300 uppercase block mb-1">
                Prioridad de la Semana:
              </strong>
              {analisis.prioridadSemana}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
