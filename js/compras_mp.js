// js/compras_mp.js
console.log("[compras_mp.js] cargado OK");

function renderComprasMP(){
  const db = getDB();

  const mpOpts = (db.materiasPrimas||[]).map((m,i)=>
    `<option value="${i}">${escapeHtml(m.nombre)} (${escapeHtml(normalizeUnitCode(m.baseUnit||m.unidad||"UND"))})</option>`
  ).join("");

  const rows = (db.comprasMP||[]).slice(-25).reverse().map(c=>`
    <tr>
      <td>${new Date(c.fechaISO).toLocaleString()}</td>
      <td>${escapeHtml(c.mpNombre)}</td>
      <td class="right">${c.qty} ${escapeHtml(c.unit)}</td>
      <td class="right">${Number(c.qtyBase||0).toFixed(4)} ${escapeHtml(c.baseUnit)}</td>
      <td class="right">${money(c.totalQ)}</td>
      <td>${escapeHtml(c.proveedor||"")}</td>
      <td>${escapeHtml(c.usuario||"")}</td>
      <td>${escapeHtml(c.comentario||"")}</td>
    </tr>
  `).join("");

  return `
    <h2>Compras de Materia Prima</h2>
    <div class="muted">Registra compras para aumentar stock. El sistema convierte la compra a la unidad base de inventario.</div>

    <div class="panel">
      <label>Materia prima</label>
      <select id="cmpMP" onchange="syncCompraMPUnits()">
        ${mpOpts || `<option value="">(No hay materias primas)</option>`}
      </select>

      <div class="row">
        <div>
          <label>Cantidad</label>
          <input id="cmpQty" type="number" step="0.01" placeholder="0">
        </div>
        <div>
          <label>Unidad</label>
          <select id="cmpUnit"></select>
        </div>
      </div>

      <div class="row">
        <div>
          <label>Total compra (Q)</label>
          <input id="cmpTotal" type="number" step="0.01" placeholder="0.00">
        </div>
        <div>
          <label>Proveedor</label>
          <input id="cmpProv" placeholder="Ej: Mercado / Distribuidora">
        </div>
      </div>

      <label>Comentario</label>
      <input id="cmpObs" placeholder="Ej: subió precio / mejor calidad / etc.">

      <button class="btn accent" onclick="registrarCompraMP()">Registrar compra</button>
    </div>

    <h3>Últimas compras</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Fecha</th><th>MP</th>
          <th class="right">Cant</th><th class="right">Base</th>
          <th class="right">Total</th><th>Proveedor</th><th>Usuario</th><th>Comentario</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="8" class="muted">Sin compras</td></tr>`}</tbody>
    </table>
  `;
}

function syncCompraMPUnits(){
  const db = getDB();
  const idx = Number(document.getElementById("cmpMP").value);
  const mp = (db.materiasPrimas||[])[idx];
  const sel = document.getElementById("cmpUnit");
  if(!sel) return;

  sel.innerHTML = "";
  if(!mp){
    sel.innerHTML = `<option value="">(Sin unidades)</option>`;
    return;
  }

  mp.baseUnit = normalizeUnitCode(mp.baseUnit || mp.unidad || "UND");
  mp.units = buildMPUnits(mp.baseUnit, mp.units || {});

  Object.keys(mp.units).forEach(u=>{
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    sel.appendChild(opt);
  });

  sel.value = mp.baseUnit;
}

function registrarCompraMP(){
  const db = getDB();
  const idx = Number(document.getElementById("cmpMP").value);
  const mp = (db.materiasPrimas||[])[idx];
  if(!mp){ alert("Selecciona una materia prima."); return; }

  mp.baseUnit = normalizeUnitCode(mp.baseUnit || mp.unidad || "UND");
  mp.units = buildMPUnits(mp.baseUnit, mp.units || {});

  const qty = Number(document.getElementById("cmpQty").value||0);
  const unit = normalizeUnitCode((document.getElementById("cmpUnit").value||"").trim());
  const totalQ = Number(document.getElementById("cmpTotal").value||0);

  if(!qty || qty<=0){ alert("Cantidad inválida."); return; }
  if(!unit){ alert("Selecciona unidad."); return; }
  if(!totalQ || totalQ<=0){ alert("Total de compra inválido."); return; }

  const qtyBase = convertQtyToMPBase(mp, qty, unit);
  if(!isFinite(qtyBase) || qtyBase<=0){
    alert("Esa unidad no está configurada para esta MP.");
    return;
  }

  const prevStock = Number(mp.stockBase||0);
  const prevCost = Number(mp.costoPromBase||0);

  const costThisBase = totalQ / qtyBase;
  const newStock = prevStock + qtyBase;
  const newCost = (newStock>0) ? ((prevStock*prevCost)+(qtyBase*costThisBase))/newStock : costThisBase;

  mp.stockBase = newStock;
  mp.stock = newStock;
  mp.costoPromBase = newCost;
  mp.costoUnit = newCost;
  mp.unidad = mp.baseUnit;

  db.comprasMP.push({
    id: generarCorrelativo("CMP"),
    fechaISO: new Date().toISOString(),
    usuario: getUserName(),
    mpId: mp.id,
    mpNombre: mp.nombre,
    qty,
    unit,
    qtyBase,
    baseUnit: mp.baseUnit,
    totalQ,
    proveedor: (document.getElementById("cmpProv").value||"").trim(),
    comentario: (document.getElementById("cmpObs").value||"").trim()
  });

  saveDB(db);

  document.getElementById("cmpQty").value = "";
  document.getElementById("cmpTotal").value = "";
  document.getElementById("cmpProv").value = "";
  document.getElementById("cmpObs").value = "";

  loadView("comprasMP");
  alert("Compra registrada. Stock actualizado.");
}
