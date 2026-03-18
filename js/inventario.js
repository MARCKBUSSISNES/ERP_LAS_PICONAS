// js/inventario.js
function renderInventarioPT(){
  const items = getInventarioPTGeneral();
  const rows = items.map(function(p){
    const lotesHtml = (p.lotes || []).map(function(l){
      return `
        <tr>
          <td>${escapeHtml(l.lote || "")}</td>
          <td class="right">${Number(l.cantidad || 0)}</td>
          <td class="right">${money(l.costoUnitario || 0)}</td>
          <td class="right">${money(l.costoTotal || 0)}</td>
        </tr>
      `;
    }).join("");

    return `
      <tr>
        <td>${escapeHtml(p.producto)}</td>
        <td class="right">${Number(p.cantidad || 0)}</td>
        <td class="right">${money(p.costoUnitarioProm || 0)}</td>
        <td class="right">${money(p.costoTotal || 0)}</td>
        <td class="right">${money(p.precioVenta || 0)}</td>
      </tr>
      <tr>
        <td colspan="5" style="padding-top:0;">
          <details>
            <summary>Lotes (${(p.lotes||[]).length}) • FIFO: ${escapeHtml(p.oldestLote || "-")}</summary>
            <table class="table" style="margin-top:8px;">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th class="right">Cantidad</th>
                  <th class="right">Costo Unit.</th>
                  <th class="right">Costo Total</th>
                </tr>
              </thead>
              <tbody>
                ${lotesHtml || `<tr><td colspan="4" class="muted">Sin lotes</td></tr>`}
              </tbody>
            </table>
          </details>
        </td>
      </tr>
    `;
  }).join("");

  return `
    <h2>Inventario Producto Terminado</h2>
    <div class="muted small" style="margin-bottom:10px;">Vista general por producto con detalle de lotes y costos.</div>
    <table class="table">
      <thead>
        <tr>
          <th>Producto</th>
          <th class="right">Cantidad</th>
          <th class="right">Costo Prom.</th>
          <th class="right">Costo Total</th>
          <th class="right">P. Venta</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5" class="muted">Sin inventario PT</td></tr>`}
      </tbody>
    </table>
  `;
}
