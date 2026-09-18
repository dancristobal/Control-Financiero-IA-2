import React, { useState } from 'react';
import {
  X,
  Settings,
  Cloud,
  Key,
  Copy,
  Check,
  FileSpreadsheet,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Code,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sun,
  Moon,
  Palette,
  Building2,
  Sliders,
  Clock,
  TrendingUp,
  Percent,
  ShieldAlert,
  RotateCcw,
  Calendar,
  Layers,
  Save,
  Info,
  CalendarDays,
} from 'lucide-react';
import {
  GoogleSheetsConfig,
  DatosNegocio,
  DEFAULT_DATOS_NEGOCIO,
  ParametrosSistema,
  DEFAULT_PARAMETROS_SISTEMA,
} from '../types';
import { ThemeMode } from '../utils/theme';
import {
  obtenerParametrosSistema,
  guardarParametrosSistema,
  restablecerParametrosSistema,
} from '../utils/parametrosSistema';

interface ConfiguracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig;
  onSaveConfig: (nuevaConfig: GoogleSheetsConfig) => void;
  onResetData: () => void;
  onSyncFacturas?: () => Promise<{ success: boolean; count: number; message?: string }>;
  theme?: ThemeMode;
  onSetTheme?: (theme: ThemeMode) => void;
  datosNegocio?: DatosNegocio;
  onSaveDatosNegocio?: (datos: DatosNegocio) => void;
}

export const ConfiguracionModal: React.FC<ConfiguracionModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetData,
  onSyncFacturas,
  theme = 'dark',
  onSetTheme,
  datosNegocio,
  onSaveDatosNegocio,
}) => {
  const [sheetId, setSheetId] = useState(config.sheetId || '');
  const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl || '');
  const [driveFolderId, setDriveFolderId] = useState(config.driveFolderId || '');
  const [negocio, setNegocio] = useState<DatosNegocio>(() => {
    if (datosNegocio && datosNegocio.nombre) {
      return {
        ...DEFAULT_DATOS_NEGOCIO,
        ...datosNegocio,
        sector: datosNegocio.sector || DEFAULT_DATOS_NEGOCIO.sector,
        contextoOperativo: datosNegocio.contextoOperativo || DEFAULT_DATOS_NEGOCIO.contextoOperativo,
      };
    }
    try {
      const saved = localStorage.getItem('fa_datos_negocio_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.nombre) {
          return {
            ...DEFAULT_DATOS_NEGOCIO,
            ...parsed,
            sector: parsed.sector || DEFAULT_DATOS_NEGOCIO.sector,
            contextoOperativo: parsed.contextoOperativo || DEFAULT_DATOS_NEGOCIO.contextoOperativo,
          };
        }
      }
    } catch (e) {
      console.warn('Error al cargar datos negocio en config', e);
    }
    return DEFAULT_DATOS_NEGOCIO;
  });
  const [copiado, setCopiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitosoNegocio, setGuardadoExitosoNegocio] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSincronizacion, setResultadoSincronizacion] = useState<{
    success: boolean;
    count: number;
    mensaje: string;
  } | null>(null);
  const [resultadoVerificacion, setResultadoVerificacion] = useState<{
    accessible: boolean;
    mensaje: string;
    code?: string;
  } | null>(null);
  const [parametros, setParametros] = useState<ParametrosSistema>(() => obtenerParametrosSistema());
  const [guardadoExitosoParametros, setGuardadoExitosoParametros] = useState(false);
  const [tabActiva, setTabActiva] = useState<
    'negocio' | 'parametros' | 'sheets' | 'gemini' | 'script' | 'apariencia'
  >('negocio');

  if (!isOpen) return null;

  const handleVerificarConexion = async () => {
    setVerificando(true);
    setResultadoVerificacion(null);
    try {
      const queryParams = new URLSearchParams({
        endpointUrl: endpointUrl.trim(),
        sheetId: sheetId.trim(),
        driveFolderId: driveFolderId.trim(),
      });
      const res = await fetch(`/api/sheets/verify?${queryParams.toString()}`, {
        signal: AbortSignal.timeout(25000),
      });
      const data = await res.json();
      setResultadoVerificacion(data);
    } catch (e: any) {
      setResultadoVerificacion({
        accessible: false,
        code: 'ERROR',
        mensaje: e?.name === 'TimeoutError'
          ? 'Tiempo de espera agotado al verificar conexión (timeout 25s). Asegúrate de que la Web App en Apps Script tenga el acceso público configurado en "Cualquier usuario".'
          : (e?.message || 'Error de red al comprobar acceso con el servidor.'),
      });
    } finally {
      setVerificando(false);
    }
  };

  const handleSincronizarHoja = async () => {
    setSincronizando(true);
    setResultadoSincronizacion(null);
    try {
      if (onSyncFacturas) {
        const res = await onSyncFacturas();
        setResultadoSincronizacion({
          success: res.success,
          count: res.count,
          mensaje: res.message || `Sincronización completada. ${res.count} facturas reales cargadas.`,
        });
      } else {
        const res = await fetch('/api/sheets/fetch-invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({ sheetId, endpointUrl }),
        });
        const data = await res.json();
        setResultadoSincronizacion({
          success: data.success,
          count: data.count || 0,
          mensaje: data.count > 0
            ? `Se han cargado ${data.count} facturas reales desde la hoja "Facturas". Los datos de ejemplo se han reemplazado.`
            : (data.error || 'Conexión activa pero la hoja "Facturas" aún no contiene filas de datos.'),
        });
      }
    } catch (e: any) {
      setResultadoSincronizacion({
        success: false,
        count: 0,
        mensaje: e?.name === 'TimeoutError'
          ? 'Tiempo de espera agotado al conectar con Google Sheets (timeout 25s).'
          : (e?.message || 'Error al conectar con la hoja de Google Sheets.'),
      });
    } finally {
      setSincronizando(false);
    }
  };

  const handleSave = () => {
    setGuardando(true);
    
    // Guardar parámetros del sistema en localStorage
    guardarParametrosSistema(parametros);

    // Guardar datos del negocio
    if (onSaveDatosNegocio) {
      onSaveDatosNegocio(negocio);
    }
    try {
      localStorage.setItem('fa_datos_negocio_v1', JSON.stringify(negocio));
    } catch (e) {
      console.warn('Error al guardar datos del negocio', e);
    }

    onSaveConfig({
      sheetId: sheetId.trim(),
      endpointUrl: endpointUrl.trim(),
      driveFolderId: driveFolderId.trim(),
      status: endpointUrl.trim() ? 'sincronizado' : 'pendiente',
      lastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sheetUrl: '',
      autoSync: false,
    });
    setTimeout(() => {
      setGuardando(false);
      onClose();
    }, 400);
  };

  const handleGuardarParametrosDirecto = () => {
    guardarParametrosSistema(parametros);
    setGuardadoExitosoParametros(true);
    setTimeout(() => setGuardadoExitosoParametros(false), 2500);
  };

  const handleRestablecerParametros = () => {
    const defaults = restablecerParametrosSistema();
    setParametros(defaults);
    setGuardadoExitosoParametros(true);
    setTimeout(() => setGuardadoExitosoParametros(false), 2500);
  };

  const handleGuardarNegocioDirecto = () => {
    if (onSaveDatosNegocio) {
      onSaveDatosNegocio(negocio);
    }
    try {
      localStorage.setItem('fa_datos_negocio_v1', JSON.stringify(negocio));
    } catch (e) {
      console.warn('Error al guardar datos del negocio', e);
    }
    setGuardadoExitosoNegocio(true);
    setTimeout(() => setGuardadoExitosoNegocio(false), 2500);
  };

  const nombreEmpresaSeguro = (negocio.nombre || 'Mi Negocio').replace(/["\\]/g, '').trim();
  const nombreCarpetaDrive = `Facturas ${nombreEmpresaSeguro}`;

  const appsScriptCode = `/**
 * FINANCE AI — Google Apps Script Web App
 * Sincronización de facturas en Google Sheets y archivado automático en Google Drive
 * para "${nombreEmpresaSeguro}"
 */

/**
 * ⚡ PASO 1 OBLIGATORIO (Ejecutar una sola vez desde el editor de Apps Script):
 * Selecciona "autorizarPermisosDrive" en la barra superior y pulsa el botón "Ejecutar" (▶).
 * Google te solicitará autorizar permisos para acceder a Google Drive y Sheets
 * (Haz clic en "Revisar permisos" > Elige tu cuenta > "Avanzado" > "Ir a proyecto (no seguro)" > "Permitir").
 */
function autorizarPermisosDrive() {
  try {
    var rootFolders = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
    var folder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("${nombreCarpetaDrive}");
    Logger.log("✅ Permisos de Google Drive autorizados con éxito.");
    Logger.log("Carpeta principal disponible: " + folder.getName() + " (ID: " + folder.getId() + ")");
    return "OK: Permisos concedidos. Carpeta: " + folder.getName();
  } catch (err) {
    Logger.log("❌ Error en autorización de Drive: " + err);
    throw err;
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";
  if (action === "getFacturas" || action === "readFacturas") {
    return handleGetFacturas(e && e.parameter && e.parameter.sheetId, (e && e.parameter && e.parameter.tab) || "Facturas");
  }
  if (action === "deleteInvoice") {
    return handleDeleteInvoice({
      idFactura: (e && e.parameter && e.parameter.idFactura) || "",
      sheetId: (e && e.parameter && e.parameter.sheetId) || "",
      tab: (e && e.parameter && e.parameter.tab) || "Facturas",
      fileUrl: (e && e.parameter && e.parameter.fileUrl) || "",
      driveFolderId: (e && e.parameter && e.parameter.driveFolderId) || "",
      nombreProveedor: (e && e.parameter && e.parameter.nombreProveedor) || ""
    });
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Google Apps Script activo y listo para sincronizar con Finance AI y Google Drive",
    tab: "Facturas"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var tabName = data.tab || "Facturas";

    // 1. Lectura de facturas existentes en la hoja
    if (data.action === "getFacturas" || data.action === "readFacturas" || data.action === "getInvoices") {
      return handleGetFacturas(data.sheetId, tabName);
    }
    
    // 2. Ping de verificación y estado de Google Drive
    if (data.action === "ping") {
      var driveMsg = "Google Drive listo";
      var driveAuthorized = false;
      try {
        if (data.driveFolderId && data.driveFolderId.trim() !== "") {
          var fId = extractDriveFolderId(data.driveFolderId);
          var tf = DriveApp.getFolderById(fId);
          driveMsg = "Carpeta configurada de Drive: " + tf.getName();
          driveAuthorized = true;
        } else {
          var rootFolders = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
          var f = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("${nombreCarpetaDrive}");
          driveMsg = "Carpeta '${nombreCarpetaDrive}' verificada en tu Google Drive";
          driveAuthorized = true;
        }
      } catch(fErr) {
        driveMsg = "Aviso Google Drive (requiere autorización en el editor): " + fErr.toString();
        driveAuthorized = false;
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Conexión activa con Google Sheets y Google Drive",
        driveStatus: driveMsg,
        driveAuthorized: driveAuthorized
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var ss = data.sheetId ? SpreadsheetApp.openById(data.sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);
    
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      // Encabezados requeridos:
      sheet.appendRow([
        "ID Factura", "Fecha de Emisión", "ID Proveedor", "Nombre proveedor", "Concepto",
        "Importe", "Fecha de Vencimiento", "Estado", "Fecha de Pago",
        "Base imponible", "Tipo/s de IVA", "Cuota IVA", "Total", "Categoría de gasto", "Enlace Google Drive"
      ]);
    }

    // 3. Inserción de factura y guardado en Google Drive
    if (data.action === "appendInvoice") {
      var driveResult = null;

      // PROCESO DE GUARDADO EN GOOGLE DRIVE:
      // 1. Toma el nombre del proveedor
      // 2. Si no existe la carpeta con el nombre del proveedor, la crea
      // 3. Guarda el archivo como "[ID Factura] [Fecha]" (ej: "FAC-2026-001 2026-01-14.pdf")
      if (data.archivo && data.archivo.base64) {
        driveResult = guardarFacturaEnDrive({
          driveFolderId: data.driveFolderId,
          nombreProveedor: data.nombreProveedor || (data.row ? data.row[3] : "Varios"),
          idFactura: data.idFactura || (data.row ? data.row[0] : "FAC"),
          fechaEmision: data.fechaEmision || (data.row ? data.row[1] : ""),
          archivo: data.archivo
        });
      } else {
        driveResult = {
          success: false,
          error: "No se recibieron datos binarios del archivo (base64 no adjunto)"
        };
      }

      if (data.row) {
        var rowData = data.row.slice();
        var driveFileUrl = (driveResult && driveResult.fileUrl) ? driveResult.fileUrl : "";
        rowData.push(driveFileUrl);
        sheet.appendRow(rowData);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: (driveResult && driveResult.success) ? "success" : "partial",
        message: (driveResult && driveResult.success)
          ? "Factura registrada en Google Sheets y guardada en Google Drive"
          : "Factura registrada en Google Sheets (Aviso Drive: " + ((driveResult && driveResult.error) || "Sin archivo") + ")",
        drive: driveResult
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Acción directa: guardar sólo en Google Drive y actualizar la fila en la hoja si existe
    if (data.action === "saveToDrive") {
      var directDrive = guardarFacturaEnDrive(data);
      if (directDrive && directDrive.success && directDrive.fileUrl) {
        try {
          var ssDirect = data.sheetId ? SpreadsheetApp.openById(data.sheetId) : SpreadsheetApp.getActiveSpreadsheet();
          var sDirect = ssDirect.getSheetByName(tabName);
          if (sDirect && data.idFactura) {
            var lr = sDirect.getLastRow();
            if (lr >= 2) {
              var idRows = sDirect.getRange(2, 1, lr - 1, 1).getValues();
              for (var ri = 0; ri < idRows.length; ri++) {
                if (String(idRows[ri][0] || "").trim().toLowerCase() === String(data.idFactura).trim().toLowerCase()) {
                  // Columna 15 es "Enlace Google Drive"
                  sDirect.getRange(ri + 2, 15).setValue(directDrive.fileUrl);
                  break;
                }
              }
            }
          }
        } catch (updateErr) {
          Logger.log("Aviso al actualizar enlace en hoja: " + updateErr);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", drive: directDrive }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Eliminar factura de forma coordinada de Google Sheets y Google Drive
    if (data.action === "deleteInvoice") {
      return handleDeleteInvoice(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ignored", action: data.action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * LÓGICA DE ALMACENAMIENTO EN GOOGLE DRIVE:
 * 1.- Toma el nombre del proveedor de la factura
 * 2.- Si no existe una carpeta con el nombre del proveedor debe crearla.
 * 3.- Si existe una carpeta con el nombre del proveedor debe guardar la factura en esa carpeta
 *     con el nombre del ID factura y Fecha de factura por ejemplo FAC-2026-001 2026-01-14
 */
function guardarFacturaEnDrive(params) {
  try {
    if (!params || !params.archivo || !params.archivo.base64) {
      return {
        success: false,
        error: "No se proporcionó contenido del archivo (base64 vacío)"
      };
    }

    var rawFolderId = params.driveFolderId;
    var carpetaPadre = null;

    // Obtener la carpeta concreta destino en Google Drive si fue indicada
    if (rawFolderId && rawFolderId.trim() !== "") {
      var folderId = extractDriveFolderId(rawFolderId);
      try {
        carpetaPadre = DriveApp.getFolderById(folderId);
      } catch (err) {
        Logger.log("Aviso: no se pudo abrir la carpeta por ID: " + err);
      }
    }

    // Si no se proporcionó o no se encontró, buscar o crear la carpeta "${nombreCarpetaDrive}"
    if (!carpetaPadre) {
      var rootFolders = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
      carpetaPadre = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("${nombreCarpetaDrive}");
    }

    // 1.- Tomar el nombre del proveedor de la factura
    var nombreProveedor = (params.nombreProveedor || "Proveedores Varios").toString().trim();
    if (!nombreProveedor) nombreProveedor = "Proveedores Varios";

    // 2.- Si no existe una carpeta con el nombre del proveedor debe crearla; si existe la utiliza
    var subCarpetas = carpetaPadre.getFoldersByName(nombreProveedor);
    var carpetaProveedor;
    var esNuevaCarpeta = false;

    if (subCarpetas.hasNext()) {
      carpetaProveedor = subCarpetas.next();
    } else {
      carpetaProveedor = carpetaPadre.createFolder(nombreProveedor);
      esNuevaCarpeta = true;
    }

    // Obtener extensión del archivo (.pdf, .png, etc.)
    var originalName = (params.archivo && params.archivo.nombre) || "factura.pdf";
    var extension = ".pdf";
    var dotIdx = originalName.lastIndexOf(".");
    if (dotIdx !== -1) {
      extension = originalName.substring(dotIdx);
    }

    // 3.- Guardar con el nombre del ID factura y Fecha de factura (ej: FAC-2026-001 2026-01-14.pdf)
    var idFactura = (params.idFactura || "FAC").toString().trim();
    var fechaEmision = (params.fechaEmision || Utilities.formatDate(new Date(), "GMT+1", "yyyy-MM-dd")).toString().trim();
    var nuevoNombreArchivo = idFactura + " " + fechaEmision + extension;

    // Decodificar Base64 y crear el archivo en la carpeta del proveedor
    var base64Limpio = String(params.archivo.base64 || "");
    var commaIdx = base64Limpio.indexOf(",");
    if (commaIdx !== -1) {
      base64Limpio = base64Limpio.substring(commaIdx + 1);
    }
    base64Limpio = base64Limpio.replace(/\s+/g, "");
    var mimeType = params.archivo.mimeType || "application/pdf";
    var bytes = Utilities.base64Decode(base64Limpio);
    var blob = Utilities.newBlob(bytes, mimeType, nuevoNombreArchivo);

    var archivoDrive = carpetaProveedor.createFile(blob);
    try {
      archivoDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eShare) {
      Logger.log("Aviso al establecer permisos públicos: " + eShare);
    }

    return {
      success: true,
      fileId: archivoDrive.getId(),
      fileName: nuevoNombreArchivo,
      fileUrl: archivoDrive.getUrl(),
      carpetaProveedor: nombreProveedor,
      carpetaProveedorId: carpetaProveedor.getId(),
      carpetaProveedorUrl: carpetaProveedor.getUrl(),
      carpetaPadreNombre: carpetaPadre.getName(),
      carpetaNuevaCreada: esNuevaCarpeta
    };
  } catch (err) {
    Logger.log("Error al guardar en Drive: " + err);
    return {
      success: false,
      error: err.toString()
    };
  }
}

function handleDeleteInvoice(data) {
  try {
    var idToDelete = String(data.idFactura || "").trim();
    var tabName = data.tab || "Facturas";
    var ss = (data.sheetId && String(data.sheetId).trim().length > 10)
      ? SpreadsheetApp.openById(String(data.sheetId).trim())
      : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);
    
    var deletedSheet = false;
    var fileUrlFound = String(data.fileUrl || "").trim();
    
    if (sheet && idToDelete) {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow > 1) {
        var range = sheet.getRange(2, 1, lastRow - 1, Math.max(lastCol, 1));
        var values = range.getValues();
        var displayValues = range.getDisplayValues();
        
        for (var r = values.length - 1; r >= 0; r--) {
          var cellVal = String(values[r][0] || "").trim();
          var cellDisplay = String(displayValues[r][0] || "").trim();
          
          var isMatch = (cellVal === idToDelete || cellDisplay === idToDelete ||
                         cellVal.toLowerCase() === idToDelete.toLowerCase() ||
                         cellDisplay.toLowerCase() === idToDelete.toLowerCase());
          
          if (!isMatch && idToDelete.length >= 3) {
            if (cellVal.indexOf(idToDelete) !== -1 || cellDisplay.indexOf(idToDelete) !== -1 ||
                idToDelete.indexOf(cellVal) !== -1 || idToDelete.indexOf(cellDisplay) !== -1) {
              isMatch = true;
            }
          }
          
          if (isMatch) {
            for (var c = 0; c < values[r].length; c++) {
              var val = String(values[r][c] || "");
              if (val.indexOf("drive.google.com") !== -1) {
                fileUrlFound = val;
              }
            }
            sheet.deleteRow(r + 2);
            deletedSheet = true;
          }
        }
      }
    }

    var driveResult = eliminarFacturaDeDrive(idToDelete, fileUrlFound, data.driveFolderId, data.nombreProveedor);
    var deletedDrive = false;
    var deletedFolder = false;
    if (typeof driveResult === "object" && driveResult !== null) {
      deletedDrive = Boolean(driveResult.fileDeleted);
      deletedFolder = Boolean(driveResult.folderDeleted);
    } else {
      deletedDrive = Boolean(driveResult);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      deleted: deletedSheet,
      deletedSheet: deletedSheet,
      deletedDrive: deletedDrive,
      deletedFolder: deletedFolder,
      idFactura: idToDelete
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      deleted: false,
      deletedSheet: false,
      deletedDrive: false,
      deletedFolder: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Elimina o envía a la papelera el archivo de la factura en Google Drive.
 * Si la factura eliminada era la última de su carpeta y queda vacía, elimina también la carpeta.
 */
function eliminarFacturaDeDrive(idFactura, fileUrl, rawFolderId, nombreProveedor) {
  var deleted = false;
  var folderDeleted = false;
  var foldersToCheck = [];

  try {
    // Proteger carpetas raíz principales para nunca borrarlas
    var protectedFolderIds = {};
    try {
      var rootFolder = DriveApp.getRootFolder();
      if (rootFolder) protectedFolderIds[rootFolder.getId()] = true;
    } catch (e) {}

    if (rawFolderId && String(rawFolderId).trim() !== "") {
      try {
        var configuredId = extractDriveFolderId(rawFolderId);
        if (configuredId) protectedFolderIds[configuredId] = true;
      } catch (e) {}
    }

    try {
      var customRoots = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
      while (customRoots.hasNext()) {
        protectedFolderIds[customRoots.next().getId()] = true;
      }
      var legacyRoots = DriveApp.getFoldersByName("Facturas Dulce Capricho");
      while (legacyRoots.hasNext()) {
        protectedFolderIds[legacyRoots.next().getId()] = true;
      }
    } catch (e) {}

    function registrarPadres(file) {
      if (!file) return;
      try {
        var parents = file.getParents();
        while (parents.hasNext()) {
          var p = parents.next();
          if (p && !protectedFolderIds[p.getId()]) {
            foldersToCheck.push(p);
          }
        }
      } catch (e) {}
    }

    // 1. Borrado directo por URL o ID de archivo
    if (fileUrl && fileUrl.indexOf("drive.google.com") !== -1) {
      var fileId = "";
      if (fileUrl.indexOf("/d/") !== -1) {
        var dParts = fileUrl.split("/d/")[1];
        fileId = dParts.split("/")[0].split("?")[0].trim();
      } else if (fileUrl.indexOf("id=") !== -1) {
        var idParts = fileUrl.split("id=")[1];
        fileId = idParts.split("&")[0].split("#")[0].trim();
      }
      if (fileId) {
        try {
          var targetFile = DriveApp.getFileById(fileId);
          if (targetFile) {
            registrarPadres(targetFile);
            targetFile.setTrashed(true);
            deleted = true;
            Logger.log("✅ Archivo enviado a la papelera por ID: " + fileId);
          }
        } catch (e) {
          Logger.log("Aviso al borrar por ID de archivo: " + e);
        }
      }
    }

    // 2. Búsqueda en carpetas de proveedores y en carpeta principal
    if (!deleted && idFactura) {
      var carpetas = [];
      if (rawFolderId && String(rawFolderId).trim() !== "") {
        try {
          var fId = extractDriveFolderId(rawFolderId);
          if (fId) carpetas.push(DriveApp.getFolderById(fId));
        } catch(e) {}
      }
      try {
        var rootFolders = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
        while (rootFolders.hasNext()) {
          carpetas.push(rootFolders.next());
        }
        var legacyRoots2 = DriveApp.getFoldersByName("Facturas Dulce Capricho");
        while (legacyRoots2.hasNext()) {
          carpetas.push(legacyRoots2.next());
        }
      } catch(e) {}

      for (var k = 0; k < carpetas.length; k++) {
        var cPadre = carpetas[k];
        var subFolders = cPadre.getFolders();
        while (subFolders.hasNext()) {
          var subF = subFolders.next();
          var provMatch = !nombreProveedor || subF.getName().toLowerCase().indexOf(nombreProveedor.toLowerCase()) !== -1 || nombreProveedor.toLowerCase().indexOf(subF.getName().toLowerCase()) !== -1;
          if (provMatch) {
            var files = subF.getFiles();
            while (files.hasNext()) {
              var f = files.next();
              var fName = f.getName();
              if (fName.indexOf(idFactura) !== -1) {
                registrarPadres(f);
                if (!protectedFolderIds[subF.getId()]) {
                  foldersToCheck.push(subF);
                }
                f.setTrashed(true);
                deleted = true;
                Logger.log("✅ Archivo enviado a papelera en subcarpeta " + subF.getName() + ": " + fName);
              }
            }
          }
        }
        
        var rootFiles = cPadre.getFiles();
        while (rootFiles.hasNext()) {
          var rf = rootFiles.next();
          if (rf.getName().indexOf(idFactura) !== -1) {
            rf.setTrashed(true);
            deleted = true;
          }
        }
      }
    }

    // 3. Fallback con búsqueda global segura
    if (!deleted && idFactura) {
      try {
        var cleanId = idFactura.replace(/["']/g, "").trim();
        if (cleanId.length >= 2) {
          var filesSearch = DriveApp.searchFiles("title contains '" + cleanId + "' and trashed = false");
          while (filesSearch.hasNext()) {
            var sf = filesSearch.next();
            if (sf.getName().indexOf(idFactura) !== -1) {
              registrarPadres(sf);
              sf.setTrashed(true);
              deleted = true;
            }
          }
        }
      } catch (searchErr) {
        Logger.log("Aviso en búsqueda global: " + searchErr);
      }
    }

    // Si se especificó nombre de proveedor, añadir su subcarpeta para verificación de vaciado
    if (nombreProveedor) {
      try {
        var provClean = nombreProveedor.toLowerCase().trim();
        var allRoots = [];
        if (rawFolderId) {
          try {
            var cfId = extractDriveFolderId(rawFolderId);
            if (cfId) allRoots.push(DriveApp.getFolderById(cfId));
          } catch(e) {}
        }
        var dRoots = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
        while (dRoots.hasNext()) allRoots.push(dRoots.next());
        var dRootsLegacy = DriveApp.getFoldersByName("Facturas Dulce Capricho");
        while (dRootsLegacy.hasNext()) allRoots.push(dRootsLegacy.next());
        
        for (var rIdx = 0; rIdx < allRoots.length; rIdx++) {
          var subs = allRoots[rIdx].getFolders();
          while (subs.hasNext()) {
            var sfb = subs.next();
            if (sfb.getName().toLowerCase().trim() === provClean || sfb.getName().toLowerCase().indexOf(provClean) !== -1) {
              if (!protectedFolderIds[sfb.getId()]) {
                foldersToCheck.push(sfb);
              }
            }
          }
        }
      } catch (e) {}
    }

    // 4. Si la carpeta del proveedor quedó vacía tras borrar la factura, eliminar la carpeta
    var processedFolderIds = {};
    for (var i = 0; i < foldersToCheck.length; i++) {
      var folder = foldersToCheck[i];
      if (!folder) continue;
      try {
        var fldId = folder.getId();
        if (processedFolderIds[fldId]) continue;
        processedFolderIds[fldId] = true;

        if (protectedFolderIds[fldId]) continue;
        if (folder.getName() === "${nombreCarpetaDrive}" || folder.getName() === "Facturas Dulce Capricho") continue;

        // Comprobar si tiene algún archivo activo
        var hasActiveFiles = false;
        var fIter = folder.getFiles();
        while (fIter.hasNext()) {
          var testF = fIter.next();
          if (!testF.isTrashed()) {
            hasActiveFiles = true;
            break;
          }
        }

        // Comprobar si tiene alguna subcarpeta activa
        var hasActiveSubs = false;
        if (!hasActiveFiles) {
          var subIter = folder.getFolders();
          while (subIter.hasNext()) {
            var testSub = subIter.next();
            if (!testSub.isTrashed()) {
              hasActiveSubs = true;
              break;
            }
          }
        }

        // Si no tiene archivos ni subcarpetas activos, está vacía: enviar a la papelera
        if (!hasActiveFiles && !hasActiveSubs) {
          Logger.log("🗑️ Carpeta vacía tras eliminar factura: " + folder.getName() + ". Eliminando carpeta de Drive...");
          folder.setTrashed(true);
          folderDeleted = true;
        }
      } catch (checkErr) {
        Logger.log("Aviso al verificar carpeta vacía: " + checkErr);
      }
    }
  } catch (err) {
    Logger.log("Error al eliminar archivo/carpeta en Drive: " + err);
  }

  return {
    fileDeleted: deleted,
    folderDeleted: folderDeleted
  };
}

function extractDriveFolderId(input) {
  if (!input) return "";
  var str = input.toString().trim();
  if (str.indexOf("folders/") !== -1) {
    var folderPart = str.split("folders/")[1];
    return folderPart.split("/")[0].split("?")[0].trim();
  }
  if (str.indexOf("id=") !== -1) {
    var idPart = str.split("id=")[1];
    return idPart.split("&")[0].split("#")[0].trim();
  }
  return str;
}

// Función auxiliar para leer todas las facturas de la hoja
function handleGetFacturas(sheetId, tabName) {
  try {
    var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName || "Facturas");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", total: 0, facturas: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol < 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", total: 0, facturas: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var facturas = [];
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var idCol = String(row[0] || "").trim();
      var provCol = String(row[2] || "").trim();
      var conceptoCol = String(row[3] || "").trim();
      // Si la fila está vacía, no tiene ID ni concepto, se ignora
      if (!idCol && !provCol && !conceptoCol) continue;
      facturas.push(row);
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      total: facturas.length,
      facturas: facturas
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

  const copiarScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in">
      <div className="w-full max-w-3xl lg:max-w-4xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-[#111c30] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Configuración General y Conexiones
              </h3>
              <p className="text-xs text-slate-400">
                Empresa • Parámetros del Sistema • Google Sheets & Drive • Servidor • Apariencia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 bg-[#0a0f18] text-xs font-semibold px-6 pt-2 overflow-x-auto shrink-0 gap-1">
          <button
            onClick={() => setTabActiva('negocio')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              tabActiva === 'negocio'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Datos de Empresa</span>
          </button>
          <button
            id="tab-parametros-sistema"
            onClick={() => setTabActiva('parametros')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              tabActiva === 'parametros'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parámetros del Sistema</span>
          </button>
          <button
            onClick={() => setTabActiva('sheets')}
            className={`px-4 py-3 border-b-2 transition-colors shrink-0 ${
              tabActiva === 'sheets'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Google Sheets
          </button>
          <button
            onClick={() => setTabActiva('script')}
            className={`px-4 py-3 border-b-2 transition-colors shrink-0 ${
              tabActiva === 'script'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Código Apps Script
          </button>
          <button
            onClick={() => setTabActiva('gemini')}
            className={`px-4 py-3 border-b-2 transition-colors shrink-0 ${
              tabActiva === 'gemini'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Seguridad & Servidor
          </button>
          <button
            onClick={() => setTabActiva('apariencia')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              tabActiva === 'apariencia'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Tema & Apariencia</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 min-h-0 p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {tabActiva === 'negocio' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <Building2 className="w-4 h-4" />
                  <span>Datos Fiscales y de Identidad del Negocio</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Configura la razón social, NIF y dirección de tu empresa. Estos datos se utilizarán dinámicamente como <strong>Cliente / Receptor</strong> en el visor de facturas, en los informes PDF y en las auditorías contables.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre / Razón Social */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Nombre Comercial o Razón Social <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={negocio.nombre}
                    onChange={(e) => setNegocio({ ...negocio, nombre: e.target.value })}
                    placeholder="Ej. Pastelería y Confitería Dulce Capricho S.L."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* NIF / CIF */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    NIF / CIF <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={negocio.nif}
                    onChange={(e) => setNegocio({ ...negocio, nif: e.target.value })}
                    placeholder="Ej. B-82910394"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs font-mono focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Actividad / Subtítulo */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Actividad / Subtítulo
                  </label>
                  <input
                    type="text"
                    value={negocio.actividad || ''}
                    onChange={(e) => setNegocio({ ...negocio, actividad: e.target.value })}
                    placeholder="Ej. Obrador y Confitería Artesanal"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Sector del Negocio */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span>Sector o Industria del Negocio <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-amber-400 font-normal">Obligatorio para Gemini AI</span>
                  </label>
                  <input
                    type="text"
                    value={negocio.sector || ''}
                    onChange={(e) => setNegocio({ ...negocio, sector: e.target.value })}
                    placeholder="Ej. Hostelería, Panadería y Confitería Artesanal / Clínica Dental / Servicios IT"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Contexto Operativo Específico */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span>Contexto Operativo y Modelo de Negocio <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-amber-400 font-normal">Clave para personalizar análisis de IA</span>
                  </label>
                  <textarea
                    rows={3}
                    value={negocio.contextoOperativo || ''}
                    onChange={(e) => setNegocio({ ...negocio, contextoOperativo: e.target.value })}
                    placeholder="Describe las compras principales, insumos críticos, modelo de venta y operativa de tu empresa."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400">
                    Todas las peticiones a Gemini incluirán este contexto operativo obligatoriamente para fundamentar sus diagnósticos, alertas y recomendaciones.
                  </p>
                </div>

                {/* Dirección / Sede */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Dirección Fiscal / Sede <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={negocio.direccion}
                    onChange={(e) => setNegocio({ ...negocio, direccion: e.target.value })}
                    placeholder="Ej. C/ Mayor 24, Obrador Central"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Email de administración */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Email de Administración
                  </label>
                  <input
                    type="email"
                    value={negocio.email || ''}
                    onChange={(e) => setNegocio({ ...negocio, email: e.target.value })}
                    placeholder="Ej. administracion@dulcecapricho.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={negocio.telefono || ''}
                    onChange={(e) => setNegocio({ ...negocio, telefono: e.target.value })}
                    placeholder="Ej. +34 912 345 678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              {/* Vista Previa en Vivo de la cabecera en el Visor */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Vista Previa en el Visor de Facturas (Cliente / Receptor)
                </div>
                <div className="bg-slate-50 text-slate-900 rounded-lg p-3 border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Cliente / Receptor
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {negocio.nombre || '(Nombre de la empresa)'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {negocio.nif ? `NIF: ${negocio.nif}` : 'NIF: (NIF no definido)'}
                    {negocio.direccion ? ` • ${negocio.direccion}` : ''}
                  </p>
                </div>
              </div>

              {/* Botón de guardado rápido de datos de empresa */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setNegocio(DEFAULT_DATOS_NEGOCIO)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-colors"
                >
                  Restablecer valores originales
                </button>
                <button
                  type="button"
                  onClick={handleGuardarNegocioDirecto}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-colors"
                >
                  {guardadoExitosoNegocio ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Guardado correctamente!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Guardar Datos de Empresa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {tabActiva === 'parametros' && (
            <div className="space-y-6" id="panel-gestion-parametros">
              {/* Tarjeta de Cabecera y Acciones Rápidas */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <Sliders className="w-4 h-4" />
                    <span>Gestión Centralizada de Valores Predeterminados y Umbrales</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Define los umbrales de alerta de precios, límites de días para facturas recurrentes y reglas analíticas.
                    Todos los valores se guardan en <code className="text-rose-300 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">localStorage</code> y personalizan el comportamiento de la aplicación en tiempo real.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id="btn-restablecer-parametros"
                    onClick={handleRestablecerParametros}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors border border-slate-700/60"
                    title="Revertir todos los parámetros a sus valores predeterminados de fábrica"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Predeterminados</span>
                  </button>
                  <button
                    type="button"
                    id="btn-guardar-parametros-directo"
                    onClick={handleGuardarParametrosDirecto}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-colors"
                  >
                    {guardadoExitosoParametros ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>¡Guardado!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Parámetros</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Feedback de éxito */}
              {guardadoExitosoParametros && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Parámetros actualizados con éxito:</strong> Las preferencias se han persistido en tu navegador y los motores de detección y cuadros de mando aplican ahora estos criterios.
                  </span>
                </div>
              )}

              {/* BLOQUE 1: Alertas y Umbrales de Precios */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <TrendingUp className="w-4 h-4" />
                    <span className="uppercase tracking-wider">1. Detección de Anomalías e Incremento de Precios</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">alertasConfig / mockData</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Umbral de Subida Moderada (8% por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Umbral de Alerta Moderada
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                        +{parametros.umbralSubidaModeradaPct}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Porcentaje de encarecimiento en un producto entre compras sucesivas para generar un aviso preventivo.
                    </p>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={parametros.umbralSubidaModeradaPct}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          umbralSubidaModeradaPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Presets rápidos:</span>
                      <div className="flex gap-1.5">
                        {[5, 8, 10, 12, 15].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setParametros({ ...parametros, umbralSubidaModeradaPct: val })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              parametros.umbralSubidaModeradaPct === val
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {val}%{val === 8 ? ' (Defecto)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Umbral de Subida Crítica (15% por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Umbral de Alerta Crítica
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono font-bold text-xs border border-rose-500/30">
                        +{parametros.umbralSubidaCriticaPct}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Subida severa que clasifica la alerta con prioridad crítica y destaca el producto para renegociación urgente.
                    </p>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={1}
                      value={parametros.umbralSubidaCriticaPct}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          umbralSubidaCriticaPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Presets rápidos:</span>
                      <div className="flex gap-1.5">
                        {[10, 15, 20, 25, 30].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setParametros({ ...parametros, umbralSubidaCriticaPct: val })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              parametros.umbralSubidaCriticaPct === val
                                ? 'bg-rose-500 text-white font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {val}%{val === 15 ? ' (Defecto)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Anticipación de Facturas por Vencer (3 días por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Anticipación de Vencimientos
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono font-bold text-xs border border-sky-500/30">
                        {parametros.diasAnticipacionVencimiento} días antes
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Días de antelación para notificar que una factura pendiente se aproxima a su fecha de vencimiento.
                    </p>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={1}
                      value={parametros.diasAnticipacionVencimiento}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          diasAnticipacionVencimiento: Number(e.target.value),
                        })
                      }
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Opciones habituales:</span>
                      <div className="flex gap-1.5">
                        {[1, 3, 5, 7, 10].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setParametros({ ...parametros, diasAnticipacionVencimiento: val })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              parametros.diasAnticipacionVencimiento === val
                                ? 'bg-sky-500 text-slate-950 font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {val}d{val === 3 ? ' (Defecto)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Concentración de Gasto en un Proveedor (30% por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="check-concentracion"
                          checked={parametros.notificarConcentracionProveedor}
                          onChange={(e) =>
                            setParametros({
                              ...parametros,
                              notificarConcentracionProveedor: e.target.checked,
                            })
                          }
                          className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                        />
                        <label
                          htmlFor="check-concentracion"
                          className="text-xs font-semibold text-slate-200 cursor-pointer"
                        >
                          Alerta de Concentración
                        </label>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/30">
                        {parametros.umbralConcentracionProveedorPct}% del gasto
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Avisa si una sola empresa concentra un porcentaje excesivo del presupuesto operativo.
                    </p>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      step={5}
                      disabled={!parametros.notificarConcentracionProveedor}
                      value={parametros.umbralConcentracionProveedorPct}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          umbralConcentracionProveedorPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-purple-500 cursor-pointer disabled:opacity-40"
                    />
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Presets recomendados:</span>
                      <div className="flex gap-1.5">
                        {[20, 25, 30, 40, 50].map((val) => (
                          <button
                            key={val}
                            type="button"
                            disabled={!parametros.notificarConcentracionProveedor}
                            onClick={() =>
                              setParametros({ ...parametros, umbralConcentracionProveedorPct: val })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors disabled:opacity-40 ${
                              parametros.umbralConcentracionProveedorPct === val
                                ? 'bg-purple-500 text-white font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {val}%{val === 30 ? ' (Defecto)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: Facturación Recurrente y Ciclos de Operación */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <Clock className="w-4 h-4" />
                    <span className="uppercase tracking-wider">2. Facturación Recurrente y Ciclo de Vencimiento</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Gestión Operativa</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Límite de Días para Facturas Recurrentes (30 días por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Ventana de Facturas Recurrentes
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/30">
                        {parametros.limiteDiasFacturasRecurrentes} días
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Límite o ventana temporal de días para identificar y clasificar compras periódicas habituales de un mismo proveedor o contratos de suministros continuados.
                    </p>
                    <input
                      type="range"
                      min={7}
                      max={90}
                      step={1}
                      value={parametros.limiteDiasFacturasRecurrentes}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          limiteDiasFacturasRecurrentes: Number(e.target.value),
                        })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex flex-wrap items-center justify-between pt-1 gap-2 text-[10px] text-slate-400">
                      <span>Ciclos habituales:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { dias: 7, etiqueta: 'Semanal' },
                          { dias: 15, etiqueta: 'Quincenal' },
                          { dias: 30, etiqueta: 'Mensual (Defecto)' },
                          { dias: 60, etiqueta: 'Bimestral' },
                          { dias: 90, etiqueta: 'Trimestral' },
                        ].map((item) => (
                          <button
                            key={item.dias}
                            type="button"
                            onClick={() =>
                              setParametros({
                                ...parametros,
                                limiteDiasFacturasRecurrentes: item.dias,
                              })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              parametros.limiteDiasFacturasRecurrentes === item.dias
                                ? 'bg-indigo-500 text-white font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {item.dias}d • {item.etiqueta}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Margen de Cortesía tras Vencimiento (7 días por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Margen de Cortesía tras Vencimiento
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-mono font-bold text-xs border border-teal-500/30">
                        {parametros.diasToleranciaPagoVencido} días de gracia
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Margen de tolerancia concedido tras la fecha límite de pago antes de catalogar el impago como mora en reclamación crítica.
                    </p>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={parametros.diasToleranciaPagoVencido}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          diasToleranciaPagoVencido: Number(e.target.value),
                        })
                      }
                      className="w-full accent-teal-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Plazos comunes:</span>
                      <div className="flex gap-1.5">
                        {[0, 3, 7, 15, 30].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setParametros({ ...parametros, diasToleranciaPagoVencido: val })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              parametros.diasToleranciaPagoVencido === val
                                ? 'bg-teal-500 text-slate-950 font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {val}d{val === 7 ? ' (Defecto)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE 3: Clasificación de Proveedores y Dependencia Operativa */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Building2 className="w-4 h-4" />
                    <span className="uppercase tracking-wider">3. Proveedores y Dependencia en Cadena de Suministro</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">sheetDataSync</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Riesgo Alto (>35% por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Dependencia: Riesgo Alto
                      </label>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-xs">
                        &gt; {parametros.umbralDependenciaAltaPct}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Cuota sobre el gasto total para catalogar al proveedor como de alto riesgo de suministro.
                    </p>
                    <input
                      type="range"
                      min={20}
                      max={60}
                      step={1}
                      value={parametros.umbralDependenciaAltaPct}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          umbralDependenciaAltaPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  {/* Riesgo Medio (18% - 35% por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Dependencia: Riesgo Medio
                      </label>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                        &gt; {parametros.umbralDependenciaMediaPct}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Rango intermedio de cuota para catalogar dependencia moderada en compras.
                    </p>
                    <input
                      type="range"
                      min={10}
                      max={30}
                      step={1}
                      value={parametros.umbralDependenciaMediaPct}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          umbralDependenciaMediaPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Mínimo de Facturas para Evaluar Concentración */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Mínimo de Facturas
                      </label>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold text-xs border border-slate-700">
                        {parametros.minimoFacturasParaConcentracion} facturas
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Registros mínimos requeridos antes de computar métricas de concentración de gasto.
                    </p>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={parametros.minimoFacturasParaConcentracion}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          minimoFacturasParaConcentracion: Number(e.target.value),
                        })
                      }
                      className="w-full accent-slate-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* BLOQUE 4: Preferencias de Visualización y Cuadros de Mando */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                    <Calendar className="w-4 h-4" />
                    <span className="uppercase tracking-wider">4. Preferencias de Visualización y Cuadros de Mando</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">FacturasView / ResumenView</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Facturas por Página */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Facturas por Página
                    </label>
                    <select
                      value={parametros.facturasPorPagina}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          facturasPorPagina: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500"
                    >
                      <option value={10}>10 facturas (Predeterminado)</option>
                      <option value={25}>25 facturas</option>
                      <option value={50}>50 facturas</option>
                      <option value={100}>100 facturas</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Paginación en la tabla de facturas.</p>
                  </div>

                  {/* Periodo Predeterminado del Dashboard */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Periodo Inicial del Resumen
                    </label>
                    <select
                      value={parametros.periodoDashboardPredeterminado}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          periodoDashboardPredeterminado: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500"
                    >
                      <option value="7d">Últimos 7 días</option>
                      <option value="30d">Últimos 30 días</option>
                      <option value="trimestre">Trimestre en Curso</option>
                      <option value="ano">Año Completo (Predeterminado)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Filtro cargado por defecto en KPIs.</p>
                  </div>

                  {/* Año Fiscal de Referencia */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Año Fiscal de Referencia
                    </label>
                    <select
                      value={parametros.anoFiscalReferencia}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          anoFiscalReferencia: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 font-mono"
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026 (Ejercicio Activo)</option>
                      <option value={2027}>2027</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Año contable para balances anuales.</p>
                  </div>

                  {/* Top Proveedores en Ranking */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Top Proveedores (Ranking)
                    </label>
                    <select
                      value={parametros.topProveedoresRanking}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          topProveedoresRanking: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500"
                    >
                      <option value={3}>Top 3</option>
                      <option value={5}>Top 5 (Predeterminado)</option>
                      <option value={10}>Top 10</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Número de filas en el podio de compras.</p>
                  </div>
                </div>
              </div>

              {/* BLOQUE 5: Fiscalidad e IVA Predeterminado */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <Percent className="w-4 h-4" />
                    <span className="uppercase tracking-wider">5. Fiscalidad e Impuestos Predeterminados</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">IvaView / Contabilidad</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Tipo de IVA Predeterminado para Nuevos Registros
                    </label>
                    <select
                      value={parametros.tipoIvaPredeterminado}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          tipoIvaPredeterminado: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 font-mono"
                    >
                      <option value="21%">21% (Régimen General)</option>
                      <option value="10%">10% (Reducido - Hostelería y Alimentos)</option>
                      <option value="4%">4% (Superreducido - Harinas y Panadería Básica)</option>
                      <option value="0%">0% (Operaciones Exentas)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Tipo impositivo aplicado de forma automática en facturas sin desglose explícito.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-200">
                        Permitir Facturas Exentas o con IVA al 0%
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Habilita la asignación de cuota cero para operaciones intracomunitarias o suministros exentos.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={parametros.permitirIvaCeroOExento}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          permitirIvaCeroOExento: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                    />
                  </div>
                </div>
              </div>

              {/* Botón inferior de guardado directo */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleRestablecerParametros}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-colors"
                >
                  Restablecer valores originales de fábrica
                </button>
                <button
                  type="button"
                  onClick={handleGuardarParametrosDirecto}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-colors"
                >
                  {guardadoExitosoParametros ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Guardado correctamente!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Parámetros del Sistema</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {tabActiva === 'sheets' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Estructura de la Hoja de Google Sheets</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Para enlazar con tu Google Sheet real de &quot;{negocio.nombre}&quot;, la hoja debe tener
                  dos pestañas con las columnas exactas:
                </p>
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div>
                    <strong className="text-slate-200 font-mono">Pestaña &quot;Facturas&quot;:</strong>{' '}
                    <span className="text-slate-400">
                      ID Factura, Fecha de Emisión, ID Proveedor, Nombre proveedor, Concepto, Importe, Fecha de Vencimiento,
                      Estado, Fecha de Pago, Base imponible, Tipo/s de IVA, Cuota IVA, Total, Categoría de gasto, Enlace Google Drive
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-200 font-mono">Pestaña &quot;PROVEEDORES&quot;:</strong>{' '}
                    <span className="text-slate-400">
                      ID Proveedor, Nombre proveedor, Productos suministrados, Importe mensual,
                      Frecuencia, Riesgo de dependencia, Tiempo medio de entrega
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  ID del Documento de Google Sheets (Spreadsheet ID)
                </label>
                <input
                  type="text"
                  placeholder="ej: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  className="w-full bg-[#0a0f18] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Se encuentra en la URL de tu hoja: https://docs.google.com/spreadsheets/d/
                  <strong>[ESTE_ES_EL_ID]</strong>/edit
                </p>
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  URL del Endpoint / Webhook (Google Apps Script Web App)
                </label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="w-full bg-[#0a0f18] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Copia y pega la URL de despliegue generada en Apps Script. Si se deja en blanco, la
                  aplicación funciona en modo de sincronización local en memoria.
                </p>
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1 flex items-center justify-between">
                  <span>Carpeta Concreta de Google Drive (ID o Enlace)</span>
                  <span className="text-[10px] text-sky-400 font-mono font-normal">Organización automática por proveedor</span>
                </label>
                <input
                  type="text"
                  placeholder="ej: 1A2b3C4d5E6f7G8h9 o https://drive.google.com/drive/folders/..."
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  className="w-full bg-[#0a0f18] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                />
                <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/20 text-[11px] text-sky-200/90 mt-2 space-y-1">
                  <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                    <span>Proceso automático de guardado en Google Drive:</span>
                  </div>
                  <div className="text-slate-300">
                    1. Identifica el <strong>nombre del proveedor</strong> de la factura.
                  </div>
                  <div className="text-slate-300">
                    2. Comprueba si existe la carpeta del proveedor dentro de esta carpeta; si no existe, la crea.
                  </div>
                  <div className="text-slate-300">
                    3. Guarda el archivo con el nombre <strong>[ID Factura] [Fecha]</strong> (ej: <code className="text-sky-300 bg-slate-900/80 px-1 py-0.5 rounded font-mono">FAC-2026-001 2026-01-14.pdf</code>).
                  </div>
                </div>
              </div>

              {/* Botones de Comprobación y Sincronización en Tiempo Real */}
              <div className="pt-2 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleVerificarConexion}
                    disabled={verificando || !endpointUrl}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                  >
                    {verificando ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        <span>Verificando conexión...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                        <span>Verificar Permisos</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSincronizarHoja}
                    disabled={sincronizando || !endpointUrl}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 disabled:opacity-50 text-xs font-semibold transition-colors border border-rose-500/40"
                  >
                    {sincronizando ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-300" />
                        <span>Leyendo facturas de la hoja...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
                        <span>Sincronizar Facturas de la Hoja Ahora</span>
                      </>
                    )}
                  </button>
                </div>

                {resultadoVerificacion && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      resultadoVerificacion.code === 'VERSION_DESACTUALIZADA'
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                        : resultadoVerificacion.accessible
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {resultadoVerificacion.code === 'VERSION_DESACTUALIZADA' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : resultadoVerificacion.accessible ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">
                          {resultadoVerificacion.code === 'VERSION_DESACTUALIZADA'
                            ? '⚠️ Versión antigua detectada en Apps Script (Sin Google Drive)'
                            : resultadoVerificacion.accessible
                            ? '¡Conexión Verificada con Éxito a Google Sheets y Drive!'
                            : 'Acceso Denegado por Google (Falta permiso público)'}
                        </div>
                        <p className="mt-1 text-[11px] opacity-90">
                          {resultadoVerificacion.mensaje}
                        </p>
                        {resultadoVerificacion.code === 'VERSION_DESACTUALIZADA' && (
                          <div className="mt-2.5">
                            <button
                              type="button"
                              onClick={() => setTabActiva('script')}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Ir a la pestaña &quot;Código Apps Script&quot; y actualizar en 1 minuto</span>
                              <span>→</span>
                            </button>
                          </div>
                        )}
                        {!resultadoVerificacion.accessible && resultadoVerificacion.code !== 'VERSION_DESACTUALIZADA' && (
                          <div className="mt-2.5 p-2.5 rounded-lg bg-rose-900/40 border border-rose-500/30 text-[11px] text-rose-200">
                            <div className="font-semibold text-rose-100 mb-1">🛠️ Cómo solucionarlo en 30 segundos:</div>
                            <ol className="list-decimal pl-4 space-y-1 text-rose-200/90 text-[10.5px]">
                              <li>En tu editor de Google Apps Script, ve al botón azul superior <strong>&quot;Implementar&quot;</strong> &gt; <strong>&quot;Gestionar implementaciones&quot;</strong>.</li>
                              <li>Haz clic en el icono del lápiz ✏️ (<strong>Editar</strong>).</li>
                              <li>En el desplegable <strong>&quot;Quién tiene acceso&quot;</strong> (<em>Who has access</em>), selecciona <strong>&quot;Cualquier usuario&quot;</strong> (<em>Anyone</em>).</li>
                              <li>En <strong>&quot;Versión&quot;</strong>, selecciona <strong>&quot;Nueva versión&quot;</strong> y pulsa <strong>&quot;Implementar&quot;</strong>.</li>
                              <li>Vuelve aquí y pulsa nuevamente <strong>&quot;Verificar Conexión Ahora&quot;</strong>.</li>
                            </ol>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {resultadoSincronizacion && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      resultadoSincronizacion.success && resultadoSincronizacion.count > 0
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {resultadoSincronizacion.success && resultadoSincronizacion.count > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">
                          {resultadoSincronizacion.count > 0
                            ? `¡${resultadoSincronizacion.count} Facturas Reales Cargadas!`
                            : 'Hoja Vacía o Pendiente de Lectura'}
                        </div>
                        <p className="mt-1 text-[11px] opacity-90">
                          {resultadoSincronizacion.mensaje}
                        </p>
                        {resultadoSincronizacion.count === 0 && (
                          <p className="mt-2 text-[10px] text-amber-300/80 bg-amber-900/30 p-2 rounded-lg border border-amber-700/30">
                            💡 Si ya tienes filas escritas en tu Google Sheet pero aún no aparecen, abre la pestaña <strong>&quot;Código Apps Script&quot;</strong> arriba, copia el código actualizado y pégalo en tu Apps Script para activar la función de lectura automática de filas.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tabActiva === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">
                    Google Apps Script (Despliegue en 1 Minuto)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Pega este código en Extensiones &gt; Apps Script dentro de tu Google Sheet
                  </p>
                </div>
                <button
                  onClick={copiarScript}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/30 transition-colors"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiado ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-72">
                {appsScriptCode}
              </pre>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <span>⚡ 3 PASOS PARA ACTIVAR EL BORRADO Y SINCRONIZACIÓN (SHEETS & DRIVE):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-300 leading-relaxed">
                  <li>
                    Abre tu Google Sheet &gt; <strong>Extensiones &gt; Apps Script</strong>, borra todo lo que haya en <code>Código.gs</code> y pega el código copiado arriba.
                  </li>
                  <li className="text-amber-200 font-semibold bg-amber-950/40 p-2 rounded-lg border border-amber-500/30">
                    <strong>Paso 1 (Permisos Drive):</strong> En la barra superior de Apps Script, selecciona la función <code className="text-white bg-slate-900 px-1.5 py-0.5 rounded">autorizarPermisosDrive</code> y pulsa <strong>Ejecutar (▶)</strong>. Concede los permisos de Google Drive que solicite Google (Revisar permisos &gt; Tu cuenta &gt; Avanzado &gt; Ir a proyecto &gt; Permitir).
                  </li>
                  <li className="text-emerald-200 font-semibold bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                    <strong>Paso 2 (Actualizar Implementación - OBLIGATORIO):</strong> En Apps Script arriba a la derecha, haz clic en <strong>Implementar &gt; Administrar implementaciones &gt; Editar (icono del lápiz) &gt; en Versión selecciona &quot;Nueva versión&quot; &gt; Clic en Implementar</strong>.
                    <p className="font-normal text-[10px] text-emerald-300/80 mt-1">
                      ⚠️ <em>Nota importante: Si no seleccionas &quot;Nueva versión&quot;, Google sigue ejecutando la versión antigua anterior y no aplicará las funciones de borrado de facturas y archivos.</em>
                    </p>
                  </li>
                  <li>
                    Asegúrate de que la URL de la aplicación web esté copiada y guardada en la pestaña <strong>&quot;Google Sheets&quot;</strong> de esta aplicación. ¡Todo quedará 100% coordinado!
                  </li>
                </ol>
                <div className="pt-2 border-t border-amber-500/20 text-[10px] text-amber-300/90 flex items-center gap-1.5">
                  <span>✨ <strong>Limpieza automática de Drive:</strong> Al eliminar una factura, si era la última de su carpeta y queda vacía, la carpeta del proveedor se elimina automáticamente de Google Drive para mantener tu nube limpia y organizada.</span>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'gemini' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Seguridad de Claves de API (Server-Side Proxy)</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Siguiendo las directrices estrictas de seguridad, ninguna clave de API sensible se
                  expone en el navegador web del cliente.
                </p>
                <div className="space-y-1 text-[11px] text-slate-400">
                  <div>• Las llamadas a Gemini se canalizan a través de <code>/api/gemini/*</code> en el servidor Express.</div>
                  <div>• La clave se almacena de forma segura en la variable de entorno <code>GEMINI_API_KEY</code>.</div>
                  <div>• En caso de ausencia de clave, cuota agotada o fallo de lectura en un archivo, el sistema muestra una advertencia explícita y detiene el proceso sin inventar datos ni generar facturas simuladas.</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onResetData}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Restablecer Datos de Demostración Originales ({negocio.nombre})
                </button>
              </div>
            </div>
          )}

          {tabActiva === 'apariencia' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <Palette className="w-4 h-4" />
                  <span>Personalización del Tema Visual</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Elige entre el tema oscuro de alta concentración o el tema claro de alto contraste. Tu selección se sincroniza de forma inmediata y se guarda automáticamente en tu navegador.
                </p>
              </div>

              {/* Selector de temas con tarjetas visuales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opción Modo Oscuro */}
                <div
                  onClick={() => onSetTheme && onSetTheme('dark')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    theme === 'dark'
                      ? 'border-rose-500 bg-[#0a0f18] shadow-lg shadow-rose-950/30'
                      : 'border-slate-800 bg-[#0a0f18]/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                        <Moon className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 text-sm">Modo Oscuro</div>
                        <div className="text-[11px] text-slate-400">Fintech Night Edition</div>
                      </div>
                    </div>
                    {theme === 'dark' && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Mini preview oscuro */}
                  <div className="rounded-lg p-2.5 bg-[#080c14] border border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Fondo Oscuro</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-rose-400 font-mono font-bold">
                      1.250,00 €
                    </span>
                  </div>
                </div>

                {/* Opción Modo Claro */}
                <div
                  onClick={() => onSetTheme && onSetTheme('light')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    theme === 'light'
                      ? 'border-rose-500 bg-white/90 shadow-lg shadow-rose-950/10'
                      : 'border-slate-800 bg-[#0a0f18]/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Sun className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 text-sm">Modo Claro</div>
                        <div className="text-[11px] text-slate-400">Fintech Day Edition</div>
                      </div>
                    </div>
                    {theme === 'light' && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Mini preview claro */}
                  <div className="rounded-lg p-2.5 bg-slate-100 border border-slate-300 flex items-center justify-between text-[10px]">
                    <span className="text-slate-700 font-medium">Fondo Claro</span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-rose-600 font-mono font-bold border border-slate-200">
                      1.250,00 €
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span>También puedes alternar rápidamente el modo claro/oscuro en cualquier momento haciendo clic en el botón con icono de sol/luna ubicado en la cabecera superior y en la barra lateral.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0d131f] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Estado: {config.status === 'sincronizado' ? 'Conectado a Sheets' : 'Modo Demostración / Local'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-colors"
            >
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
