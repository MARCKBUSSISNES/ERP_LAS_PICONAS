// js/export.js

function exportarEnviosXlsx(){
  const db = getDB();
  const rows = [];

  for (const e of (db.envios || [])) {
    for (const it of (e.itemsLotes || e.items || [])) {
      rows.push({
        ENVIO: e.envioId,
        FECHA: new Date(e.fechaISO).toLocaleString(),
        CLIENTE: e.clienteNombre,
        DIRECCION: e.clienteDireccion || "",
        TELEFONO: e.clienteTelefono || "",
        VEHICULO: e.vehiculoPlaca || "",
        PILOTO: e.vehiculoPiloto || "",
        PRODUCTO: it.producto,
        LOTE: it.lote,
        CANTIDAD: it.cantidad,
        PRECIO_VENTA: it.precio,
        TOTAL_VENTA: it.subtotal,
        COSTO_UNITARIO: Number(it.costoUnitario || 0),
        COSTO_TOTAL: Number(it.costoTotal || 0),
        UTILIDAD: Number(it.utilidad || (Number(it.subtotal || 0) - Number(it.costoTotal || 0))),
        TOTAL_ENVIO: e.total,
        COSTO_TOTAL_ENVIO: Number(e.costoTotal || 0),
        UTILIDAD_TOTAL_ENVIO: Number(e.utilidadTotal || 0),
        MARGEN_TOTAL_ENVIO: Number(e.margenTotal || 0)
      });
    }
  }

  if (rows.length === 0) { alert("No hay envíos para exportar."); return; }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Envios");
  XLSX.writeFile(wb, `ENVÍOS_LAS_PICONAS_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportarVentasXlsx(){
  const db = getDB();
  const rows = [];

  for (const v of (db.ventas || [])) {
    for (const it of (v.itemsLotes || v.items || [])) {
      rows.push({
        VENTA: v.ventaId,
        FECHA: new Date(v.fechaISO).toLocaleString(),
        TIPO: v.tipo,
        CLIENTE: v.clienteNombre,
        PRODUCTO: it.producto,
        LOTE: it.lote,
        CANTIDAD: it.cantidad,
        PRECIO_VENTA: it.precio,
        TOTAL_VENTA: it.subtotal,
        COSTO_UNITARIO: Number(it.costoUnitario || 0),
        COSTO_TOTAL: Number(it.costoTotal || 0),
        UTILIDAD: Number(it.utilidad || (Number(it.subtotal || 0) - Number(it.costoTotal || 0))),
        TOTAL_DOCUMENTO: v.total,
        COSTO_TOTAL_DOCUMENTO: Number(v.costoTotal || 0),
        UTILIDAD_TOTAL_DOCUMENTO: Number(v.utilidadTotal || 0),
        MARGEN_TOTAL_DOCUMENTO: Number(v.margenTotal || 0)
      });
    }
  }

  if (rows.length === 0) { alert("No hay ventas para exportar."); return; }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ventas");
  XLSX.writeFile(wb, `VENTAS_LAS_PICONAS_${new Date().toISOString().slice(0,10)}.xlsx`);
}
