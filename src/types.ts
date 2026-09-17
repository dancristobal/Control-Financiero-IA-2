export interface ProductoLinea {
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface Factura {
  idFactura: string;
  fechaEmision: string;
  idProveedor: string;
  nombreProveedor: string;
  concepto: string;
  importe: number; // Base imponible o importe principal
  fechaVencimiento: string;
  estado: 'Pagada' | 'Pendiente' | 'Vencida';
  fechaPago: string;
  baseImponible: number;
  tiposIVA: string; // ej: '4%', '10%', '21%' o combinaciones
  cuotaIVA: number;
  total: number;
  categoriaGasto:
    | 'Materias Primas'
    | 'Envases y Embalajes'
    | 'Suministros y Energía'
    | 'Logística y Transporte'
    | 'Mantenimiento y Maquinaria'
    | 'Servicios y Gestión';
  lineas?: ProductoLinea[];
  archivoNombre?: string;
  archivoBase64?: string;
  sincronizadoSheets?: boolean;
  driveFileUrl?: string;
  driveFolderUrl?: string;
  driveFileName?: string;
  driveFolderName?: string;
  driveGuardado?: boolean;
  driveError?: string;
}

export interface Proveedor {
  idProveedor: string;
  nombreProveedor: string;
  productosSuministrados: string;
  importeMensual: number;
  frecuencia: 'Semanal' | 'Quincenal' | 'Mensual' | 'Bimestral' | string;
  riesgoDependencia: 'Bajo' | 'Medio' | 'Alto';
  tiempoMedioEntrega: string;
  cif?: string;
  contacto?: string;
}

export type AlertaTipo =
  | 'POSIBLE DUPLICADO'
  | 'SUBIDA DE PRECIO'
  | 'GASTO INUSUAL'
  | 'NUEVO PROVEEDOR'
  | 'FACTURA VENCIDA'
  | 'CONCENTRACIÓN DE PROVEEDOR';

export type AlertaNivel = 'critica' | 'alta' | 'media' | 'informativa';

export interface Alerta {
  id: string;
  tipo: AlertaTipo;
  nivel: AlertaNivel;
  titulo: string;
  descripcion: string;
  fecha: string;
  estado: 'activa' | 'resuelta' | 'ignorada';
  datosRelacionados?: {
    idFactura?: string;
    facturaExistente?: string;
    archivoNuevo?: string;
    proveedor?: string;
    producto?: string;
    importe?: number;
    variacionPorcentaje?: number;
    precioAnterior?: number;
    precioNuevo?: number;
  };
}

export interface DesgloseIVA {
  tipo: string;
  tasa: number; // 0.04, 0.10, 0.21
  baseImponible: number;
  cuotaIVA: number;
  numFacturas: number;
}

export interface ResumenIVA {
  periodo: 'T1' | 'T2' | 'T3' | 'T4' | 'Año Completo';
  numFacturas: number;
  baseImponibleTotal: number;
  cuotaIVATotal: number;
  totalConIVA: number;
  desglose: DesgloseIVA[];
}

export interface AccionRecomendada {
  accion: string;
  motivo: string;
  datos: string;
  impacto: 'Alto' | 'Medio' | 'Inmediato';
}

export interface AnalisisEjecutivo {
  id: string;
  fechaGeneracion: string;
  estadoGeneral: string; // Máx 5 líneas
  principalesGastos: string[];
  cambiosImportantes: string[];
  alertas: string[];
  oportunidadesAhorro: string[];
  tresAcciones: AccionRecomendada[];
  prioridadSemana: string;
}

export interface ArchivoEnProceso {
  id: string;
  nombre: string;
  tamano: number;
  tipo: string;
  estado: 'esperando' | 'procesando' | 'procesado' | 'duplicado' | 'error';
  progreso: number; // 0 - 100
  mensaje?: string;
  datosExtraidos?: Factura;
  duplicadoCon?: Factura;
  base64Data?: string;
  rawFile?: File;
  driveInfo?: {
    carpetaProveedor: string;
    nombreArchivo: string;
    fileUrl?: string;
    carpetaUrl?: string;
    creadaNuevaCarpeta?: boolean;
    error?: string;
  };
}

export interface GoogleSheetsConfig {
  sheetId: string;
  sheetUrl: string;
  endpointUrl: string;
  driveFolderId?: string;
  autoSync: boolean;
  status: 'sincronizado' | 'pendiente' | 'desconectado' | 'error';
  lastSync?: string;
  totalFilasFacturas?: number;
  totalFilasProveedores?: number;
}

export interface ChatMessage {
  id: string;
  emisor: 'usuario' | 'gemini';
  texto: string;
  fecha: string;
  sugerencias?: string[];
}

export interface MensajeChat {
  id: string;
  emisor: 'usuario' | 'asistente';
  texto: string;
  timestamp: string;
  sugerencias?: string[];
}

export interface GlobalLoadingState {
  activo: boolean;
  mensaje: string;
  progreso?: number;
}
