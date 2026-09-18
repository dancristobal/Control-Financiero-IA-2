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
    | 'Insumos'
    | 'Logística'
    | 'Servicios'
    | 'Materias Primas'
    | 'Envases y Embalajes'
    | 'Suministros y Energía'
    | 'Logística y Transporte'
    | 'Mantenimiento y Maquinaria'
    | 'Servicios y Gestión'
    | string;
  categoriaGastoJustificacion?: string;
  categoriaGastoSugerida?: boolean;
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

export interface DatosNegocio {
  nombre: string;
  nif: string;
  direccion: string;
  actividad?: string;
  sector?: string;
  contextoOperativo?: string;
  email?: string;
  telefono?: string;
}

export interface ConfiguracionAlertas {
  umbralSubidaModeradaPct: number; // Ej: 8% (por defecto aviso / nivel alta)
  umbralSubidaCriticaPct: number;   // Ej: 15% (nivel crítica)
  notificarConcentracionProveedor?: boolean;
  umbralConcentracionPct?: number;  // Ej: 30%
  notificarFacturasVencidas?: boolean;
  diasAnticipacionVencimiento?: number; // Ej: 3 días antes
  actualizadoEn?: string;
}

export const DEFAULT_CONFIGURACION_ALERTAS: ConfiguracionAlertas = {
  umbralSubidaModeradaPct: 8,
  umbralSubidaCriticaPct: 15,
  notificarConcentracionProveedor: true,
  umbralConcentracionPct: 30,
  notificarFacturasVencidas: true,
  diasAnticipacionVencimiento: 3,
};

export const DEFAULT_DATOS_NEGOCIO: DatosNegocio = {
  nombre: 'Pastelería y Confitería Dulce Capricho S.L.',
  nif: 'B-82910394',
  direccion: 'C/ Mayor 24, Obrador Central',
  actividad: 'Obrador y Confitería Artesanal',
  sector: 'Hostelería, Obrador de Pastelería y Panadería',
  contextoOperativo:
    'Obrador artesanal con despacho directo y distribución B2B a cafeterías y hostelería. Sus compras principales abarcan materias primas agrícolas (harinas especiales, mantequillas, coberturas, azúcares), cajas y envoltorios kraft para take-away, suministros energéticos intensivos en hornos y servicios de transporte refrigerado.',
  email: 'administracion@dulcecapricho.com',
  telefono: '+34 912 345 678',
};

export interface ParametrosSistema {
  // 1. Alertas & Riesgos de Precios
  umbralSubidaModeradaPct: number; // Por defecto: 8 (%)
  umbralSubidaCriticaPct: number; // Por defecto: 15 (%)
  notificarConcentracionProveedor: boolean; // Por defecto: true
  umbralConcentracionProveedorPct: number; // Por defecto: 30 (%)
  notificarFacturasVencidas: boolean; // Por defecto: true
  diasAnticipacionVencimiento: number; // Por defecto: 3 (días antes)

  // 2. Facturación Recurrente & Vencimientos
  limiteDiasFacturasRecurrentes: number; // Por defecto: 30 (días para clasificar compras recurrentes)
  diasToleranciaPagoVencido: number; // Por defecto: 7 (días margen tras fecha límite)
  evaluarVencimientosActivo: boolean; // Por defecto: true

  // 3. Proveedores & Dependencia Operativa
  umbralDependenciaAltaPct: number; // Por defecto: 35 (%)
  umbralDependenciaMediaPct: number; // Por defecto: 18 (%)
  minimoFacturasParaConcentracion: number; // Por defecto: 3 (mínimo facturas registradas)

  // 4. Panel de Control & Preferencias UI
  facturasPorPagina: number; // Por defecto: 10 (10 | 25 | 50 | 100)
  periodoDashboardPredeterminado: '7d' | '30d' | 'trimestre' | 'ano'; // Por defecto: 'ano'
  anoFiscalReferencia: number; // Por defecto: 2026
  topProveedoresRanking: number; // Por defecto: 5

  // 5. Fiscalidad e IVA
  tipoIvaPredeterminado: string; // Por defecto: '21%'
  permitirIvaCeroOExento: boolean; // Por defecto: true

  actualizadoEn?: string;
}

export const DEFAULT_PARAMETROS_SISTEMA: ParametrosSistema = {
  umbralSubidaModeradaPct: 8,
  umbralSubidaCriticaPct: 15,
  notificarConcentracionProveedor: true,
  umbralConcentracionProveedorPct: 30,
  notificarFacturasVencidas: true,
  diasAnticipacionVencimiento: 3,

  limiteDiasFacturasRecurrentes: 30,
  diasToleranciaPagoVencido: 7,
  evaluarVencimientosActivo: true,

  umbralDependenciaAltaPct: 35,
  umbralDependenciaMediaPct: 18,
  minimoFacturasParaConcentracion: 3,

  facturasPorPagina: 10,
  periodoDashboardPredeterminado: 'ano',
  anoFiscalReferencia: 2026,
  topProveedoresRanking: 5,

  tipoIvaPredeterminado: '21%',
  permitirIvaCeroOExento: true,
};
