import React, { useState } from 'react';
import { X, FileText, CheckCircle2, Calendar, Building2, Tag, Layers, Download, Trash2, Eye, UploadCloud, Loader2 } from 'lucide-react';
import { Factura } from '../types';

interface FacturaDetalleModalProps {
  factura: Factura | null;
  onClose: () => void;
  onDelete?: (factura: Factura) => void;
  onAbrirVisor?: (factura: Factura) => void;
  onUploadToDrive?: (factura: Factura) => Promise<any> | void;
}

export const FacturaDetalleModal: React.FC<FacturaDetalleModalProps> = ({
  factura,
  onClose,
  onDelete,
  onAbrirVisor,
  onUploadToDrive,
}) => {
  const [subiendoDrive, setSubiendoDrive] = useState(false);
  if (!factura) return null;

  const handleSubirDrive = async () => {
    if (!onUploadToDrive) return;
    setSubiendoDrive(true);
    try {
      await onUploadToDrive(factura);
    } finally {
      setSubiendoDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#111c30]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 font-mono">
                  {factura.idFactura}
                </h3>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    factura.estado === 'Pagada'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : factura.estado === 'Vencida'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {factura.estado}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {factura.nombreProveedor} • {factura.idProveedor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Facts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Fecha Emisión</span>
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-1">
                {factura.fechaEmision}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Vencimiento</span>
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-1">
                {factura.fechaVencimiento}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-500" />
                <span>Categoría</span>
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                {factura.categoriaGasto}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-500" />
                <span>Fecha Pago</span>
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                {factura.fechaPago}
              </div>
            </div>
          </div>

          {/* Concepto */}
          <div className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800/80">
            <div className="text-xs font-medium text-slate-400">Concepto general</div>
            <div className="text-sm font-medium text-slate-200 mt-0.5 leading-relaxed">
              {factura.concepto}
            </div>
          </div>

          {/* Product Lines Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Líneas de Producto Extraídas por Gemini
              </h4>
              <span className="text-[11px] text-slate-400">
                {factura.lineas?.length || 0} referencias
              </span>
            </div>

            {factura.lineas && factura.lineas.length > 0 ? (
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111827] text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="p-3">Producto</th>
                      <th className="p-3 text-right">Cantidad</th>
                      <th className="p-3 text-right">Precio Unit.</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-[#0a0f18]">
                    {factura.lineas.map((lin, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-3 font-medium text-slate-200">
                          {lin.nombreProducto}
                        </td>
                        <td className="p-3 text-right text-slate-400 font-mono">
                          {lin.cantidad} {lin.unidad}
                        </td>
                        <td className="p-3 text-right text-slate-300 font-mono">
                          {lin.precioUnitario.toLocaleString('es-ES', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 3,
                          })}{' '}
                          €
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-100 font-mono">
                          {lin.subtotal.toLocaleString('es-ES', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-500">
                Factura registrada sin desglose por líneas de producto.
              </div>
            )}
          </div>

          {/* Financial Totals & Tax Box */}
          <div
            id="modal-totales-financieros"
            className="p-4 rounded-xl bg-gradient-to-br from-[#121c2e] to-[#0d1422] border border-slate-800 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span>Base Imponible</span>
              <span className="font-mono font-medium text-slate-200">
                {factura.baseImponible.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>IVA Aplicado ({factura.tiposIVA})</span>
              <span className="font-mono font-medium text-sky-400">
                +{factura.cuotaIVA.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </span>
            </div>
            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-sm">
              <span className="font-bold text-slate-100">Total Factura</span>
              <span className="font-bold text-rose-400 font-mono text-base">
                {factura.total.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </span>
            </div>
          </div>

          {/* Google Drive Archiving & Sheets Sync Metadata */}
          <div className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Almacenamiento en Google Drive</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                  factura.driveGuardado
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {factura.driveGuardado
                  ? `Carpeta: ${factura.driveFolderName || factura.nombreProveedor}`
                  : 'No archivado en Drive'}
              </span>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Nombre destino en Drive:</span>
                <span className="font-mono text-slate-200 font-medium">
                  {factura.driveFileName || `${factura.idFactura} ${factura.fechaEmision}.pdf`}
                </span>
              </div>
              {factura.driveGuardado && factura.driveFileUrl ? (
                <div className="pt-1 flex items-center justify-end gap-2 text-xs">
                  {onAbrirVisor && (
                    <button
                      type="button"
                      onClick={() => onAbrirVisor(factura)}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver en Visor Integrado</span>
                    </button>
                  )}
                  <a
                    href={factura.driveFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 underline text-[11px] font-medium"
                  >
                    Abrir factura en Google Drive ↗
                  </a>
                </div>
              ) : (
                <div className="pt-2 space-y-2">
                  {factura.driveError && (
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300">
                      <strong>Aviso Google Drive:</strong> {factura.driveError}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    {onAbrirVisor && (
                      <button
                        type="button"
                        onClick={() => onAbrirVisor(factura)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver documento digital</span>
                      </button>
                    )}
                    {factura.archivoBase64 && onUploadToDrive && (
                      <button
                        type="button"
                        onClick={handleSubirDrive}
                        disabled={subiendoDrive}
                        className="px-3 py-1 rounded-lg bg-sky-600/25 hover:bg-sky-600/40 text-sky-300 border border-sky-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {subiendoDrive ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                            <span>Subiendo a Drive...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                            <span>Archivar en Google Drive Ahora</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Google Sheets Sync Metadata */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sincronizada con Google Sheets (pestaña &quot;Facturas&quot;)</span>
            </div>
            <span className="text-slate-500 font-mono text-[10px]">
              {factura.archivoNombre || 'archivo_digital.pdf'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0d131f] flex items-center justify-between gap-2">
          {onDelete ? (
            <button
              onClick={() => {
                onDelete(factura);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Factura</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            {onAbrirVisor && (
              <button
                type="button"
                onClick={() => onAbrirVisor(factura)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Abrir Visor PDF</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
