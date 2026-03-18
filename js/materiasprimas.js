// js/materiasprimas.js

let editMPIndex = null;

function canEditMP(){
  return isAdmin?.() || can?.("mp_editar");
}

function renderMateriasPrimas(){
  const db = getDB();
  const list = (db.materiasPrimas||[]);

  const rows = list.map((m,i)=>`
    <tr>
      <td>${escapeHtml(m.id)}</td>
      <td>${escapeHtml(m.nombre)}</td>
      <td class="right">${Number(m.stockBase ?? m.stock ?? 0)}</td>
      <td>${escapeHtml(m.baseUnit || m.unidad || "und")}</td>
      <td class="right">${Number(m.stockMinBase ?? m.stockMin ?? 0)}</td>
      <td class="right">${money(Number(m.costoPromBase ?? m.costoUnit ?? 0))}</td>
      <td class="right">
        ${canEditMP() ? `
          <button class="btn sm" onclick="editMP(${i})">✏️</button>
          <button class="btn danger sm" onclick="delMP(${i})">🗑</button>
        ` : `<span class="muted small">—</span>`}
      </td>
    </tr>
  `).join("");

  const editable = canEditMP();

  return `
    <div class="page-head">
      <div>
        <div class="big">Inventario Materia Prima</div>
        <div class="muted small">Crea, edita y controla stock mínimo y costo promedio.</div>
      </div>
      <div class="actions">
        ${editMPIndex!=null ? `<button class="btn" onclick="cancelEditMP()">Cancelar edición</button>` : ``}
      </div>
    </div>

    <div class="panel">
      ${editable ? `` : `<div class="muted small">Modo lectura: no tienes permiso para editar materias primas.</div><div class="hr"></div>`}

      <div class="grid-2">
        <div>
          <label>ID</label>
          <input id="mpId" placeholder="MP-0001" ${editable?``:`disabled`}>

          <label>Nombre</label>
          <input id="mpNombre" placeholder="TOMATE" ${editable?``:`disabled`}>

          <label>Unidad base</label>
          <input id="mpUnidad" placeholder="und / g / ml / libra" ${editable?``:`disabled`}>
        </div>

        <div>
          <label>Stock (base)</label>
          <input id="mpStock" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>

          <label>Stock mínimo (base)</label>
          <input id="mpMin" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>

          <label>Costo promedio (base)</label>
          <input id="mpCosto" type="number" step="0.01" placeholder="0" ${editable?``:`disabled`}>
        </div>
      </div>

      ${editable ? `
        <button id="btnSaveMP" class="btn accent" onclick="saveMP()">${editMPIndex==null ? "Agregar MP" : "Actualizar MP"}</button>
      ` : ``}
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>ID</th><th>Materia Prima</th>
          <th class="right">Stock</th><th>Unidad</th>
          <th class="right">Mín</th><th class="right">Costo</th>
          <th class="right">Acción</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="7" class="muted">Sin materias primas</td></tr>`}</tbody>
    </table>
  `;
}

function saveMP(){
  if(!canEditMP()){ alert("No tienes permiso para editar MP."); return; }

  const db = getDB();
  db.materiasPrimas = db.materiasPrimas || [];

  const id = (document.getElementById("mpId").value||"").trim();
  const nombre = (document.getElementById("mpNombre").value||"").trim();

  if(!id || !nombre){
    alert("ID y Nombre son obligatorios");
    return;
  }

  const baseUnit = normalizeUnitCode((document.getElementById("mpUnidad").value||"").trim() || "UND");
  const stockBase = Number(document.getElementById("mpStock").value||0);
  const stockMinBase = Number(document.getElementById("mpMin").value||0);
  const costoPromBase = Number(document.getElementById("mpCosto").value||0);

  // evita duplicar ID si estás creando
  if(editMPIndex==null){
    const exists = db.materiasPrimas.some(m => String(m.id||"").toUpperCase() === id.toUpperCase());
    if(exists){
      alert("Ese ID ya existe. Usa otro o edita el registro.");
      return;
    }
  }

  const obj = {
    ...(editMPIndex!=null ? (db.materiasPrimas[editMPIndex]||{}) : {}),
    id,
    nombre,
    categoria: (db.materiasPrimas[editMPIndex]?.categoria || "GENERAL"),

    // modelo nuevo
    baseUnit,
    units: buildMPUnits(baseUnit, editMPIndex!=null ? db.materiasPrimas[editMPIndex]?.units : null),
    stockBase,
    stockMinBase,
    costoPromBase,

    // legacy compatibilidad
    unidad: baseUnit,
    stock: stockBase,
    stockMin: stockMinBase,
    costoUnit: costoPromBase,

    updatedAt: Date.now(),
    updatedBy: (getSession()?.usuario || "SYSTEM")
  };

  if(editMPIndex!=null){
    db.materiasPrimas[editMPIndex] = obj;
  }else{
    obj.createdAt = Date.now();
    obj.createdBy = (getSession()?.usuario || "SYSTEM");
    db.materiasPrimas.push(obj);
  }

  saveDB(db);
  toast?.(editMPIndex!=null ? "✅ MP actualizada" : "✅ MP agregada");

  cancelEditMP();
  loadView("mp");
}

function editMP(i){
  if(!canEditMP()){ alert("No tienes permiso para editar MP."); return; }

  const db = getDB();
  const m = (db.materiasPrimas||[])[i];
  if(!m) return;

  editMPIndex = i;

  document.getElementById("mpId").value = m.id || "";
  document.getElementById("mpNombre").value = m.nombre || "";
  document.getElementById("mpUnidad").value = m.baseUnit || m.unidad || "und";
  document.getElementById("mpStock").value = Number(m.stockBase ?? m.stock ?? 0);
  document.getElementById("mpMin").value = Number(m.stockMinBase ?? m.stockMin ?? 0);
  document.getElementById("mpCosto").value = Number(m.costoPromBase ?? m.costoUnit ?? 0);

  const btn = document.getElementById("btnSaveMP");
  if(btn) btn.textContent = "Actualizar MP";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEditMP(){
  editMPIndex = null;

  const ids = ["mpId","mpNombre","mpUnidad","mpStock","mpMin","mpCosto"];
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = "";
  });

  const btn = document.getElementById("btnSaveMP");
  if(btn) btn.textContent = "Agregar MP";
}

function delMP(i){
  if(!canEditMP()){ alert("No tienes permiso para eliminar MP."); return; }

  const db = getDB();
  db.materiasPrimas = db.materiasPrimas || [];

  db.materiasPrimas.splice(i,1);
  saveDB(db);

  if(editMPIndex === i) cancelEditMP();

  toast?.("🗑 MP eliminada");
  loadView("mp");
}