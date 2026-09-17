import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  ShieldAlert,
  Calendar,
  Building2,
  TrendingUp,
  FileText,
  DollarSign
} from 'lucide-react';
import { Alerta } from '../types';

interface AlertasViewProps {
  alertas: Alerta[];
  onResolverAlerta: (id: string) => void;
  onIgnorarAlerta: (id: string) => void;
  onVerFactura?: (idFactura: string) => void;
}

export const AlertasView: React.FC<AlertasViewProps> = ({
  alertas,
  onResolverAlerta,
  onIgnorarAlerta,
  onVerFactura,
}) => {
  const [filtroNivel, setFiltroNivel] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'activa' | 'resuelta' | 'ignorada' | 'TODOS'>('activa');

  const filtradas = useMemo(() => {
    return alertas.filter((a) => {
      if (filtroEstado !== 'TODOS' && a.estado !== filtroEstado) {
        return false;
      }
      if (filtroNivel !== 'TODOS' && a.nivel !== filtroNivel) {
        return false;
      }
      return true;
    });
  }, [alertas, filtroEstado, filtroNivel]);

  const activasCount = alertas.filter((a) => a.estado === 'activa').length;
  const criticasCount = alertas.filter((a) => a.estado === 'activa' && a.nivel === 'critica').length;
  const altasCount = alertas.filter((a) => a.estado === 'activa' && a.nivel === 'alta').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
              Monitor de Riesgos
            </span>
            <span className="text-xs text-slate-300">
              Anomalías y Control de Precios
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Bandeja de Alertas Financieras
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Detección preventiva de subidas de precio, facturas vencidas y concentración de proveedores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs font-bold text-red-300">
            {criticasCount} Críticas
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-[#0f172a] border border-slate-800 text-xs text-slate-300">
            {activasCount} Activas en total
          </span>
        </div>
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center bg-[#0d131f] p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setFiltroEstado('activa')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filtroEstado === 'activa'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Activas ({alertas.filter((a) => a.estado === 'activa').length})
          </button>
          <button
            onClick={() => setFiltroEstado('resuelta')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filtroEstado === 'resuelta'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Resueltas ({alertas.filter((a) => a.estado === 'resuelta').length})
          </button>
          <button
            onClick={() => setFiltroEstado('ignorada')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filtroEstado === 'ignorada'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ignoradas ({alertas.filter((a) => a.estado === 'ignorada').length})
          </button>
          <button
            onClick={() => setFiltroEstado('TODOS')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filtroEstado === 'TODOS'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas ({alertas.length})
          </button>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>Severidad:</span>
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="bg-[#0a0f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="critica">Crítica (Rojo)</option>
            <option value="alta">Alta (Naranja)</option>
            <option value="media">Media (Amarillo)</option>
            <option value="informativa">Informativa</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3.5">
        {filtradas.length > 0 ? (
          filtradas.map((alerta) => {
            const isCritica = alerta.nivel === 'critica';
            const isAlta = alerta.nivel === 'alta';
            const isMedia = alerta.nivel === 'media';

            return (
              <div
                key={alerta.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md ${
                  alerta.estado !== 'activa'
                    ? 'bg-[#0a0f18]/60 border-slate-800/60 opacity-60'
                    : isCritica
                    ? 'bg-red-950/20 border-red-500/40'
                    : isAlta
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : isMedia
                    ? 'bg-yellow-950/15 border-yellow-500/25'
                    : 'bg-[#101726] border-slate-800'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isCritica
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : isAlta
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : isMedia
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          isCritica
                            ? 'bg-red-500/25 text-red-300'
                            : isAlta
                            ? 'bg-amber-500/25 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {alerta.tipo}
                      </span>
                      <span className="text-xs text-slate-300 font-mono">
                        {alerta.fecha}
                      </span>
                      {alerta.estado !== 'activa' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 capitalize">
                          {alerta.estado}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-100">
                      {alerta.titulo}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                      {alerta.descripcion}
                    </p>

                    {/* Related Data Badges */}
                    {alerta.datosRelacionados && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300">
                        {alerta.datosRelacionados.proveedor && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                            Proveedor: <strong>{alerta.datosRelacionados.proveedor}</strong>
                          </span>
                        )}
                        {alerta.datosRelacionados.variacionPorcentaje && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
                            Variación: +{alerta.datosRelacionados.variacionPorcentaje.toFixed(1)}%
                          </span>
                        )}
                        {alerta.datosRelacionados.idFactura && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300">
                            Ref: {alerta.datosRelacionados.idFactura}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
                  {alerta.estado === 'activa' ? (
                    <>
                      <button
                        onClick={() => onResolverAlerta(alerta.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolver</span>
                      </button>
                      <button
                        onClick={() => onIgnorarAlerta(alerta.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Ignorar</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-300 italic">
                      Alerta {alerta.estado}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-2xl bg-[#101726] border border-slate-800 text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">
              No hay alertas en este estado o filtro.
            </p>
            <p className="text-xs text-slate-300">
              Las anomalías y subidas detectadas por Gemini se mostrarán aquí de forma preventiva.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
