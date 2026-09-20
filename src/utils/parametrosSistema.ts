import { ParametrosSistema, DEFAULT_PARAMETROS_SISTEMA, ConfiguracionAlertas } from '../types';
import { STORAGE_KEY_ALERTAS_CONFIG } from './alertasConfig';

export const STORAGE_KEY_PARAMETROS_SISTEMA = 'fa_parametros_sistema_v1';

/**
 * Obtiene los parámetros del sistema guardados en localStorage
 * o retorna los valores predeterminados de fábrica.
 */
export function obtenerParametrosSistema(): ParametrosSistema {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PARAMETROS_SISTEMA };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PARAMETROS_SISTEMA);
    // Si no existe aún la clave de parámetros del sistema, intentamos migrar desde la clave de alertas si existiera
    let base = { ...DEFAULT_PARAMETROS_SISTEMA };

    const rawAlertas = localStorage.getItem(STORAGE_KEY_ALERTAS_CONFIG);
    if (rawAlertas) {
      try {
        const parsedAlertas = JSON.parse(rawAlertas);
        if (parsedAlertas) {
          if (typeof parsedAlertas.umbralSubidaModeradaPct === 'number') {
            base.umbralSubidaModeradaPct = parsedAlertas.umbralSubidaModeradaPct;
          }
          if (typeof parsedAlertas.umbralSubidaCriticaPct === 'number') {
            base.umbralSubidaCriticaPct = parsedAlertas.umbralSubidaCriticaPct;
          }
          if (typeof parsedAlertas.umbralConcentracionPct === 'number') {
            base.umbralConcentracionProveedorPct = parsedAlertas.umbralConcentracionPct;
          }
          if (typeof parsedAlertas.diasAnticipacionVencimiento === 'number') {
            base.diasAnticipacionVencimiento = parsedAlertas.diasAnticipacionVencimiento;
          }
        }
      } catch {}
    }

    if (!raw) {
      return base;
    }

    const parsed = JSON.parse(raw);
    return {
      umbralSubidaModeradaPct:
        typeof parsed.umbralSubidaModeradaPct === 'number' && !isNaN(parsed.umbralSubidaModeradaPct)
          ? parsed.umbralSubidaModeradaPct
          : base.umbralSubidaModeradaPct,
      umbralSubidaCriticaPct:
        typeof parsed.umbralSubidaCriticaPct === 'number' && !isNaN(parsed.umbralSubidaCriticaPct)
          ? parsed.umbralSubidaCriticaPct
          : base.umbralSubidaCriticaPct,
      notificarConcentracionProveedor:
        parsed.notificarConcentracionProveedor !== undefined
          ? Boolean(parsed.notificarConcentracionProveedor)
          : base.notificarConcentracionProveedor,
      umbralConcentracionProveedorPct:
        typeof parsed.umbralConcentracionProveedorPct === 'number' && !isNaN(parsed.umbralConcentracionProveedorPct)
          ? parsed.umbralConcentracionProveedorPct
          : base.umbralConcentracionProveedorPct,
      notificarFacturasVencidas:
        parsed.notificarFacturasVencidas !== undefined
          ? Boolean(parsed.notificarFacturasVencidas)
          : base.notificarFacturasVencidas,
      diasAnticipacionVencimiento:
        typeof parsed.diasAnticipacionVencimiento === 'number' && !isNaN(parsed.diasAnticipacionVencimiento)
          ? parsed.diasAnticipacionVencimiento
          : base.diasAnticipacionVencimiento,

      limiteDiasFacturasRecurrentes:
        typeof parsed.limiteDiasFacturasRecurrentes === 'number' && !isNaN(parsed.limiteDiasFacturasRecurrentes)
          ? parsed.limiteDiasFacturasRecurrentes
          : base.limiteDiasFacturasRecurrentes,
      diasToleranciaPagoVencido:
        typeof parsed.diasToleranciaPagoVencido === 'number' && !isNaN(parsed.diasToleranciaPagoVencido)
          ? parsed.diasToleranciaPagoVencido
          : base.diasToleranciaPagoVencido,
      evaluarVencimientosActivo:
        parsed.evaluarVencimientosActivo !== undefined
          ? Boolean(parsed.evaluarVencimientosActivo)
          : base.evaluarVencimientosActivo,

      umbralDependenciaAltaPct:
        typeof parsed.umbralDependenciaAltaPct === 'number' && !isNaN(parsed.umbralDependenciaAltaPct)
          ? parsed.umbralDependenciaAltaPct
          : base.umbralDependenciaAltaPct,
      umbralDependenciaMediaPct:
        typeof parsed.umbralDependenciaMediaPct === 'number' && !isNaN(parsed.umbralDependenciaMediaPct)
          ? parsed.umbralDependenciaMediaPct
          : base.umbralDependenciaMediaPct,
      minimoFacturasParaConcentracion:
        typeof parsed.minimoFacturasParaConcentracion === 'number' && !isNaN(parsed.minimoFacturasParaConcentracion)
          ? parsed.minimoFacturasParaConcentracion
          : base.minimoFacturasParaConcentracion,

      facturasPorPagina:
        typeof parsed.facturasPorPagina === 'number' && [10, 25, 50, 100].includes(parsed.facturasPorPagina)
          ? parsed.facturasPorPagina
          : base.facturasPorPagina,
      periodoDashboardPredeterminado:
        ['7d', '30d', 'trimestre', 'ano'].includes(parsed.periodoDashboardPredeterminado)
          ? parsed.periodoDashboardPredeterminado
          : base.periodoDashboardPredeterminado,
      anoFiscalReferencia:
        typeof parsed.anoFiscalReferencia === 'number' && !isNaN(parsed.anoFiscalReferencia)
          ? parsed.anoFiscalReferencia
          : base.anoFiscalReferencia,
      topProveedoresRanking:
        typeof parsed.topProveedoresRanking === 'number' && !isNaN(parsed.topProveedoresRanking)
          ? parsed.topProveedoresRanking
          : base.topProveedoresRanking,

      tipoIvaPredeterminado:
        typeof parsed.tipoIvaPredeterminado === 'string' && parsed.tipoIvaPredeterminado.trim() !== ''
          ? parsed.tipoIvaPredeterminado
          : base.tipoIvaPredeterminado,
      regimenFiscalEmpresa:
        ['IVA_PENINSULAR', 'IGIC_CANARIAS', 'IPSI_CEUTA_MELILLA', 'RECARGO_EQUIVALENCIA', 'EXENTO_FRANQUICIA', 'MULTIRREGIMEN'].includes(parsed.regimenFiscalEmpresa)
          ? parsed.regimenFiscalEmpresa
          : base.regimenFiscalEmpresa,
      regimenFiscalPredeterminado:
        ['IVA_PENINSULAR', 'IGIC_CANARIAS', 'IPSI_CEUTA_MELILLA', 'RECARGO_EQUIVALENCIA', 'TODOS'].includes(parsed.regimenFiscalPredeterminado)
          ? parsed.regimenFiscalPredeterminado
          : base.regimenFiscalPredeterminado,
      aplicaRecargoEquivalenciaDefecto:
        parsed.aplicaRecargoEquivalenciaDefecto !== undefined
          ? Boolean(parsed.aplicaRecargoEquivalenciaDefecto)
          : base.aplicaRecargoEquivalenciaDefecto,
      permitirIvaCeroOExento:
        parsed.permitirIvaCeroOExento !== undefined
          ? Boolean(parsed.permitirIvaCeroOExento)
          : base.permitirIvaCeroOExento,
      mostrarTiposTemporales:
        parsed.mostrarTiposTemporales !== undefined
          ? Boolean(parsed.mostrarTiposTemporales)
          : base.mostrarTiposTemporales,
      mostrarTiposCanarios:
        parsed.mostrarTiposCanarios !== undefined
          ? Boolean(parsed.mostrarTiposCanarios)
          : base.mostrarTiposCanarios,
      mostrarTiposIpsi:
        parsed.mostrarTiposIpsi !== undefined
          ? Boolean(parsed.mostrarTiposIpsi)
          : base.mostrarTiposIpsi,
      tiposImpositivos:
        Array.isArray(parsed.tiposImpositivos) && parsed.tiposImpositivos.length > 0
          ? parsed.tiposImpositivos
          : base.tiposImpositivos,

      actualizadoEn: parsed.actualizadoEn,
    };
  } catch (error) {
    console.error('Error al leer parámetros del sistema desde localStorage:', error);
    return { ...DEFAULT_PARAMETROS_SISTEMA };
  }
}

/**
 * Guarda los parámetros en localStorage y sincroniza la configuración de alertas.
 */
export function guardarParametrosSistema(params: ParametrosSistema): void {
  if (typeof window === 'undefined') return;

  try {
    const paramsCompletos: ParametrosSistema = {
      ...params,
      actualizadoEn: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_PARAMETROS_SISTEMA, JSON.stringify(paramsCompletos));

    // Sincronizar simultáneamente con la clave de alertas para compatibilidad retroactiva
    const alertasSync: ConfiguracionAlertas = {
      umbralSubidaModeradaPct: params.umbralSubidaModeradaPct,
      umbralSubidaCriticaPct: params.umbralSubidaCriticaPct,
      notificarConcentracionProveedor: params.notificarConcentracionProveedor,
      umbralConcentracionPct: params.umbralConcentracionProveedorPct,
      notificarFacturasVencidas: params.notificarFacturasVencidas,
      diasAnticipacionVencimiento: params.diasAnticipacionVencimiento,
      actualizadoEn: paramsCompletos.actualizadoEn,
    };
    localStorage.setItem(STORAGE_KEY_ALERTAS_CONFIG, JSON.stringify(alertasSync));

    // Emitir eventos para componentes escuchando
    window.dispatchEvent(
      new CustomEvent('fa_parametros_sistema_updated', { detail: paramsCompletos })
    );
    window.dispatchEvent(
      new CustomEvent('fa_alertas_config_updated', { detail: alertasSync })
    );
  } catch (error) {
    console.error('Error al guardar parámetros del sistema en localStorage:', error);
  }
}

/**
 * Restablece los parámetros del sistema a los valores predeterminados de fábrica.
 */
export function restablecerParametrosSistema(): ParametrosSistema {
  const config = { ...DEFAULT_PARAMETROS_SISTEMA, actualizadoEn: new Date().toISOString() };
  guardarParametrosSistema(config);
  return config;
}
