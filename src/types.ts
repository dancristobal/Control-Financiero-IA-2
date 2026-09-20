export interface ProductoLinea {
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface CategoriaGastoDef {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string; // hex #f43f5e
  esPredeterminada?: boolean;
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
  tiposIVA: string; // ej: '4%', '10%', '21%', '5%', '0%', 'IGIC 7%', 'IGIC 3%' o con RE
  cuotaIVA: number;
  regimenFiscal?: string; // ej: 'Régimen General Peninsular', 'Tipos Temporales / Alimentos', 'IGIC Canario', 'Recargo de Equivalencia', 'Exento'
  tipoImpuestoNombre?: string; // 'IVA' | 'IGIC' | 'IPSI' | 'Exento'
  aplicaRecargoEquivalencia?: boolean;
  tipoRecargoEquivalencia?: string; // ej: '5.2%', '1.4%', '0.5%', '0.62%', '0.7%'
  cuotaRecargoEquivalencia?: number;
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
  notas?: string;
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

  // 5. Fiscalidad e IVA / IGIC / IPSI
  tipoIvaPredeterminado: string; // Por defecto: '21%'
  regimenFiscalEmpresa: RegimenFiscalEmpresa; // Régimen fiscal principal configurado para la empresa
  regimenFiscalPredeterminado: 'IVA_PENINSULAR' | 'IGIC_CANARIAS' | 'IPSI_CEUTA_MELILLA' | 'RECARGO_EQUIVALENCIA' | 'TODOS';
  aplicaRecargoEquivalenciaDefecto: boolean; // Por defecto: false
  permitirIvaCeroOExento: boolean; // Por defecto: true
  mostrarTiposTemporales: boolean; // Por defecto: true (0%, 2%, 5%, 7.5%)
  mostrarTiposCanarios: boolean; // Por defecto: true (IGIC 7%, 3%, 0%, 9.5%, 15%)
  mostrarTiposIpsi: boolean; // Por defecto: true (IPSI 0.5%, 1%, 2%, 4%, 8%, 10%)
  tiposImpositivos: TipoImpositivoConfigurable[];

  actualizadoEn?: string;
}

export type TipoImpuestoJurisdiccion = 'IVA' | 'IGIC' | 'IPSI' | 'EXENTO' | 'OTRO';

export type RegimenFiscalEmpresa =
  | 'IVA_PENINSULAR' // Península y Baleares (IVA 21%, 10%, 4%)
  | 'IGIC_CANARIAS' // Canarias (IGIC 7%, 3%, 0%, 9.5%, 15%)
  | 'IPSI_CEUTA_MELILLA' // Ceuta y Melilla (IPSI 0.5%, 1%, 2%, 4%, 8%, 10%)
  | 'RECARGO_EQUIVALENCIA' // Minoristas con R.E. obligatorio (5.2%, 1.4%, 0.5%)
  | 'EXENTO_FRANQUICIA' // Exento / Franquicia fiscal
  | 'MULTIRREGIMEN'; // Multirégimen / Consolidado

export interface TipoImpositivoConfigurable {
  id: string;
  codigo: string;
  nombre: string;
  valor: string; // ej: '21%', '10%', '4%', '0% (Temporal)', 'IGIC 7%', 'IPSI 4%'
  tipoImpuesto: TipoImpuestoJurisdiccion;
  porcentaje: number;
  porcentajeRecargo: number; // Porcentaje de recargo de equivalencia o recargo minorista asociado
  aplicaRecargoDefecto: boolean;
  habilitado: boolean;
  esPersonalizado?: boolean;
  esTemporal?: boolean;
  descripcion?: string;
  ejemplos?: string;
}

export const TIPOS_IMPOSITIVOS_PREDETERMINADOS: TipoImpositivoConfigurable[] = [
  // Régimen General Peninsular (IVA)
  {
    id: 'iva-21',
    codigo: 'IVA_21',
    nombre: '21% - IVA General Peninsular',
    valor: '21%',
    tipoImpuesto: 'IVA',
    porcentaje: 21,
    porcentajeRecargo: 5.2,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Tipo general peninsular aplicable a la mayoría de suministros, energía, paquetería y servicios profesionales.',
    ejemplos: 'Electricidad, gas, packaging, maquinaria, asesoría, reformas, transporte de mercancías',
  },
  {
    id: 'iva-10',
    codigo: 'IVA_10',
    nombre: '10% - IVA Reducido',
    valor: '10%',
    tipoImpuesto: 'IVA',
    porcentaje: 10,
    porcentajeRecargo: 1.4,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Alimentación humana general, agua, hostelería, transporte de viajeros y flores.',
    ejemplos: 'Lácteos procesados, mantequillas, nata, chocolates, azúcar, conservas, restaurantes',
  },
  {
    id: 'iva-4',
    codigo: 'IVA_4',
    nombre: '4% - IVA Superreducido',
    valor: '4%',
    tipoImpuesto: 'IVA',
    porcentaje: 4,
    porcentajeRecargo: 0.5,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Productos de primera necesidad, pan común, harinas panificables, leche y huevos.',
    ejemplos: 'Harinas de fuerza y panificables, pan común, leche fresca, huevos, legumbres, frutas',
  },
  // Tipos Temporales Reducidos (Alimentos y Aceite de Oliva - RDL)
  {
    id: 'iva-0-temp',
    codigo: 'IVA_0_TEMP',
    nombre: '0% - IVA Superreducido Temporal (Alimentos Básicos / Aceite)',
    valor: '0% (Temporal)',
    tipoImpuesto: 'IVA',
    porcentaje: 0,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    esTemporal: true,
    descripcion: 'Tipo temporal al 0% introducido en España para alimentos básicos de primera necesidad y aceite de oliva virgen extra.',
    ejemplos: 'Aceite de oliva virgen extra, pan común, leches, harinas panificables, frutas y hortalizas',
  },
  {
    id: 'iva-2-temp',
    codigo: 'IVA_2_TEMP',
    nombre: '2% - IVA Temporal Transitorio (Alimentos Básicos)',
    valor: '2% (Temporal)',
    tipoImpuesto: 'IVA',
    porcentaje: 2,
    porcentajeRecargo: 0.26,
    aplicaRecargoDefecto: false,
    habilitado: true,
    esTemporal: true,
    descripcion: 'Tipo transitorio aplicable en tramos de normalización de alimentos de primera necesidad.',
    ejemplos: 'Productos básicos en fase de transición tributaria según RDL 4/2024',
  },
  {
    id: 'iva-5-temp',
    codigo: 'IVA_5_TEMP',
    nombre: '5% - IVA Temporal Reducido (Aceites y Pastas)',
    valor: '5% (Temporal)',
    tipoImpuesto: 'IVA',
    porcentaje: 5,
    porcentajeRecargo: 0.62,
    aplicaRecargoDefecto: false,
    habilitado: true,
    esTemporal: true,
    descripcion: 'Tipo temporal reducido para aceites de semillas y pastas alimenticias.',
    ejemplos: 'Pastas alimenticias, aceite de girasol, aceites de semillas comestibles',
  },
  {
    id: 'iva-7.5-temp',
    codigo: 'IVA_7.5_TEMP',
    nombre: '7.5% - IVA Temporal Transitorio (Pastas y Aceites)',
    valor: '7.5% (Temporal)',
    tipoImpuesto: 'IVA',
    porcentaje: 7.5,
    porcentajeRecargo: 1.0,
    aplicaRecargoDefecto: false,
    habilitado: false,
    esTemporal: true,
    descripcion: 'Tipo transitorio intermedio para aceites y pastas antes de retornar al 10%.',
    ejemplos: 'Pastas alimenticias y aceites en escalonamiento tributario',
  },
  // Régimen Autonómico Canario (IGIC)
  {
    id: 'igic-7',
    codigo: 'IGIC_7',
    nombre: 'IGIC 7% - Tipo General (Canarias)',
    valor: 'IGIC 7%',
    tipoImpuesto: 'IGIC',
    porcentaje: 7,
    porcentajeRecargo: 0.7,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Tipo general del Impuesto General Indirecto Canario aplicable a la mayoría de entregas de bienes y servicios.',
    ejemplos: 'Mercancías comerciales, suministros, paquetería, logística en el archipiélago canario',
  },
  {
    id: 'igic-3',
    codigo: 'IGIC_3',
    nombre: 'IGIC 3% - Tipo Reducido (Canarias)',
    valor: 'IGIC 3%',
    tipoImpuesto: 'IGIC',
    porcentaje: 3,
    porcentajeRecargo: 0.3,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Tipo reducido para industria alimentaria elaborada en Canarias, madera, textil y transporte interior.',
    ejemplos: 'Alimentos elaborados en Canarias, envases, transporte interior insular',
  },
  {
    id: 'igic-0',
    codigo: 'IGIC_0',
    nombre: 'IGIC 0% - Tipo Cero (Canarias)',
    valor: 'IGIC 0%',
    tipoImpuesto: 'IGIC',
    porcentaje: 0,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Tipo cero canario para agua potable, medicamentos, libros y alimentos primarios no transformados.',
    ejemplos: 'Entregas de agua potable, productos hortofrutícolas locales no transformados',
  },
  {
    id: 'igic-9.5',
    codigo: 'IGIC_9.5',
    nombre: 'IGIC 9.5% - Tipo Incrementado (Canarias)',
    valor: 'IGIC 9.5%',
    tipoImpuesto: 'IGIC',
    porcentaje: 9.5,
    porcentajeRecargo: 0.95,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: 'Tipo incrementado aplicable a determinados vehículos y maquinaria específica en Canarias.',
    ejemplos: 'Vehículos comerciales con emisiones específicas, maquinaria industrial',
  },
  {
    id: 'igic-15',
    codigo: 'IGIC_15',
    nombre: 'IGIC 15% - Tipo Especial (Canarias)',
    valor: 'IGIC 15%',
    tipoImpuesto: 'IGIC',
    porcentaje: 15,
    porcentajeRecargo: 1.5,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: 'Tipo especial para bebidas alcohólicas, labores de tabaco y bienes suntuarios.',
    ejemplos: 'Bebidas espirituosas, artículos de joyería y lujo',
  },
  // Régimen Especial de Ceuta y Melilla (IPSI)
  {
    id: 'ipsi-0.5',
    codigo: 'IPSI_0.5',
    nombre: 'IPSI 0.5% - Tipo Superreducido (Ceuta y Melilla)',
    valor: 'IPSI 0.5%',
    tipoImpuesto: 'IPSI',
    porcentaje: 0.5,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Impuesto sobre la Producción, los Servicios y la Importación (IPSI). Operaciones bancarias y suministros esenciales.',
    ejemplos: 'Operaciones de seguro, suministros de agua y energía de primera necesidad',
  },
  {
    id: 'ipsi-1',
    codigo: 'IPSI_1',
    nombre: 'IPSI 1% - Tipo Reducido Alimentos Básicos (Ceuta y Melilla)',
    valor: 'IPSI 1%',
    tipoImpuesto: 'IPSI',
    porcentaje: 1,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Alimentos básicos de primera necesidad, panadería, leche, huevos y transporte urbano.',
    ejemplos: 'Pan común, harinas, leche fresca, frutas, verduras, transporte colectivo urbano',
  },
  {
    id: 'ipsi-2',
    codigo: 'IPSI_2',
    nombre: 'IPSI 2% - Tipo Reducido Vivienda y Obras (Ceuta y Melilla)',
    valor: 'IPSI 2%',
    tipoImpuesto: 'IPSI',
    porcentaje: 2,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Obras de albañilería, construcción y reparación de inmuebles, materiales básicos.',
    ejemplos: 'Materiales de construcción, reformas de locales comerciales y viviendas',
  },
  {
    id: 'ipsi-4',
    codigo: 'IPSI_4',
    nombre: 'IPSI 4% - Tipo General (Ceuta y Melilla)',
    valor: 'IPSI 4%',
    tipoImpuesto: 'IPSI',
    porcentaje: 4,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Tipo general en Ceuta y Melilla aplicable a hostelería, servicios profesionales y comercio.',
    ejemplos: 'Restauración, hostelería, servicios informáticos, consultoría, suministros comerciales',
  },
  {
    id: 'ipsi-8',
    codigo: 'IPSI_8',
    nombre: 'IPSI 8% - Tipo Incrementado (Ceuta y Melilla)',
    valor: 'IPSI 8%',
    tipoImpuesto: 'IPSI',
    porcentaje: 8,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: 'Vehículos de motor, embarcaciones y bienes semilujo en Ceuta y Melilla.',
    ejemplos: 'Vehículos comerciales de alta potencia, electrónica especializada',
  },
  {
    id: 'ipsi-10',
    codigo: 'IPSI_10',
    nombre: 'IPSI 10% - Tipo Especial (Ceuta y Melilla)',
    valor: 'IPSI 10%',
    tipoImpuesto: 'IPSI',
    porcentaje: 10,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: 'Juegos de suerte, envite o azar, artículos de lujo y suntuarios.',
    ejemplos: 'Artículos de joyería, tabaco y bebidas alcohólicas de alta graduación',
  },
  // Operaciones Exentas
  {
    id: 'exento-0',
    codigo: 'EXENTO_0',
    nombre: '0% - Operación Exenta / Inversión Sujeto Pasivo',
    valor: '0% Exento',
    tipoImpuesto: 'EXENTO',
    porcentaje: 0,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Entregas exentas (art. 20 LIVA), adquisiciones intracomunitarias (VIES) o inversión del sujeto pasivo.',
    ejemplos: 'Servicios financieros, seguros, proveedores comunitarios intracomunitarios UE',
  },
];

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
  regimenFiscalEmpresa: 'IVA_PENINSULAR',
  regimenFiscalPredeterminado: 'IVA_PENINSULAR',
  aplicaRecargoEquivalenciaDefecto: false,
  permitirIvaCeroOExento: true,
  mostrarTiposTemporales: true,
  mostrarTiposCanarios: true,
  mostrarTiposIpsi: true,
  tiposImpositivos: TIPOS_IMPOSITIVOS_PREDETERMINADOS,
};

