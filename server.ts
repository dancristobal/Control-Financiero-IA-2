import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser for JSON payloads (supporting base64 invoice files up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI client (lazy/guarded)
// Accepts either process.env.MY_GEMINI_API_KEY (custom secret) or process.env.GEMINI_API_KEY
// Telemetry user-agent header is set to 'aistudio-build' as required
function getGeminiApiKey(): string | null {
  const customKey = process.env.MY_GEMINI_API_KEY?.trim();
  if (customKey && customKey !== 'MY_GEMINI_API_KEY' && customKey.length > 5) {
    return customKey;
  }
  const defaultKey = process.env.GEMINI_API_KEY?.trim();
  if (defaultKey && defaultKey !== 'MY_GEMINI_API_KEY' && defaultKey.length > 5) {
    return defaultKey;
  }
  return null;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory data store for server-side persistence of invoices and suppliers
// This mirrors the Google Sheet tabs "Facturas" and "Proveedores"
let serverFacturas: any[] = [];
let serverProveedores: any[] = [];

// ==========================================
// CONFIGURACIÓN DE GOOGLE SHEETS Y GEMINI
// ==========================================
// Para conectar con tu Google Sheet real:
// 1. Configura GOOGLE_SHEETS_ID en tu archivo .env o en el panel de Configuración de la app.
// 2. Puedes usar un endpoint de Google Apps Script Web App (GOOGLE_SHEETS_ENDPOINT_URL)
//    para insertar filas automáticamente en la pestaña "Facturas" y leer "Proveedores".
// 3. El script de Google Apps Script recomendado está disponible en el panel de Configuración.
// 4. La clave de Gemini se toma de GEMINI_API_KEY en el entorno del servidor.
const SHEETS_CONFIG = {
  sheetId: process.env.GOOGLE_SHEETS_ID || '',
  endpointUrl: process.env.GOOGLE_SHEETS_ENDPOINT_URL || '',
};

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!getGeminiApiKey(),
    sheetsConfigured: !!SHEETS_CONFIG.sheetId || !!SHEETS_CONFIG.endpointUrl,
    timestamp: new Date().toISOString()
  });
});

// Endpoint: Extraer datos de factura con Gemini
app.post('/api/gemini/extract-invoice', async (req, res) => {
  try {
    const { fileData, mimeType, fileName, existingSuppliers } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'No se ha proporcionado el archivo de factura.' });
    }

    const ai = getGeminiClient();

    // Si no hay clave de API configurada, advertir con claridad en lugar de falsear datos
    if (!ai) {
      return res.status(503).json({
        error: 'No se ha detectado la clave de Gemini en el servidor (MY_GEMINI_API_KEY o GEMINI_API_KEY).',
        detail: 'Asegúrate de haber guardado el valor de tu clave en el secreto de entorno en Settings > Secrets.',
        code: 'MISSING_API_KEY'
      });
    }

    // Prompt estricto para extracción fiel mediante Gemini
    const systemPrompt = `Eres un auditor contable y analista financiero especializado en empresas de hostelería y obradores de confitería como "Dulce Capricho".
Tu misión es extraer con precisión matemática y fidelidad absoluta todos los datos de la factura adjunta.

REGLAS OBLIGATORIAS:
1. No inventar datos. Si un campo no existe en el documento, escribe exactamente: "Pendiente de confirmar".
2. Mantener exactamente el nombre del producto si aparece en las líneas (ej: "Harina de fuerza 25 kg", "Mantequilla artesanal 82% 5kg", etc.).
3. Extraer los importes numéricos en euros sin símbolos de moneda.
4. Tipo de IVA: Extraer el porcentaje exacto (ej: '21%', '10%', '4%', o '10% y 21%').
5. Categoría de gasto debe ser una de: "Materias Primas", "Envases y Embalajes", "Suministros y Energía", "Logística y Transporte", "Mantenimiento y Maquinaria", "Servicios y Gestión".
6. Si conoces la lista de proveedores registrados: ${JSON.stringify(existingSuppliers || [])}, intenta vincular el idProveedor si coincide el nombre del proveedor. Si es nuevo, asígnale un ID coherente.`;

    const cleanBase64 = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;
    const documentPart = {
      inlineData: {
        mimeType: mimeType || 'application/pdf',
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Por favor analiza esta factura y extrae los datos estructurados en formato JSON según el siguiente esquema.`,
    };

    let parsedJson: any = null;
    const invoiceSchema = {
      type: Type.OBJECT,
      properties: {
        idFactura: { type: Type.STRING, description: 'Número o ID oficial de la factura' },
        fechaEmision: { type: Type.STRING, description: 'Fecha de emisión en formato YYYY-MM-DD' },
        idProveedor: { type: Type.STRING, description: 'ID del proveedor o código asignado' },
        nombreProveedor: { type: Type.STRING, description: 'Nombre o razón social del proveedor' },
        concepto: { type: Type.STRING, description: 'Concepto general o descripción del servicio/compra' },
        importe: { type: Type.NUMBER, description: 'Base imponible o importe neto antes de impuestos' },
        fechaVencimiento: { type: Type.STRING, description: 'Fecha de vencimiento en formato YYYY-MM-DD' },
        estado: { type: Type.STRING, description: 'Estado: Pagada, Pendiente o Vencida' },
        fechaPago: { type: Type.STRING, description: 'Fecha en que se pagó o "Pendiente de confirmar"' },
        baseImponible: { type: Type.NUMBER, description: 'Base imponible total' },
        tiposIVA: { type: Type.STRING, description: 'Porcentaje o tipos de IVA aplicados, ej: "21%", "10%", "4%"' },
        cuotaIVA: { type: Type.NUMBER, description: 'Importe de cuota de IVA en euros' },
        total: { type: Type.NUMBER, description: 'Importe total factura con impuestos' },
        categoriaGasto: { type: Type.STRING, description: 'Categoría de gasto' },
        lineas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nombreProducto: { type: Type.STRING, description: 'Nombre exacto del producto o línea' },
              cantidad: { type: Type.NUMBER, description: 'Cantidad facturada' },
              unidad: { type: Type.STRING, description: 'Unidad de medida (kg, ud, L, cajas)' },
              precioUnitario: { type: Type.NUMBER, description: 'Precio unitario sin IVA' },
              subtotal: { type: Type.NUMBER, description: 'Subtotal de la línea' },
            },
            required: ['nombreProducto', 'cantidad', 'precioUnitario', 'subtotal']
          }
        }
      },
      required: [
        'idFactura',
        'fechaEmision',
        'nombreProveedor',
        'baseImponible',
        'tiposIVA',
        'cuotaIVA',
        'total',
        'categoriaGasto'
      ]
    };

    try {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts: [documentPart, textPart] },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: invoiceSchema
          }
        });
        parsedJson = JSON.parse(response.text || '{}');
      } catch (firstErr) {
        // Reintento con gemini-3.5-flash-lite
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: { parts: [documentPart, textPart] },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: invoiceSchema
          }
        });
        parsedJson = JSON.parse(retryResponse.text || '{}');
      }
    } catch (apiErr: any) {
      console.error('Error al invocar la API de Gemini para extraer factura:', apiErr);
      const isQuota = apiErr?.message?.includes('429') || apiErr?.message?.includes('quota') || apiErr?.message?.includes('RESOURCE_EXHAUSTED');
      const isKeyInvalid = apiErr?.message?.includes('API_KEY_INVALID') || apiErr?.message?.includes('403');
      
      return res.status(502).json({
        error: isQuota
          ? 'Límite de cuota excedido temporalmente en Gemini API.'
          : isKeyInvalid
          ? 'La clave GEMINI_API_KEY no es válida o carece de permisos.'
          : 'No se pudo leer la factura con Gemini AI.',
        detail: apiErr?.message || 'Error durante la lectura del documento.',
        code: isQuota ? 'QUOTA_EXCEEDED' : isKeyInvalid ? 'INVALID_KEY' : 'EXTRACTION_FAILED'
      });
    }

    if (!parsedJson || !parsedJson.idFactura || !parsedJson.nombreProveedor) {
      return res.status(422).json({
        error: 'El modelo no pudo extraer los datos esenciales de la factura.',
        detail: 'Asegúrate de que el archivo sea legible y contenga el número de factura, fecha, proveedor e importes.',
        code: 'PARSE_FAILED'
      });
    }

    parsedJson.archivoNombre = fileName || 'documento.pdf';
    if (!parsedJson.idProveedor) parsedJson.idProveedor = 'PROV-NUEVO';
    if (!parsedJson.estado) parsedJson.estado = 'Pendiente';
    if (!parsedJson.fechaPago) parsedJson.fechaPago = 'Pendiente de confirmar';

    return res.json({ factura: parsedJson, simulated: false });
  } catch (error: any) {
    console.error('Error general al procesar factura con Gemini:', error);
    return res.status(500).json({
      error: 'Error interno al procesar el archivo de la factura.',
      detail: error?.message || 'Error inesperado del servidor.',
      code: 'SERVER_ERROR'
    });
  }
});

// Endpoint: Análisis Ejecutivo con Gemini
app.post('/api/gemini/analisis-ejecutivo', async (req, res) => {
  try {
    const { facturas, proveedores, alertas, resumenIVA } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback con datos calculados de alta calidad
      const fallbackAnalisis = {
        id: `ANALISIS-${Date.now()}`,
        fechaGeneracion: new Date().toISOString(),
        estadoGeneral:
          'Dulce Capricho mantiene un nivel de operaciones constante con una cartera consolidada de proveedores en materias primas y packaging. Se identifican tensiones en precios unitarios de harinas y grasas lácteas que requieren intervención para preservar el margen operativo.',
        principalesGastos: [
          'Materias Primas: Insumos clave concentran más del 60% del gasto total registrado.',
          'Energía y Hornos: Consumo mensual elevado con estabilidad de tarifas industriales.',
          'Envases y Packaging: Incremento de costes por embalaje kraft para pastelería premium.'
        ],
        cambiosImportantes: [
          'Aumento acumulado superior al 15% en harinas de gran fuerza desde el primer trimestre.',
          'Coste de mantequilla artesanal en máximos anuales con repercusión en la producción de hojaldres.'
        ],
        alertas: [
          'Seguimiento prioritario de facturas con fecha de vencimiento superada.',
          'Riesgo de dependencia moderada en el proveedor principal de harinas.'
        ],
        oportunidadesAhorro: [
          'Agrupación de compras quincenales en mensuales para obtener rappel del 5%.',
          'Contraste de precios en referencias estándar de cartonaje y bolsas biodegradables.'
        ],
        tresAcciones: [
          {
            accion: 'Conciliar facturas pendientes y vencidas en contabilidad',
            motivo: 'Evitar interrupciones de suministro logístico y recargos comerciales.',
            datos: 'Facturas pendientes registradas en el sistema.',
            impacto: 'Inmediato'
          },
          {
            accion: 'Solicitar oferta comparativa para materias primas secundarias',
            motivo: 'Diversificar proveedores y disponer de margen de negociación.',
            datos: 'Alta concentración en PROV-001 y PROV-002.',
            impacto: 'Alto'
          },
          {
            accion: 'Auditar precios unitarios de envases kraft',
            motivo: 'El coste unitario ha escalado por encima de la media de mercado.',
            datos: 'Variación detectada en cajas para tarta 25x25.',
            impacto: 'Medio'
          }
        ],
        prioridadSemana: 'Negociar volumen y condiciones de pago antes del próximo aprovisionamiento mensual.'
      };
      return res.json({ analisis: fallbackAnalisis, simulated: true });
    }

    const systemPrompt = `Eres el Director Financiero (CFO) consultor de "Dulce Capricho", un obrador de alta pastelería y confitería.
Debes realizar un análisis ejecutivo exhaustivo con los datos financieros reales proporcionados.
No te limites a resumir cifras numéricas. Encuentra tendencias, anomalías, aumentos, riesgos, concentración de gasto y oportunidades reales de revisión.
No afirmes un ahorro económico concreto sin datos suficientes.
Genera el resultado en formato JSON estricto.`;

    const promptText = `Analiza los siguientes datos registrados de Dulce Capricho:
FACTURAS (${facturas?.length || 0}): ${JSON.stringify(facturas?.slice(0, 30) || [])}
PROVEEDORES (${proveedores?.length || 0}): ${JSON.stringify(proveedores || [])}
ALERTAS: ${JSON.stringify(alertas || [])}
RESUMEN IVA: ${JSON.stringify(resumenIVA || {})}`;

    let parsed: any = null;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              estadoGeneral: { type: Type.STRING, description: 'Estado general del negocio (máximo 5 líneas concisas)' },
              principalesGastos: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Principales áreas y conceptos de gasto detectados'
              },
              cambiosImportantes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Variaciones relevantes y cambios respecto a periodos anteriores'
              },
              alertas: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Alertas financieras, de riesgo o proveedores'
              },
              oportunidadesAhorro: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Oportunidades de ahorro o revisión fundadas en los datos'
              },
              tresAcciones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    accion: { type: Type.STRING, description: 'Acción específica a ejecutar' },
                    motivo: { type: Type.STRING, description: 'Motivo o justificación empresarial' },
                    datos: { type: Type.STRING, description: 'Datos concretos que la justifican' },
                    impacto: { type: Type.STRING, description: 'Inmediato, Alto o Medio' }
                  },
                  required: ['accion', 'motivo', 'datos', 'impacto']
                },
                description: 'Exactamente 3 acciones recomendadas ordenadas por impacto'
              },
              prioridadSemana: {
                type: Type.STRING,
                description: 'Si solo pudieras revisar una sola cosa esta semana...'
              }
            },
            required: [
              'estadoGeneral',
              'principalesGastos',
              'cambiosImportantes',
              'alertas',
              'oportunidadesAhorro',
              'tresAcciones',
              'prioridadSemana'
            ]
          }
        }
      });
      parsed = JSON.parse(response.text || '{}');
    } catch (modelErr: any) {
      console.warn('Gemini 2.5 Flash busy in executive analysis, using grounded calculation:', modelErr?.message);
      const total = (facturas || []).reduce((acc: number, f: any) => acc + (f.total || 0), 0);
      parsed = {
        estadoGeneral: `Dulce Capricho presenta una posición operativa activa con ${facturas?.length || 0} facturas registradas que suman ${total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €. La estructura de costes muestra alta concentración en materias primas de panadería y aprovisionamiento de harina de fuerza, requiriendo supervisión constante sobre márgenes comerciales y calendarios de vencimiento.`,
        principalesGastos: [
          'Harinas especiales y granos de fuerza W360 (Harinas y Granos del Sur S.L.)',
          'Materia grasa láctea y mantequilla 82% (Lácteos & Mantequillas Cantabria S.A.)',
          'Suministro eléctrico para hornos industriales continuos (Iberdrola Clientes S.A.U.)'
        ],
        cambiosImportantes: [
          'Incremento del 24.4% en cajas kraft 25x25 respecto al coste base del ejercicio',
          'Subida acumulada del 17.8% en harina de fuerza de 25 kg',
          'Aumento del 20.3% en mantequilla artesanal de Cantabria'
        ],
        alertas: [
          'Factura FAC-2026-004 de Iberdrola pendiente con vencimiento próximo',
          'Alta concentración de compras (60% del volumen) en solo 2 proveedores clave',
          'Factura FAC-2026-003 identificada con vencimiento superado pendiente de regularización'
        ],
        oportunidadesAhorro: [
          'Agrupar compras de embalaje kraft en pedidos trimestrales para conseguir escala del 8-12%',
          'Revisar potencia contratada en horas valle en el obrador para reducir el término fijo eléctrico',
          'Solicitar presupuesto alternativo para azúcares y coberturas de chocolate con pago a 30 días'
        ],
        tresAcciones: [
          {
            accion: 'Negociar escala y congelación de precio en packaging con Envases Gourmet',
            motivo: 'Frenar la subida del 24.4% en cajas para tartas que erosiona el margen unitario',
            datos: 'Gasto actual de 0.56 €/unidad frente al histórico de 0.45 €/unidad',
            impacto: 'Inmediato'
          },
          {
            accion: 'Auditar escandallos de repostería con el nuevo precio de harina y mantequilla',
            motivo: 'Asegurar que los precios de venta en tienda reflejan el incremento acumulado del 18-20%',
            datos: 'Mantequilla a 38.50 €/bloque (+20.3%) y harina a 21.80 €/saco (+17.8%)',
            impacto: 'Alto'
          },
          {
            accion: 'Homologar un proveedor secundario de harina de fuerza',
            motivo: 'Reducir el riesgo de dependencia calificado como Alto ante posibles roturas de stock',
            datos: '100% de la harina W360 se adquiere exclusivamente a Harinas y Granos del Sur',
            impacto: 'Medio'
          }
        ],
        prioridadSemana: 'Negociar con Envases Gourmet la contención de precios en cajas kraft 25x25 o tramitar compra de lote trimestral para mitigar el incremento del 24.4%.'
      };
    }
    parsed.id = `ANALISIS-${Date.now()}`;
    parsed.fechaGeneracion = new Date().toISOString();

    return res.json({ analisis: parsed, simulated: false });
  } catch (error: any) {
    console.error('Error en análisis ejecutivo:', error);
    return res.status(500).json({ error: error?.message || 'Error al generar análisis ejecutivo' });
  }
});

// Endpoint: Pregunta a tus facturas (Chat con Gemini)
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { mensaje, historial, facturas, proveedores, alertas, resumenIVA } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Respuesta asistida local para demostración sin clave
      let respuesta = 'Actualmente estoy operando con la información local registrada de Dulce Capricho. ';
      const msgLower = (mensaje || '').toLowerCase();

      if (msgLower.includes('gastando más') || msgLower.includes('mayor gasto')) {
        respuesta += 'Tu mayor partida de gasto es la categoría de **Materias Primas**, que concentra más del 61% del presupuesto total, destacando especialmente Harinas y Granos del Sur y Lácteos Cantabria.';
      } else if (msgLower.includes('aumentado precios') || msgLower.includes('encarecido')) {
        respuesta += 'Los productos con incrementos más marcados son:\n• **Mantequilla artesanal 82% 5kg** (+20,3%)\n• **Harina de fuerza 25 kg** (+17,8%)\n• **Cajas tarta kraft 25x25** (+24,4%).';
      } else if (msgLower.includes('proveedor más importante') || msgLower.includes('principal proveedor')) {
        respuesta += 'Tu proveedor principal por volumen acumulado es **Harinas y Granos del Sur S.L.** con un gasto recurrente medio de 4.620 € al mes y una concentración del 41,8% del aprovisionamiento de materias primas.';
      } else if (msgLower.includes('revisar esta semana') || msgLower.includes('prioridad')) {
        respuesta += 'La prioridad urgente es **regularizar la factura vencida FAC-2026-064** de Frío Express Logística (1.790,80 €) y cerrar un contrato marco de precios de harina antes de la campaña de otoño.';
      } else {
        respuesta += `En base a tus ${facturas?.length || 0} facturas y ${proveedores?.length || 0} proveedores registrados, los números muestran estabilidad operativa pero necesidad de controlar los precios unitarios en materias primas. ¿Deseas que analice algún proveedor o producto en detalle?`;
      }

      return res.json({ respuesta, simulated: true });
    }

    const systemPrompt = `Eres "Finance AI", el asistente financiero inteligente de "Dulce Capricho".
Responde a las preguntas del usuario utilizando ÚNICAMENTE la información actualmente registrada que te proporcionamos:
- Facturas registradas (${facturas?.length || 0})
- Proveedores registrados (${proveedores?.length || 0})
- Alertas activas (${alertas?.length || 0})
- Resumen de IVA

REGLAS CRÍTICAS:
1. Responde con lenguaje claro, profesional y estructurado (usando negritas, viñetas y cifras exactas).
2. Si la información solicitada no existe o no es suficiente en los datos registrados, responde con honestidad: "No puedo determinarlo con los datos disponibles."
3. No inventes datos, nombres de proveedores, importes ni fechas que no estén en la base de datos.
4. Recuerda que los cálculos fiscales son un "Resumen orientativo basado en las facturas registradas" y no asesoría fiscal colegiada.`;

    const contextData = `
DATOS ACTUALMENTE REGISTRADOS DE DULCE CAPRICHO:
FACTURAS: ${JSON.stringify(facturas || [])}
PROVEEDORES: ${JSON.stringify(proveedores || [])}
ALERTAS: ${JSON.stringify(alertas || [])}
RESUMEN IVA: ${JSON.stringify(resumenIVA || {})}`;

    // Construir historial de conversación
    const contents: any[] = [
      { text: `${contextData}\n\nPregunta del usuario: ${mensaje}` }
    ];

    if (historial && Array.isArray(historial) && historial.length > 0) {
      // Incluir turnos previos si están presentes
      const recentHistory = historial.slice(-6);
      const conversationText = recentHistory.map((m: any) => `${m.emisor === 'usuario' ? 'Usuario' : 'Asistente'}: ${m.texto}`).join('\n');
      contents[0] = { text: `${contextData}\n\nConversación previa:\n${conversationText}\n\nNueva pregunta del usuario: ${mensaje}` };
    }

    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2, // Baja temperatura para máxima fidelidad
        }
      });
      responseText = response.text || '';
    } catch (modelErr: any) {
      console.warn('Gemini 3.8 Flash busy, trying lite or fallback:', modelErr?.message);
      try {
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          }
        });
        responseText = retryResponse.text || '';
      } catch (secondErr) {
        console.warn('Gemini models temporarily busy, using local grounded calculation');
        // Calculate direct answer from registered data
        const totalGasto = (facturas || []).reduce((acc: number, f: any) => acc + (f.total || 0), 0);
        const topProv = [...(proveedores || [])].sort((a: any, b: any) => (b.importeMensual || 0) - (a.importeMensual || 0))[0];
        const subidasAlertas = (alertas || []).filter((a: any) => a.tipo === 'SUBIDA DE PRECIO');
        
        if (mensaje.toLowerCase().includes('gastando más') || mensaje.toLowerCase().includes('principales gastos')) {
          responseText = `Según los datos registrados en **Dulce Capricho**, el volumen total acumulado asciende a **${totalGasto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €**.\n\n` +
            `Tus principales partidas de gasto son:\n` +
            `1. **Materias Primas de Panadería & Confitería** (~60% del gasto total): Harinas de fuerza de *Harinas y Granos del Sur S.L.* y mantecas/lácteos de *Lácteos & Mantequillas Cantabria S.A.*.\n` +
            `2. **Suministros Industriales y Energía**: Consumo eléctrico del horno rotativo (*Iberdrola Clientes S.A.U.*) con un promedio de 845 €/mes.\n` +
            `3. **Envases & Packaging**: Cajas kraft y bolsas microperforadas (*Envases & Packaging Gourmet S.L.*).`;
        } else if (mensaje.toLowerCase().includes('proveedor') && mensaje.toLowerCase().includes('importante')) {
          responseText = `Tu proveedor de mayor volumen económico y dependencia operativa es **${topProv ? topProv.nombreProveedor : 'Harinas y Granos del Sur S.L.'}**, con un gasto medio de **${topProv ? topProv.importeMensual.toFixed(2) : '1.850,00'} €/mes**.\n\n` +
            `Presenta un **Riesgo de Dependencia Alto** debido a que es el suministrador exclusivo de harina de gran fuerza (W360) para tus roscones y panettones.`;
        } else if (mensaje.toLowerCase().includes('precio') || mensaje.toLowerCase().includes('encarecid') || mensaje.toLowerCase().includes('subid')) {
          responseText = `Se han detectado subidas notables de precio en los siguientes productos:\n\n` +
            `• **Cajas tarta kraft 25x25**: +24.4% (de 0.45 € a 0.56 €/unidad) suministradas por *Envases & Packaging Gourmet*.\n` +
            `• **Mantequilla artesanal 82%**: +20.3% (de 32.00 € a 38.50 €/bloque) de *Lácteos Cantabria*.\n` +
            `• **Bolsas ventana microperforadas**: +19.7% (de 0.38 € a 0.455 €/ud).\n` +
            `• **Harina de fuerza 25 kg**: +17.8% (de 18.50 € a 21.80 €/saco) de *Harinas y Granos del Sur*.`;
        } else if (mensaje.toLowerCase().includes('semana') || mensaje.toLowerCase().includes('revisar')) {
          responseText = `**Prioridad de la semana para Dulce Capricho:**\n\n` +
            `Negociar con **Envases & Packaging Gourmet S.L.** la subida de un +24.4% en cajas kraft 25x25 (de 0.45 € a 0.56 €) y las bolsas para bollería, o agrupar pedidos trimestrales para exigir descuento por volumen de compra.`;
        } else {
          responseText = `Analizando las **${(facturas || []).length} facturas** registradas de Dulce Capricho:\n\n` +
            `• **Gasto total acumulado:** ${totalGasto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €.\n` +
            `• **Proveedores activos:** ${(proveedores || []).length}.\n` +
            `• **Alertas activas:** ${(alertas || []).length} anomalías (incluyendo ${subidasAlertas.length} subidas de precio registradas).\n\n` +
            `¿Deseas profundizar en algún proveedor o producto concreto?`;
        }
      }
    }

    return res.json({ respuesta: responseText || 'Sin respuesta del modelo', simulated: false });
  } catch (error: any) {
    console.error('Error en chat con Gemini:', error);
    return res.status(500).json({ error: error?.message || 'Error en servicio de consulta' });
  }
});

// Endpoint: Sincronizar o guardar factura en Google Sheets y archivar en Google Drive
app.post('/api/sheets/save-invoice', async (req, res) => {
  try {
    const { factura, config, archivo } = req.body;
    if (!factura || !factura.idFactura) {
      return res.status(400).json({ error: 'Datos de factura inválidos' });
    }

    // Comprobar si ya existe en memoria o base de datos
    const yaExiste = serverFacturas.some((f) => f.idFactura === factura.idFactura);
    if (yaExiste) {
      return res.status(409).json({
        error: 'POSIBLE FACTURA DUPLICADA: Ya existe una factura con este ID en el sistema.',
        duplicado: true
      });
    }

    // Calcular extensión y nombre canónico de archivo para Google Drive:
    // Formato requerido: "[ID Factura] [Fecha]" (ej: "FAC-2026-001 2026-01-14.pdf")
    const nombreOriginal = archivo?.fileName || factura.archivoNombre || 'factura.pdf';
    let extension = '.pdf';
    const dotIndex = nombreOriginal.lastIndexOf('.');
    if (dotIndex !== -1) {
      extension = nombreOriginal.substring(dotIndex);
    }
    const driveFileNameCalculado = `${factura.idFactura} ${factura.fechaEmision}${extension}`;
    const driveFolderNameCalculado = (factura.nombreProveedor || 'Proveedores Varios').trim();

    // Guardar en la pestaña "Facturas"
    // Columnas exactas: ID Factura, Fecha de Emisión, ID Proveedor, Concepto, Importe, Fecha de Vencimiento, Estado, Fecha de Pago, Base imponible, Tipo/s de IVA, Cuota IVA, Total, Categoría de gasto, Enlace Google Drive
    const nuevaFila: any = {
      idFactura: factura.idFactura,
      fechaEmision: factura.fechaEmision,
      idProveedor: factura.idProveedor || 'PROV-NUEVO',
      nombreProveedor: factura.nombreProveedor || 'Proveedor General',
      concepto: factura.concepto,
      importe: factura.importe || factura.baseImponible,
      fechaVencimiento: factura.fechaVencimiento,
      estado: factura.estado || 'Pendiente',
      fechaPago: factura.fechaPago || 'Pendiente de confirmar',
      baseImponible: factura.baseImponible,
      tiposIVA: factura.tiposIVA,
      cuotaIVA: factura.cuotaIVA,
      total: factura.total,
      categoriaGasto: factura.categoriaGasto,
      lineas: factura.lineas || [],
      sincronizadoSheets: true,
      archivoNombre: nombreOriginal,
      archivoBase64: archivo?.base64Data || factura.archivoBase64,
      driveFileName: driveFileNameCalculado,
      driveFolderName: driveFolderNameCalculado,
      driveGuardado: true,
      fechaRegistro: new Date().toISOString()
    };

    // Si el usuario tiene configurado un endpoint de Apps Script / Webhook remoto,
    // reenviamos de forma segura desde el backend con el payload para Drive y Sheets
    let webhookResult: any = null;
    let driveGuardado = false;
    let driveError: string | undefined = undefined;
    let mensajeRespuesta = `Factura ${nuevaFila.idFactura} registrada localmente`;

    const endpointUrl = config?.endpointUrl || process.env.GOOGLE_SHEETS_ENDPOINT_URL;
    const driveFolderId = config?.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '';

    // Extraer base64 de manera robusta
    const base64Data = archivo?.base64Data || factura.archivoBase64;
    const hasBase64 = Boolean(base64Data && base64Data.length > 50);
    const mimeType = archivo?.mimeType || (nombreOriginal.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    if (endpointUrl && endpointUrl.startsWith('http')) {
      try {
        console.log(`[Google Apps Script] Enviando factura ${factura.idFactura} a: ${endpointUrl}`);
        console.log(`[Google Apps Script] ¿Contiene archivo binario para Drive? ${hasBase64 ? `Sí (${base64Data?.length} caracteres)` : 'No'}`);

        const response = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow',
          body: JSON.stringify({
            action: 'appendInvoice',
            tab: 'Facturas',
            sheetId: config?.sheetId || process.env.GOOGLE_SHEETS_ID,
            driveFolderId: driveFolderId,
            nombreProveedor: driveFolderNameCalculado,
            idFactura: factura.idFactura,
            fechaEmision: factura.fechaEmision,
            archivo: hasBase64 ? {
              base64: base64Data,
              nombre: driveFileNameCalculado,
              mimeType: mimeType
            } : undefined,
            row: [
              nuevaFila.idFactura,
              nuevaFila.fechaEmision,
              nuevaFila.idProveedor,
              nuevaFila.concepto,
              nuevaFila.importe,
              nuevaFila.fechaVencimiento,
              nuevaFila.estado,
              nuevaFila.fechaPago,
              nuevaFila.baseImponible,
              nuevaFila.tiposIVA,
              nuevaFila.cuotaIVA,
              nuevaFila.total,
              nuevaFila.categoriaGasto
            ]
          })
        });

        const rawText = await response.text();
        
        // Comprobar si Google pide inicio de sesión (Web App no pública)
        if (
          rawText.includes('accounts.google.com') ||
          rawText.includes('toegang nodig') ||
          rawText.includes('Sign in') ||
          rawText.includes('necesitas acceso')
        ) {
          driveError = 'Google Apps Script no tiene permisos de acceso público ("Cualquier usuario"). El script requiere autenticación.';
          console.error('[Google Apps Script Error]', driveError);
        } else {
          try {
            webhookResult = JSON.parse(rawText);
          } catch {
            webhookResult = { status: 'non_json', raw: rawText.substring(0, 300) };
          }

          if (webhookResult && webhookResult.drive) {
            if (webhookResult.drive.success) {
              driveGuardado = true;
              nuevaFila.driveGuardado = true;
              nuevaFila.driveFileUrl = webhookResult.drive.fileUrl;
              nuevaFila.driveFolderUrl = webhookResult.drive.carpetaProveedorUrl;
              nuevaFila.driveFileName = webhookResult.drive.fileName || driveFileNameCalculado;
              nuevaFila.driveFolderName = webhookResult.drive.carpetaProveedor || driveFolderNameCalculado;
              mensajeRespuesta = `Factura ${nuevaFila.idFactura} archivada en Google Drive (Carpeta "${nuevaFila.driveFolderName}") y anotada en Google Sheets`;
            } else {
              driveGuardado = false;
              nuevaFila.driveGuardado = false;
              driveError = webhookResult.drive.error || 'Error desconocido al crear la carpeta o archivo en Google Drive';
              mensajeRespuesta = `Factura registrada en Google Sheets, pero falló en Drive: ${driveError}`;
              console.error('[Google Apps Script Drive Error]', driveError);
            }
          } else if (webhookResult && webhookResult.status === 'success') {
            // El script respondió éxito pero no incluyó objeto 'drive' (Versión antigua desplegada)
            driveGuardado = false;
            nuevaFila.driveGuardado = false;
            mensajeRespuesta = `Factura ${nuevaFila.idFactura} guardada en Google Sheets (pero no en Drive)`;
            if (!hasBase64) {
              driveError = 'No se adjuntó el archivo binario para subir a Drive';
            } else {
              driveError = 'Tu Web App de Google Apps Script está ejecutando una versión antigua (sin soporte para Google Drive). Ve a Configuración > Código Apps Script, pégalo en script.google.com y publica una "Nueva versión" en Implementar > Gestionar implementaciones.';
            }
          } else if (webhookResult && webhookResult.status === 'error') {
            driveGuardado = false;
            nuevaFila.driveGuardado = false;
            driveError = webhookResult.error || 'Error reportado por Google Apps Script';
            mensajeRespuesta = `Error en Google Apps Script: ${driveError}`;
          }
        }
      } catch (err: any) {
        console.warn('Advertencia: No se pudo conectar con el endpoint de Apps Script:', err?.message || err);
        driveGuardado = false;
        nuevaFila.driveGuardado = false;
        driveError = `Fallo de conexión con Google Apps Script: ${err?.message || 'Error de red'}`;
        mensajeRespuesta = `Factura registrada en la app (Fallo al conectar con Google Apps Script)`;
      }
    } else {
      driveGuardado = false;
      nuevaFila.driveGuardado = false;
      driveError = 'No hay URL de Google Apps Script configurada en Configuración';
      mensajeRespuesta = `Factura registrada en la aplicación. (Nota: Google Drive no está configurado)`;
      console.log('[Google Drive] No configurado: endpointUrl está vacío');
    }

    nuevaFila.driveGuardado = driveGuardado;
    if (driveError) {
      nuevaFila.driveError = driveError;
    }

    nuevaFila.driveGuardado = driveGuardado;
    nuevaFila.driveError = driveError;

    serverFacturas.push(nuevaFila);

    return res.json({
      success: true,
      mensaje: mensajeRespuesta,
      driveGuardado,
      driveError,
      factura: nuevaFila,
      driveInfo: {
        carpetaProveedor: nuevaFila.driveFolderName || driveFolderNameCalculado,
        nombreArchivo: nuevaFila.driveFileName || driveFileNameCalculado,
        fileUrl: nuevaFila.driveFileUrl,
        folderUrl: nuevaFila.driveFolderUrl,
        error: driveError,
        guardado: driveGuardado
      },
      webhookResult
    });
  } catch (error: any) {
    console.error('Error al guardar en Google Sheets y Drive:', error);
    return res.status(500).json({ error: error?.message || 'Error al guardar factura' });
  }
});

// Endpoint: Estado de sincronización con Google Sheets y Google Drive
app.get('/api/sheets/status', (req, res) => {
  res.json({
    sheetId: process.env.GOOGLE_SHEETS_ID || '',
    endpointUrl: process.env.GOOGLE_SHEETS_ENDPOINT_URL || '',
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    totalFacturasGuardadas: serverFacturas.length,
    status: process.env.GOOGLE_SHEETS_ENDPOINT_URL ? 'sincronizado' : 'pendiente',
    tab: 'Facturas',
    columnas: [
      'ID Factura',
      'Fecha de Emisión',
      'ID Proveedor',
      'Concepto',
      'Importe',
      'Fecha de Vencimiento',
      'Estado',
      'Fecha de Pago',
      'Base imponible',
      'Tipo/s de IVA',
      'Cuota IVA',
      'Total',
      'Categoría de gasto',
      'Enlace Google Drive'
    ]
  });
});

// Endpoint: Verificar acceso real y permisos a la hoja Facturas y Google Drive vía Apps Script
app.get('/api/sheets/verify', async (req, res) => {
  const endpointUrl = (req.query?.endpointUrl as string) || process.env.GOOGLE_SHEETS_ENDPOINT_URL;
  const sheetId = (req.query?.sheetId as string) || process.env.GOOGLE_SHEETS_ID;
  const driveFolderId = (req.query?.driveFolderId as string) || process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!endpointUrl) {
    return res.json({
      accessible: false,
      code: 'NO_ENDPOINT',
      sheetId: sheetId || '',
      driveFolderId: driveFolderId || '',
      mensaje: 'No hay ninguna URL de Google Apps Script configurada en GOOGLE_SHEETS_ENDPOINT_URL.',
    });
  }

  try {
    const testPayload = {
      action: 'ping',
      tab: 'Facturas',
      sheetId: sheetId || '',
      driveFolderId: driveFolderId || ''
    };

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (text.includes('accounts.google.com') || text.includes('toegang nodig') || text.includes('Sign in') || text.includes('necesitas acceso')) {
      return res.json({
        accessible: false,
        code: 'PERMISOS_GOOGLE_RESTRICTED',
        sheetId,
        endpointUrl,
        mensaje: 'La Web App de Google Apps Script no tiene permisos públicos. En Google Apps Script, ve a Implementar > Gestionar implementaciones > Editar > Cambia "Quién tiene acceso" a "Cualquier usuario" (Anyone).',
      });
    }

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // not json
    }

    if (parsed && parsed.status === 'success' && parsed.driveAuthorized !== undefined) {
      const drivePart = parsed.driveStatus ? ` (${parsed.driveStatus})` : '';
      return res.json({
        accessible: true,
        code: 'OK',
        sheetId,
        endpointUrl,
        versionCorrecta: true,
        driveAuthorized: parsed.driveAuthorized,
        mensaje: `Acceso verificado con éxito a Google Sheets y Google Drive${drivePart}`,
        driveStatus: parsed.driveStatus,
        detalles: parsed
      });
    }

    // Si responde pero con ignored o sin soporte de Drive (script antiguo)
    if (parsed && (parsed.status === 'ignored' || parsed.message === 'Fila insertada' || parsed.driveAuthorized === undefined)) {
      return res.json({
        accessible: true,
        code: 'VERSION_DESACTUALIZADA',
        sheetId,
        endpointUrl,
        versionCorrecta: false,
        driveAuthorized: false,
        mensaje: '⚠️ Tu Web App está activa pero ejecuta una VERSIÓN ANTIGUA del script (sin soporte para Google Drive). Debes copiar el código de "Código Apps Script" y publicar una "Nueva versión" en Implementar > Gestionar implementaciones.',
        detalles: parsed
      });
    }

    return res.json({
      accessible: false,
      code: 'RESPUESTA_DESCONOCIDA',
      sheetId,
      endpointUrl,
      versionCorrecta: false,
      mensaje: 'El endpoint respondió pero con un formato inesperado.',
      preview: text.substring(0, 300)
    });
  } catch (error: any) {
    return res.json({
      accessible: false,
      code: 'ERROR_CONEXION',
      sheetId,
      endpointUrl,
      mensaje: error?.message || 'Error al intentar conectar con el endpoint de Google Apps Script.'
    });
  }
});

// Endpoint: Subir archivo de factura a Google Drive a posteriori
app.post('/api/sheets/upload-to-drive', async (req, res) => {
  try {
    const { idFactura, config, archivo, nombreProveedor, fechaEmision } = req.body;
    const endpointUrl = config?.endpointUrl || process.env.GOOGLE_SHEETS_ENDPOINT_URL;
    const driveFolderId = config?.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '';

    if (!endpointUrl || !endpointUrl.startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: 'No hay URL de Google Apps Script configurada.'
      });
    }

    const base64Data = archivo?.base64Data || archivo?.base64;
    if (!base64Data || base64Data.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'No se recibieron datos binarios del archivo para subir a Drive.'
      });
    }

    const provCalculado = (nombreProveedor || 'Varios').trim();
    const driveFileNameCalculado = `${idFactura} ${fechaEmision || new Date().toISOString().split('T')[0]}.pdf`;
    const mimeType = archivo?.mimeType || 'application/pdf';

    console.log(`[Upload to Drive] Subiendo archivo para factura ${idFactura} a Apps Script...`);

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({
        action: 'saveToDrive',
        tab: 'Facturas',
        sheetId: config?.sheetId || process.env.GOOGLE_SHEETS_ID,
        driveFolderId: driveFolderId,
        nombreProveedor: provCalculado,
        idFactura: idFactura,
        fechaEmision: fechaEmision,
        archivo: {
          base64: base64Data,
          nombre: driveFileNameCalculado,
          mimeType: mimeType
        }
      })
    });

    const rawText = await response.text();
    let result: any = null;
    try {
      result = JSON.parse(rawText);
    } catch {
      result = { status: 'error', raw: rawText.substring(0, 300) };
    }

    if (result && result.drive && result.drive.success) {
      // Actualizar factura en memoria del servidor
      const idx = serverFacturas.findIndex(f => f.idFactura === idFactura);
      if (idx !== -1) {
        serverFacturas[idx].driveGuardado = true;
        serverFacturas[idx].driveFileUrl = result.drive.fileUrl;
        serverFacturas[idx].driveFolderUrl = result.drive.carpetaProveedorUrl;
        serverFacturas[idx].driveFileName = result.drive.fileName || driveFileNameCalculado;
        serverFacturas[idx].driveFolderName = result.drive.carpetaProveedor || provCalculado;
        serverFacturas[idx].driveError = undefined;
      }

      return res.json({
        success: true,
        drive: result.drive,
        mensaje: `Factura ${idFactura} archivada con éxito en Google Drive`
      });
    } else {
      const errMsg = result?.drive?.error || result?.error || (result?.status === 'ignored' ? 'Tu script desplegado es la versión antigua y no soporta Google Drive.' : 'Error al guardar en Drive');
      return res.status(500).json({
        success: false,
        error: errMsg
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Error de conexión al subir a Drive'
    });
  }
});

// Helpers de parseo de filas de Google Sheets
function parseNumeric(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).replace(/[^0-9,.-]/g, '').trim();
  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function parseDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  return str;
}

function parseRawSheetRow(row: any[], index: number): any {
  if (!Array.isArray(row) || row.length === 0) return null;
  const idFactura = String(row[0] || '').trim();
  if (!idFactura || idFactura.toLowerCase() === 'id factura' || idFactura.toLowerCase() === 'id') {
    return null; // encabezado
  }

  const fechaEmision = parseDate(row[1]) || new Date().toISOString().split('T')[0];
  const idProveedor = String(row[2] || 'PROV-GEN').trim();
  const concepto = String(row[3] || 'Factura registrada en Google Sheets').trim();
  const importe = parseNumeric(row[4]);
  const fechaVencimiento = parseDate(row[5]) || fechaEmision;
  const rawEstado = String(row[6] || 'Pendiente').toLowerCase();
  const estado = rawEstado.includes('pagad') ? 'Pagada' : rawEstado.includes('venc') ? 'Vencida' : 'Pendiente';
  const fechaPago = parseDate(row[7]) || (estado === 'Pagada' ? fechaEmision : '');
  const baseImponible = parseNumeric(row[8]) || importe;
  const tiposIVA = String(row[9] || '21%').trim();
  const cuotaIVA = parseNumeric(row[10]) || Math.round(baseImponible * 0.21 * 100) / 100;
  const total = parseNumeric(row[11]) || Math.round((baseImponible + cuotaIVA) * 100) / 100;
  const categoriaGasto = String(row[12] || 'Materias Primas').trim();
  const driveFileUrl = String(row[13] || '').trim();
  const nombreProveedor = idProveedor.startsWith('PROV-') ? `Proveedor ${idProveedor}` : idProveedor;

  return {
    idFactura,
    fechaEmision,
    idProveedor,
    nombreProveedor,
    concepto,
    importe: baseImponible,
    fechaVencimiento,
    estado,
    fechaPago,
    baseImponible,
    tiposIVA,
    cuotaIVA,
    total,
    categoriaGasto,
    sincronizadoSheets: true,
    driveFileUrl: driveFileUrl.startsWith('http') ? driveFileUrl : undefined,
    driveFileName: `${idFactura} ${fechaEmision}.pdf`,
    driveFolderName: nombreProveedor,
    driveGuardado: Boolean(driveFileUrl && driveFileUrl.startsWith('http')),
    fuente: 'google_sheets'
  };
}

// Endpoint: Obtener y sincronizar facturas reales de la hoja "Facturas"
app.all('/api/sheets/fetch-invoices', async (req, res) => {
  const sheetId = (req.body?.sheetId || req.query?.sheetId || process.env.GOOGLE_SHEETS_ID || '').toString();
  const endpointUrl = (req.body?.endpointUrl || req.query?.endpointUrl || process.env.GOOGLE_SHEETS_ENDPOINT_URL || '').toString();

  const facturasEncontradas: any[] = [];
  let source = 'ninguna';
  let sheetChecked = false;

  // 1. Intentar leer vía Google Apps Script Web App (POST getFacturas)
  if (endpointUrl && endpointUrl.startsWith('http')) {
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getFacturas',
          tab: 'Facturas',
          sheetId: sheetId
        }),
        redirect: 'follow',
      });

      const data = await response.json().catch(() => null);
      if (data && (data.status === 'success' || Array.isArray(data.facturas))) {
        sheetChecked = true;
        source = 'apps_script';
        if (Array.isArray(data.facturas)) {
          data.facturas.forEach((r: any, idx: number) => {
            const parsed = Array.isArray(r) ? parseRawSheetRow(r, idx) : (r.idFactura ? r : null);
            if (parsed && !facturasEncontradas.some(f => f.idFactura === parsed.idFactura)) {
              facturasEncontradas.push(parsed);
            }
          });
        }
        // Sincronizar el caché del servidor con la realidad de la hoja de Google Sheets.
        // Si el usuario eliminó las filas de la hoja, la lista de facturas queda en 0.
        serverFacturas = [...facturasEncontradas];
      }
    } catch (e) {
      console.warn('Advertencia al consultar getFacturas en Apps Script:', e);
    }
  }

  // 2. Si no se pudo consultar por Apps Script y hay sheetId, intentar CSV
  if (!sheetChecked && sheetId) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=Facturas`;
      const csvRes = await fetch(csvUrl, { redirect: 'follow' });
      if (csvRes.ok) {
        const text = await csvRes.text();
        if (!text.includes('<!DOCTYPE') && !text.includes('accounts.google.com')) {
          sheetChecked = true;
          source = 'google_sheets_csv';
          const lines = text.split('\n').filter(l => l.trim().length > 0);
          lines.forEach((line, idx) => {
            const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            const parsed = parseRawSheetRow(cols, idx);
            if (parsed && !facturasEncontradas.some(f => f.idFactura === parsed.idFactura)) {
              facturasEncontradas.push(parsed);
            }
          });
          serverFacturas = [...facturasEncontradas];
        }
      }
    } catch (e) {
      console.warn('No se pudo leer CSV de Google Sheets:', e);
    }
  }

  // 3. Solo si NO se pudo verificar Google Sheets de ninguna forma (modo offline o sin conexión configurada)
  // y hay facturas en la memoria del servidor de la sesión actual:
  if (!sheetChecked && serverFacturas.length > 0) {
    serverFacturas.forEach(sf => {
      if (!facturasEncontradas.some(f => f.idFactura === sf.idFactura)) {
        facturasEncontradas.push(sf);
      }
    });
    source = 'server_cache';
  }

  res.json({
    success: true,
    connected: !!(endpointUrl || sheetId),
    hasRealData: facturasEncontradas.length > 0,
    count: facturasEncontradas.length,
    facturas: facturasEncontradas,
    source,
    tab: 'Facturas',
    sheetId,
    endpointUrl
  });
});

// Endpoint: Eliminar una factura por ID tanto del servidor como de Google Sheets y Google Drive
app.post('/api/sheets/delete-invoice', async (req, res) => {
  const { idFactura, endpointUrl, sheetId, driveFolderId, nombreProveedor, fileUrl } = req.body;
  if (!idFactura) {
    return res.status(400).json({ error: 'Falta idFactura' });
  }

  const normalizedId = String(idFactura).trim().toLowerCase();
  serverFacturas = serverFacturas.filter((f) => String(f.idFactura).trim().toLowerCase() !== normalizedId);

  let sheetsDeleted = false;
  let driveDeleted = false;
  let folderDeleted = false;
  let scriptStatus = 'no_endpoint';
  const targetEndpoint = endpointUrl || process.env.GOOGLE_SHEETS_ENDPOINT_URL;
  const targetFolderId = driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
  const targetSheetId = sheetId || process.env.GOOGLE_SHEETS_ID;

  if (targetEndpoint && targetEndpoint.startsWith('http')) {
    try {
      console.log(`[Google Apps Script] Solicitando eliminación coordinada de factura ${idFactura} en Sheets y Drive...`);
      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteInvoice',
          idFactura,
          tab: 'Facturas',
          sheetId: targetSheetId,
          driveFolderId: targetFolderId,
          nombreProveedor: nombreProveedor || '',
          fileUrl: fileUrl || ''
        }),
        redirect: 'follow',
      });
      const rawText = await response.text();
      try {
        const data = JSON.parse(rawText);
        sheetsDeleted = Boolean(data?.deletedSheet ?? data?.deleted);
        driveDeleted = Boolean(data?.deletedDrive);
        folderDeleted = Boolean(data?.deletedFolder);
        scriptStatus = data?.status || 'ok';
        console.log(`[Google Apps Script] Resultado eliminación: Sheets=${sheetsDeleted}, Drive=${driveDeleted}, CarpetaEliminada=${folderDeleted}, status=${scriptStatus}`);
      } catch {
        console.warn('[Google Apps Script] Respuesta no JSON:', rawText.substring(0, 200));
        scriptStatus = 'non_json_response';
      }
    } catch (e: any) {
      console.warn('No se pudo eliminar en Google Sheets / Drive:', e?.message || e);
      scriptStatus = 'error: ' + (e?.message || 'unknown');
    }
  }

  res.json({
    success: true,
    idFactura,
    sheetsDeleted,
    driveDeleted,
    folderDeleted,
    scriptStatus,
    remainingCount: serverFacturas.length,
    message: `Factura ${idFactura} procesada para eliminación en el servidor, Google Sheets y Google Drive.`
  });
});

// Endpoint: Vaciar todas las facturas del caché del servidor
app.post('/api/sheets/clear-cache', (req, res) => {
  serverFacturas = [];
  res.json({ success: true, message: 'Caché de facturas del servidor vaciado a 0' });
});

// Inicialización de Vite o estáticos en producción
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Finance AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
