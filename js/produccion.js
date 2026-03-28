// js/produccion.js
console.log("[produccion.js] cargado OK");
function _nowISO(){
  return new Date().toISOString();
}

function _currentUserName(){
  const u = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  return (u && u.usuario) ? u.usuario : "DESCONOCIDO";
}

// ✅ cualquier usuario, pero debe confirmar SU clave
function _verifyCurrentUserPassword(pass){
  const u = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  if(!u) return false;
  return String(u.clave || "").trim() === String(pass || "").trim();
}

function agregarMemoProduccion(ordenId){
  openMemoModal(ordenId);
}
/* =========================================================
   HELPERS: fecha + slug + correlativo por producto y día
========================================================= */
let _memoTargetOrdenId = null;

function openMemoModal(ordenId){
  const db = getDB();
  const orden = (db.producciones || []).find(p => p.id === ordenId);
  if(!orden){ alert("Orden no encontrada"); return; }

  _memoTargetOrdenId = ordenId;

  const modal = document.getElementById("memoModal");
  const meta  = document.getElementById("memoModalMeta");
  const txt   = document.getElementById("memoTexto");
  const clave = document.getElementById("memoClave");
  const msg   = document.getElementById("memoModalMsg");

  meta.textContent = `${orden.productoFinal || ""} • Lote: ${orden.lote || ""}`;
  txt.value = "";
  clave.value = "";
  msg.textContent = "";

  modal.style.display = "block";
}
function openConfirmProduccionModal(onConfirm){
  const modal = document.createElement("div");
  modal.className = "mb-modal mb-confirm";

  // Tomamos datos para mostrar resumen
  const db = getDB();
  const idx = Number(document.getElementById("prodReceta")?.value);
  const receta = (db.recetas || [])[idx];
  if (!receta) { alert("Selecciona una receta"); return; }

  // Cantidad del producto base (ingresada por usuario)
  const baseQtyInput = Number(document.getElementById("prodBaseQty")?.value || 0);
  if (!baseQtyInput || baseQtyInput <= 0) { alert("Cantidad inválida del producto base"); return; }

  // Base configurada dentro de la receta (NO editable en Producción)
  const baseQtyReceta = Number(receta.baseQty || 0);
  if (!baseQtyReceta || baseQtyReceta <= 0) { alert("Esta receta no tiene baseQty configurado. Ve a Recetas y configura el producto base."); return; }

  const factor = baseQtyInput / baseQtyReceta;

  const titulo = receta ? (receta.productoFinal || receta.nombre) : "Producción";
  const unidad = (receta?.unidadRend || "und");
  const esperado = receta ? (Number(receta.rendimientoEsperado || 0) * factor) : 0;

  modal.innerHTML = `
    <div class="mb-backdrop"></div>
    <div class="mb-card">
      <div class="mb-head">
        <img src="assets/MARCK1.png" class="mb-logo" onerror="this.style.display='none'">
        <div>
          <div class="mb-title">Confirmar orden de producción</div>
          <div class="mb-sub">${escapeHtml(titulo || "")}</div>
        </div>
        <button class="btn sm" id="mbX">✖</button>
      </div>

      <div class="mb-body">
        <div class="mb-loading" style="display:none;" id="mbLoading">
          <div class="mb-spinner"></div>
          <div>Generando orden…</div>
        </div>

        <div id="mbContent">
          <div style="opacity:.9; font-size:14px; line-height:1.5;">
            Estás por generar una orden con:
            <div style="margin-top:8px;">
              <b>Factor:</b> ${isFinite(factor) ? factor : "—"}<br>
              <b>Rendimiento esperado:</b> ${isFinite(esperado) ? esperado : "—"} ${escapeHtml(unidad)}
            </div>
          </div>

          <div class="mb-actions">
            <button class="btn" id="mbCancel">Cancelar</button>
            <button class="btn accent" id="mbOk">✅ Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => {
    modal.classList.add("mb-close");
    setTimeout(()=> modal.remove(), 180);
  };

  modal.querySelector(".mb-backdrop").addEventListener("click", close);
  modal.querySelector("#mbX").addEventListener("click", close);
  modal.querySelector("#mbCancel").addEventListener("click", close);

  modal.querySelector("#mbOk").addEventListener("click", () => {
    // mostrar spinner
    modal.querySelector("#mbContent").style.display = "none";
    modal.querySelector("#mbLoading").style.display = "flex";

    // ⚠️ Importante: NO usar await/setTimeout aquí.
    // Si se pierde el "user gesture", Chrome bloquea window.print()/popups.
    try{
      onConfirm && onConfirm(); // ejecución síncrona
      close();
      showProduccionActualizadaModal?.();
    }catch(err){
      console.error(err);
      alert(err?.message || "No se pudo generar la orden.");
      close();
    }
  });
}
function poblarListadosProduccion(){
  const db = getDB();

  // Productos disponibles (recetas)
  const prods = new Set();
  (db.recetas || []).forEach(r => {
    const prod = String(r.productoFinal || r.nombre || "").trim();
    if (prod) prods.add(prod);
  });

  // Lotes existentes
  const lotes = new Set();
  (db.producciones || []).forEach(p => {
    const lote = String(p.lote || "").trim();
    if (lote) lotes.add(lote);
  });

  // ✅ SELECT de producto
  const selProd = document.getElementById("fProducto");
  if(selProd){
    const current = selProd.value || "";
    const opts = Array.from(prods).sort().map(x =>
      `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`
    ).join("");
    selProd.innerHTML = `<option value="">(Todos)</option>` + opts;
    selProd.value = current; // conserva selección
  }

  // ✅ datalist de lotes (se queda igual)
  const dlLote = document.getElementById("dlLotesProd");
  if (dlLote) dlLote.innerHTML = Array.from(lotes).sort()
    .map(x => `<option value="${escapeHtml(x)}"></option>`).join("");
}

function closeMemoModal(){
  const modal = document.getElementById("memoModal");
  if(modal) modal.style.display = "none";
  _memoTargetOrdenId = null;
}

// usuario actual (usa tu función existente)
function _currentUser(){
  return (typeof getCurrentUser === "function") ? getCurrentUser() : null;
}

function _currentUserName(){
  const u = _currentUser();
  return (u && u.usuario) ? u.usuario : "DESCONOCIDO";
}

function _verifyCurrentUserPassword(pass){
  const u = _currentUser();
  if(!u) return false;
  return String(u.clave || "").trim() === String(pass || "").trim();
}

function saveMemoModal(){
  const msg = document.getElementById("memoModalMsg");
  const texto = (document.getElementById("memoTexto").value || "").trim();
  const clave = (document.getElementById("memoClave").value || "").trim();

  if(!_memoTargetOrdenId){ msg.textContent = "Orden no válida."; return; }
  if(!texto){ msg.textContent = "Memo vacío."; return; }
  if(!clave){ msg.textContent = "Ingresa tu clave."; return; }

  if(!_verifyCurrentUserPassword(clave)){
    msg.textContent = "Clave incorrecta. No se guardó.";
    return;
  }

  const db = getDB();
  db.producciones = db.producciones || [];
  const idx = db.producciones.findIndex(p => p.id === _memoTargetOrdenId);
  if(idx === -1){ msg.textContent = "Orden no encontrada."; return; }

  const orden = db.producciones[idx];
  orden.memos = Array.isArray(orden.memos) ? orden.memos : [];
  orden.memos.push({
    ts: Date.now(),
    usuario: _currentUserName(),
    texto
  });

  saveDB(db);

closeMemoModal();
cargarProducciones();
}
function showProduccionActualizadaModal(){
  const modal = document.createElement("div");
  modal.className = "mb-modal";

  modal.innerHTML = `
    <div class="mb-backdrop"></div>

    <div class="mb-card" style="max-width:480px;text-align:center;">
      <div class="mb-head" style="justify-content:center;">
        <img src="assets/MARCK1.png" class="mb-logo" onerror="this.style.display='none'">
        <div>
          <div class="mb-title">Listado actualizado</div>
          <div class="mb-sub">Producción actualizada correctamente</div>
        </div>
      </div>

      <div class="mb-body">
        <div style="margin-top:10px;font-size:15px;opacity:.85;">
          El listado de producción ha sido recargado.
        </div>

        <button class="btn accent" style="margin-top:18px;" id="mbOkBtn">
          ✔ Entendido
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => {
    // cierre con animación
    modal.classList.add("mb-close");
    setTimeout(()=> modal.remove(), 180);
  };

  // cerrar al click fuera
  modal.querySelector(".mb-backdrop").addEventListener("click", close);
  // cerrar con botón
  modal.querySelector("#mbOkBtn").addEventListener("click", close);

  // auto-cierre (3s)
  setTimeout(() => {
    if(document.body.contains(modal)) close();
  }, 3000);
}

function _slugProd(s) {
  return String(s || "PRODUCTO")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

// ✅ Usa el MISMO db y NO guarda adentro
function nextCorrelativoPorProducto(db, prefijo, productoFinal) {
  const hoy = yyyymmdd(new Date()); // usa la global
  const prodKey = _slugProd(productoFinal);

  db.configuracion = db.configuracion || {};
  db.configuracion.correlativos = db.configuracion.correlativos || {};

  const key = `${prefijo}-${hoy}||${prodKey}`;

  // ✅ Si no existe contador, reconstruirlo desde producciones existentes
  if (db.configuracion.correlativos[key] == null) {
    let max = 0;
    for (const p of (db.producciones || [])) {
      const id = String((prefijo === "LP" ? p.lote : p.id) || "");
      // busca: LP-yyyymmdd-###
      if (!id.startsWith(`${prefijo}-${hoy}-`)) continue;
      if (_slugProd(p.productoFinal) !== prodKey) continue;

      const n = Number(id.split("-").pop() || 0);
      if (n > max) max = n;
    }
    db.configuracion.correlativos[key] = max; // queda listo para continuar
  }

  const current = Number(db.configuracion.correlativos[key] || 0) + 1;
  db.configuracion.correlativos[key] = current;

  return `${prefijo}-${hoy}-${String(current).padStart(3, "0")}`;
}
/* =========================================================
   MIGRACIÓN SUAVE / NORMALIZACIÓN (para datos viejos)
========================================================= */
function normalizeProducciones() {
  const db = getDB();
  db.producciones = db.producciones || [];

  for (const p of db.producciones) {
    if (!p.id) p.id = String(p.ordenId || p.lote || ("PRD-" + Date.now()));
    if (!p.productoFinal) p.productoFinal = p.producto || p.recetaNombre || "PRODUCTO";
    if (!p.unidad) p.unidad = p.unidadRend || "und";

    // campos antiguos
    if (p.real == null && p.rendReal != null) p.real = Number(p.rendReal);
    if (p.esperado == null && p.rendEsperado != null) p.esperado = Number(p.rendEsperado);

    // Normaliza números seguros
    const esp = Number(p.esperado || 0);
    const rea = (p.real == null) ? null : Number(p.real || 0);
    p.esperado = isFinite(esp) ? esp : 0;
    if (p.real != null) p.real = isFinite(rea) ? rea : 0;

    // Si falta status, inferirlo con una regla segura
    if (!p.status) {
      // Solo FINALIZADA si hay marca real de cierre
      p.status = (p.finalTs != null) ? "FINALIZADA" : "EN_PROCESO";
    }

    // ✅ REGLA CLAVE:
    // Si dice FINALIZADA pero NO tiene finalTs => estaba "inconsistente".
    // La regresamos a EN_PROCESO para que la puedas finalizar/cancelar bien.
    if (p.status === "FINALIZADA" && (p.finalTs == null)) {
      p.status = "EN_PROCESO";
      p.statusSem = null;
      p.diff = 0;

      // Si venía un "real" viejo que activó la finalización incorrecta, lo anulamos
      // (porque el real debe capturarse al FINALIZAR, no por arrastre).
      p.real = null;
    }

    // Si está EN_PROCESO, NO la forzamos a FINALIZADA solo por real>0.
    // (Eso era el bug que te trababa órdenes.)
    if (p.status === "FINALIZADA") {
      const esperado = Number(p.esperado || 0);
      const real = Number(p.real || 0);
      p.esperado = isFinite(esperado) ? esperado : 0;
      p.real = isFinite(real) ? real : 0;
      p.diff = isFinite(p.real - p.esperado) ? (p.real - p.esperado) : 0;
      p.statusSem = (p.real === p.esperado) ? "VERDE" : "ROJO";
    }
  }

  saveDB(db);
}

/* =========================================================
   IMPRESIÓN: Etiquetas 2x4 pulgadas VERTICAL (2" x 4")
   - 1 etiqueta por unidad REAL
   - En impresión lote se muestra como LP-XXX (últimos 3)
========================================================= */
function imprimirEtiquetas2x4({ producto, lote, fechaISO, cantidad, logoSrc = "assets/logo.png" }) {
  // 1 etiqueta por unidad real (entero)
  const qty = Math.max(1, Math.floor(Number(cantidad || 1)));

  const fecha = fechaISO ? new Date(fechaISO) : new Date();
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yyyy = fecha.getFullYear();
  const fechaStr = `${dd}/${mm}/${yyyy}`;

  // ✅ SOLO PARA IMPRESIÓN: LP-XXX (últimos 3 dígitos)
  const partes = String(lote || "").split("-");
  const ultimos3 = partes[partes.length - 1] || "";
  const loteImpresion = `LP-${ultimos3}`;

  const win = window.open("", "", "width=900,height=700");
  if (!win) {
    alert("Pop-up bloqueado. Permite ventanas emergentes para poder imprimir etiquetas.");
    return;
  }

  const labelsHtml = Array.from({ length: qty }).map(() => `
    <div class="label">
      <div class="logoWrap">
        <img class="logo" src="${logoSrc}" onerror="this.style.display='none'">
      </div>

      <div class="producto">${escapeHtml(producto)}</div>

      <div class="info">
        <div class="line"><span class="k">LOTE:</span> <span class="v">${escapeHtml(loteImpresion)}</span></div>
        <div class="line"><span class="k">PROD:</span> <span class="v">${escapeHtml(fechaStr)}</span></div>
      </div>

      <div class="footer">Las Piconas - Planta</div>
    </div>
  `).join("");

  win.document.open();
  win.document.write(`
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Etiquetas 2x4 Vertical</title>
      <style>
        /* Vertical 2x4: 2" ancho x 4" alto */
        @page { size: 2in 4in; margin: 0.08in; }

        body{
          margin:0;
          font-family: Arial, sans-serif;
          color:#000;
          background:#fff;
        }

   .label{
  width: 1.84in;
  height: 3.84in;
  box-sizing: border-box;
  border: none;
  padding: 0.10in;
          page-break-after: always;

          display:flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align:center;
        }

        .logoWrap{
          width: 100%;
          display:flex;
          justify-content:center;
          align-items:center;
          padding-top: 0.02in;
        }

        .logo{
          width: 1.55in;
          height:auto;
          object-fit:contain;
        }

        .producto{
          font-weight: 900;
          font-size: 26px;
          letter-spacing: 0.5px;
          margin-top: 0.08in;
          margin-bottom: 0.08in;
          line-height: 1.0;
          max-width: 100%;
          word-break: break-word;
        }

        .info{
          width: 100%;
          text-align:left;
          margin-top: 0.05in;
        }

        .line{
          display:flex;
          gap: 6px;
          align-items: baseline;
          font-size: 15px;
          line-height: 1.15;
        }

        .k{
          font-weight: 900;
          min-width: 0.62in;
        }

        .v{
          font-weight: 700;
          overflow:hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .footer{
          width: 100%;
          font-size: 12px;
          opacity: .85;
          padding-bottom: 0.03in;
        }
      </style>
    </head>
    <body>
      ${labelsHtml}
      <script>
        window.onload = () => {
          window.focus();
          window.print();
          setTimeout(()=> window.close(), 1200);
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
}

// Alias de compatibilidad
function imprimirEtiquetasProducto(producto, lote, cantidad, fechaISO, logoSrc){
  return imprimirEtiquetas2x4({ producto, lote, fechaISO, cantidad, logoSrc });
}

/* =========================================================
   UI PRINCIPAL
========================================================= */
function autoBaseDesdeReceta(){
  const db = getDB();
  const sel = document.getElementById("prodReceta");
  const lbl = document.getElementById("prodBaseLabel");
  const qtyInp = document.getElementById("prodBaseQty");
  if(!sel || !lbl) return;

  const idx = Number(sel.value);
  const receta = (db.recetas || [])[idx];
  if(!receta) return;

  // producto base configurado en receta
  const mp = (db.materiasPrimas || []).find(m => m.id === receta.baseMpId) || null;
  const mpNombre = (mp?.nombre || receta.baseMpNombre || receta.baseMpId || "BASE").toString();
  const baseUnit = (receta.baseUnit || mp?.unidad || mp?.baseUnit || "und").toString();
  const baseQty = Number(receta.baseQty || 0) || 0;

  lbl.value = `${mpNombre} • Base receta: ${baseQty} ${baseUnit}`;

  // unidad de producción (producto final) queda fija
  const unitInp = document.getElementById("prodUnit");
  if(unitInp) unitInp.value = receta.unidadRend || "und";

  // no borrar lo que el usuario está escribiendo si ya hay algo
  if(qtyInp && qtyInp.value === "") qtyInp.placeholder = `Ej: ${baseQty || 100}`;
}
function renderProduccion() {
  normalizeProducciones();

  const db = getDB();
  const opts = (db.recetas || []).map((r, i) =>
    `<option value="${i}">${escapeHtml(r.nombre)}</option>`
  ).join("");

 setTimeout(() => {
  cargarProducciones();
  poblarListadosProduccion();
  autoBaseDesdeReceta();
}, 0);

  return `
    <div class="page-head">
      <div>
        <div class="big">Producción</div>
        <div class="muted small">Genera orden base (EN_PROCESO) y finaliza con rendimiento real.</div>
      </div>
    </div>

    <div class="panel">
      <label>Receta</label>
      <select id="prodReceta" onchange="autoBaseDesdeReceta()">
  ${opts}
</select>

      <div class="row">
        <div style="flex:2">
          <label>Producto base (fijo en receta)</label>
          <input id="prodBaseLabel" placeholder="(Selecciona receta)" readonly>
          <div class="muted small" style="margin-top:6px;">Este producto base se configura en la receta. Aquí no se puede cambiar.</div>
        </div>
        <div>
          <label>Cantidad del producto base</label>
          <input id="prodBaseQty" type="number" step="0.01" placeholder="0">
          <div class="muted small" style="margin-top:6px;">Escribe solo la cantidad (ej: 10). El sistema calcula el factor automáticamente.</div>
        </div>
        <div>
          <label>Unidad producción (producto final)</label>
          <input id="prodUnit" placeholder="Unidad (auto)" readonly>
        </div>
      </div>

      <label>Comentario (opcional)</label>
      <input id="prodObs" placeholder="Ej: Producción para sucursal X / turno noche">

      <div class="row" style="margin-top:10px;">
        <button class="btn accent" onclick="confirmarGenerarOrden()">➕ Generar Orden</button>
        <hr style="margin:14px 0; opacity:.2;">

<div class="row">
  <div>
    <label>Desde</label>
    <input id="fDesde" type="date">
  </div>
  <div>
    <label>Hasta</label>
    <input id="fHasta" type="date">
  </div>
</div>

<div class="row">
  <div>
   <label>Producto</label>
<select id="fProducto">
  <option value="">(Todos)</option>
</select>
    <label>Lote (contiene)</label>
    <input id="fLote" list="dlLotesProd" placeholder="Ej: LP-20260302-001">
<datalist id="dlLotesProd"></datalist>
  </div>
</div>

<div class="row" style="margin-top:10px;">
  <button class="btn" onclick="aplicarFiltroProduccion()">🔎 Filtrar</button>
  <button class="btn" onclick="limpiarFiltroProduccion()">🧹 Limpiar</button>
  <button class="btn accent" onclick="exportarProduccionPDF()">📄 Exportar PDF (Carta)</button>
</div>
        <button class="btn" onclick="cargarProducciones(); showProduccionActualizadaModal();">
  🔄 Recargar lista
</button>
      </div>
    </div>
    <!-- MODAL MEMO -->
<div id="memoModal" class="mb-modal" style="display:none;">
  <div class="mb-backdrop" onclick="closeMemoModal()"></div>

  <div class="mb-card">
    <div class="mb-head">
      <img src="assets/MARCK1.png" class="mb-logo" onerror="this.style.display='none'">
      <div>
        <div class="mb-title">Memo de Lote</div>
        <div id="memoModalMeta" class="mb-sub"></div>
      </div>
      <button class="btn sm" onclick="closeMemoModal()">✖</button>
    </div>

    <div class="mb-body">
      <label>Memo / explicación</label>
      <textarea id="memoTexto" rows="4" placeholder="Ej: Salió de más por exceso de materia prima / evaporación menor / etc."></textarea>

      <label style="margin-top:10px;">Clave para guardar</label>
      <input id="memoClave" type="password" placeholder="Tu clave">

      <div class="row" style="margin-top:12px;">
        <button class="btn accent" onclick="saveMemoModal()">💾 Guardar</button>
        <button class="btn" onclick="closeMemoModal()">Cancelar</button>
      </div>

      <div id="memoModalMsg" class="muted small" style="margin-top:10px;"></div>
    </div>
  </div>
</div>
    <div class="panel" style="margin-top:14px;">
      <div class="big" style="font-size:16px;">Órdenes recientes</div>
      <div id="produccionesList" style="margin-top:10px;"></div>
    </div>
  `;
}

/* =========================================================
   CREAR ORDEN (EN_PROCESO)
========================================================= */
function generarOrdenProduccion() {
  normalizeProducciones();
  const db = getDB();

  const idx = Number(document.getElementById("prodReceta").value);
  const receta = (db.recetas || [])[idx];
  if (!receta) { alert("Selecciona una receta"); return; }

  const baseQtyInput = Number(document.getElementById("prodBaseQty")?.value || 0);
  if (!baseQtyInput || baseQtyInput <= 0) { alert("Cantidad inválida del producto base"); return; }

  const baseQtyReceta = Number(receta.baseQty || 0);
  if (!baseQtyReceta || baseQtyReceta <= 0) { alert("Esta receta no tiene baseQty configurado. Ve a Recetas y configura el producto base."); return; }

  const factor = baseQtyInput / baseQtyReceta;
  const unidad = receta.unidadRend || "und";
  const obs = (document.getElementById("prodObs").value || "").trim();

  const productoFinal = receta.productoFinal || receta.nombre || "PRODUCTO";
  const esperado = Number(receta.rendimientoEsperado || 0) * factor;
  if (!esperado || esperado <= 0) { alert("Rendimiento esperado inválido en la receta"); return; }

  const faltantes = [];
  const consumosMP = [];
  let costoDirectoEstimado = 0;

  for (const ing of (receta.ingredientes || [])) {
    const mp = (db.materiasPrimas || []).find(x => x.id === ing.mpId);
    if (!mp) {
      faltantes.push((ing.mpNombre || ing.mpId || "MP") + " (no existe)");
      continue;
    }

    let needBase = 0;
    try{
      needBase = convertirCantidadMPaBase(mp, Number(ing.cantBase || 0) * factor, ing.unidad || mp.baseUnit || mp.unidad || "UND");
    }catch(err){
      alert(err && err.message ? err.message : "No se pudo convertir unidades de MP.");
      return;
    }

    const stockActual = Number(mp.stockBase ?? mp.stock ?? 0);
    if (stockActual + 1e-9 < needBase) {
      faltantes.push(`${ing.mpNombre || ing.mpId} (necesita ${needBase.toFixed(4)} ${mp.baseUnit || mp.unidad || ""})`);
    }

    const costoUnitBase = Number(mp.costoPromBase || 0);
    const costoTotal = needBase * costoUnitBase;
    costoDirectoEstimado += costoTotal;

    consumosMP.push({
      mpId: mp.id,
      mpNombre: mp.nombre,
      cantidadBase: needBase,
      baseUnit: mp.baseUnit || mp.unidad || "UND",
      costoUnitarioBase: costoUnitBase,
      costoTotal: costoTotal,
      cantidadReceta: Number(ing.cantBase || 0) * factor,
      unidadReceta: ing.unidad || mp.baseUnit || mp.unidad || "UND"
    });
  }

  if (faltantes.length) {
    alert("Materia prima insuficiente:\n- " + faltantes.join("\n- "));
    return;
  }

  for (const c of consumosMP) {
    const mp = (db.materiasPrimas || []).find(x => x.id === c.mpId);
    if (mp) {
      mp.stockBase = Number(mp.stockBase ?? mp.stock ?? 0) - Number(c.cantidadBase || 0);
      mp.stock = Number(mp.stockBase || 0);
    }
  }

  const costoIndirectoBase = sumarIndirectosReceta(receta);
  const costoIndirectoEstimado = costoIndirectoBase * factor;
  const costoTotalEstimado = costoDirectoEstimado + costoIndirectoEstimado;
  const costoUnitarioEstimado = esperado > 0 ? (costoTotalEstimado / esperado) : 0;
  const precioVentaUnitario = costoUnitarioEstimado * (1 + Number(receta.margenPct || 0) / 100);

  const ordenId = nextCorrelativoPorProducto(db, "PRD", productoFinal);
  const lote = nextCorrelativoPorProducto(db, "LP", productoFinal);

  db.producciones = db.producciones || [];
  db.producciones.push({
    id: ordenId,
    recetaId: receta.id || null,
    recetaNombre: receta.nombre || productoFinal,
    productoFinal,
    unidad,
    factor,
    baseInfo: {
      mpId: receta.baseMpId || null,
      mpNombre: ((db.materiasPrimas||[]).find(m=>m.id===receta.baseMpId)?.nombre || receta.baseMpNombre || "").toString(),
      unidad: receta.baseUnit || ((db.materiasPrimas||[]).find(m=>m.id===receta.baseMpId)?.unidad || (db.materiasPrimas||[]).find(m=>m.id===receta.baseMpId)?.baseUnit || "und"),
      baseQty: baseQtyInput,
      baseQtyReceta: baseQtyReceta
    },
    esperado,
    real: null,
    diff: 0,
    lote,
    status: "EN_PROCESO",
    statusSem: null,
    comentario: obs,
    consumosMP: consumosMP,
    costoDirectoEstimado: costoDirectoEstimado,
    costoIndirectoEstimado: costoIndirectoEstimado,
    costoTotalEstimado: costoTotalEstimado,
    costoUnitarioEstimado: costoUnitarioEstimado,
    margenPct: Number(receta.margenPct || 0),
    precioVentaUnitario: precioVentaUnitario,
    creadoPor: getUserName(),
    ts: Date.now()
  });

  saveDB(db);

  if (typeof window.imprimirTicketRecetaEscalada === "function") {
    try { window.imprimirTicketRecetaEscalada(ordenId); } catch(e){ console.warn("No se pudo imprimir receta:", e); }
  }

  document.getElementById("prodObs").value = "";
  cargarProducciones();
  loadView("produccion");
}

/* =========================================================
   LISTA / UI DE ÓRDENES
========================================================= */
function cargarProducciones() {
  normalizeProducciones();
  const db = getDB();
  const list = (db.producciones || []).slice().reverse().slice(0, 60);

  const html = list.map(p => {
    // ✅ MEMOS (se muestran dentro del sitio)
    const memosHtml = (Array.isArray(p.memos) && p.memos.length)
  ? `
    <div class="produccion-memos" style="margin-top:14px;padding:14px;border:1px dashed rgba(249,115,22,.35);border-radius:12px;background:rgba(249,115,22,.05);">
      <div style="font-weight:800;margin-bottom:10px;font-size:16px;color:#f97316;">
        📝 Memos del lote
      </div>
      ${p.memos.slice().reverse().map(m => `
        <div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.08);font-size:15px;line-height:1.6;">
          <div style="font-weight:800;">
            ${escapeHtml(m.usuario || "")}
            <span style="font-weight:400;opacity:.7;">
              • ${escapeHtml(new Date(m.ts || Date.now()).toLocaleString())}
            </span>
          </div>
          <div style="margin-top:6px;">
            ${escapeHtml(m.texto || "")}
          </div>
        </div>
      `).join("")}
    </div>
  `
  : "";

    const fecha = p.ts ? new Date(p.ts).toLocaleString() : "—";
    const esperado = Number(p.esperado || 0);
    const real = (p.real == null) ? null : Number(p.real || 0);

    const statusPill =
      p.status === "EN_PROCESO"
        ? `<span class="tag yellow small">EN_PROCESO</span>`
        : (p.status === "FINALIZADA"
          ? `<span class="${cssSemaforo(p.statusSem)}">${p.statusSem}</span>`
          : `<span class="muted small">${escapeHtml(p.status || "—")}</span>`);

    const diffTxt = (p.status === "FINALIZADA")
      ? `<div class="muted small" style="margin-top:6px;">Diferencia (Real - Esperado): <b>${Number(p.diff || 0)}</b></div>`
      : ``;

    return `
      <div class="panel" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:900;">
              ${escapeHtml(p.recetaNombre || "—")}
              <span class="muted small">— ${escapeHtml(p.productoFinal || "")}</span>
            </div>
            <div class="muted small">
              ${escapeHtml(fecha)} • PRD: <b>${escapeHtml(p.id)}</b> • Lote: <b class="produccion-lote">${escapeHtml(p.lote || "—")}</b>
            </div>
            ${p.comentario ? `<div class="muted small" style="margin-top:6px;">Obs: ${escapeHtml(p.comentario)}</div>` : ``}
          </div>

          <div style="text-align:right;min-width:260px;">
            <div>Esperado: <b>${esperado} ${escapeHtml(p.unidad || "")}</b></div>
            <div>Real: <b>${real == null ? "—" : (real + " " + escapeHtml(p.unidad || ""))}</b></div>
            <div style="margin-top:8px;">${statusPill}</div>
            ${diffTxt}
          </div>
        </div>

        ${p.status === "EN_PROCESO" ? `
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <input type="number"
                   step="1"
                   class="real-input"
                   data-orden="${escapeHtml(p.id)}"
                   placeholder="Cantidad real obtenida"
                   style="width:220px;">
            <button class="btn" onclick="finalizarProduccion('${escapeHtml(p.id)}')">✅ Finalizar</button>
            <button class="btn danger" onclick="cancelarOrden('${escapeHtml(p.id)}')">✖ Cancelar</button>
            <button class="btn secondary" onclick="agregarMemoProduccion('${escapeHtml(p.id)}')">📝 Memo</button>
          </div>
          <div class="muted small" style="margin-top:8px;">
            * Al finalizar: si Real = Esperado → VERDE. Si es mayor o menor → ROJO.
          </div>
        ` : `
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button class="btn secondary sm" onclick="agregarMemoProduccion('${escapeHtml(p.id)}')">📝 Memo</button>
          </div>
        `}

        ${memosHtml}
      </div>
    `;
  }).join("");

  const box = document.getElementById("produccionesList");
  if (box) box.innerHTML = html || `<div class="muted">Sin órdenes registradas</div>`;
  poblarListadosProduccion();
}
function confirmarGenerarOrden(){
  openConfirmProduccionModal(() => {
    // generarOrdenProduccion es síncrona, pero la envolvemos igual
    generarOrdenProduccion();
  });
}
function _parseYmdToTs(ymd, endOfDay=false){
  if(!ymd) return null;
  const [y,m,d] = ymd.split("-").map(Number);
  if(!y||!m||!d) return null;
  return endOfDay
    ? new Date(y, m-1, d, 23,59,59,999).getTime()
    : new Date(y, m-1, d, 0,0,0,0).getTime();
}

function _getFiltrosUI(){
  const desde = document.getElementById("fDesde")?.value || "";
  const hasta = document.getElementById("fHasta")?.value || "";
  const producto = (document.getElementById("fProducto")?.value || "").trim().toUpperCase();
  const lote = (document.getElementById("fLote")?.value || "").trim().toUpperCase();
  return { desde, hasta, producto, lote };
}

function getProduccionesFiltradas(){
  normalizeProducciones();
  const db = getDB();
  const all = (db.producciones || []).slice();

  const { desde, hasta, producto, lote } = _getFiltrosUI();
  const tsDesde = _parseYmdToTs(desde, false);
  const tsHasta = _parseYmdToTs(hasta, true);

  return all.filter(p => {
    const ts = Number(p.ts || 0);

    if(tsDesde != null && ts < tsDesde) return false;
    if(tsHasta != null && ts > tsHasta) return false;

    const prodTxt = String(p.productoFinal || p.recetaNombre || "").toUpperCase();
    const loteTxt = String(p.lote || "").toUpperCase();

    if(producto && !prodTxt.includes(producto)) return false;
    if(lote && !loteTxt.includes(lote)) return false;

    return true;
  }).sort((a,b)=> (a.ts||0) - (b.ts||0));
}

function aplicarFiltroProduccion(){
  // Re-render con los mismos cards pero filtrados
  renderProduccionesFiltradasEnLista();
  showProduccionActualizadaModal?.(); // tu modal animado si existe
}

function limpiarFiltroProduccion(){
  const ids = ["fDesde","fHasta","fProducto","fLote"];
  ids.forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });
  cargarProducciones();
  showProduccionActualizadaModal?.();
}

function renderProduccionesFiltradasEnLista(){
  const list = getProduccionesFiltradas().slice().reverse().slice(0, 200); // tope visual
  // Reusa tu misma lógica: temporalmente sustituye db.producciones -> list y llama cargarProducciones “manual”
  // Para no tocar tu lógica existente, hacemos un render directo copiando tu código:
  const box = document.getElementById("produccionesList");
  if(!box){ cargarProducciones(); return; }

  const html = list.map(p => {
    const fecha = p.ts ? new Date(p.ts).toLocaleString() : "—";
    const esperado = Number(p.esperado || 0);
    const real = (p.real == null) ? null : Number(p.real || 0);

    const statusPill =
      p.status === "EN_PROCESO"
        ? `<span class="tag yellow small">EN_PROCESO</span>`
        : (p.status === "FINALIZADA"
          ? `<span class="${cssSemaforo(p.statusSem)}">${p.statusSem}</span>`
          : `<span class="muted small">${escapeHtml(p.status || "—")}</span>`);

    const diffTxt = (p.status === "FINALIZADA")
      ? `<div class="muted small" style="margin-top:6px;">Diferencia (Real - Esperado): <b>${Number(p.diff || 0)}</b></div>`
      : ``;

    const memosHtml = (Array.isArray(p.memos) && p.memos.length)
      ? `
        <div class="produccion-memos" style="margin-top:14px;padding:14px;border:1px dashed rgba(249,115,22,.35);border-radius:12px;background:rgba(249,115,22,.05);">
          <div style="font-weight:800;margin-bottom:10px;font-size:16px;color:#f97316;">📝 Memos del lote</div>
          ${p.memos.slice().reverse().map(m => `
            <div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.08);font-size:15px;line-height:1.6;">
              <div style="font-weight:800;">
                ${escapeHtml(m.usuario || "")}
                <span style="font-weight:400;opacity:.7;"> • ${escapeHtml(new Date(m.ts || Date.now()).toLocaleString())}</span>
              </div>
              <div style="margin-top:6px;">${escapeHtml(m.texto || "")}</div>
            </div>
          `).join("")}
        </div>
      `
      : "";

    return `
      <div class="panel" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:900;">
              ${escapeHtml(p.recetaNombre || "—")}
              <span class="muted small">— ${escapeHtml(p.productoFinal || "")}</span>
            </div>
            <div class="muted small">
              ${escapeHtml(fecha)} • PRD: <b>${escapeHtml(p.id)}</b> • Lote: <b class="produccion-lote">${escapeHtml(p.lote || "—")}</b>
            </div>
          </div>

          <div style="text-align:right;min-width:260px;">
            <div>Esperado: <b>${esperado} ${escapeHtml(p.unidad || "")}</b></div>
            <div>Real: <b>${real == null ? "—" : (real + " " + escapeHtml(p.unidad || ""))}</b></div>
            <div style="margin-top:8px;">${statusPill}</div>
            ${diffTxt}
          </div>
        </div>

        ${p.status === "EN_PROCESO" ? `
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <input type="number" step="1" class="real-input" data-orden="${escapeHtml(p.id)}"
              placeholder="Cantidad real obtenida" style="width:220px;">
            <button class="btn" onclick="finalizarProduccion('${escapeHtml(p.id)}')">✅ Finalizar</button>
            <button class="btn danger" onclick="cancelarOrden('${escapeHtml(p.id)}')">✖ Cancelar</button>
            <button class="btn secondary" onclick="agregarMemoProduccion('${escapeHtml(p.id)}')">📝 Memo</button>
          </div>
        ` : `
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button class="btn secondary sm" onclick="agregarMemoProduccion('${escapeHtml(p.id)}')">📝 Memo</button>
          </div>
        `}

        ${memosHtml}
      </div>
    `;
  }).join("");

  box.innerHTML = html || `<div class="muted">Sin órdenes en este filtro</div>`;
}

function exportarProduccionPDF(){
  const list = getProduccionesFiltradas();
  const { desde, hasta, producto, lote } = _getFiltrosUI();

  // Totales
  const tot = list.reduce((acc, p) => {
    acc.count++;
    acc.esperado += Number(p.esperado||0);
    acc.real += Number(p.real||0);
    acc.diff += Number(p.diff||0);
    return acc;
  }, {count:0, esperado:0, real:0, diff:0});

  const win = window.open("", "", "width=1100,height=800");
  if(!win){ alert("Pop-up bloqueado. Permite ventanas emergentes para exportar PDF."); return; }

  const rows = list.map(p => {
    const fecha = p.ts ? new Date(p.ts).toLocaleString() : "";
    const memos = (Array.isArray(p.memos) && p.memos.length)
      ? p.memos.map(m => `${m.usuario||""}: ${m.texto||""}`).join(" | ")
      : "";

    return `
      <tr>
        <td>${escapeHtml(fecha)}</td>
        <td>${escapeHtml(p.productoFinal || p.recetaNombre || "")}</td>
        <td>${escapeHtml(p.id || "")}</td>
        <td><b>${escapeHtml(p.lote || "")}</b></td>
        <td>${escapeHtml(p.status || "")}</td>
        <td style="text-align:right;">${Number(p.esperado||0)} ${escapeHtml(p.unidad||"")}</td>
        <td style="text-align:right;">${p.real==null ? "—" : (Number(p.real||0)+" "+escapeHtml(p.unidad||""))}</td>
        <td style="text-align:right;">${p.real==null ? "—" : Number(p.diff||0)}</td>
        <td style="font-size:11px;">${escapeHtml(memos)}</td>
      </tr>
    `;
  }).join("");

  const filtrosTxt = `
    ${desde ? `Desde: ${escapeHtml(desde)}` : `Desde: —`} •
    ${hasta ? `Hasta: ${escapeHtml(hasta)}` : `Hasta: —`} •
    Producto: ${escapeHtml(producto || "—")} •
    Lote: ${escapeHtml(lote || "—")}
  `;

  win.document.open();
  win.document.write(`
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Reporte de Producción</title>
      <style>
        @page { size: letter; margin: 0.6in; }
        body { font-family: Arial, sans-serif; color:#111; }
        .head{ display:flex; align-items:center; gap:14px; margin-bottom:14px; }
        .logo{ width:64px; height:64px; object-fit:contain; }
        h1{ margin:0; font-size:18px; }
        .sub{ font-size:12px; color:#444; margin-top:4px; }
        .meta{ margin: 10px 0 16px; font-size:12px; color:#333; }
        table{ width:100%; border-collapse:collapse; font-size:12px; }
        th, td{ border:1px solid #ddd; padding:6px; vertical-align:top; }
        th{ background:#f3f3f3; text-align:left; }
        .tot{ margin-top:12px; font-size:12px; }
        .tot b{ font-size:13px; }
      </style>
    </head>
    <body>
      <div class="head">
        <img class="logo" src="assets/MARCK1.png" onerror="this.style.display='none'">
        <div>
          <h1>Reporte de Producción</h1>
          <div class="sub">Rendimientos y memos por orden • Exportación PDF (Carta)</div>
        </div>
      </div>

      <div class="meta">
        ${filtrosTxt}
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>PRD</th>
            <th>Lote</th>
            <th>Estado</th>
            <th>Esperado</th>
            <th>Real</th>
            <th>Diferencia</th>
            <th>Memos</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="9">Sin datos con este filtro.</td></tr>`}
        </tbody>
      </table>

      <div class="tot">
        <b>Totales:</b>
        Órdenes: <b>${tot.count}</b> •
        Esperado: <b>${tot.esperado}</b> •
        Real: <b>${tot.real}</b> •
        Diferencia: <b>${tot.diff}</b>
      </div>

      <div style="margin-top:18px; font-size:11px; color:#555;">
        © 2026 Marck Business. Todos los derechos reservados.
      </div>

      <script>
        window.onload = () => {
          window.focus();
          window.print();   // el usuario elige “Guardar como PDF”
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
}
/* =========================================================
   FINALIZAR (imprime etiquetas)
========================================================= */
function finalizarProduccion(ordenId) {
  normalizeProducciones();
  const db = getDB();

  db.producciones = db.producciones || [];
  const idx = db.producciones.findIndex(x => x.id === ordenId);
  if (idx === -1) { alert("Orden no encontrada"); return; }

  const orden = db.producciones[idx];

  if (orden.status !== "EN_PROCESO") {
    alert("Esta orden ya está finalizada.");
    return;
  }

  const inp = document.querySelector(`input.real-input[data-orden="${CSS.escape(ordenId)}"]`);
  const real = Number(inp?.value || 0);
  if (!real || real <= 0) { alert("Ingresa la cantidad real obtenida."); return; }

  const esperado = Number(orden.esperado || 0);
  const diff = real - esperado;
  const statusSem = (real === esperado) ? "VERDE" : "ROJO";

  const costoDirecto = Number(orden.costoDirectoEstimado || 0);
  const costoIndirecto = Number(orden.costoIndirectoEstimado || 0);
  const costoTotal = costoDirecto + costoIndirecto;
  const costoUnitario = real > 0 ? (costoTotal / real) : 0;

  orden.real = real;
  orden.diff = diff;
  orden.status = "FINALIZADA";
  orden.statusSem = statusSem;
  orden.finalizadoPor = getUserName();
  orden.finalTs = Date.now();
  orden.costoDirectoReal = costoDirecto;
  orden.costoIndirectoReal = costoIndirecto;
  orden.costoTotalReal = costoTotal;
  orden.costoUnitarioReal = costoUnitario;

  db.inventarioPT = db.inventarioPT || [];
  db.inventarioPT.push({
    producto: orden.productoFinal,
    cantidad: real,
    lote: orden.lote,
    fecha: new Date().toLocaleDateString(),
    fechaISO: new Date().toISOString(),
    ts: Date.now(),
    costoDirecto: costoDirecto,
    costoIndirecto: costoIndirecto,
    costoTotal: costoTotal,
    costoUnitario: costoUnitario,
    precioVenta: Number(orden.precioVentaUnitario || 0)
  });

  db.variacionesRend = db.variacionesRend || [];
  db.variacionesRend.push({
    fechaISO: new Date().toISOString(),
    usuario: getUserName(),
    recetaNombre: orden.recetaNombre,
    productoFinal: orden.productoFinal,
    lote: orden.lote,
    esperado,
    real,
    diff,
    status: statusSem,
    comentario: orden.comentario || "",
    costoDirecto: costoDirecto,
    costoIndirecto: costoIndirecto,
    costoTotal: costoTotal,
    costoUnitario: costoUnitario
  });

  saveDB(db);

  try {
    if (typeof imprimirEtiquetas2x4 === "function") {
      imprimirEtiquetas2x4({
        producto: orden.productoFinal,
        lote: orden.lote,
        fechaISO: new Date().toISOString(),
        cantidad: real
      });
    } else if (typeof imprimirEtiquetasProducto === "function") {
      imprimirEtiquetasProducto(orden.productoFinal, orden.lote, real);
    } else if (typeof imprimirEtiqueta === "function") {
      imprimirEtiqueta(orden.productoFinal, orden.lote, real);
    } else {
      console.warn("No se encontró función de impresión de etiquetas.");
    }
  } catch (e) {
    console.warn("No se pudo imprimir etiquetas:", e);
  }

  cargarProducciones();
  loadView("inventarioPT");
}

/* =========================================================
   CANCELAR ORDEN (revierte MP)
========================================================= */
async function cancelarOrden(ordenId) {
  normalizeProducciones();
  const db = getDB();

  const idx = (db.producciones || []).findIndex(x => x.id === ordenId);
  if (idx === -1) { alert("Orden no encontrada"); return; }

  const orden = db.producciones[idx];

  if (orden.status !== "EN_PROCESO") {
    alert("Solo puedes cancelar órdenes EN_PROCESO.");
    return;
  }

  const ok = await mbConfirm("¿Cancelar la orden y revertir la materia prima descontada?", "Cancelar orden");
  if (!ok) return;

  for (const c of (orden.consumosMP || [])) {
    const mp = (db.materiasPrimas || []).find(m => m.id === c.mpId);
    if (mp) {
      mp.stockBase = Number(mp.stockBase ?? mp.stock ?? 0) + Number(c.cantidadBase || 0);
      mp.stock = Number(mp.stockBase || 0);
    }
  }

  db.producciones.splice(idx, 1);
  saveDB(db);

  cargarProducciones();
  loadView("produccion");
}