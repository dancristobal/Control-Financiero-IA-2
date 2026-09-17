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
  Palette
} from 'lucide-react';
import { GoogleSheetsConfig } from '../types';
import { ThemeMode } from '../utils/theme';

interface ConfiguracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig;
  onSaveConfig: (nuevaConfig: GoogleSheetsConfig) => void;
  onResetData: () => void;
  onSyncFacturas?: () => Promise<{ success: boolean; count: number; message?: string }>;
  theme?: ThemeMode;
  onSetTheme?: (theme: ThemeMode) => void;
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
}) => {
  const [sheetId, setSheetId] = useState(config.sheetId || '');
  const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl || '');
  const [driveFolderId, setDriveFolderId] = useState(config.driveFolderId || '');
  const [copiado, setCopiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
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
  const [tabActiva, setTabActiva] = useState<'sheets' | 'gemini' | 'script' | 'apariencia'>('sheets');

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
      const res = await fetch(`/api/sheets/verify?${queryParams.toString()}`);
      const data = await res.json();
      setResultadoVerificacion(data);
    } catch (e: any) {
      setResultadoVerificacion({
        accessible: false,
        code: 'ERROR',
        mensaje: e?.message || 'Error de red al comprobar acceso con el servidor.',
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
          body: JSON.stringify({ sheetId, endpointUrl }),
        });
        const data = await res.json();
        setResultadoSincronizacion({
          success: data.success,
          count: data.count || 0,
          mensaje: data.count > 0
            ? `Se han cargado ${data.count} facturas reales desde la hoja "Facturas". Los datos de ejemplo se han reemplazado.`
            : 'Conexión activa pero la hoja "Facturas" aún no contiene filas de datos.',
        });
      }
    } catch (e: any) {
      setResultadoSincronizacion({
        success: false,
        count: 0,
        mensaje: e?.message || 'Error al conectar con la hoja de Google Sheets.',
      });
    } finally {
      setSincronizando(false);
    }
  };

  const handleSave = () => {
    setGuardando(true);
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

  const appsScriptCode = `/**
 * FINANCE AI — Google Apps Script Web App
 * Sincronización de facturas en Google Sheets y archivado automático en Google Drive
 * para "Dulce Capricho"
 */

/**
 * ⚡ PASO 1 OBLIGATORIO (Ejecutar una sola vez desde el editor de Apps Script):
 * Selecciona "autorizarPermisosDrive" en la barra superior y pulsa el botón "Ejecutar" (▶).
 * Google te solicitará autorizar permisos para acceder a Google Drive y Sheets
 * (Haz clic en "Revisar permisos" > Elige tu cuenta > "Avanzado" > "Ir a proyecto (no seguro)" > "Permitir").
 */
function autorizarPermisosDrive() {
  try {
    var rootFolders = DriveApp.getFoldersByName("Facturas Dulce Capricho");
    var folder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("Facturas Dulce Capricho");
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
          var rootFolders = DriveApp.getFoldersByName("Facturas Dulce Capricho");
          var f = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("Facturas Dulce Capricho");
          driveMsg = "Carpeta 'Facturas Dulce Capricho' verificada en tu Google Drive";
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
        "ID Factura", "Fecha de Emisión", "ID Proveedor", "Concepto",
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
          nombreProveedor: data.nombreProveedor || (data.row ? data.row[2] : "Varios"),
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
        if (driveResult && driveResult.fileUrl) {
          rowData.push(driveResult.fileUrl);
        }
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

    // Acción directa: guardar sólo en Google Drive
    if (data.action === "saveToDrive") {
      var directDrive = guardarFacturaEnDrive(data);
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

    // Si no se proporcionó o no se encontró, buscar o crear la carpeta "Facturas Dulce Capricho"
    if (!carpetaPadre) {
      var rootFolders = DriveApp.getFoldersByName("Facturas Dulce Capricho");
      carpetaPadre = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("Facturas Dulce Capricho");
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
    var base64Limpio = params.archivo.base64;
    var commaIdx = base64Limpio.indexOf(",");
    if (commaIdx !== -1 && base64Limpio.indexOf("base64") !== -1) {
      base64Limpio = base64Limpio.substring(commaIdx + 1);
    }
    var mimeType = params.archivo.mimeType || "application/pdf";
    var bytes = Utilities.base64Decode(base64Limpio);
    var blob = Utilities.newBlob(bytes, mimeType, nuevoNombreArchivo);

    var archivoDrive = carpetaProveedor.createFile(blob);

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
      var dulceRoots = DriveApp.getFoldersByName("Facturas Dulce Capricho");
      while (dulceRoots.hasNext()) {
        protectedFolderIds[dulceRoots.next().getId()] = true;
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
        var rootFolders = DriveApp.getFoldersByName("Facturas Dulce Capricho");
        while (rootFolders.hasNext()) {
          carpetas.push(rootFolders.next());
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
        var dRoots = DriveApp.getFoldersByName("Facturas Dulce Capricho");
        while (dRoots.hasNext()) allRoots.push(dRoots.next());
        
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
        if (folder.getName() === "Facturas Dulce Capricho") continue;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-[#111c30] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Configuración de Conexiones
              </h3>
              <p className="text-xs text-slate-400">
                Google Sheets • Gemini API • Seguridad de Entorno
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 bg-[#0a0f18] text-xs font-semibold px-4 pt-2">
          <button
            onClick={() => setTabActiva('sheets')}
            className={`px-4 py-2.5 border-b-2 transition-colors ${
              tabActiva === 'sheets'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Google Sheets
          </button>
          <button
            onClick={() => setTabActiva('script')}
            className={`px-4 py-2.5 border-b-2 transition-colors ${
              tabActiva === 'script'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Código Apps Script
          </button>
          <button
            onClick={() => setTabActiva('gemini')}
            className={`px-4 py-2.5 border-b-2 transition-colors ${
              tabActiva === 'gemini'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Seguridad & Servidor
          </button>
          <button
            onClick={() => setTabActiva('apariencia')}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
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
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {tabActiva === 'sheets' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Estructura de la Hoja de Google Sheets</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Para enlazar con tu Google Sheet real de &quot;Dulce Capricho&quot;, la hoja debe tener
                  dos pestañas con las columnas exactas:
                </p>
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div>
                    <strong className="text-slate-200 font-mono">Pestaña &quot;Facturas&quot;:</strong>{' '}
                    <span className="text-slate-400">
                      ID Factura, Fecha de Emisión, ID Proveedor, Concepto, Importe, Fecha de Vencimiento,
                      Estado, Fecha de Pago, Base imponible, Tipo/s de IVA, Cuota IVA, Total, Categoría de gasto
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
                      resultadoVerificacion.accessible
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {resultadoVerificacion.accessible ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">
                          {resultadoVerificacion.accessible
                            ? '¡Conexión Verificada con Éxito!'
                            : 'Acceso Denegado por Google (Falta permiso público)'}
                        </div>
                        <p className="mt-1 text-[11px] opacity-90">
                          {resultadoVerificacion.mensaje}
                        </p>
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
                  Restablecer Datos de Demostración Originales (Dulce Capricho)
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
        <div className="p-4 border-t border-slate-800 bg-[#0d131f] flex items-center justify-between">
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
