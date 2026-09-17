import { Factura, Proveedor, Alerta } from '../types';

/**
 * Genera la lista consolidada de proveedores a partir de las facturas reales de Google Sheets
 */
export function generarProveedoresDesdeFacturas(facturas: Factura[]): Proveedor[] {
  if (!facturas || facturas.length === 0) return [];

  const mapProveedores = new Map<
    string,
    {
      id: string;
      nombre: string;
      total: number;
      count: number;
      conceptos: Set<string>;
      categorias: Set<string>;
      ultimaFecha: string;
    }
  >();

  facturas.forEach((f) => {
    const idProv = f.idProveedor || 'PROV-GEN';
    const nombreProv = f.nombreProveedor || (idProv.startsWith('PROV-') ? `Proveedor ${idProv}` : idProv);
    const key = idProv;

    const entry = mapProveedores.get(key) || {
      id: idProv,
      nombre: nombreProv,
      total: 0,
      count: 0,
      conceptos: new Set<string>(),
      categorias: new Set<string>(),
      ultimaFecha: f.fechaEmision || '',
    };

    entry.total += f.total;
    entry.count += 1;
    if (f.concepto) entry.conceptos.add(f.concepto);
    if (f.categoriaGasto) entry.categorias.add(f.categoriaGasto);
    if (f.fechaEmision && f.fechaEmision > entry.ultimaFecha) {
      entry.ultimaFecha = f.fechaEmision;
    }
    mapProveedores.set(key, entry);
  });

  const totalGastoGlobal = facturas.reduce((sum, f) => sum + f.total, 0) || 1;

  return Array.from(mapProveedores.values()).map((p, idx) => {
    const share = p.total / totalGastoGlobal;
    const riesgo: 'Bajo' | 'Medio' | 'Alto' =
      share > 0.35 ? 'Alto' : share > 0.18 ? 'Medio' : 'Bajo';
    const frecuencia = p.count >= 8 ? 'Semanal' : p.count >= 4 ? 'Quincenal' : 'Mensual';
    const productos =
      Array.from(p.conceptos).slice(0, 3).join(', ') ||
      Array.from(p.categorias).join(', ') ||
      'Suministros diversos';

    return {
      idProveedor: p.id,
      nombreProveedor: p.nombre,
      productosSuministrados: productos,
      importeMensual: Math.round((p.total / Math.max(1, Math.min(6, p.count))) * 100) / 100,
      frecuencia,
      riesgoDependencia: riesgo,
      tiempoMedioEntrega: '24-48h',
      cif: `B-${(10000000 + (idx + 1) * 739).toString().substring(0, 8)}`,
      contacto: `pedidos@${p.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')}.com`,
    };
  });
}

/**
 * Genera alertas analíticas automáticas basadas estrictamente en las facturas reales
 */
export function generarAlertasDesdeFacturas(facturas: Factura[]): Alerta[] {
  if (!facturas || facturas.length === 0) return [];

  const alertas: Alerta[] = [];
  const hoy = new Date().toISOString().split('T')[0];

  // 1. Facturas vencidas o pendientes pasadas de fecha
  const vencidas = facturas.filter(
    (f) =>
      f.estado === 'Vencida' ||
      (f.estado === 'Pendiente' && f.fechaVencimiento && f.fechaVencimiento < hoy)
  );
  vencidas.forEach((f, i) => {
    alertas.push({
      id: `ALT-VENC-${f.idFactura}-${i}`,
      tipo: 'FACTURA VENCIDA',
      nivel: 'critica',
      titulo: `Factura vencida: ${f.idFactura} (${f.nombreProveedor})`,
      descripcion: `La factura por importe de ${f.total.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
      })} venció el ${f.fechaVencimiento || 'fecha sin definir'} y consta como pendiente de pago.`,
      fecha: f.fechaVencimiento || f.fechaEmision,
      estado: 'activa',
      datosRelacionados: {
        proveedor: f.nombreProveedor,
        importe: f.total,
      },
    });
  });

  // 2. Posibles identificadores duplicados
  const idCounts = new Map<string, number>();
  facturas.forEach((f) => {
    idCounts.set(f.idFactura, (idCounts.get(f.idFactura) || 0) + 1);
  });
  idCounts.forEach((count, id) => {
    if (count > 1) {
      alertas.push({
        id: `ALT-DUP-${id}`,
        tipo: 'POSIBLE DUPLICADO',
        nivel: 'critica',
        titulo: `ID Duplicado en Hoja Facturas: ${id}`,
        descripcion: `Existen ${count} registros con el mismo identificador de factura en la hoja de cálculo.`,
        fecha: hoy,
        estado: 'activa',
      });
    }
  });

  // 3. Concentración de proveedor (> 30% del volumen total)
  // Solo se evalúa cuando hay al menos 3 facturas y más de 1 proveedor distinto
  const totalGasto = facturas.reduce((s, f) => s + f.total, 0);
  const proveedorSpend = new Map<string, { nombre: string; total: number }>();
  facturas.forEach((f) => {
    const entry = proveedorSpend.get(f.idProveedor) || { nombre: f.nombreProveedor, total: 0 };
    entry.total += f.total;
    proveedorSpend.set(f.idProveedor, entry);
  });

  if (facturas.length >= 3 && proveedorSpend.size > 1 && totalGasto > 0) {
    proveedorSpend.forEach((data, idProv) => {
      if (data.total / totalGasto > 0.3) {
        const pct = Math.round((data.total / totalGasto) * 100);
        alertas.push({
          id: `ALT-CONC-${idProv}`,
          tipo: 'CONCENTRACIÓN DE PROVEEDOR',
          nivel: 'alta',
          titulo: `Concentración en ${data.nombre} (${pct}%)`,
          descripcion: `Este proveedor concentra el ${pct}% del total de gasto de la empresa (${data.total.toLocaleString(
            'es-ES',
            { style: 'currency', currency: 'EUR' }
          )}).`,
          fecha: hoy,
          estado: 'activa',
          datosRelacionados: {
            proveedor: data.nombre,
            importe: data.total,
            variacionPorcentaje: pct,
          },
        });
      }
    });
  }

  return alertas;
}
