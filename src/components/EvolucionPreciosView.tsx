import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  CheckCircle2,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Factura } from '../types';

interface EvolucionPreciosViewProps {
  facturas: Factura[];
}

export const EvolucionPreciosView: React.FC<EvolucionPreciosViewProps> = ({
  facturas,
}) => {
  // Extract all unique products across all invoice lines
  const todosLosProductos = useMemo(() => {
    const mapa: Record<
      string,
      Array<{
        idFactura: string;
        fecha: string;
        proveedor: string;
        cantidad: number;
        unidad: string;
        precioUnitario: number;
        subtotal: number;
      }>
    > = {};

    facturas.forEach((fac) => {
      if (fac.lineas && fac.lineas.length > 0) {
        fac.lineas.forEach((lin) => {
          const prodNombre = lin.nombreProducto.trim();
          if (!mapa[prodNombre]) {
            mapa[prodNombre] = [];
          }
          mapa[prodNombre].push({
            idFactura: fac.idFactura,
            fecha: fac.fechaEmision,
            proveedor: fac.nombreProveedor,
            cantidad: lin.cantidad,
            unidad: lin.unidad,
            precioUnitario: lin.precioUnitario,
            subtotal: lin.subtotal,
          });
        });
      }
    });

    // Sort purchase points by date ascending
    Object.keys(mapa).forEach((k) => {
      mapa[k].sort((a, b) => a.fecha.localeCompare(b.fecha));
    });

    return mapa;
  }, [facturas]);

  const listaNombresProductos = useMemo(() => {
    return Object.keys(todosLosProductos).sort();
  }, [todosLosProductos]);

  // Selected product
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>(
    listaNombresProductos.includes('Harina de fuerza 25 kg')
      ? 'Harina de fuerza 25 kg'
      : listaNombresProductos[0] || ''
  );

  const [busqueda, setBusqueda] = useState('');

  // Selected product metrics
  const datosProductoActual = useMemo(() => {
    const puntos = todosLosProductos[productoSeleccionado] || [];
    if (puntos.length === 0) return null;

    const primerPunto = puntos[0];
    const ultimoPunto = puntos[puntos.length - 1];
    const precioInicial = primerPunto.precioUnitario;
    const precioActual = ultimoPunto.precioUnitario;
    const variacionAbs = precioActual - precioInicial;
    const variacionPorc = precioInicial > 0 ? (variacionAbs / precioInicial) * 100 : 0;
    const tieneSubida = variacionPorc > 5;
    const subidaPronunciada = variacionPorc >= 15;

    const chartData = puntos.map((p) => ({
      fecha: p.fecha,
      precio: p.precioUnitario,
      idFactura: p.idFactura,
      proveedor: p.proveedor,
      unidad: p.unidad,
    }));

    return {
      nombre: productoSeleccionado,
      unidad: ultimoPunto.unidad,
      puntos,
      chartData,
      precioInicial,
      precioActual,
      variacionAbs,
      variacionPorc,
      tieneSubida,
      subidaPronunciada,
    };
  }, [todosLosProductos, productoSeleccionado]);

  // Ranking of top price increases across all bakery items
  const rankingAumentos = useMemo(() => {
    return Object.keys(todosLosProductos)
      .map((nombre) => {
        const puntos = todosLosProductos[nombre];
        if (puntos.length < 2) return null;
        const pIni = puntos[0].precioUnitario;
        const pFin = puntos[puntos.length - 1].precioUnitario;
        const varPorc = ((pFin - pIni) / pIni) * 100;
        return {
          nombre,
          unidad: puntos[0].unidad,
          proveedor: puntos[puntos.length - 1].proveedor,
          precioInicial: pIni,
          precioActual: pFin,
          variacionPorcentaje: varPorc,
          comprasCount: puntos.length,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.variacionPorcentaje - a.variacionPorcentaje);
  }, [todosLosProductos]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
              Auditoría de Costes
            </span>
            <span className="text-xs text-slate-300">
              Análisis Histórico de Precios Unitarios
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Evolución de Precios de Productos
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Detección de aumentos de costes y variaciones entre remesas de proveedores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#0f172a] border border-slate-800 text-xs text-slate-300">
            Productos analizados: <strong className="text-slate-200">{listaNombresProductos.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Analysis Layout: Selector + Current Product Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Selection & Search */}
        <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Seleccionar Producto
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Haz clic en cualquier insumo para ver su evolución
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-[#0a0f18] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-1 pr-1">
            {listaNombresProductos
              .filter((nom) => nom.toLowerCase().includes(busqueda.toLowerCase()))
              .map((nombre) => {
                const puntos = todosLosProductos[nombre];
                const pIni = puntos[0]?.precioUnitario || 0;
                const pFin = puntos[puntos.length - 1]?.precioUnitario || 0;
                const vPorc = pIni > 0 ? ((pFin - pIni) / pIni) * 100 : 0;
                const isSelected = productoSeleccionado === nombre;

                return (
                  <button
                    key={nombre}
                    onClick={() => setProductoSeleccionado(nombre)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-rose-500/15 border-rose-500/40 text-slate-100 shadow-sm'
                        : 'bg-[#0a0f18] border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate">{nombre}</div>
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        {puntos.length} compras registradas
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {pFin.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </div>
                      {puntos.length > 1 && (
                        <div
                          className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                            vPorc > 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {vPorc > 0 ? '+' : ''}
                          {vPorc.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Right Column (2 cols): Selected Product Detailed Evolution */}
        {datosProductoActual ? (
          <div className="lg:col-span-2 space-y-5">
            {/* Price Hike Alert Banner if applicable */}
            {datosProductoActual.tieneSubida && (
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                  datosProductoActual.subidaPronunciada
                    ? 'bg-red-950/40 border-red-500/50 text-red-200'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      datosProductoActual.subidaPronunciada
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/30">
                      SUBIDA DE PRECIO DETECTADA
                    </span>
                    <h4 className="text-sm font-bold mt-1">
                      {datosProductoActual.nombre} ha subido un +
                      {datosProductoActual.variacionPorc.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </h4>
                    <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                      El precio unitario pasó de {datosProductoActual.precioInicial.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € a{' '}
                      {datosProductoActual.precioActual.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € por {datosProductoActual.unidad}.
                      Revisa con el proveedor o evalúa repercutir en escandallos de pastelería.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Row for Selected Product */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                <span className="text-[11px] text-slate-300">Precio Inicial</span>
                <div className="text-xl font-bold text-slate-200 font-mono mt-1">
                  {datosProductoActual.precioInicial.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
                <span className="text-[10px] text-slate-300">
                  {datosProductoActual.puntos[0]?.fecha}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                <span className="text-[11px] text-slate-300">Precio Actual</span>
                <div className="text-xl font-bold text-rose-400 font-mono mt-1">
                  {datosProductoActual.precioActual.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
                <span className="text-[10px] text-slate-300">
                  {datosProductoActual.puntos[datosProductoActual.puntos.length - 1]?.fecha}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                <span className="text-[11px] text-slate-300">Variación Neta</span>
                <div
                  className={`text-xl font-bold font-mono mt-1 ${
                    datosProductoActual.variacionAbs > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {datosProductoActual.variacionAbs > 0 ? '+' : ''}
                  {datosProductoActual.variacionAbs.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
                <span className="text-[10px] text-slate-300">Por {datosProductoActual.unidad}</span>
              </div>

              <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                <span className="text-[11px] text-slate-300">Variación Porcentual</span>
                <div
                  className={`text-xl font-bold font-mono mt-1 ${
                    datosProductoActual.variacionPorc > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {datosProductoActual.variacionPorc > 0 ? '+' : ''}
                  {datosProductoActual.variacionPorc.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                </div>
                <span className="text-[10px] text-slate-300">Acumulado 2026</span>
              </div>
            </div>

            {/* Chart: Fecha → Precio Unitario */}
            <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Evolución Temporal del Precio: {datosProductoActual.nombre}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Precio unitario sin IVA (€/{datosProductoActual.unidad}) en cada factura
                  </p>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={datosProductoActual.chartData}
                    margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="fecha" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                      formatter={(v: any) => [
                        `${Number(v).toFixed(2)} € / ${datosProductoActual.unidad}`,
                        'Precio Unitario',
                      ]}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return `${label} • ${item?.idFactura || ''} (${item?.proveedor || ''})`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="precio"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#f43f5e' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Historical Invoices Table for this Product */}
            <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Compras Históricas Registradas ({datosProductoActual.puntos.length})
              </h4>

              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a0f18] text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="p-3">Factura</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Proveedor</th>
                      <th className="p-3 text-right">Cantidad</th>
                      <th className="p-3 text-right">Precio Unit.</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-[#101726]">
                    {datosProductoActual.puntos.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-3 font-mono font-bold text-slate-200">
                          {p.idFactura}
                        </td>
                        <td className="p-3 text-slate-400 font-mono">{p.fecha}</td>
                        <td className="p-3 text-slate-300 truncate max-w-[200px]">
                          {p.proveedor}
                        </td>
                        <td className="p-3 text-right text-slate-400 font-mono">
                          {p.cantidad} {p.unidad}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-400">
                          {p.precioUnitario.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </td>
                        <td className="p-3 text-right font-mono text-slate-200">
                          {p.subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-10 rounded-2xl bg-[#101726] border border-slate-800 text-center text-slate-500">
            Selecciona un producto para visualizar su evolución temporal.
          </div>
        )}
      </div>

      {/* Cross-Product Price Increase Ranking */}
      <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-100">
            Ranking de Productos con Mayor Incremento de Precio (2026)
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Detección automática de anomalías y aumentos acumulados en el ejercicio
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rankingAumentos.map((item) => (
            <div
              key={item.nombre}
              onClick={() => setProductoSeleccionado(item.nombre)}
              className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-xs text-slate-200 truncate">{item.nombre}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.variacionPorcentaje >= 15
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : item.variacionPorcentaje > 0
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {item.variacionPorcentaje > 0 ? '+' : ''}
                  {item.variacionPorcentaje.toFixed(1)}%
                </span>
              </div>

              <p className="text-[11px] text-slate-300 truncate">{item.proveedor}</p>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 font-mono">
                <span className="text-slate-300">
                  {item.precioInicial.toFixed(2)} € →{' '}
                  <strong className="text-slate-100">{item.precioActual.toFixed(2)} €</strong>
                </span>
                <span className="text-[10px] text-slate-300 font-sans">
                  {item.comprasCount} compras
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
