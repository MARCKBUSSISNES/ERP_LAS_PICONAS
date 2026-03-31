// js/inventario.js
function _ptRowId(producto, idx){
  return "ptrow_" + String(idx) + "_" + String(producto || "").replace(/[^a-zA-Z0-9]+/g, "_");
}

function _formatQtyPT(n){
  var v = Number(n || 0);
  if (!isFinite(v)) v = 0;
  return (Math.round(v * 100) % 100 === 0) ? String(Math.round(v)) : v.toFixed(2);
}

function renderInventarioPT(){
  const items = getInventarioPTGeneral();
  const rows = items.map(function(p, idx){
    const rowId = _ptRowId(p.producto, idx);
    const lotesHtml = (p.lotes || []).map(function(l, lotIdx){
      var fechaTxt = l.fechaISO ? new Date(l.fechaISO).toLocaleString() : (l.fecha || "—");
      return `
        <div style="display:grid;grid-template-columns:1.35fr .75fr .9fr .9fr;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);margin-bottom:8px;align-items:center;">
          <div>
            <div style="font-weight:800;font-size:13px;color:#fff;">${escapeHtml(l.lote || "Sin lote")}</div>
            <div class="muted small">Fecha: ${escapeHtml(fechaTxt)}</div>
          </div>
          <div class="right">
            <div class="muted small">Cantidad</div>
            <div style="font-weight:800;color:#fff;">${_formatQtyPT(l.cantidad || 0)}</div>
          </div>
          <div class="right">
            <div class="muted small">Costo Unit.</div>
            <div style="font-weight:800;color:#fff;">${money(l.costoUnitario || 0)}</div>
          </div>
          <div class="right">
            <div class="muted small">Costo Total</div>
            <div style="font-weight:800;color:#fff;">${money(l.costoTotal || 0)}</div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <tr class="pt-product-row"
          data-producto="${escapeHtml(String(p.producto || "").toLowerCase())}"
          data-rowid="${rowId}"
          ondblclick="toggleInventarioPTLotes('${rowId}')"
          style="cursor:pointer;background:linear-gradient(90deg, rgba(255,122,0,.22), rgba(255,122,0,.10));border-top:1px solid rgba(255,140,26,.28);border-bottom:1px solid rgba(255,140,26,.18);">
        <td style="font-weight:900;color:#ff9c38;letter-spacing:.2px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
              <div style="font-size:15px;line-height:1.15;">${escapeHtml(p.producto)}</div>
              <div class="muted small" style="margin-top:4px;">Doble clic para ver lotes • FIFO: ${escapeHtml(p.oldestLote || "-")}</div>
            </div>
            <button class="btn sm" type="button" onclick="event.stopPropagation();toggleInventarioPTLotes('${rowId}')">Ver lotes</button>
          </div>
        </td>
        <td class="right" style="font-weight:900;">${_formatQtyPT(p.cantidad || 0)}</td>
        <td class="right">${money(p.costoUnitarioProm || 0)}</td>
        <td class="right">${money(p.costoTotal || 0)}</td>
        <td class="right">${money(p.precioVenta || 0)}</td>
      </tr>
      <tr id="${rowId}" class="pt-lotes-row" data-parent="${rowId}" style="display:none;">
        <td colspan="5" style="padding:0 0 12px 0;border-top:none;">
          <div style="background:linear-gradient(180deg, rgba(12,18,29,.98), rgba(8,13,22,.98));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:14px 14px 10px 14px;box-shadow:0 14px 34px rgba(0,0,0,.22);margin:6px 0 0 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;">
              <div>
                <div style="font-size:14px;font-weight:900;color:#ff9c38;">Lotes disponibles</div>
                <div class="muted small">${escapeHtml(p.producto)} • ${(p.lotes||[]).length} lote(s)</div>
              </div>
              <span class="tag yellow">FIFO: ${escapeHtml(p.oldestLote || "-")}</span>
            </div>
            ${lotesHtml || `<div class="muted" style="padding:8px 2px;">Sin lotes disponibles</div>`}
          </div>
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

    <div class="panel" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:end;flex-wrap:wrap;">
        <div style="flex:1;min-width:260px;">
          <label>Filtrar productos</label>
          <input id="ptFiltro" oninput="aplicarFiltroInventarioPT()" placeholder="Ej: birria, salsa, tortilla...">
        </div>
        <div class="actions" style="display:flex;gap:8px;align-items:center;">
          <button class="btn" onclick="limpiarFiltroInventarioPT()">Limpiar filtro</button>
          <button class="btn accent" onclick="exportarInventarioPTPDF()">Descargar inventario PDF</button>
        </div>
      </div>
      <div class="muted small" style="margin-top:8px;">Se muestra el total por producto. Los lotes solo se abren al dar doble clic o en el botón <b>Ver lotes</b>.</div>
    </div>

    <table class="table" id="tablaInventarioPT">
      <thead>
        <tr>
          <th>Producto</th>
          <th class="right">Cantidad</th>
          <th class="right">Costo Prom.</th>
          <th class="right">Costo Total</th>
          <th class="right">P. Venta</th>
        </tr>
      </thead>
      <tbody id="inventarioPTBody">
        ${rows || `<tr><td colspan="5" class="muted">Sin inventario PT</td></tr>`}
      </tbody>
    </table>
  `;
}

function toggleInventarioPTLotes(rowId){
  var tr = document.getElementById(rowId);
  if(!tr) return;
  var visible = tr.style.display !== "none";
  tr.style.display = visible ? "none" : "table-row";
}

function aplicarFiltroInventarioPT(){
  var q = String(document.getElementById("ptFiltro")?.value || "").trim().toLowerCase();
  var productRows = document.querySelectorAll("#inventarioPTBody .pt-product-row");
  var visible = 0;

  productRows.forEach(function(row){
    var txt = String(row.getAttribute("data-producto") || "");
    var match = !q || txt.indexOf(q) >= 0;
    row.style.display = match ? "table-row" : "none";

    var detailId = row.getAttribute("data-rowid");
    var detailRow = detailId ? document.getElementById(detailId) : null;
    if(detailRow){
      if(!match){
        detailRow.style.display = "none";
      }
    }
    if(match) visible++;
  });

  var emptyId = "inventarioPTEmptyRow";
  var body = document.getElementById("inventarioPTBody");
  if(!body) return;
  var empty = document.getElementById(emptyId);

  if(visible === 0){
    if(!empty){
      empty = document.createElement("tr");
      empty.id = emptyId;
      empty.innerHTML = '<td colspan="5" class="muted">No se encontraron productos con ese filtro.</td>';
      body.appendChild(empty);
    }
  } else if(empty){
    empty.remove();
  }
}

function limpiarFiltroInventarioPT(){
  var input = document.getElementById("ptFiltro");
  if(input) input.value = "";
  aplicarFiltroInventarioPT();
}

function exportarInventarioPTPDF(){
  var items = getInventarioPTGeneral();
  var generadoPor = (typeof getUserName === "function") ? getUserName() : "USUARIO";
  var fecha = new Date();
  var fechaTxt = fecha.toLocaleString();
  var totalProductos = items.length;
  var totalUnidades = items.reduce(function(acc, it){ return acc + Number(it.cantidad || 0); }, 0);

  var rowsHtml = items.map(function(p, idx){
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(p.producto || "")}</td>
        <td class="right">${_formatQtyPT(p.cantidad || 0)}</td>
        <td class="right">${money(p.costoUnitarioProm || 0)}</td>
        <td class="right">${money(p.costoTotal || 0)}</td>
        <td class="right">${money(p.precioVenta || 0)}</td>
      </tr>
    `;
  }).join("") || '<tr><td colspan="6" class="muted">Sin inventario PT</td></tr>';

  var html = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Inventario PT</title>
      <style>
        @page{ size:A4 portrait; margin:14mm; }
        *{ box-sizing:border-box; }
        body{ font-family:Arial,sans-serif; color:#111; margin:0; }
        .head{ display:flex; align-items:center; justify-content:space-between; gap:18px; border-bottom:3px solid #ff7a00; padding-bottom:10px; }
        .brand{ display:flex; align-items:center; gap:14px; }
        .brand img{ width:84px; height:auto; object-fit:contain; }
        .title{ font-size:26px; font-weight:900; color:#111; line-height:1.05; }
        .sub{ font-size:12px; color:#555; margin-top:4px; }
        .meta{ text-align:right; font-size:12px; }
        .hero{ margin:14px 0 12px 0; padding:12px 14px; background:linear-gradient(90deg, rgba(255,122,0,.16), rgba(255,255,255,0)); border:1px solid rgba(255,122,0,.35); border-radius:14px; }
        .hero-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .kpi{ border:1px solid #e7e7e7; border-radius:12px; padding:12px; }
        .kpi .lab{ font-size:11px; color:#666; text-transform:uppercase; letter-spacing:.4px; }
        .kpi .val{ font-size:22px; font-weight:900; color:#ff7a00; margin-top:4px; }
        table{ width:100%; border-collapse:collapse; margin-top:10px; }
        th,td{ padding:10px 8px; border-bottom:1px solid #e9e9e9; font-size:12px; }
        th{ background:#fff4ea; color:#9a4f00; text-transform:uppercase; letter-spacing:.35px; font-size:11px; text-align:left; }
        .right{ text-align:right; }
        .muted{ color:#666; }
        .footer{ margin-top:16px; border-top:2px solid #f1f1f1; padding-top:10px; font-size:11px; color:#666; display:flex; justify-content:space-between; gap:12px; }
      </style>
    </head>
    <body>
      <div class="head">
        <div class="brand">
          <img src="assets/LOGO1.png" onerror="this.style.display='none'">
          <div>
            <div class="title">INVENTARIO PT</div>
            <div class="sub">Reporte general de producto terminado</div>
          </div>
        </div>
        <div class="meta">
          <div><b>Fecha:</b> ${escapeHtml(fechaTxt)}</div>
          <div><b>Generado por:</b> ${escapeHtml(generadoPor)}</div>
        </div>
      </div>

      <div class="hero">
        <div class="hero-grid">
          <div class="kpi">
            <div class="lab">Productos</div>
            <div class="val">${totalProductos}</div>
          </div>
          <div class="kpi">
            <div class="lab">Unidades Totales</div>
            <div class="val">${_formatQtyPT(totalUnidades)}</div>
          </div>
          <div class="kpi">
            <div class="lab">Vista</div>
            <div class="val" style="font-size:16px;line-height:1.25;">Sin lotes<br><span style="font-size:12px;color:#444;">solo totales por producto</span></div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:6%;">#</th>
            <th style="width:36%;">Producto</th>
            <th class="right" style="width:14%;">Cantidad</th>
            <th class="right" style="width:14%;">Costo Prom.</th>
            <th class="right" style="width:16%;">Costo Total</th>
            <th class="right" style="width:14%;">P. Venta</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <div class="footer">
        <div>Las Piconas • Inventario consolidado de producto terminado</div>
        <div>Marck Business © 2026</div>
      </div>

      <script>
        window.onload = function(){
          window.focus();
          window.print();
        };
      <\/script>
    </body>
    </html>
  `;

  var win = window.open("", "", "width=1000,height=900");
  if(!win){
    alert("El navegador bloqueó la ventana del PDF. Permite popups para continuar.");
    return;
  }
  win.document.write(html);
  win.document.close();
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
