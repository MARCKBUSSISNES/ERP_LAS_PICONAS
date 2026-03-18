// js/tickets.js
console.log("[tickets.js] cargado OK");

// Formateo de dinero
function money(n){
    var v = Number(n || 0);
    return "Q" + v.toFixed(2);
}

// Escape básico HTML
function escapeHtml(str){
    if(!str) return "";
    return String(str)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

// Función global para imprimir ticket de envío
window.imprimirTicketEnvio = function(envio){

    var fecha = new Date(envio.fechaISO || Date.now());
    var fechaStr = fecha.toLocaleDateString();
    var horaStr = fecha.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

    var rows = "";
    for(var i = 0; i < (envio.items || []).length; i++){
        var it = envio.items[i];

        rows += `
            <tr>
                <td class="prod">
                    <div class="prod-name">${escapeHtml(it.producto || "")}</div>
                    <div class="prod-sub">${Number(it.cantidad || 0)} x ${money(it.precio || 0)}</div>
                </td>
                <td class="right total-line">${money(it.subtotal || 0)}</td>
            </tr>
        `;
    }

    var lotesRows = "";
    if(envio.itemsLotes && envio.itemsLotes.length){
        for(var j = 0; j < envio.itemsLotes.length; j++){
            var l = envio.itemsLotes[j];
            lotesRows += `
                <tr>
                    <td class="left">${escapeHtml(l.producto || "")}</td>
                    <td class="center">${escapeHtml(l.lote || "")}</td>
                    <td class="right">${Number(l.cantidad || 0)}</td>
                </tr>
            `;
        }
    }

    var obsHtml = envio.obs
        ? `<div class="box"><div class="label">OBSERVACIÓN</div><div>${escapeHtml(envio.obs)}</div></div>`
        : "";

    var costoHtml = `
        <div class="totals">
            <div class="line"><span>Venta total</span><span>${money(envio.total || 0)}</span></div>
            <div class="line"><span>Costo</span><span>${money(envio.costoTotal || 0)}</span></div>
            <div class="line"><span>Utilidad</span><span>${money(envio.utilidadTotal || 0)}</span></div>
            <div class="line grand"><span>TOTAL</span><span>${money(envio.total || 0)}</span></div>
        </div>
    `;

    var win = window.open("", "", "width=420,height=900");

    win.document.write(`
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Ticket Envío</title>
            <style>
                @page {
                    size: 80mm auto;
                    margin: 4mm;
                }

                *{
                    box-sizing:border-box;
                }

                body{
                    font-family: Arial, sans-serif;
                    width: 72mm;
                    margin: 0 auto;
                    color:#000;
                    font-size:12px;
                    line-height:1.25;
                }

                .center{text-align:center;}
                .right{text-align:right;}
                .left{text-align:left;}
                .bold{font-weight:700;}
                .small{font-size:10px;}
                .tiny{font-size:9px;}

                .brand{
                    text-align:center;
                    margin-bottom:6px;
                }

                .brand img{
                    max-width:48mm;
                    max-height:22mm;
                    height:auto;
                    display:block;
                    margin:0 auto 4px auto;
                }

                .brand-name{
                    font-size:16px;
                    font-weight:900;
                    letter-spacing:.4px;
                }

                .ticket-title{
                    font-size:12px;
                    font-weight:700;
                    margin-top:2px;
                }

                .hr{
                    border-top:1px dashed #000;
                    margin:7px 0;
                }

                .box{
                    border:1px solid #000;
                    padding:5px 6px;
                    margin-bottom:6px;
                }

                .label{
                    font-size:10px;
                    font-weight:700;
                    letter-spacing:.3px;
                    margin-bottom:2px;
                }

                .meta-row{
                    display:flex;
                    justify-content:space-between;
                    gap:8px;
                    margin-bottom:2px;
                }

                table{
                    width:100%;
                    border-collapse:collapse;
                }

                th, td{
                    padding:3px 0;
                    vertical-align:top;
                }

                th{
                    border-bottom:1px solid #000;
                    font-size:11px;
                    text-transform:uppercase;
                }

                .prod{
                    width:70%;
                }

                .prod-name{
                    font-weight:700;
                    font-size:12px;
                }

                .prod-sub{
                    font-size:10px;
                }

                .total-line{
                    width:30%;
                    font-weight:700;
                    padding-left:6px;
                }

                .totals{
                    border-top:1px dashed #000;
                    border-bottom:1px dashed #000;
                    padding:5px 0;
                    margin-top:4px;
                }

                .totals .line{
                    display:flex;
                    justify-content:space-between;
                    margin:2px 0;
                    font-size:12px;
                }

                .totals .grand{
                    margin-top:5px;
                    padding-top:5px;
                    border-top:1px solid #000;
                    font-size:15px;
                    font-weight:900;
                }

                .footer{
                    text-align:center;
                    margin-top:8px;
                    font-size:10px;
                }

                .lotes-title{
                    font-size:11px;
                    font-weight:700;
                    margin-bottom:4px;
                }

                .lotes th, .lotes td{
                    font-size:10px;
                    padding:2px 0;
                }
            </style>
        </head>
        <body>

            <div class="brand">
                <img src="assets/LOGO1.png" onerror="this.style.display='none'">
                <div class="brand-name">LAS PICONAS</div>
                <div class="ticket-title">COMPROBANTE DE ENVÍO</div>
            </div>

            <div class="hr"></div>

            <div class="box">
                <div class="meta-row"><span class="bold">Envío:</span><span>${escapeHtml(envio.envioId || "")}</span></div>
                <div class="meta-row"><span class="bold">Fecha:</span><span>${fechaStr}</span></div>
                <div class="meta-row"><span class="bold">Hora:</span><span>${horaStr}</span></div>
            </div>

            <div class="box">
                <div class="label">CLIENTE</div>
                <div>${escapeHtml(envio.clienteNombre || "")}</div>
                <div class="small">${escapeHtml(envio.clienteDireccion || "")}</div>
                <div class="small">${escapeHtml(envio.clienteTelefono || "")}</div>
            </div>

            <div class="box">
                <div class="label">TRANSPORTE</div>
                <div><span class="bold">Vehículo:</span> ${escapeHtml(envio.vehiculoPlaca || "")}</div>
                <div><span class="bold">Piloto:</span> ${escapeHtml(envio.vehiculoPiloto || "")}</div>
            </div>

            ${obsHtml}

            <table>
                <thead>
                    <tr>
                        <th class="left">Detalle</th>
                        <th class="right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            ${costoHtml}

            ${lotesRows ? `
                <div class="hr"></div>
                <div class="lotes-title">LOTES CONSUMIDOS</div>
                <table class="lotes">
                    <thead>
                        <tr>
                            <th class="left">Producto</th>
                            <th class="center">Lote</th>
                            <th class="right">Cant</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lotesRows}
                    </tbody>
                </table>
            ` : ""}

            <div class="footer">
                <div>Gracias por su preferencia</div>
                <div>Marck Business © 2026</div>
            </div>

            <script>
                window.onload = function(){
                    window.focus();
                    window.print();
                }
            <\/script>

        </body>
        </html>
    `);

    win.document.close();
};
// ===============================
// Ticket Receta Escalada (SIN popup / SIN hojas en blanco)
// ===============================
window.imprimirTicketRecetaEscalada = (function(){
  let printing = false;

  function fmtQty(n){
    const v = Number(n || 0);
    if (!isFinite(v)) return "0";
    return String(v.toFixed(3))
      .replace(/\.000$/, "")
      .replace(/(\.\d*[1-9])0+$/, "$1");
  }

  return function(ordenId){
    try{
      if(printing) return true;
      printing = true;

      const db = getDB();
      const ord = (db.producciones||[]).find(x=>x.id===ordenId);
      if(!ord){ printing=false; alert("No se encontró la orden: " + ordenId); return false; }

      let receta = null;
      if(ord.recetaId) receta = (db.recetas||[]).find(r=>r.id===ord.recetaId) || null;
      if(!receta) receta = (db.recetas||[]).find(r=>(r.nombre||"") === (ord.recetaNombre||"")) || null;
      if(!receta){ printing=false; alert("No se encontró la receta para imprimir."); return false; }

      let factor = Number(ord.factor || 1);
      if(!(factor > 0)) factor = 1;

      const baseInfo = ord.baseInfo || {};
      const baseTxt  = baseInfo.mpNombre || "BASE";
      const baseUnit = baseInfo.unidad || "";
      const baseQty  = Number(baseInfo.baseQty || 0);

      const fecha = new Date(ord.ts || Date.now());
      const fechaStr = fecha.toLocaleDateString();
      const horaStr  = fecha.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

      const rendimiento = Number(ord.esperado || ord.rendimientoEsperado || receta.rendimientoEsperado || 0);
      const unidadRend  = ord.unidad || receta.unidadRendimiento || "";

      let rows = "";
      (receta.ingredientes || []).forEach(ing=>{
        const base = Number(ing.cantBase || ing.cant || 0);
        const qty  = base * factor;

        rows += `
          <tr>
            <td class="mp">
              <div class="mp-name">${escapeHtml(ing.mpNombre || ing.nombre || "")}</div>
            </td>
            <td class="qty">${fmtQty(qty)}</td>
            <td class="unit">${escapeHtml(ing.unidad || "")}</td>
          </tr>
        `;
      });

      const procedimientoHtml = receta.procedimiento
        ? `
          <div class="section">
            <div class="section-title">PROCEDIMIENTO</div>
            <div class="procedimiento">${escapeHtml(receta.procedimiento).replace(/\n/g, "<br>")}</div>
          </div>
        `
        : "";

      const old = document.getElementById("__print_overlay__");
      if(old) old.remove();

      const overlay = document.createElement("div");
      overlay.id = "__print_overlay__";
      overlay.innerHTML = `
<style id="__print_recipe_css__">
  #__print_overlay__{
    position: fixed;
    inset: 0;
    background: #fff;
    color:#000;
    z-index: 999999;
    overflow: auto;
    padding: 8px;
  }

  #__print_recipe_root__{
    width: 80mm;
    margin: 0 auto;
    padding: 2.5mm 2.5mm;
    font-family: Arial, sans-serif;
    font-size: 14px;
    line-height: 1.22;
  }

  .center{ text-align:center; }
  .right{ text-align:right; }
  .left{ text-align:left; }

  .brand{
    text-align:center;
    margin-bottom: 6px;
  }

  .brand-logo{
    width: 100%;
    max-height: 24mm;
    object-fit: contain;
    display:block;
    margin: 0 auto 4px auto;
  }

  .title{
    font-weight: 900;
    font-size: 20px;
    letter-spacing: .4px;
    line-height: 1.05;
  }

  .sub{
    font-size: 14px;
    font-weight: 700;
    margin-top: 2px;
  }

  .small{ font-size: 12px; }
  .tiny{ font-size: 11px; }

  .hr{
    border-top: 2px dashed #000;
    margin: 9px 0;
  }

  .hero{
    border: 1.5px solid #000;
    padding: 7px 6px;
    text-align:center;
    margin-bottom: 7px;
  }

  .hero-name{
    font-size: 19px;
    font-weight: 900;
    line-height: 1.08;
    text-transform: uppercase;
  }

  .hero-qty{
    margin-top: 4px;
    font-size: 16px;
    font-weight: 800;
  }

  .box{
    border: 1.5px solid #000;
    padding: 6px 7px;
    margin-bottom: 7px;
  }

  .box-title{
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .3px;
    border-bottom: 1px solid #000;
    padding-bottom: 2px;
    margin-bottom: 5px;
    text-transform: uppercase;
  }

  .meta-row{
    display:flex;
    justify-content:space-between;
    gap:8px;
    margin-bottom: 3px;
    font-size: 14px;
  }

  table{
    width:100%;
    border-collapse:collapse;
  }

  th, td{
    padding: 4px 0;
    vertical-align: top;
  }

  th{
    border-bottom: 1px solid #000;
    font-size: 12px;
    text-transform: uppercase;
  }

  .mp{
    width: 56%;
    padding-right: 4px;
  }

  .mp-name{
    font-weight: 700;
    font-size: 15px;
    word-break: break-word;
  }

  .qty{
    width: 22%;
    text-align: right;
    font-weight: 900;
    font-size: 16px;
    padding-right: 4px;
  }

  .unit{
    width: 22%;
    text-align: right;
    font-weight: 800;
    font-size: 15px;
  }

  .section{
    border: 1.5px solid #000;
    padding: 6px 7px;
    margin-top: 7px;
  }

  .section-title{
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .3px;
    border-bottom: 1px solid #000;
    padding-bottom: 2px;
    margin-bottom: 5px;
    text-transform: uppercase;
  }

  .procedimiento{
    font-size: 13px;
    line-height: 1.28;
    word-break: break-word;
  }

  .sign-area{
    margin-top: 9px;
  }

  .sign-line{
    border-top: 1px solid #000;
    margin-top: 20px;
    padding-top: 4px;
    text-align:center;
    font-size: 11px;
  }

  .footer{
    text-align:center;
    margin-top: 9px;
    font-size: 11px;
  }

  @page {
    size: 80mm auto;
    margin: 2.5mm;
  }

  @media print{
    body{ margin:0 !important; }
    body > *:not(#__print_overlay__){ display:none !important; }

    #__print_overlay__{
      position: static;
      inset: auto;
      padding: 0;
      background: #fff;
      overflow: visible;
    }

    #__print_recipe_root__{
      margin: 0 auto;
    }
  }
</style>

<div id="__print_recipe_root__">

  <div class="brand">
    <img class="brand-logo" src="assets/LOGO1.png" onerror="this.style.display='none'">
    <div class="title">LAS PICONAS</div>
    <div class="sub">Ticket de Preparación</div>
  </div>

  <div class="hero">
    <div class="hero-name">${escapeHtml(receta.nombre || ord.recetaNombre || "")}</div>
    <div class="hero-qty">
      ${rendimiento ? fmtQty(rendimiento) : ""} ${escapeHtml(unidadRend)}
    </div>
  </div>

  <div class="box">
    <div class="box-title">Datos de Producción</div>
    <div class="meta-row"><span><b>Orden:</b></span><span>${escapeHtml(ord.id||"")}</span></div>
    <div class="meta-row"><span><b>Fecha:</b></span><span>${fechaStr}</span></div>
    <div class="meta-row"><span><b>Hora:</b></span><span>${horaStr}</span></div>
    <div class="meta-row"><span><b>Base:</b></span><span>${fmtQty(baseQty)} ${escapeHtml(baseUnit)} ${escapeHtml(baseTxt)}</span></div>
    <div class="meta-row"><span><b>Factor:</b></span><span>${fmtQty(factor)}</span></div>
  </div>

  <div class="box">
    <div class="box-title">Ingredientes Escalados</div>
    <table>
      <thead>
        <tr>
          <th class="left">MP</th>
          <th class="right">Cant</th>
          <th class="right">Und</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>

  ${procedimientoHtml}

  <div class="section sign-area">
    <div class="section-title">Control</div>
    <div class="sign-line">Preparado por</div>
    <div class="sign-line">Revisado por</div>
  </div>

  <div class="footer">
    <div class="small">Documento interno de producción</div>
    <div class="tiny">Marck Business © 2026</div>
  </div>

</div>
      `;

      document.body.appendChild(overlay);

      const cleanup = ()=>{
        printing = false;
        const o = document.getElementById("__print_overlay__");
        if(o) o.remove();
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);

      window.print();
      setTimeout(()=>cleanup(), 1500);

      return true;

    }catch(e){
      printing = false;
      console.warn("Ticket receta error:", e);
      alert("No se pudo imprimir el ticket de receta.");
      return false;
    }
  };
})();