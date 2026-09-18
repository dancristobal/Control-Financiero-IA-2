import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResumenView } from './components/ResumenView';
import { FacturasView } from './components/FacturasView';
import { ProveedoresView } from './components/ProveedoresView';
import { EvolucionPreciosView } from './components/EvolucionPreciosView';
import { AlertasView } from './components/AlertasView';
import { IvaView } from './components/IvaView';
import { AnalisisIAView } from './components/AnalisisIAView';
import { ChatFacturasModal } from './components/ChatFacturasModal';
import { InformePdfModal } from './components/InformePdfModal';
import { ConfiguracionModal } from './components/ConfiguracionModal';
import {
  INITIAL_FACTURAS,
  INITIAL_PROVEEDORES,
  INITIAL_ALERTAS,
  INITIAL_ANALISIS_EJECUTIVO,
} from './data/mockData';
import { Factura, Proveedor, Alerta, AnalisisEjecutivo, GoogleSheetsConfig, GlobalLoadingState, DatosNegocio, DEFAULT_DATOS_NEGOCIO } from './types';
import { GlobalLoadingBar } from './components/GlobalLoadingBar';
import {
  MessageSquare,
  Settings,
  Bell,
  Sparkles,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Sun,
  Moon,
} from 'lucide-react';
import { generarProveedoresDesdeFacturas, generarAlertasDesdeFacturas } from './utils/sheetDataSync';
import { obtenerConfiguracionAlertas } from './utils/alertasConfig';
import { ThemeMode, getInitialTheme, applyTheme } from './utils/theme';

export default function App() {
  // Theme State (Dark / Light Mode)
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  // Apply theme class to <html> and <body> immediately
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('resumen');

  // Modo de visualización: si está activo, solo se muestran datos reales de Google Sheets
  const [isSheetDataActive, setIsSheetDataActive] = useState<boolean>(() => {
    return localStorage.getItem('fa_is_sheet_data_active_v1') === 'true';
  });
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [globalLoading, setGlobalLoading] = useState<GlobalLoadingState>({
    activo: false,
    mensaje: '',
  });
  const [syncToast, setSyncToast] = useState<{
    tipo: 'success' | 'info' | 'error';
    mensaje: string;
  } | null>(null);

  // Application Data States (with localStorage memory)
  const [facturas, setFacturas] = useState<Factura[]>(() => {
    try {
      const isSheet = localStorage.getItem('fa_is_sheet_data_active_v1') === 'true';
      const saved = localStorage.getItem('fa_facturas_v1');
      if (saved) {
        return JSON.parse(saved);
      }
      return isSheet ? [] : INITIAL_FACTURAS;
    } catch {
      return INITIAL_FACTURAS;
    }
  });

  const [proveedores, setProveedores] = useState<Proveedor[]>(() => {
    try {
      const isSheet = localStorage.getItem('fa_is_sheet_data_active_v1') === 'true';
      const saved = localStorage.getItem('fa_proveedores_v1');
      if (saved) {
        return JSON.parse(saved);
      }
      return isSheet ? [] : INITIAL_PROVEEDORES;
    } catch {
      return INITIAL_PROVEEDORES;
    }
  });

  const [alertas, setAlertas] = useState<Alerta[]>(() => {
    try {
      const isSheet = localStorage.getItem('fa_is_sheet_data_active_v1') === 'true';
      const saved = localStorage.getItem('fa_alertas_v1');
      if (saved) {
        return JSON.parse(saved);
      }
      return isSheet ? [] : INITIAL_ALERTAS;
    } catch {
      return INITIAL_ALERTAS;
    }
  });

  const [analisis, setAnalisis] = useState<AnalisisEjecutivo>(() => {
    try {
      const saved = localStorage.getItem('fa_analisis_v1');
      return saved ? JSON.parse(saved) : INITIAL_ANALISIS_EJECUTIVO;
    } catch {
      return INITIAL_ANALISIS_EJECUTIVO;
    }
  });

  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    try {
      const saved = localStorage.getItem('fa_sheets_config_v1');
      return saved
        ? JSON.parse(saved)
        : {
            sheetId: '',
            endpointUrl: '',
            driveFolderId: '',
            status: 'pendiente',
            lastSync: 'Auto',
          };
    } catch {
      return {
        sheetId: '',
        endpointUrl: '',
        driveFolderId: '',
        status: 'pendiente',
        lastSync: 'Auto',
      };
    }
  });

  const [datosNegocio, setDatosNegocio] = useState<DatosNegocio>(() => {
    try {
      const saved = localStorage.getItem('fa_datos_negocio_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_DATOS_NEGOCIO,
          ...parsed,
          sector: parsed.sector || DEFAULT_DATOS_NEGOCIO.sector,
          contextoOperativo: parsed.contextoOperativo || DEFAULT_DATOS_NEGOCIO.contextoOperativo,
        };
      }
      return DEFAULT_DATOS_NEGOCIO;
    } catch {
      return DEFAULT_DATOS_NEGOCIO;
    }
  });

  // Modals Visibility
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPdfReportOpen, setIsPdfReportOpen] = useState(false);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fa_facturas_v1', JSON.stringify(facturas));
    } catch (e) {
      console.warn('Error al persistir facturas en local', e);
    }
  }, [facturas]);

  useEffect(() => {
    try {
      localStorage.setItem('fa_alertas_v1', JSON.stringify(alertas));
    } catch (e) {
      console.warn('Error al persistir alertas en local', e);
    }
  }, [alertas]);

  useEffect(() => {
    try {
      localStorage.setItem('fa_analisis_v1', JSON.stringify(analisis));
    } catch (e) {
      console.warn('Error al persistir analisis en local', e);
    }
  }, [analisis]);

  useEffect(() => {
    try {
      localStorage.setItem('fa_sheets_config_v1', JSON.stringify(sheetsConfig));
    } catch (e) {
      console.warn('Error al persistir config en local', e);
    }
  }, [sheetsConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('fa_datos_negocio_v1', JSON.stringify(datosNegocio));
    } catch (e) {
      console.warn('Error al persistir datos de negocio en local', e);
    }
  }, [datosNegocio]);

  // Función para sincronizar y cargar exclusivamente los datos reales de la hoja "Facturas"
  const sincronizarFacturasHoja = async (
    forzarNotificacion = false
  ): Promise<{ success: boolean; count: number; message?: string }> => {
    setIsSyncingSheets(true);
    setGlobalLoading({
      activo: true,
      mensaje: 'Sincronizando facturas con Google Sheets...',
    });
    try {
      const response = await fetch('/api/sheets/fetch-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          sheetId: sheetsConfig.sheetId,
          endpointUrl: sheetsConfig.endpointUrl,
        }),
      });
      const data = await response.json();

      if (data.success && data.hasRealData && Array.isArray(data.facturas) && data.facturas.length > 0) {
        // Mostrar ÚNICAMENTE los datos de la hoja facturas, reemplazando los de ejemplo
        setFacturas(data.facturas);
        const provsReales = generarProveedoresDesdeFacturas(data.facturas);
        setProveedores(provsReales);
        const alertsReales = generarAlertasDesdeFacturas(data.facturas);
        setAlertas(alertsReales);
        setIsSheetDataActive(true);
        localStorage.setItem('fa_is_sheet_data_active_v1', 'true');
        localStorage.setItem('fa_facturas_v1', JSON.stringify(data.facturas));
        localStorage.setItem('fa_proveedores_v1', JSON.stringify(provsReales));
        localStorage.setItem('fa_alertas_v1', JSON.stringify(alertsReales));

        const msg = `Se han cargado ${data.facturas.length} facturas reales de la hoja "Facturas". Mostrando únicamente datos reales.`;
        if (forzarNotificacion) {
          setSyncToast({ tipo: 'success', mensaje: msg });
          setTimeout(() => setSyncToast(null), 5000);
        }
        return { success: true, count: data.facturas.length, message: msg };
      } else if (data.success && (data.connected || data.source === 'apps_script' || data.source === 'google_sheets_csv')) {
        // Conexión establecida pero hoja actualmente sin filas (0 facturas encontradas)
        setFacturas([]);
        setProveedores([]);
        setAlertas([]);
        setIsSheetDataActive(true);
        localStorage.setItem('fa_is_sheet_data_active_v1', 'true');
        localStorage.setItem('fa_facturas_v1', JSON.stringify([]));
        localStorage.setItem('fa_proveedores_v1', JSON.stringify([]));
        localStorage.setItem('fa_alertas_v1', JSON.stringify([]));

        const msg = `Sincronización completada: la hoja "Facturas" está vacía (0 facturas). Panel de control actualizado a 0 facturas y 0 alertas.`;
        if (forzarNotificacion) {
          setSyncToast({ tipo: 'info', mensaje: msg });
          setTimeout(() => setSyncToast(null), 5000);
        }
        return { success: true, count: 0, message: msg };
      } else {
        const msg = data.error || 'No se ha podido leer la hoja "Facturas" de Google Sheets.';
        if (forzarNotificacion) {
          setSyncToast({ tipo: 'error', mensaje: msg });
          setTimeout(() => setSyncToast(null), 5000);
        }
        return { success: false, count: 0, message: msg };
      }
    } catch (e: any) {
      const msg = e?.name === 'TimeoutError'
        ? 'Tiempo de espera agotado al conectar con Google Sheets (timeout 15s).'
        : (e?.message || 'Error de conexión al sincronizar con Google Sheets.');
      if (forzarNotificacion) {
        setSyncToast({ tipo: 'error', mensaje: msg });
        setTimeout(() => setSyncToast(null), 5000);
      }
      return { success: false, count: 0, message: msg };
    } finally {
      setIsSyncingSheets(false);
      setGlobalLoading({ activo: false, mensaje: '' });
    }
  };

  // Al arrancar: verificar estado en el servidor y cargar automáticamente datos reales de Sheets si existen
  useEffect(() => {
    let montado = true;
    const comprobarYcargarDatosReales = async () => {
      try {
        const statusRes = await fetch('/api/sheets/status');
        const statusData = await statusRes.json();
        let currentSheetId = sheetsConfig.sheetId;
        let currentEndpointUrl = sheetsConfig.endpointUrl;

        if (statusData && (statusData.sheetId || statusData.endpointUrl || statusData.driveFolderId)) {
          currentSheetId = currentSheetId || statusData.sheetId || '';
          currentEndpointUrl = currentEndpointUrl || statusData.endpointUrl || '';
          setSheetsConfig((prev) => ({
            ...prev,
            sheetId: prev.sheetId || statusData.sheetId || '',
            endpointUrl: prev.endpointUrl || statusData.endpointUrl || '',
            driveFolderId: prev.driveFolderId || statusData.driveFolderId || '',
            status: statusData.status || 'sincronizado',
          }));
        }

        // Consultar si existen facturas en la hoja
        const fetchRes = await fetch('/api/sheets/fetch-invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetId: currentSheetId,
            endpointUrl: currentEndpointUrl,
          }),
        });
        const fetchData = await fetchRes.json();
        if (montado && fetchData.success) {
          if (fetchData.hasRealData && Array.isArray(fetchData.facturas) && fetchData.facturas.length > 0) {
            // Reemplazar inmediatamente datos de ejemplo por datos reales de la hoja
            setFacturas(fetchData.facturas);
            const provs = generarProveedoresDesdeFacturas(fetchData.facturas);
            setProveedores(provs);
            const alrts = generarAlertasDesdeFacturas(fetchData.facturas);
            setAlertas(alrts);
            setIsSheetDataActive(true);
            localStorage.setItem('fa_is_sheet_data_active_v1', 'true');
            localStorage.setItem('fa_facturas_v1', JSON.stringify(fetchData.facturas));
            localStorage.setItem('fa_proveedores_v1', JSON.stringify(provs));
            localStorage.setItem('fa_alertas_v1', JSON.stringify(alrts));
          } else if (fetchData.connected || fetchData.source === 'apps_script' || fetchData.source === 'google_sheets_csv') {
            // Si la hoja está conectada pero vacía (0 facturas), dejar el panel limpio en 0 facturas y 0 alertas
            setFacturas([]);
            setProveedores([]);
            setAlertas([]);
            setIsSheetDataActive(true);
            localStorage.setItem('fa_is_sheet_data_active_v1', 'true');
            localStorage.setItem('fa_facturas_v1', JSON.stringify([]));
            localStorage.setItem('fa_proveedores_v1', JSON.stringify([]));
            localStorage.setItem('fa_alertas_v1', JSON.stringify([]));
          }
        }
      } catch (err) {
        console.warn('Comprobación inicial de Sheets:', err);
      }
    };

    comprobarYcargarDatosReales();
    return () => {
      montado = false;
    };
  }, []);

  // Eliminar una factura de forma coordinada en Aplicación, Google Sheets y Google Drive
  const handleDeleteFactura = async (facturaOId: Factura | string): Promise<{ success: boolean; message: string }> => {
    const idFactura = typeof facturaOId === 'string' ? facturaOId : facturaOId.idFactura;
    const facturaObj = typeof facturaOId === 'object' ? facturaOId : facturas.find((f) => f.idFactura === idFactura);
    const normalizedTarget = String(idFactura).trim().toLowerCase();

    // 1. Inmediatamente actualizar estado de React y almacenamiento local
    let facturasRestantes: Factura[] = [];
    setFacturas((prevFacturas) => {
      facturasRestantes = prevFacturas.filter((f) => String(f.idFactura).trim().toLowerCase() !== normalizedTarget);
      try {
        localStorage.setItem('fa_facturas_v1', JSON.stringify(facturasRestantes));
      } catch (e) {
        console.warn('Error al persistir facturas en local:', e);
      }
      return facturasRestantes;
    });

    setProveedores((prev) => {
      const provs = generarProveedoresDesdeFacturas(facturasRestantes);
      try {
        localStorage.setItem('fa_proveedores_v1', JSON.stringify(provs));
      } catch (e) {}
      return provs;
    });

    setAlertas((prev) => {
      const alrts = generarAlertasDesdeFacturas(facturasRestantes);
      try {
        localStorage.setItem('fa_alertas_v1', JSON.stringify(alrts));
      } catch (e) {}
      return alrts;
    });

    // 2. Notificar al servidor y a Google Apps Script para eliminar en Google Sheets y Drive
    setGlobalLoading({
      activo: true,
      mensaje: `Eliminando factura ${idFactura} de Google Sheets y Drive...`,
    });
    try {
      const fileUrl = facturaObj?.driveFileUrl || (facturaObj as any)?.fileUrl || (facturaObj as any)?.archivoUrl || '';
      const res = await fetch('/api/sheets/delete-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idFactura,
          endpointUrl: sheetsConfig.endpointUrl,
          sheetId: sheetsConfig.sheetId,
          driveFolderId: sheetsConfig.driveFolderId,
          nombreProveedor: facturaObj?.nombreProveedor || facturaObj?.idProveedor || '',
          fileUrl: fileUrl,
        }),
      });
      const data = await res.json().catch(() => null);
      
      const sheetsOk = data?.sheetsDeleted;
      const driveOk = data?.driveDeleted;
      const folderOk = data?.folderDeleted;
      
      let msg = `Factura ${idFactura} eliminada correctamente de la aplicación`;
      if (sheetsOk && driveOk) {
        msg += ', de Google Sheets y de Google Drive';
        if (folderOk) {
          msg += ' (la carpeta del proveedor quedó vacía y también fue eliminada)';
        }
        msg += '.';
      } else if (sheetsOk) {
        msg += ' y de Google Sheets.';
      } else if (driveOk) {
        msg += ' y de Google Drive';
        if (folderOk) {
          msg += ' (la carpeta del proveedor quedó vacía y también fue eliminada)';
        }
        msg += '.';
      } else if (data?.scriptStatus === 'ignored') {
        msg += '. Recuerda implementar una "Nueva versión" en Google Apps Script para activar la eliminación remota en Sheets y Drive.';
      } else {
        msg += ' y solicitada eliminación en Sheets y Drive.';
      }

      setSyncToast({ tipo: 'info', mensaje: msg });
      setTimeout(() => setSyncToast(null), 6000);
      return { success: true, message: msg };
    } catch (err) {
      console.warn('Error al eliminar en backend:', err);
      const msg = `Factura ${idFactura} eliminada de la aplicación local.`;
      setSyncToast({ tipo: 'info', mensaje: msg });
      setTimeout(() => setSyncToast(null), 5000);
      return { success: true, message: msg };
    } finally {
      setGlobalLoading({ activo: false, mensaje: '' });
    }
  };

  // Handler: Save newly processed invoice to Sheets and Google Drive and State
  const handleSaveFactura = async (
    nuevaFactura: Factura,
    archivoInfo?: { base64Data?: string; fileName?: string; mimeType?: string }
  ): Promise<{
    success: boolean;
    message?: string;
    facturaGuardada?: Factura;
    driveInfo?: any;
    driveGuardado?: boolean;
    driveError?: string;
  }> => {
    setGlobalLoading({
      activo: true,
      mensaje: `Guardando factura ${nuevaFactura.idFactura || ''} en Google Sheets y Drive...`,
    });
    try {
      const response = await fetch('/api/sheets/save-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factura: nuevaFactura,
          config: sheetsConfig,
          archivo: archivoInfo,
        }),
      });

      const resData = await response.json();
      const isDriveSaved = Boolean(resData.driveGuardado);
      const facturaFinal: Factura = {
        ...nuevaFactura,
        ...(resData.factura || {}),
        archivoBase64: nuevaFactura.archivoBase64 || resData.factura?.archivoBase64 || archivoInfo?.base64Data,
        archivoNombre: nuevaFactura.archivoNombre || resData.factura?.archivoNombre || archivoInfo?.fileName,
        driveFileName: resData.factura?.driveFileName || resData.driveInfo?.nombreArchivo || `${nuevaFactura.idFactura} ${nuevaFactura.fechaEmision}.pdf`,
        driveFolderName: resData.factura?.driveFolderName || resData.driveInfo?.carpetaProveedor || nuevaFactura.nombreProveedor,
        driveFileUrl: resData.factura?.driveFileUrl || resData.driveInfo?.fileUrl,
        driveFolderUrl: resData.factura?.driveFolderUrl || resData.driveInfo?.folderUrl,
        driveGuardado: isDriveSaved,
        driveError: resData.driveError,
      };

      // Append to local state (limpiando datos de ejemplo si estábamos en modo demo)
      setFacturas((prev) => {
        const base = !isSheetDataActive ? [] : prev;
        const existe = base.some((f) => f.idFactura === facturaFinal.idFactura);
        if (existe) {
          return base.map((f) => (f.idFactura === facturaFinal.idFactura ? facturaFinal : f));
        }
        return [facturaFinal, ...base];
      });
      setIsSheetDataActive(true);
      localStorage.setItem('fa_is_sheet_data_active_v1', 'true');

      // Automatically evaluate if this new invoice creates a price increase alert
      if (nuevaFactura.lineas && nuevaFactura.lineas.length > 0) {
        nuevaFactura.lineas.forEach((linea) => {
          // Check historical purchases of this same product
          const anteriores = facturas
            .flatMap((f) => f.lineas || [])
            .filter((l) => l.nombreProducto.toLowerCase() === linea.nombreProducto.toLowerCase());

          if (anteriores.length > 0) {
            const configAlertas = obtenerConfiguracionAlertas();
            const precioPrevio = anteriores[anteriores.length - 1].precioUnitario;
            const umbralRatio = 1 + configAlertas.umbralSubidaModeradaPct / 100;
            if (linea.precioUnitario > precioPrevio * umbralRatio) {
              const varPct = ((linea.precioUnitario - precioPrevio) / precioPrevio) * 100;
              const nuevaAlerta: Alerta = {
                id: `ALT-${Date.now()}-${Math.floor(Math.random() * 100)}`,
                tipo: 'SUBIDA DE PRECIO',
                nivel: varPct >= configAlertas.umbralSubidaCriticaPct ? 'critica' : 'alta',
                titulo: `Subida detectada en ${linea.nombreProducto} (+${varPct.toFixed(1)}%)`,
                descripcion: `El precio unitario subió de ${precioPrevio.toFixed(2)} € a ${linea.precioUnitario.toFixed(2)} € (+${varPct.toFixed(1)}%) en la factura ${nuevaFactura.idFactura}.`,
                fecha: nuevaFactura.fechaEmision,
                estado: 'activa',
                datosRelacionados: {
                  proveedor: nuevaFactura.nombreProveedor,
                  producto: linea.nombreProducto,
                  precioAnterior: precioPrevio,
                  precioNuevo: linea.precioUnitario,
                  variacionPorcentaje: varPct,
                },
              };
              setAlertas((prev) => [nuevaAlerta, ...prev]);
            }
          }
        });
      }

      return {
        success: true,
        message: resData.mensaje || 'Factura registrada con éxito',
        facturaGuardada: facturaFinal,
        driveInfo: resData.driveInfo,
        driveGuardado: isDriveSaved,
        driveError: resData.driveError,
      };
    } catch (err: any) {
      console.error('Error al guardar factura:', err);
      // Fallback local save
      setFacturas((prev) => [nuevaFactura, ...prev]);
      return { success: true, message: 'Guardada en memoria local' };
    } finally {
      setGlobalLoading({ activo: false, mensaje: '' });
    }
  };

  // Handler para subir a Google Drive a posteriori (o reintentar)
  const handleUploadToDrive = async (factura: Factura) => {
    if (!factura.archivoBase64) {
      alert('Esta factura no tiene el archivo digital en memoria para subir a Google Drive.');
      return { success: false, error: 'Sin archivo digital en memoria' };
    }
    setGlobalLoading({
      activo: true,
      mensaje: `Archivando ${factura.idFactura} en Google Drive...`,
    });
    try {
      const res = await fetch('/api/sheets/upload-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idFactura: factura.idFactura,
          config: sheetsConfig,
          archivo: {
            base64Data: factura.archivoBase64,
            fileName: factura.archivoNombre || `${factura.idFactura} ${factura.fechaEmision}.pdf`,
            mimeType: factura.archivoNombre?.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf',
          },
          nombreProveedor: factura.nombreProveedor,
          fechaEmision: factura.fechaEmision,
        }),
      });
      const data = await res.json();
      if (data.success && data.drive) {
        setFacturas((prev) =>
          prev.map((f) => {
            if (f.idFactura === factura.idFactura) {
              return {
                ...f,
                driveGuardado: true,
                driveFileUrl: data.drive.fileUrl,
                driveFolderUrl: data.drive.carpetaProveedorUrl,
                driveFileName: data.drive.fileName,
                driveFolderName: data.drive.carpetaProveedor,
                driveError: undefined,
              };
            }
            return f;
          })
        );
        setSyncToast({
          tipo: 'success',
          mensaje: `Factura ${factura.idFactura} archivada en Google Drive (Carpeta: ${data.drive.carpetaProveedor || factura.nombreProveedor})`,
        });
        return { success: true, drive: data.drive };
      } else {
        const err = data.error || 'Fallo al subir a Google Drive';
        setFacturas((prev) =>
          prev.map((f) => (f.idFactura === factura.idFactura ? { ...f, driveError: err } : f))
        );
        setSyncToast({
          tipo: 'error',
          mensaje: `Error al subir a Drive: ${err}`,
        });
        return { success: false, error: err };
      }
    } catch (e: any) {
      const msg = e?.message || 'Error de conexión con Google Drive';
      setSyncToast({ tipo: 'error', mensaje: msg });
      return { success: false, error: msg };
    } finally {
      setGlobalLoading({ activo: false, mensaje: '' });
    }
  };

  // Handlers for Alerts
  const handleResolverAlerta = (id: string) => {
    setAlertas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado: 'resuelta' } : a))
    );
  };

  const handleIgnorarAlerta = (id: string) => {
    setAlertas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado: 'ignorada' } : a))
    );
  };

  // Handler: Reset to original authentic demo data
  const handleResetData = () => {
    setFacturas(INITIAL_FACTURAS);
    setProveedores(INITIAL_PROVEEDORES);
    setAlertas(INITIAL_ALERTAS);
    setAnalisis(INITIAL_ANALISIS_EJECUTIVO);
    setIsSheetDataActive(false);
    localStorage.removeItem('fa_facturas_v1');
    localStorage.removeItem('fa_alertas_v1');
    localStorage.removeItem('fa_analisis_v1');
    localStorage.removeItem('fa_is_sheet_data_active_v1');
    setIsConfigOpen(false);
    setSyncToast({ tipo: 'info', mensaje: 'Se han restaurado los datos de demostración.' });
    setTimeout(() => setSyncToast(null), 4000);
  };

  const alertasActivasCount = alertas.filter((a) => a.estado === 'activa').length;

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Global Async Loading Bar & Floating Status Indicator */}
      <GlobalLoadingBar loading={globalLoading} />

      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertasActivasCount={alertasActivasCount}
        facturasCount={facturas.length}
        sheetsConfig={sheetsConfig}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        isChatOpen={isChatOpen}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        datosNegocio={datosNegocio}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-[#0a0f18]/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline max-w-[200px] truncate" title={datosNegocio.nombre}>
              {datosNegocio.nombre}
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-xs font-semibold text-rose-400 capitalize">
              {activeTab === 'resumen'
                ? 'Panel de Control Financiero'
                : activeTab === 'facturas'
                ? 'Gestión Contable de Facturas'
                : activeTab === 'proveedores'
                ? 'Directorio de Proveedores'
                : activeTab === 'precios'
                ? 'Auditoría de Precios'
                : activeTab === 'alertas'
                ? 'Alertas de Riesgo'
                : activeTab === 'iva'
                ? 'Resumen Fiscal de IVA'
                : 'Análisis Ejecutivo Gemini'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Selector de Modo Claro / Oscuro */}
            <button
              id="theme-toggle-header-btn"
              onClick={handleToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Cambiar modo claro u oscuro"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden md:inline">Modo Oscuro</span>
                </>
              )}
            </button>

            {/* Botón y Estado de Sincronización con Google Sheets */}
            <button
              onClick={() => sincronizarFacturasHoja(true)}
              disabled={isSyncingSheets}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
              title="Sincronizar facturas desde la hoja 'Facturas'"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isSyncingSheets ? 'Sincronizando...' : 'Sincronizar Hoja'}</span>
            </button>

            <div
              className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-medium transition-colors ${
                isSheetDataActive
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-blue-950/50 border-blue-500/30 text-blue-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isSheetDataActive ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`}></span>
              <span>{isSheetDataActive ? `Hoja "Facturas" (${facturas.length} reales)` : 'Modo Demostración'}</span>
            </div>

            {/* Quick Chat with Gemini Button */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pregunta a tus facturas</span>
            </button>

            {/* Alert Indicator */}
            {alertasActivasCount > 0 && (
              <button
                onClick={() => setActiveTab('alertas')}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 relative transition-colors"
                title={`${alertasActivasCount} alertas activas`}
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1"></span>
              </button>
            )}

            {/* Settings Trigger */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Notificación Toast de Sincronización */}
        {syncToast && (
          <div
            className={`mx-4 sm:mx-6 lg:mx-8 mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              syncToast.tipo === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                : syncToast.tipo === 'info'
                ? 'bg-blue-950/70 border-blue-500/50 text-blue-200'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {syncToast.tipo === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : syncToast.tipo === 'info' ? (
                <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium leading-relaxed">{syncToast.mensaje}</span>
            </div>
            <button
              onClick={() => setSyncToast(null)}
              className="text-slate-400 hover:text-slate-200 ml-4 font-bold text-base leading-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* View Component Rendering */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'resumen' && (
            <ResumenView
              facturas={facturas}
              proveedores={proveedores}
              alertas={alertas}
              datosNegocio={datosNegocio}
              onNavigate={setActiveTab}
              onOpenUpload={() => setActiveTab('facturas')}
              onOpenAnalysis={() => setActiveTab('analisis-ia')}
              onOpenPdfReport={() => setIsPdfReportOpen(true)}
            />
          )}

          {activeTab === 'facturas' && (
            <FacturasView
              facturas={facturas}
              proveedores={proveedores}
              sheetsConfig={sheetsConfig}
              datosNegocio={datosNegocio}
              onSaveFactura={handleSaveFactura}
              onDeleteFactura={handleDeleteFactura}
              onOpenConfig={() => setIsConfigOpen(true)}
              onSetGlobalLoading={setGlobalLoading}
              isGlobalLoading={globalLoading.activo}
              onUploadToDrive={handleUploadToDrive}
            />
          )}

          {activeTab === 'proveedores' && (
            <ProveedoresView
              proveedores={proveedores}
              facturas={facturas}
              datosNegocio={datosNegocio}
              onUploadToDrive={handleUploadToDrive}
              onDeleteFactura={handleDeleteFactura}
            />
          )}

          {activeTab === 'precios' && (
            <EvolucionPreciosView
              facturas={facturas}
            />
          )}

          {activeTab === 'alertas' && (
            <AlertasView
              alertas={alertas}
              onResolverAlerta={handleResolverAlerta}
              onIgnorarAlerta={handleIgnorarAlerta}
              onVerFactura={(id) => {
                setActiveTab('facturas');
              }}
              facturas={facturas}
              onActualizarAlertas={(nuevas) => {
                setAlertas(nuevas);
                try {
                  localStorage.setItem('fa_alertas_v1', JSON.stringify(nuevas));
                } catch (e) {}
              }}
            />
          )}

          {activeTab === 'iva' && (
            <IvaView facturas={facturas} />
          )}

          {activeTab === 'analisis-ia' && (
            <AnalisisIAView
              analisis={analisis}
              facturas={facturas}
              proveedores={proveedores}
              alertas={alertas}
              datosNegocio={datosNegocio}
              onOpenPdfReport={() => setIsPdfReportOpen(true)}
              onUpdateAnalisis={setAnalisis}
            />
          )}
        </div>
      </main>

      {/* Natural Language Query Chat Assistant (Gemini) */}
      <ChatFacturasModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        facturas={facturas}
        proveedores={proveedores}
        alertas={alertas}
        datosNegocio={datosNegocio}
      />

      {/* 9-Page Printable Executive PDF Report */}
      <InformePdfModal
        isOpen={isPdfReportOpen}
        onClose={() => setIsPdfReportOpen(false)}
        facturas={facturas}
        proveedores={proveedores}
        alertas={alertas}
        analisis={analisis}
        datosNegocio={datosNegocio}
      />

      {/* Configuration & Google Sheets / Gemini Connections Modal */}
      <ConfiguracionModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={sheetsConfig}
        onSaveConfig={setSheetsConfig}
        onResetData={handleResetData}
        onSyncFacturas={() => sincronizarFacturasHoja(true)}
        theme={theme}
        onSetTheme={setTheme}
        datosNegocio={datosNegocio}
        onSaveDatosNegocio={setDatosNegocio}
      />
    </div>
  );
}
