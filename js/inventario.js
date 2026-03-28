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

    ${isAdmin() ? `
      <div class="panel" style="margin-bottom:12px;">
        <h3>Carga inicial de producto terminado</h3>
        <div class="muted small">Úsalo solo una vez por lote para ingresar inventario ya producido anteriormente.</div>

        <div class="row">
          <div>
            <label>Producto</label>
            <input id="ptInitProducto" placeholder="Ej: Carne de Birria">
          </div>
          <div>
            <label>Lote</label>
            <input id="ptInitLote" placeholder="Ej: LP-20260327-001">
          </div>
        </div>

        <div class="row">
          <div>
            <label>Cantidad</label>
            <input id="ptInitCantidad" type="number" min="0.01" step="0.01" placeholder="0">
          </div>
          <div>
            <label>Precio de venta</label>
            <input id="ptInitPrecioVenta" type="number" min="0" step="0.01" placeholder="0.00">
          </div>
        </div>

        <button class="btn accent" onclick="guardarInventarioPTInicial()">Guardar carga inicial</button>
      </div>
    ` : ``}

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

function guardarInventarioPTInicial(){
  if(!isAdmin()) { alert("Acceso restringido."); return; }
  const db = getDB();
  db.inventarioPT = db.inventarioPT || [];

  const producto = String(document.getElementById("ptInitProducto")?.value || "").trim();
  const lote = String(document.getElementById("ptInitLote")?.value || "").trim();
  const cantidad = Number(document.getElementById("ptInitCantidad")?.value || 0);
  const precioVenta = Number(document.getElementById("ptInitPrecioVenta")?.value || 0);

  if(!producto){ alert("Ingresa el producto."); return; }
  if(!lote){ alert("Ingresa el lote."); return; }
  if(!cantidad || cantidad <= 0){ alert("Cantidad inválida."); return; }
  if(precioVenta < 0){ alert("Precio de venta inválido."); return; }

  const productoKey = producto.toLowerCase();
  const loteKey = lote.toLowerCase();

  const yaExiste = (db.inventarioPT || []).some(function(it){
    return String(it.producto || "").trim().toLowerCase() === productoKey &&
           String(it.lote || "").trim().toLowerCase() === loteKey;
  });

  if(yaExiste){
    alert("Ese producto con ese lote ya fue cargado anteriormente.");
    return;
  }

  const fecha = new Date();
  db.inventarioPT.push({
    producto: producto,
    lote: lote,
    cantidad: cantidad,
    costoUnitario: 0,
    costoTotal: 0,
    precioVenta: precioVenta,
    fechaISO: fecha.toISOString(),
    fecha: fecha.toLocaleString(),
    ts: Date.now(),
    origen: "CARGA_INICIAL"
  });

  saveDB(db);

  document.getElementById("ptInitProducto").value = "";
  document.getElementById("ptInitLote").value = "";
  document.getElementById("ptInitCantidad").value = "";
  document.getElementById("ptInitPrecioVenta").value = "";

  alert("Carga inicial guardada correctamente.");
  loadView("inventarioPT");
}
