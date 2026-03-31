// js/database.js
var DB_KEY = window.DB_KEY || "LAS_PICONAS_ERP_V2";
window.DB_KEY = DB_KEY;
function initDatabase() {
  if (!localStorage.getItem(DB_KEY)) {
    const initialData = {
      usuarios: [{ usuario: "juan luis", clave: "22782522", rol: "ADMIN" }],

      clientes: [],
      vehiculos: [],

      // ✅ RECETAS del sistema (seed)
      recetas: (typeof RECETAS_SEED !== "undefined"
        ? RECETAS_SEED.map(r => ({
            ...r,
            system: true,
            locked: true,
            version: r.version || 1,
            createdAt: Date.now(),
            createdBy: "SYSTEM",
            categoria: r.categoria || "GENERAL",
            ingredientes: Array.isArray(r.ingredientes) ? r.ingredientes : [],
            // ✅ Procedimiento (por si viene en seed)
            procedimiento: (r.procedimiento || "").toString(),
            procedimientoSteps: Array.isArray(r.procedimientoSteps) ? r.procedimientoSteps : []
          }))
        : []
      ),

      // ✅ ROLES (con permiso de ver recetas)
      roles: [
        {
          nombre: "ADMIN",
          permisos: {
            usuarios: true,
            recetas_ver: true,
            recetas_editar: true,
            mp_editar: true,
            compras_mp: true,
            produccion: true,
            envios: true,
            exportar: true
          }
        },
        {
          nombre: "SUPERVISOR",
          permisos: {
            usuarios: false,
            recetas_ver: true,
            recetas_editar: true,
            mp_editar: false,
            compras_mp: false,
            produccion: true,
            envios: true,
            exportar: true
          }
        },
        {
          nombre: "OPERADOR",
          permisos: {
            usuarios: false,
            recetas_ver: true,      // 👈 SOLO VER
            recetas_editar: false,  // 👈 NO EDITAR
            mp_editar: false,
            compras_mp: false,
            produccion: true,
            envios: true,
            exportar: false
          }
        }
      ],
      // Legacy (puedes mantenerlo por compatibilidad)
      inventarioMP: [],

      inventarioPT: [],
      producciones: [],
      lotes: [],
      envios: [],
      despachosAgrupados: [],
      ventas: [],

      // NUEVO: MP + compras + logs
      materiasPrimas: [],
      comprasMP: [],
      ajustesMP: [],
      variacionesRend: [],

      // NUEVO: categorías
      categorias: { mp: ["GENERAL"], recetas: ["GENERAL"] },

      configuracion: { correlativos: {} }
    };

    localStorage.setItem(DB_KEY, JSON.stringify(initialData));
  } else {
    
    // Migración suave: agrega llaves faltantes sin borrar datos
    const db = getDB();

    db.usuarios = db.usuarios || [{ usuario: "juan luis", clave: "22782522", rol: "ADMIN" }];

    const adminPrincipal = (db.usuarios || []).find(u =>
      String(u?.usuario || "").trim().toLowerCase() === "juan luis"
    );
    if (!adminPrincipal) {
      db.usuarios.push({ usuario: "juan luis", clave: "22782522", rol: "ADMIN" });
    }
    db.clientes = db.clientes || [];
    db.vehiculos = db.vehiculos || [];
    db.recetas = db.recetas || [];

    db.inventarioMP = db.inventarioMP || []; // legacy
    db.inventarioPT = db.inventarioPT || [];
    db.producciones = db.producciones || [];
    db.lotes = db.lotes || [];
    db.envios = db.envios || [];
    db.despachosAgrupados = db.despachosAgrupados || [];
    db.ventas = db.ventas || [];

    db.materiasPrimas = db.materiasPrimas || [];
    db.comprasMP = db.comprasMP || [];
    db.ajustesMP = db.ajustesMP || [];
    db.variacionesRend = db.variacionesRend || [];

    db.categorias = db.categorias || { mp: ["GENERAL"], recetas: ["GENERAL"] };
    db.categorias.mp = db.categorias.mp || ["GENERAL"];
    db.categorias.recetas = db.categorias.recetas || ["GENERAL"];

    db.configuracion = db.configuracion || { correlativos: {} };
    db.configuracion.correlativos = db.configuracion.correlativos || {};
    db.roles = db.roles || [
  { nombre:"ADMIN", permisos:{ usuarios:true, recetas_editar:true, mp_editar:true, compras_mp:true, produccion:true, envios:true, exportar:true } },
  { nombre:"SUPERVISOR", permisos:{ usuarios:false, recetas_editar:true, mp_editar:false, compras_mp:false, produccion:true, envios:true, exportar:true } },
  { nombre:"OPERADOR", permisos:{ usuarios:false, recetas_editar:false, mp_editar:false, compras_mp:false, produccion:true, envios:true, exportar:false } },
];
// ✅ Sembrar recetas oficiales si faltan (NO borra recetas existentes)
if (typeof RECETAS_SEED !== "undefined") {
  const byId = new Map((db.recetas || []).filter(r => r && r.id).map(r => [r.id, r]));
  for (const seed of RECETAS_SEED) {
    if (!byId.has(seed.id)) {
      db.recetas.push({
        ...seed,
        system: true,
        locked: true,
        version: seed.version || 1,
        createdAt: Date.now(),
        createdBy: "SYSTEM",
        categoria: seed.categoria || "GENERAL",
        ingredientes: Array.isArray(seed.ingredientes) ? seed.ingredientes : []
      });
    }
  }
}

// ✅ Asegurar bloqueo de recetas system
for (const r of db.recetas) {
  if (r && r.system === true) r.locked = true;
  if (r && !r.version) r.version = 1;
  if (r && !Array.isArray(r.ingredientes)) r.ingredientes = [];
}

    // Normalizar recetas para costos indirectos / margen
    for (const r of db.recetas) {
      if (!r.indirectos || typeof r.indirectos !== "object") {
        r.indirectos = { gas: 0, luz: 0, salario: 0, empaque: 0, otros: 0 };
      } else {
        r.indirectos.gas = Number(r.indirectos.gas || 0);
        r.indirectos.luz = Number(r.indirectos.luz || 0);
        r.indirectos.salario = Number(r.indirectos.salario || 0);
        r.indirectos.empaque = Number(r.indirectos.empaque || 0);
        r.indirectos.otros = Number(r.indirectos.otros || 0);
      }
      if (r.margenPct == null) r.margenPct = 0;
      r.margenPct = Number(r.margenPct || 0);
    }

    // Normalizar inventario PT con costos
    for (const it of db.inventarioPT) {
      if (it.costoDirecto == null) it.costoDirecto = 0;
      if (it.costoIndirecto == null) it.costoIndirecto = 0;
      if (it.costoTotal == null) it.costoTotal = Number(it.cantidad || 0) * Number(it.costoUnitario || 0);
      if (it.costoUnitario == null) {
        const qty = Number(it.cantidad || 0);
        it.costoUnitario = qty > 0 ? Number(it.costoTotal || 0) / qty : 0;
      }
      if (it.ts == null) it.ts = Date.now();
      if (it.fechaISO == null) it.fechaISO = new Date(it.ts).toISOString();
    }

    // Normalizar materias primas (unidad base + conversiones)
    for (const mp of db.materiasPrimas) {
      if (!mp.baseUnit) mp.baseUnit = mp.unidadBase || mp.unidad || "g";
      if (!mp.units) mp.units = { [mp.baseUnit]: 1 };
      if (mp.units[mp.baseUnit] == null) mp.units[mp.baseUnit] = 1;

      if (mp.stockBase == null) mp.stockBase = Number(mp.stockBase ?? mp.stock ?? 0) || 0;
      if (mp.stockMinBase == null) mp.stockMinBase = Number(mp.stockMinBase ?? mp.stockMin ?? 0) || 0;
      if (mp.costoPromBase == null) mp.costoPromBase = Number(mp.costoPromBase ?? 0) || 0;

      if (!mp.categoria) mp.categoria = "GENERAL";
    }

    // Normalizar recetas (estructura nueva)
    for (const r of db.recetas) {
      if (!r.productoFinal) r.productoFinal = r.nombre || "Producto";
      if (!r.unidadRend) r.unidadRend = "und";
      if (!Array.isArray(r.ingredientes)) r.ingredientes = [];
      if (!r.semaforo) r.semaforo = { greenMin: 0, greenMax: 999999, yellowMin: 0, yellowMax: 999999 };
      if (r.categoria == null) r.categoria = "GENERAL";
      if (r.rendimientoEsperado == null && r.rendimiento != null) r.rendimientoEsperado = Number(r.rendimiento || 0);

      // ✅ Normalizar ingredientes (compatibilidad con recipes viejas / seed)
      for (const ing of (r.ingredientes || [])) {
        if (ing && ing.cantBase == null && ing.cant != null) {
          ing.cantBase = Number(ing.cant || 0);
          delete ing.cant;
        }
        if (ing && ing.mpId == null && ing.mpNombre) {
          const name = String(ing.mpNombre || "").trim().toUpperCase();
          const mpMatch = (db.materiasPrimas || []).find(m => String(m.nombre||"").trim().toUpperCase() === name);
          if (mpMatch) ing.mpId = mpMatch.id;
        }
        if (ing && !ing.mpNombre && ing.mpId) {
          const mp = (db.materiasPrimas || []).find(m => m.id === ing.mpId);
          if (mp) ing.mpNombre = mp.nombre;
        }
        if (ing && !ing.unidad) {
          // Si no trae unidad, intenta tomarla de la MP
          const mp = (db.materiasPrimas || []).find(m => m.id === ing.mpId);
          ing.unidad = mp?.baseUnit || mp?.unidad || "und";
        }
        if (ing && ing.cantBase != null) ing.cantBase = Number(ing.cantBase || 0);
      }
    }

    saveDB(db);
    autoBackupDB();
  }
}

function getDB() {
  return JSON.parse(localStorage.getItem(DB_KEY));
}

function saveDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function yyyymmdd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function generarCorrelativo(prefijo) {
  const db = getDB();
  const hoy = yyyymmdd(new Date());
  const key = `${prefijo}${hoy}`;

  if (!db.configuracion) db.configuracion = { correlativos: {} };
  if (!db.configuracion.correlativos) db.configuracion.correlativos = {};

  if (!db.configuracion.correlativos[key]) db.configuracion.correlativos[key] = 1;
  else db.configuracion.correlativos[key]++;

  saveDB(db);
  autoBackupDB();
  return `${prefijo}-${hoy}-${String(db.configuracion.correlativos[key]).padStart(3, "0")}`;
}
function exportBackupDB(){
  const db = getDB();
  const stamp = new Date().toISOString().slice(0,10);
  const name = `marck_backup_${stamp}.json`;
  const blob = new Blob([JSON.stringify(db, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
}

function importBackupDB(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = () => {
      try{
        const obj = JSON.parse(String(r.result || "{}"));
        if(!obj || typeof obj !== "object") throw new Error("Backup inválido.");

        const realDB =
          (obj.keys && obj.keys[DB_KEY] && typeof obj.keys[DB_KEY] === "object")
            ? obj.keys[DB_KEY]
            : obj;

        saveDB(realDB);
        resolve(realDB);
      }catch(e){
        reject(e);
      }
    };
    r.onerror = () => reject(new Error("No se pudo leer el archivo."));
    r.readAsText(file);
  });
}

// Backup automático rotativo (últimos 14)
function autoBackupDB(){
  try{
    const db = getDB();
    const key = "MB_BACKUP_" + yyyymmdd(new Date());
    localStorage.setItem(key, JSON.stringify(db));

    // limpia backups antiguos (deja 14)
    const keys = Object.keys(localStorage).filter(k=>k.startsWith("MB_BACKUP_")).sort();
    while(keys.length > 14){
      const old = keys.shift();
      localStorage.removeItem(old);
    }
  }catch(e){
    console.warn("Auto-backup falló:", e);
  }
}
