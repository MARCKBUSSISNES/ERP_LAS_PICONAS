// js/dashboard.js
console.log(">>> DASHBOARD.JS CARGADO <<<");

let DASH_CLOCK_TIMER = null;

function renderDashboard(){
  const db = getDB();

  // ===== KPIs básicos =====
  const hoy = new Date();
  const startDay = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0,0,0,0).getTime();
  const endDay   = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23,59,59,999).getTime();

  const producciones = db.producciones || [];
  const envios = db.envios || [];
  const lotes = db.lotes || [];
  const pt = db.inventarioPT || [];
  const mp = db.materiasPrimas || [];

  const prodHoy = producciones.filter(p => {
    const t = Number(p.ts || p.fechaTs || p.timestamp || 0);
    return t >= startDay && t <= endDay;
  });

  const enviosHoy = envios.filter(e => {
    const t = Number(e.ts || e.fechaTs || e.timestamp || 0);
    return t >= startDay && t <= endDay;
  });

  const totalProdHoy = sum(prodHoy.map(p => Number(p.cantidad || p.qty || 0)));
  const totalEnviosHoy = enviosHoy.length;

  // Stock MP bajo (en base)
  const mpBajo = mp.filter(x => Number(x.stockBase||0) <= Number(x.stockMinBase||0));

  // Top 5 productos producidos (histórico)
  const top = topProductosProducidos(producciones).slice(0,5);
  const topHtml = top.length ? top.map(t=>`
    <tr>
      <td>${escapeHtml(t.nombre)}</td>
      <td class="right">${Number(t.cantidad).toFixed(2)}</td>
    </tr>
  `).join("") : `<tr><td colspan="2" class="muted">Sin producción registrada</td></tr>`;

  // MP bajo (lista)
  const mpBajoHtml = mpBajo.length ? mpBajo.slice(0,8).map(x=>`
    <tr>
      <td>${escapeHtml(x.nombre || x.id)}</td>
      <td class="right">
        <span class="tag red">${Number(x.stockBase||0).toFixed(2)} ${escapeHtml(x.baseUnit||"")}</span>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="2" class="muted">Sin alertas de MP</td></tr>`;

  // Resumen PT (cantidad de items)
  const ptItems = pt.length;

  return `
    <div class="page-head">
      <div>
        <div class="big">Dashboard</div>
        <div class="muted small">Vista ejecutiva de fábrica • Producción • Inventarios • Envíos</div>
      </div>
      <div class="actions">
        <button class="btn secondary" onclick="loadView('produccion')">Ir a Producción</button>
        <button class="btn secondary" onclick="loadView('envios')">Ir a Envíos</button>
      </div>
    </div>

    <div class="grid-2">
      <!-- Widget: Reloj / Fecha -->
      <div class="panel">
        <div class="muted small">Hora actual</div>
        <div id="dashClock" class="big" style="font-size:30px;margin-top:6px;">--:--:--</div>
        <div id="dashDate" class="muted" style="margin-top:4px;">—</div>
        <div class="hr"></div>
        <div class="muted small">Atajos</div>
        <div class="actions" style="margin-top:8px;">
          <button class="btn accent" onclick="loadView('comprasMP')">Compras MP</button>
          <button class="btn accent" onclick="loadView('mp')">Inventario MP</button>
        </div>
      </div>

      <!-- Widget: KPIs de hoy -->
      <div class="panel">
        <div class="big" style="font-size:16px;">Hoy</div>
        <div class="totals" style="margin-top:12px;">
          <div>
            <div class="muted small">Unidades producidas</div>
            <div class="big">${Number(totalProdHoy||0).toFixed(2)}</div>
          </div>
          <div>
            <div class="muted small">Envíos</div>
            <div class="big">${totalEnviosHoy}</div>
          </div>
          <div>
            <div class="muted small">Lotes</div>
            <div class="big">${lotes.length}</div>
          </div>
          <div>
            <div class="muted small">PT items</div>
            <div class="big">${ptItems}</div>
          </div>
        </div>

        <div class="hr"></div>
        <div class="muted small">Alertas</div>
        <div style="margin-top:8px;">
          ${mpBajo.length
            ? `<span class="tag red">MP bajo: ${mpBajo.length}</span>`
            : `<span class="tag green">MP OK</span>`
          }
        </div>
      </div>

      <!-- Widget: Calendario -->
      <div class="panel">
        <div class="big" style="font-size:16px;display:flex;justify-content:space-between;align-items:center;">
          <span>Calendario</span>
          <span class="muted small" id="calTitle">—</span>
        </div>
        <div id="calendarBox" style="margin-top:10px;"></div>
      </div>

      <!-- Widget: Top producción -->
      <div class="panel">
        <div class="big" style="font-size:16px;">Top productos producidos</div>
        <div class="muted small">Acumulado histórico</div>
        <table class="table" style="margin-top:10px;">
          <thead><tr><th>Producto</th><th class="right">Cantidad</th></tr></thead>
          <tbody>${topHtml}</tbody>
        </table>
      </div>

      <!-- Widget: MP bajo -->
      <div class="panel">
        <div class="big" style="font-size:16px;">Materia prima en mínimo</div>
        <div class="muted small">StockBase <= StockMinBase</div>
        <table class="table" style="margin-top:10px;">
          <thead><tr><th>MP</th><th class="right">Stock</th></tr></thead>
          <tbody>${mpBajoHtml}</tbody>
        </table>
      </div>

      <!-- Widget: Producciones recientes -->
      <div class="panel">
        <div class="big" style="font-size:16px;">Producciones recientes</div>
        <div class="muted small">Últimos registros</div>
        ${renderProduccionesRecientes(producciones)}
      </div>
    </div>
  `;
}

function afterRenderDashboard(){
  startDashboardClock();
  renderCalendar(new Date());
}

function startDashboardClock(){
  // evita timers duplicados
  if (DASH_CLOCK_TIMER) clearInterval(DASH_CLOCK_TIMER);

  const clockEl = document.getElementById("dashClock");
  const dateEl  = document.getElementById("dashDate");
  if(!clockEl || !dateEl) return;

  const tick = () => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("es-GT", { hour12:false });
    dateEl.textContent  = now.toLocaleDateString("es-GT", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  };

  tick();
  DASH_CLOCK_TIMER = setInterval(tick, 1000);
}

function renderCalendar(date){
  const box = document.getElementById("calendarBox");
  const title = document.getElementById("calTitle");
  if(!box || !title) return;

  const y = date.getFullYear();
  const m = date.getMonth();

  title.textContent = date.toLocaleDateString("es-GT", { month:"long", year:"numeric" });

  const first = new Date(y, m, 1);
  const last  = new Date(y, m + 1, 0);
  const startDay = (first.getDay() + 6) % 7; // lunes=0
  const daysInMonth = last.getDate();

  const week = ["L","M","X","J","V","S","D"];
  const today = new Date();

  let cells = "";

  // encabezado
  cells += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:8px;">` +
    week.map(d=>`<div class="muted small" style="text-align:center;font-weight:800;">${d}</div>`).join("") +
  `</div>`;

  // grilla días
  cells += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">`;

  // espacios antes
  for(let i=0;i<startDay;i++){
    cells += `<div style="padding:10px;border:1px solid rgba(255,255,255,.06);border-radius:10px;opacity:.35;"></div>`;
  }

  for(let d=1; d<=daysInMonth; d++){
    const isToday = (today.getFullYear()===y && today.getMonth()===m && today.getDate()===d);

    cells += `
      <div style="
        padding:10px;
        border:1px solid rgba(255,255,255,.08);
        border-radius:10px;
        text-align:center;
        font-weight:800;
        background:${isToday ? "rgba(255,107,0,.18)" : "rgba(255,255,255,.02)"};
      ">${d}</div>
    `;
  }

  cells += `</div>`;
  box.innerHTML = cells;
}

function renderProduccionesRecientes(producciones){
  const last = (producciones || []).slice().reverse().slice(0,8);
  if(!last.length){
    return `<div class="muted" style="margin-top:10px;">Sin registros aún.</div>`;
  }

  const rows = last.map(p=>{
    const ts = Number(p.ts || p.fechaTs || p.timestamp || 0);
    const fecha = ts ? new Date(ts).toLocaleString("es-GT") : (p.fecha || "—");
    const prod = p.producto || p.nombre || p.pt || "—";
    const qty  = Number(p.cantidad || p.qty || 0);

    return `
      <tr>
        <td>${escapeHtml(prod)}</td>
        <td class="right">${qty.toFixed(2)}</td>
        <td class="right"><span class="muted small">${escapeHtml(fecha)}</span></td>
      </tr>
    `;
  }).join("");

  return `
    <table class="table" style="margin-top:10px;">
      <thead><tr><th>Producto</th><th class="right">Cant</th><th class="right">Fecha</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function topProductosProducidos(producciones){
  const map = new Map();
  for(const p of (producciones||[])){
    const nombre = (p.producto || p.nombre || p.pt || "SIN_NOMBRE").toString();
    const qty = Number(p.cantidad || p.qty || 0) || 0;
    map.set(nombre, (map.get(nombre)||0) + qty);
  }
  return Array.from(map.entries())
    .map(([nombre,cantidad])=>({nombre,cantidad}))
    .sort((a,b)=>b.cantidad-a.cantidad);
}

function sum(arr){
  return (arr||[]).reduce((a,b)=>a+(Number(b)||0),0);
}