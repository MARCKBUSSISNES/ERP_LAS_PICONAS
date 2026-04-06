// js/inventario.js
function _ptRowId(producto, idx){
  return "ptrow_" + String(idx) + "_" + String(producto || "").replace(/[^a-zA-Z0-9]+/g, "_");
}

function _formatQtyPT(n){
  var v = Number(n || 0);
  if (!isFinite(v)) v = 0;
  return (Math.round(v * 100) % 100 === 0) ? String(Math.round(v)) : v.toFixed(2);
}

var _editInventarioPTTarget = null;

function _formatDateTimeLocalInv(value){
  var d = value instanceof Date ? value : new Date(value || Date.now());
  if (isNaN(d.getTime())) d = new Date();
  var pad = function(n){ return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes());
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
          ${isAdmin() ? `
            <div class="right" style="display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;">
              <button class="btn sm" type="button" onclick="event.stopPropagation();openEditarInventarioPTLoteModal('${encodeURIComponent(String(p.producto || ""))}','${encodeURIComponent(String(l.lote || ""))}')">✏️ Editar</button>
              <button class="btn danger sm" type="button" onclick="event.stopPropagation();deleteInventarioPTLoteAdmin('${escapeHtml(String(p.producto || ""))}','${escapeHtml(String(l.lote || ""))}')">🗑 Borrar lote</button>
            </div>
          ` : ``}
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

    <div id="editInventarioPTModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center;padding:18px;">
      <div class="panel" style="width:min(560px,100%);margin:0 auto;">
        <h3>Editar lote de inventario PT</h3>
        <div id="editInventarioPTMeta" class="muted small" style="margin-bottom:10px;"></div>

        <div class="row">
          <div>
            <label>Lote</label>
            <input id="editInventarioPTLote" placeholder="Lote">
          </div>
          <div>
            <label>Cantidad</label>
            <input id="editInventarioPTCantidad" type="number" min="0.01" step="0.01" placeholder="0">
          </div>
        </div>

        <div class="row">
          <div>
            <label>Fecha de referencia</label>
            <input id="editInventarioPTFechaRef" type="datetime-local" readonly>
          </div>
        </div>

        <div id="editInventarioPTMsg" class="muted small" style="margin:8px 0 14px 0;"></div>

        <div class="actions" style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn" type="button" onclick="closeEditarInventarioPTLoteModal()">Cancelar</button>
          <button class="btn accent" type="button" onclick="saveEditarInventarioPTLoteModal()">Guardar cambios</button>
        </div>
      </div>
    </div>
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
  var fechaTxt = fecha.toLocaleString("es-GT");
  var totalProductos = items.length;
  var totalUnidades = items.reduce(function(acc, it){ return acc + Number(it.cantidad || 0); }, 0);
  var LOGO_CACHE_KEY = "INV_PDF_LOGO1_DATAURL_V1";

  function ensureScript(src){
    return new Promise(function(resolve, reject){
      var existing = document.querySelector('script[data-src="' + src + '"]');
      if(existing){
        if(existing.getAttribute("data-loaded") === "1"){
          resolve();
          return;
        }
        existing.addEventListener("load", function(){ resolve(); }, { once:true });
        existing.addEventListener("error", function(){ reject(new Error("No se pudo cargar " + src)); }, { once:true });
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.setAttribute("data-src", src);
      s.onload = function(){ s.setAttribute("data-loaded", "1"); resolve(); };
      s.onerror = function(){ reject(new Error("No se pudo cargar " + src)); };
      document.head.appendChild(s);
    });
  }

  function pad2(n){
    return String(n).padStart(2, "0");
  }

  function nombreArchivoPDF(d){
    return "INVENTARIO-" + pad2(d.getDate()) + "-" + pad2(d.getMonth() + 1) + "-" + d.getFullYear() + ".pdf";
  }

  function clipText(doc, txt, maxW){
    txt = String(txt == null ? "" : txt);
    if(doc.getTextWidth(txt) <= maxW) return txt;
    while(txt.length > 3 && doc.getTextWidth(txt + "...") > maxW){
      txt = txt.slice(0, -1);
    }
    return txt + "...";
  }

  function drawText(doc, txt, x, y, opts){
    opts = opts || {};
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 10);
    var c = opts.color || [255,255,255];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(String(txt == null ? "" : txt), x, y, {
      align: opts.align || "left",
      baseline: opts.baseline || "alphabetic"
    });
  }

  function fileToDataURL(file){
    return new Promise(function(resolve, reject){
      try{
        var fr = new FileReader();
        fr.onload = function(){ resolve(fr.result); };
        fr.onerror = function(){ reject(fr.error || new Error("No se pudo leer el archivo.")); };
        fr.readAsDataURL(file);
      }catch(err){
        reject(err);
      }
    });
  }

  function promptLogoUpload(){
    return new Promise(function(resolve){
      var inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/png,image/jpeg,image/webp,image/*";
      inp.style.position = "fixed";
      inp.style.left = "-99999px";
      document.body.appendChild(inp);

      inp.addEventListener("change", async function(){
        try{
          var f = inp.files && inp.files[0];
          if(!f){ resolve(null); return; }
          var data = await fileToDataURL(f);
          try{ localStorage.setItem(LOGO_CACHE_KEY, data); }catch(_e){}
          resolve(data);
        }catch(_e){
          resolve(null);
        }finally{
          inp.remove();
        }
      }, { once:true });

      inp.click();
    });
  }

  function imageToDataURL(img){
    try{
      var c = document.createElement("canvas");
      c.width = img.naturalWidth || img.width || 1;
      c.height = img.naturalHeight || img.height || 1;
      var ctx = c.getContext("2d");
      if(!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return c.toDataURL("image/png");
    }catch(_e){
      return null;
    }
  }

  async function obtenerLogoTicketDataURL(){
    try{
      var cached = localStorage.getItem(LOGO_CACHE_KEY);
      if(cached && String(cached).startsWith("data:image")) return cached;
    }catch(_e){}

    try{
      var exact = Array.from(document.images || []).find(function(img){
        var s = String(img.currentSrc || img.src || "");
        return (s.indexOf("assets/LOGO1.png") >= 0 || /LOGO1\.png$/i.test(s)) && (img.complete || img.naturalWidth > 0);
      });
      if(exact){
        var d1 = imageToDataURL(exact);
        if(d1){
          try{ localStorage.setItem(LOGO_CACHE_KEY, d1); }catch(_e){}
          return d1;
        }
      }
    }catch(_e){}

    if(location.protocol !== "file:"){
      try{
        var img = new Image();
        img.crossOrigin = "anonymous";
        var loaded = await new Promise(function(resolve){
          img.onload = function(){ resolve(true); };
          img.onerror = function(){ resolve(false); };
          img.src = "assets/LOGO1.png";
        });
        if(loaded){
          var d2 = imageToDataURL(img);
          if(d2){
            try{ localStorage.setItem(LOGO_CACHE_KEY, d2); }catch(_e){}
            return d2;
          }
        }
      }catch(_e){}
    }

    return await promptLogoUpload();
  }

  Promise.resolve()
    .then(function(){
      return ensureScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
    })
    .then(function(){
      var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
      if(!jsPDFCtor) throw new Error("jsPDF no está disponible.");
      return Promise.all([Promise.resolve(jsPDFCtor), obtenerLogoTicketDataURL()]);
    })
    .then(function(values){
      var jsPDFCtor = values[0];
      var logoDataUrl = values[1];

      var doc = new jsPDFCtor("p", "pt", "a4");
      var pageW = doc.internal.pageSize.getWidth();
      var pageH = doc.internal.pageSize.getHeight();

      var BG = [15, 23, 42];
      var PANEL = [17, 24, 39];
      var PANEL_2 = [11, 18, 32];
      var ORANGE = [249, 115, 22];
      var TEXT = [255, 255, 255];
      var MUTED = [148, 163, 184];

      var margin = 26;
      var usableW = pageW - margin * 2;
      var y = margin;

      function drawPageBackground(){
        doc.setFillColor(BG[0], BG[1], BG[2]);
        doc.rect(0, 0, pageW, pageH, "F");
      }

      function drawFooter(){
        doc.setDrawColor(55, 65, 81);
        doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
        drawText(doc, "Las Piconas • Inventario consolidado de producto terminado", margin, pageH - 20, { size:9, color:MUTED });
        drawText(doc, "Marck Business © 2026", pageW - margin, pageH - 20, { size:9, color:MUTED, align:"right" });
      }

      function drawHeader(){
        doc.setFillColor(PANEL[0], PANEL[1], PANEL[2]);
        doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.roundedRect(margin, y, usableW, 94, 16, 16, "FD");

        doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.roundedRect(margin + 14, y + 16, 6, 62, 3, 3, "F");

        if(logoDataUrl){
          try{
            doc.addImage(logoDataUrl, "PNG", margin + 28, y + 18, 58, 58);
          }catch(err){
            console.warn("No se pudo insertar el logo en el PDF:", err);
          }
        }

        drawText(doc, "INVENTARIO PT", margin + 100, y + 33, { size:22, bold:true, color:TEXT });
        drawText(doc, "Reporte general de producto terminado", margin + 100, y + 54, { size:11, color:MUTED });
        drawText(doc, "Fecha: " + fechaTxt, pageW - margin - 16, y + 31, { size:11, bold:true, color:TEXT, align:"right" });
        drawText(doc, "Generado por: " + generadoPor, pageW - margin - 16, y + 52, { size:11, color:MUTED, align:"right" });
        y += 110;
      }

      function drawKpi(x, label, value, sub){
        doc.setFillColor(PANEL[0], PANEL[1], PANEL[2]);
        doc.setDrawColor(55, 65, 81);
        doc.roundedRect(x, y, kpiW, 68, 12, 12, "FD");
        drawText(doc, label, x + 12, y + 18, { size:9, bold:true, color:MUTED });
        drawText(doc, value, x + 12, y + 43, { size:18, bold:true, color:ORANGE });
        if(sub){
          drawText(doc, sub, x + 12, y + 57, { size:8, color:MUTED });
        }
      }

      function drawTableHeader(){
        doc.setFillColor(PANEL_2[0], PANEL_2[1], PANEL_2[2]);
        doc.roundedRect(margin, y, usableW, 26, 8, 8, "F");
        var x = margin;
        cols.forEach(function(c){
          if(c.align === "right"){
            drawText(doc, c.title, x + c.w - 8, y + 17, { size:9, bold:true, color:MUTED, align:"right" });
          }else if(c.align === "center"){
            drawText(doc, c.title, x + c.w / 2, y + 17, { size:9, bold:true, color:MUTED, align:"center" });
          }else{
            drawText(doc, c.title, x + 8, y + 17, { size:9, bold:true, color:MUTED });
          }
          x += c.w;
        });
        y += 30;
      }

      function newPage(){
        drawFooter();
        doc.addPage();
        drawPageBackground();
        y = margin;
        drawHeader();
        drawTableHeader();
      }

      drawPageBackground();
      drawHeader();

      var gap = 10;
      var kpiW = (usableW - gap * 2) / 3;
      drawKpi(margin, "PRODUCTOS", String(totalProductos), "");
      drawKpi(margin + kpiW + gap, "UNIDADES TOTALES", _formatQtyPT(totalUnidades), "");
      drawKpi(margin + (kpiW + gap) * 2, "VISTA", "Sin lotes", "solo totales por producto");
      y += 82;

      var cols = [
        { key:"n", title:"#", w:34, align:"center" },
        { key:"producto", title:"PRODUCTO", w:390, align:"left" },
        { key:"cantidad", title:"TOTAL", w:96, align:"right" }
      ];

      drawTableHeader();

      if(!items.length){
        drawText(doc, "Sin inventario PT", margin + 8, y + 14, { size:10, color:MUTED });
        y += 24;
      }else{
        items.forEach(function(p, idx){
          if(y + 24 > pageH - 56){
            newPage();
          }

          if(idx % 2 === 0){
            doc.setFillColor(PANEL[0], PANEL[1], PANEL[2]);
            doc.roundedRect(margin, y - 2, usableW, 22, 6, 6, "F");
          }

          var x = margin;
          drawText(doc, String(idx + 1), x + cols[0].w / 2, y + 12, { size:10, color:TEXT, align:"center" });
          x += cols[0].w;

          var prodTxt = clipText(doc, String(p.producto || ""), cols[1].w - 12);
          drawText(doc, prodTxt, x + 8, y + 12, { size:10, bold:true, color:ORANGE });
          x += cols[1].w;

          drawText(doc, _formatQtyPT(p.cantidad || 0), x + cols[2].w - 8, y + 12, { size:10, bold:true, color:TEXT, align:"right" });

          doc.setDrawColor(31, 41, 55);
          doc.line(margin, y + 20, pageW - margin, y + 20);
          y += 24;
        });
      }

      drawFooter();
      doc.save(nombreArchivoPDF(fecha));
    })
    .catch(function(err){
      console.error(err);
      alert("No se pudo descargar el PDF del inventario.");
    });
}


function _parseLoteMetaPT(lote){
  const txt = String(lote || "").trim().toUpperCase();
  const m = txt.match(/^LP-(\d{8})-(\d+)$/);
  if(!m) return null;
  return { fechaYmd: m[1], numero: Number(m[2] || 0) };
}

async function deleteInventarioPTLoteAdmin(producto, lote){
  if(!isAdmin()){
    alert("Solo ADMIN puede borrar lotes de inventario PT.");
    return;
  }

  const productoTxt = String(producto || "").trim();
  const loteTxt = String(lote || "").trim();
  if(!productoTxt || !loteTxt){
    alert("Producto o lote inválido.");
    return;
  }

  const ok = await mbConfirm(`¿Borrar el lote ${loteTxt} de ${productoTxt}?

Se eliminará del inventario PT y se ajustará el correlativo para poder reutilizar ese lote si corresponde.`, "Borrar lote de inventario PT");
  if(!ok) return;

  const db = getDB();
  db.inventarioPT = db.inventarioPT || [];
  db.producciones = db.producciones || [];

  const before = db.inventarioPT.length;
  db.inventarioPT = db.inventarioPT.filter(function(it){
    return !(String(it?.producto || "") === productoTxt && String(it?.lote || "") === loteTxt);
  });

  if (db.inventarioPT.length === before) {
    alert("No se encontró ese lote en inventario PT.");
    return;
  }

  for (const ord of (db.producciones || [])) {
    if (String(ord?.productoFinal || "") === productoTxt && String(ord?.lote || "") === loteTxt) {
      ord.omitirEnCorrelativoLote = true;
      ord.inventarioEliminadoAdmin = true;
      ord.inventarioEliminadoAdminTs = Date.now();
      ord.inventarioEliminadoAdminPor = (typeof getUserName === "function") ? getUserName() : "ADMIN";
    }
  }

  const meta = _parseLoteMetaPT(loteTxt);
  if (meta && typeof _rebuildCorrelativoPorProducto === "function") {
    _rebuildCorrelativoPorProducto(db, "LP", productoTxt, meta.fechaYmd);
  }

  saveDB(db);
  loadView("inventarioPT");
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


function openEditarInventarioPTLoteModal(productoEnc, loteEnc){
  if(!isAdmin()){
    alert("Solo ADMIN puede editar lotes de inventario PT.");
    return;
  }

  var producto = decodeURIComponent(String(productoEnc || ""));
  var lote = decodeURIComponent(String(loteEnc || ""));

  var db = getDB();
  db.inventarioPT = db.inventarioPT || [];

  var item = db.inventarioPT.find(function(it){
    return String(it?.producto || "") === producto && String(it?.lote || "") === lote;
  });

  if(!item){
    alert("No se encontró el lote a editar.");
    return;
  }

  _editInventarioPTTarget = {
    producto: producto,
    lote: lote
  };

  var modal = document.getElementById("editInventarioPTModal");
  var meta = document.getElementById("editInventarioPTMeta");
  var inpLote = document.getElementById("editInventarioPTLote");
  var inpCantidad = document.getElementById("editInventarioPTCantidad");
  var inpFechaRef = document.getElementById("editInventarioPTFechaRef");
  var msg = document.getElementById("editInventarioPTMsg");

  if(!modal || !meta || !inpLote || !inpCantidad || !inpFechaRef || !msg){
    alert("No se encontró el modal de edición.");
    return;
  }

  meta.textContent = producto + " • Lote actual: " + lote;
  inpLote.value = String(item.lote || "");
  inpCantidad.value = Number(item.cantidad || 0);
  inpFechaRef.value = _formatDateTimeLocalInv(item.fechaISO || item.fecha || item.ts || Date.now());
  msg.textContent = "";

  modal.style.display = "flex";
}

function closeEditarInventarioPTLoteModal(){
  var modal = document.getElementById("editInventarioPTModal");
  if(modal) modal.style.display = "none";
  _editInventarioPTTarget = null;
}

async function saveEditarInventarioPTLoteModal(){
  if(!isAdmin()){
    alert("Solo ADMIN puede editar lotes de inventario PT.");
    return;
  }

  if(!_editInventarioPTTarget){
    alert("No hay lote seleccionado.");
    return;
  }

  var nuevoLote = String(document.getElementById("editInventarioPTLote")?.value || "").trim();
  var nuevaCantidad = Number(document.getElementById("editInventarioPTCantidad")?.value || 0);
  var msg = document.getElementById("editInventarioPTMsg");

  if(!nuevoLote){
    if(msg) msg.textContent = "Ingresa el lote.";
    return;
  }
  if(!nuevaCantidad || nuevaCantidad <= 0){
    if(msg) msg.textContent = "La cantidad debe ser mayor a 0.";
    return;
  }

  var db = getDB();
  db.inventarioPT = db.inventarioPT || [];

  var idx = db.inventarioPT.findIndex(function(it){
    return String(it?.producto || "") === String(_editInventarioPTTarget.producto || "") &&
           String(it?.lote || "") === String(_editInventarioPTTarget.lote || "");
  });

  if(idx === -1){
    if(msg) msg.textContent = "No se encontró el lote.";
    return;
  }

  var duplicado = db.inventarioPT.some(function(it, i){
    if(i === idx) return false;
    return String(it?.producto || "").trim().toLowerCase() === String(_editInventarioPTTarget.producto || "").trim().toLowerCase() &&
           String(it?.lote || "").trim().toLowerCase() === nuevoLote.trim().toLowerCase();
  });

  if(duplicado){
    if(msg) msg.textContent = "Ya existe otro lote con ese nombre para este producto.";
    return;
  }

  var item = db.inventarioPT[idx];
  var loteAnterior = String(item.lote || "");
  var cantidadAnterior = Number(item.cantidad || 0);

  item.lote = nuevoLote;
  item.cantidad = nuevaCantidad;
  if(Number(item.costoUnitario || 0) > 0){
    item.costoTotal = Number(item.costoUnitario || 0) * nuevaCantidad;
  }

  item.editadoAdminTs = Date.now();
  item.editadoAdminPor = (typeof getUserName === "function") ? getUserName() : "ADMIN";
  item.historialEdicionesAdmin = Array.isArray(item.historialEdicionesAdmin) ? item.historialEdicionesAdmin : [];
  item.historialEdicionesAdmin.push({
    ts: Date.now(),
    usuario: (typeof getUserName === "function") ? getUserName() : "ADMIN",
    loteAnterior: loteAnterior,
    loteNuevo: nuevoLote,
    cantidadAnterior: cantidadAnterior,
    cantidadNueva: nuevaCantidad
  });

  var metaAnterior = _parseLoteMetaPT(loteAnterior);
  var metaNueva = _parseLoteMetaPT(nuevoLote);
  if (typeof _rebuildCorrelativoPorProducto === "function") {
    if (metaAnterior) _rebuildCorrelativoPorProducto(db, "LP", String(item.producto || ""), metaAnterior.fechaYmd);
    if (metaNueva) _rebuildCorrelativoPorProducto(db, "LP", String(item.producto || ""), metaNueva.fechaYmd);
  }

  saveDB(db);
  closeEditarInventarioPTLoteModal();
  loadView("inventarioPT");
}
