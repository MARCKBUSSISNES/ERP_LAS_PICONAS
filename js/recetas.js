// js/recetas.js

let tmpIngredientes = [];
let editRecetaIndex = null;

// 🔒 Si receta es locked (oficial), solo ADMIN la edita/elimina
function canEditReceta(rec){
  if(!rec) return false;
  if(rec.locked) return isAdmin();
  return can("recetas_editar");
}

function renderRecetas(){
  const db = getDB();
  const mpIndex = Object.fromEntries((db.materiasPrimas||[]).map(m => [m.id, m]));

  const rows = (db.recetas||[]).map((r,i)=>{
    const baseMp = mpIndex[r.baseMpId];
    const baseNombre = (baseMp?.nombre) || r.baseMpId || "";
    const baseUnit = (r.baseUnit || baseMp?.unidad || baseMp?.baseUnit || "").toString();
    const baseQty = (r.baseQty!=null && r.baseQty!=="") ? Number(r.baseQty) : null;
    const baseQtyTxt = (baseQty!=null && !Number.isNaN(baseQty) && baseQty>0) ? String(baseQty) : "-";
    const baseTxt = baseNombre
      ? `${escapeHtml(baseNombre)} <span class="muted small">(${escapeHtml(baseQtyTxt)} ${escapeHtml(baseUnit)})</span>`
      : `<span class="muted">—</span>`;

    return `
      <tr>
        <td>
          ${escapeHtml(r.nombre || "")}
          ${r.locked ? ` <span class="tag yellow small">OFICIAL</span>` : ``}
        </td>
        <td class="right">${Number(r.rendimientoEsperado||0)} ${escapeHtml(r.unidadRend||"")}</td>
        <td class="right">${(r.ingredientes||[]).length}</td>
        <td>${baseTxt}</td>
        <td class="right">${money(calcularPrecioVentaReceta(r, db).precioVenta)}</td>
        <td class="right">
          <button class="btn sm" onclick="verReceta(${i})">👁 Ver</button>
          ${canEditReceta(r) ? `<button class="btn sm" onclick="editarReceta(${i})">✏️ Editar</button>` : ``}
          ${canEditReceta(r) ? `<button class="btn danger sm" onclick="deleteReceta(${i})">🗑</button>` : `<span class="muted small">—</span>`}
        </td>
      </tr>
    `;
  }).join("");

  const editable = (can("recetas_editar") || isAdmin());

  const lockedNote = !isAdmin()
    ? `<div class="muted small">Nota: las recetas marcadas como <b>OFICIAL</b> solo las puede editar/eliminar el <b>ADMIN</b>.</div><div class="hr"></div>`
    : ``;

  return `
    <div class="page-head">
      <div>
        <div class="big">Recetas</div>
        <div class="muted small">Define ingredientes, rendimiento y escalado por producto base.</div>
      </div>
      <div class="actions">
        ${editRecetaIndex!=null ? `<button class="btn" onclick="cancelEditReceta()">Cancelar edición</button>` : ``}
      </div>
    </div>

    <div class="panel">
      ${lockedNote}

      ${editable ? `` : `<div class="muted small">Modo solo lectura: no tienes permiso para crear/editar recetas.</div><div class="hr"></div>`}

      <div class="grid-2">
        <div>
          <label>Nombre receta</label>
          <input id="recNombre" placeholder="Carne de Birria" ${editable?``:`disabled`}>

          <label>Producto final</label>
          <input id="recProdFinal" placeholder="Carne de Birria" ${editable?``:`disabled`}>

          <label>Rendimiento esperado (base)</label>
          <input id="recRend" type="number" step="1" placeholder="20" ${editable?``:`disabled`}>

          <label>Unidad rendimiento</label>
          <input id="recRendU" placeholder="bolsa" ${editable?``:`disabled`}>
        </div>

        <div>
          <label>Producto base (para escalar)</label>
          <select id="recBaseMp" onchange="autoUnidadBaseReceta()" ${editable?``:`disabled`}>
            ${(db.materiasPrimas||[]).map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.nombre)} (${escapeHtml(m.unidad||m.baseUnit||"")})</option>`).join("")}
          </select>

          <label>Cantidad base del producto base</label>
          <input id="recBaseQty" type="number" step="0.01" placeholder="100" ${editable?``:`disabled`}>

          <label>Unidad del producto base</label>
          <input id="recBaseUnit" placeholder="LIBRA" disabled>

          <div class="muted small" style="margin-top:8px;">
            El producto base define la unidad y la referencia para escalar la receta en producción.
          </div>
        </div>
      </div>

      <!-- ✅ PROCEDIMIENTO -->
      <div class="hr"></div>
      <h3>Procedimiento</h3>
      <label>Pasos detallados</label>
      <textarea
        id="recProcedimiento"
        rows="7"
        style="width:100%; resize:vertical; min-height:160px; margin-top:6px; border-radius:10px; border:1px solid rgba(255,255,255,.10); background:#0b1220; color:#e5e7eb; padding:10px;"
        placeholder="Ejemplo:
1. Hervir tomates y chiles 10 minutos.
2. Licuar con ajo y cebolla.
3. Cocinar la salsa 15 minutos.
4. Agregar sal al gusto."
        ${editable?``:`disabled`}
      ></textarea>
      <div class="hr"></div>
      <h3>Costos indirectos por lote</h3>
      <div class="grid-2">
        <div>
          <label>Gas</label>
          <input id="recGas" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>
        </div>
        <div>
          <label>Luz</label>
          <input id="recLuz" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>
        </div>
        <div>
          <label>Salario</label>
          <input id="recSalario" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>
        </div>
        <div>
          <label>Empaque</label>
          <input id="recEmpaque" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>
        </div>
        <div>
          <label>Otros</label>
          <input id="recOtros" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>
        </div>
        <div>
          <label>Margen %</label>
          <input id="recMargenPct" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>
        </div>
      </div>
      <div class="muted small" style="margin-top:8px;">
        El precio de venta sugerido se calcula con costo directo + indirectos, dividido entre el rendimiento base, y luego se aplica el margen.
      </div>


      <div class="hr"></div>

      <h3>Ingredientes (base)</h3>
      <div class="row">
        <div style="flex:2">
          <label>Materia prima</label>
          <select id="ingMp" ${editable?``:`disabled`}>
            ${(db.materiasPrimas||[]).length
              ? (db.materiasPrimas||[]).map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.nombre)} (${escapeHtml(m.unidad||"")})</option>`).join("")
              : `<option value="">(Sin MP)</option>`
            }
          </select>
        </div>
        <div>
          <label>Cantidad base</label>
          <input id="ingCant" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>
        </div>
        <div>
          <label>Unidad</label>
          <input id="ingUni" placeholder="kg" ${editable?``:`disabled`}>
        </div>
      </div>

      ${editable ? `<button class="btn accent" onclick="addIngTemp()">➕ Agregar ingrediente</button>` : ``}

      <div id="tmpIng"></div>

      ${editable ? `<button id="btnGuardarReceta" class="btn accent" onclick="guardarReceta()">Guardar receta</button>` : ``}
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Receta</th>
          <th class="right">Rend</th>
          <th class="right">Ingredientes</th>
          <th>Producto base</th>
          <th class="right">P. Venta</th>
          <th class="right">Acción</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="6" class="muted">Sin recetas</td></tr>`}</tbody>
    </table>

    <script>
      setTimeout(()=>{ if(typeof renderTmpIng==="function") renderTmpIng(); if(typeof autoUnidadBaseReceta==="function") autoUnidadBaseReceta(); }, 0);
    </script>
  `;
}

function addIngTemp(){
  const db = getDB();

  // permiso: si editas receta oficial -> solo admin
  if(editRecetaIndex!=null){
    const r = (db.recetas||[])[editRecetaIndex];
    if(!canEditReceta(r)){
      alert("No tienes permiso para editar esta receta.");
      return;
    }
  }else{
    if(!can("recetas_editar") && !isAdmin()){
      alert("No tienes permiso para crear recetas.");
      return;
    }
  }

  const mpId = (document.getElementById("ingMp").value||"").trim();
  const cant = Number(document.getElementById("ingCant").value||0);
  const uni = (document.getElementById("ingUni").value||"").trim();

  const mp = (db.materiasPrimas||[]).find(x=>x.id===mpId);
  if(!mp){ alert("Selecciona una materia prima válida"); return; }
  if(!cant || cant<=0){ alert("Cantidad inválida"); return; }

  tmpIngredientes.push({
    mpId,
    mpNombre: mp.nombre,
    cantBase: cant,
    unidad: uni || mp.unidad || "und"
  });

  document.getElementById("ingCant").value="";
  renderTmpIng();
}

/* =========================
   INGREDIENTES EDITABLES
========================= */

function updateIngTemp(i, key, val){
  const db = getDB();
  if(!tmpIngredientes[i]) return;

  // permisos
  if(editRecetaIndex!=null){
    const r = (db.recetas||[])[editRecetaIndex];
    if(!canEditReceta(r)){
      alert("No tienes permiso para editar esta receta.");
      return;
    }
  }else{
    if(!can("recetas_editar") && !isAdmin()){
      alert("No tienes permiso.");
      return;
    }
  }

  if(key === "cantBase"){
    tmpIngredientes[i].cantBase = Number(val||0);
    if(!tmpIngredientes[i].cantBase || tmpIngredientes[i].cantBase <= 0) tmpIngredientes[i].cantBase = 0;
    return;
  }

  if(key === "unidad"){
    tmpIngredientes[i].unidad = String(val||"").trim();
    return;
  }

  if(key === "mpId"){
    const mp = (db.materiasPrimas||[]).find(m => m.id === val);
    if(!mp){
      alert("Materia prima inválida.");
      return;
    }
    tmpIngredientes[i].mpId = mp.id;
    tmpIngredientes[i].mpNombre = mp.nombre;
    if(!tmpIngredientes[i].unidad) tmpIngredientes[i].unidad = mp.unidad || "und";
    renderTmpIng();
    return;
  }
}

function renderTmpIng(){
  const db = getDB();
  const editable = (can("recetas_editar") || isAdmin());

  const html = tmpIngredientes.map((x,i)=>`
    <div class="panel" style="margin-top:10px">
      <div class="row" style="align-items:end;">
        <div style="flex:2; min-width:260px;">
          <label class="small muted">Materia prima</label>
          <select ${editable?``:`disabled`} onchange="updateIngTemp(${i}, 'mpId', this.value)">
            ${(db.materiasPrimas||[]).map(m => `
              <option value="${escapeHtml(m.id)}" ${m.id===x.mpId ? "selected" : ""}>
                ${escapeHtml(m.nombre)} (${escapeHtml(m.unidad||"")})
              </option>
            `).join("")}
          </select>
        </div>

        <div style="min-width:180px;">
          <label class="small muted">Cantidad</label>
          <input ${editable?``:`disabled`}
                 type="number" step="0.01"
                 value="${Number(x.cantBase||0)}"
                 oninput="updateIngTemp(${i}, 'cantBase', this.value)">
        </div>

        <div style="min-width:180px;">
          <label class="small muted">Unidad</label>
          <input ${editable?``:`disabled`}
                 value="${escapeHtml(x.unidad||'')}"
                 oninput="updateIngTemp(${i}, 'unidad', this.value)">
        </div>

        <div style="min-width:120px; display:flex; gap:10px; justify-content:flex-end;">
          ${editable ? `<button class="btn danger sm" onclick="delIngTemp(${i})">Quitar</button>` : ``}
        </div>
      </div>

      <div class="muted small" style="margin-top:6px;">
        <b>${escapeHtml(x.mpNombre || "")}</b>
      </div>
    </div>
  `).join("");

  const box = document.getElementById("tmpIng");
  if(box) box.innerHTML = html || `<div class="muted">Sin ingredientes agregados</div>`;
}

function delIngTemp(i){
  const db = getDB();
  if(editRecetaIndex!=null){
    const r = (db.recetas||[])[editRecetaIndex];
    if(!canEditReceta(r)){
      alert("No tienes permiso para editar esta receta.");
      return;
    }
  }else{
    if(!can("recetas_editar") && !isAdmin()){
      alert("No tienes permiso.");
      return;
    }
  }
  tmpIngredientes.splice(i,1);
  renderTmpIng();
}

/* =========================
   GUARDAR / EDITAR
========================= */

function guardarReceta(){
  const db = getDB();
  db.recetas = db.recetas || [];

  const nombre = (document.getElementById("recNombre").value||"").trim();
  if(!nombre){ alert("Nombre receta obligatorio"); return; }

  const isEdit = (editRecetaIndex != null);
  const old = isEdit ? db.recetas[editRecetaIndex] : null;

  if(isEdit){
    if(!canEditReceta(old)){
      alert("No tienes permiso para editar esta receta.");
      return;
    }
  }else{
    if(!can("recetas_editar") && !isAdmin()){
      alert("No tienes permiso para crear recetas.");
      return;
    }
  }

  if(tmpIngredientes.length===0){
    alert("Agrega ingredientes");
    return;
  }
  if(tmpIngredientes.some(x => !x.cantBase || x.cantBase <= 0)){
    alert("Hay ingredientes con cantidad 0. Corrige antes de guardar.");
    return;
  }

  // ✅ Validar producto base configurado
  const baseMpId = (document.getElementById("recBaseMp")?.value || "").trim();
  const baseQty = Number(document.getElementById("recBaseQty")?.value || 0);
  // baseUnit viene auto desde la MP
  if(!baseMpId){ alert("Selecciona el producto base (para escalar)."); return; }
  if(!baseQty || baseQty <= 0){ alert("Cantidad base inválida (ej: 100)."); return; }
  if(!(document.getElementById("recBaseUnit")?.value || "").trim()){
    alert("Unidad del producto base inválida."); return;
  }


  const rec = {
    ...(isEdit ? (old||{}) : {}),
    nombre,
    productoFinal: (document.getElementById("recProdFinal").value||nombre).trim(),
    rendimientoEsperado: Number(document.getElementById("recRend").value||0),
    unidadRend: (document.getElementById("recRendU").value||"und").trim(),

    // ✅ NUEVO: PRODUCTO BASE PARA ESCALADO
    baseMpId: (document.getElementById("recBaseMp")?.value || "").trim(),
    baseQty: Number(document.getElementById("recBaseQty")?.value || 0),
    baseUnit: (document.getElementById("recBaseUnit")?.value || "").trim(),

    // ✅ NUEVO: PROCEDIMIENTO

    procedimiento: (document.getElementById("recProcedimiento")?.value || "").trim(),
    indirectos: {
      gas: Number(document.getElementById("recGas")?.value || 0),
      luz: Number(document.getElementById("recLuz")?.value || 0),
      salario: Number(document.getElementById("recSalario")?.value || 0),
      empaque: Number(document.getElementById("recEmpaque")?.value || 0),
      otros: Number(document.getElementById("recOtros")?.value || 0)
    },
    margenPct: Number(document.getElementById("recMargenPct")?.value || 0),
    ingredientes: tmpIngredientes.slice()
  };

  if(!rec.rendimientoEsperado || rec.rendimientoEsperado<=0){ alert("Rendimiento esperado inválido"); return; }

  if(isEdit){
    db.recetas[editRecetaIndex] = rec;
  }else{
    db.recetas.push(rec);
  }

  saveDB(db);
  cancelEditReceta();
  loadView("recetas");
}

function editarReceta(i){
  const db = getDB();
  const r = (db.recetas||[])[i];
  if(!r) return;

  const baseMp = (db.materiasPrimas||[]).find(m => m.id === r.baseMpId);
  const baseNombre = baseMp?.nombre || r.baseMpId || "";
  const baseUnit = (r.baseUnit || baseMp?.unidad || baseMp?.baseUnit || "").toString();
  const baseQty = (r.baseQty!=null && r.baseQty!=="") ? Number(r.baseQty) : null;
  const baseQtyTxt = (baseQty!=null && !Number.isNaN(baseQty) && baseQty>0) ? String(baseQty) : "-";
  const baseLine = baseNombre ? `${baseNombre} (${baseQtyTxt} ${baseUnit})` : "";

  if(!canEditReceta(r)){
    alert("No tienes permiso para editar esta receta.");
    return;
  }

  editRecetaIndex = i;

  document.getElementById("recNombre").value = r.nombre || "";
  document.getElementById("recProdFinal").value = r.productoFinal || "";
  document.getElementById("recRend").value = Number(r.rendimientoEsperado||0);
  document.getElementById("recRendU").value = r.unidadRend || "und";

  document.getElementById("recBaseMp").value = r.baseMpId || "";
  document.getElementById("recBaseQty").value = (r.baseQty != null ? Number(r.baseQty) : "");
  autoUnidadBaseReceta();


  // ✅ NUEVO: cargar procedimiento
  const procEl = document.getElementById("recProcedimiento");
  if(procEl) procEl.value = r.procedimiento || "";

  const indirectos = r.indirectos || {};
  const gasEl = document.getElementById("recGas");
  const luzEl = document.getElementById("recLuz");
  const salarioEl = document.getElementById("recSalario");
  const empaqueEl = document.getElementById("recEmpaque");
  const otrosEl = document.getElementById("recOtros");
  const margenEl = document.getElementById("recMargenPct");
  if(gasEl) gasEl.value = Number(indirectos.gas || 0);
  if(luzEl) luzEl.value = Number(indirectos.luz || 0);
  if(salarioEl) salarioEl.value = Number(indirectos.salario || 0);
  if(empaqueEl) empaqueEl.value = Number(indirectos.empaque || 0);
  if(otrosEl) otrosEl.value = Number(indirectos.otros || 0);
  if(margenEl) margenEl.value = Number(r.margenPct || 0);

  tmpIngredientes = (r.ingredientes||[]).map(x => ({
    mpId: x.mpId || "",
    mpNombre: x.mpNombre || "",
    cantBase: Number(x.cantBase ?? 0),
    unidad: x.unidad || "und"
  }));
  renderTmpIng();

  const btn = document.getElementById("btnGuardarReceta");
  if(btn) btn.textContent = "Actualizar receta";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEditReceta(){
  editRecetaIndex = null;
  tmpIngredientes = [];

  const btn = document.getElementById("btnGuardarReceta");
  if(btn) btn.textContent = "Guardar receta";

  const ids = [
    "recNombre","recProdFinal","recRend","recRendU","recBaseMp","recBaseQty","recBaseUnit",
    "ingCant","ingUni","recProcedimiento","recGas","recLuz","recSalario","recEmpaque","recOtros","recMargenPct"
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = "";
  });

  renderTmpIng();
}

function deleteReceta(i){
  const db = getDB();
  const r = (db.recetas||[])[i];
  if(!r) return;

  const baseMp = (db.materiasPrimas||[]).find(m => m.id === r.baseMpId);
  const baseNombre = baseMp?.nombre || r.baseMpId || "";
  const baseUnit = (r.baseUnit || baseMp?.unidad || baseMp?.baseUnit || "").toString();
  const baseQty = (r.baseQty!=null && r.baseQty!=="") ? Number(r.baseQty) : null;
  const baseQtyTxt = (baseQty!=null && !Number.isNaN(baseQty) && baseQty>0) ? String(baseQty) : "-";
  const baseLine = baseNombre ? `${baseNombre} (${baseQtyTxt} ${baseUnit})` : "";

  if(!canEditReceta(r)){
    alert("No tienes permiso para eliminar esta receta.");
    return;
  }

  db.recetas.splice(i,1);
  saveDB(db);

  if(editRecetaIndex === i) cancelEditReceta();

  loadView("recetas");
}

/* =========================
   MODAL "VER" receta
========================= */
function closeModal(){
  const m = document.getElementById("modal");
  if(m) m.remove();
}

function verReceta(i){
  const db = getDB();
  const r = (db.recetas||[])[i];
  if(!r) return;

  const baseMp = (db.materiasPrimas||[]).find(m => m.id === r.baseMpId);
  const baseNombre = baseMp?.nombre || r.baseMpId || "";
  const baseUnit = (r.baseUnit || baseMp?.unidad || baseMp?.baseUnit || "").toString();
  const baseQty = (r.baseQty!=null && r.baseQty!=="") ? Number(r.baseQty) : null;
  const baseQtyTxt = (baseQty!=null && !Number.isNaN(baseQty) && baseQty>0) ? String(baseQty) : "-";
  const baseLine = baseNombre ? `${baseNombre} (${baseQtyTxt} ${baseUnit})` : "";

  const ing = (r.ingredientes||[]).map(x => {
    const mp = x.mpNombre || x.mpId || "MP";
    const cant = x.cantBase ?? 0;
    const uni = x.unidad || "";
    return `<li>${escapeHtml(String(cant))} ${escapeHtml(String(uni))} — ${escapeHtml(String(mp))}</li>`;
  }).join("");

  const proc = (r.procedimiento || "").trim();
  const procHtml = proc
    ? `<div style="margin-top:10px; white-space:pre-wrap;">${escapeHtml(proc)}</div>`
    : `<div class="muted" style="margin-top:10px;">Sin procedimiento definido</div>`;
  const costoInfo = calcularPrecioVentaReceta(r, db);
  const indirectos = r.indirectos || {};
  const indirectosTotal = Number(indirectos.gas||0)+Number(indirectos.luz||0)+Number(indirectos.salario||0)+Number(indirectos.empaque||0)+Number(indirectos.otros||0);

  const html = `
    <div class="modal-backdrop" onclick="closeModal()"></div>
    <div class="modal">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div class="big" style="font-size:18px;">
            ${escapeHtml(r.nombre)}
            ${r.locked ? ` <span class="tag yellow small">OFICIAL</span>` : ``}
          </div>
          <div class="muted small">
            Producto: ${escapeHtml(r.productoFinal||"")} • Rend: ${Number(r.rendimientoEsperado||0)} ${escapeHtml(r.unidadRend||"")}${baseLine ? ` • Base: ${escapeHtml(baseLine)}` : ``}
          </div>
        </div>
        <button class="btn" onclick="closeModal()">Cerrar</button>
      </div>

      <div class="hr"></div>

      <div class="panel">
        <b>Ingredientes</b>
        <ul style="margin:10px 0 0 18px;">${ing || `<li class="muted">Sin ingredientes</li>`}</ul>
      </div>

      <div class="panel" style="margin-top:12px;">
        <b>Procedimiento</b>
        ${procHtml}
      </div>

      <div class="panel" style="margin-top:12px;">
        <b>Costeo</b>
        <div class="small muted" style="margin-top:6px;">
          Costo directo base: <b>${money(costoInfo.costoDirecto)}</b><br>
          Indirectos por lote: <b>${money(indirectosTotal)}</b><br>
          Costo total por lote: <b>${money(costoInfo.costoTotalLote)}</b><br>
          Costo unitario base: <b>${money(costoInfo.costoUnitario)}</b><br>
          Margen: <b>${Number(r.margenPct||0).toFixed(2)}%</b><br>
          Precio de venta sugerido: <b>${money(costoInfo.precioVenta)}</b>
        </div>
      </div>

      <div class="panel" style="margin-top:12px;">
        <b>Producto base</b>
        <div class="small muted" style="margin-top:6px;">
          ${baseLine ? escapeHtml(baseLine) : `<span class="muted">—</span>`}
        </div>
      </div>
    </div>
  `;

  const modal = document.createElement("div");
  modal.id = "modal";
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

// Auto completa la unidad del producto base según la materia prima seleccionada
function autoUnidadBaseReceta(){
  const db = getDB();
  const sel = document.getElementById("recBaseMp");
  const unit = document.getElementById("recBaseUnit");
  if(!sel || !unit) return;

  const mpId = (sel.value||"").trim();
  const mp = (db.materiasPrimas||[]).find(x => x.id === mpId);
  unit.value = (mp?.unidad || mp?.baseUnit || "und").toString();
}

// --- Exponer funciones al router / scope global (por compatibilidad) ---
// Esto evita "renderRecetas is not defined" si tu app carga scripts como módulos o con scope aislado.
try{
  if(typeof window !== "undefined"){
    Object.assign(window, {
      renderRecetas,
      addIngTemp,
      updateIngTemp,
      renderTmpIng,
      delIngTemp,
      guardarReceta,
      editarReceta,
      cancelEditReceta,
      deleteReceta,
      verReceta,
      closeModal,
      autoUnidadBaseReceta
    });
  }
}catch(e){ /* noop */ }