// js/utils.js

function money(n){
  return "Q" + Number(n || 0).toFixed(2);
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function getUserName(){
  const s = localStorage.getItem("SESSION");
  if(!s) return "SIN_SESION";
  try { return JSON.parse(s).usuario || "USUARIO"; } catch { return "USUARIO"; }
}

// =========================
// UNIDADES / CONVERSIONES
// =========================

function normalizeUnitCode(unit){
  var u = String(unit || "").trim().toUpperCase();

  // Peso
  if (["LB","LBS","LIBRA","LIBRAS"].includes(u)) return "LIBRA";
  if (["OZ","ONZA","ONZAS"].includes(u)) return "ONZA";
  if (["G","GR","GRAMO","GRAMOS"].includes(u)) return "GRAMO";
  if (["KG","KILO","KILOGRAMO","KILOGRAMOS","KGS"].includes(u)) return "KILOGRAMO";

  // Volumen
  if (["GAL","GALON","GALONES"].includes(u)) return "GALON";
  if (["L","LT","LTS","LITRO","LITROS"].includes(u)) return "LITRO";
  if (["ML","MLS","MILILITRO","MILILITROS","CC"].includes(u)) return "MILILITRO";

  // Unidad simple
  if (["UND","UNIDAD","UNIDADES","U"].includes(u)) return "UNIDAD";

  return u;
}

function normalizeUnitKey(unit){
  return normalizeUnitCode(unit);
}

function getConversionMapForBase(base){
  base = normalizeUnitCode(base);

  // Peso
  if(base === "LIBRA") return {
    LIBRA: 1,
    ONZA: 1/16,
    GRAMO: 1/453.592,
    KILOGRAMO: 2.2046226218
  };

  if(base === "ONZA") return {
    ONZA: 1,
    LIBRA: 16,
    GRAMO: 28.349523125,
    KILOGRAMO: 35.27396195
  };

  if(base === "GRAMO") return {
    GRAMO: 1,
    ONZA: 1/28.349523125,
    LIBRA: 1/453.592,
    KILOGRAMO: 1/1000
  };

  if(base === "KILOGRAMO") return {
    KILOGRAMO: 1,
    GRAMO: 1000,
    ONZA: 35.27396195,
    LIBRA: 2.2046226218
  };

  // Volumen
  if(base === "GALON") return {
    GALON: 1,
    LITRO: 1/3.78541,
    MILILITRO: 1/3785.41
  };

  if(base === "LITRO") return {
    LITRO: 1,
    MILILITRO: 1/1000,
    GALON: 3.78541
  };

  if(base === "MILILITRO") return {
    MILILITRO: 1,
    LITRO: 1000,
    GALON: 3785.41
  };

  // Unidad simple
  if(base === "UNIDAD") return { UNIDAD: 1 };

  return { [base]: 1 };
}

function buildMPUnits(base){
  var b = normalizeUnitCode(base || "UNIDAD");
  var map = getConversionMapForBase(b);
  map[b] = 1;
  return map;
}

function ensureMPUnits(mp){
  if(!mp) return mp;

  mp.baseUnit = normalizeUnitCode(mp.baseUnit || mp.unidad || "UNIDAD");

  if(!mp.units || typeof mp.units !== "object"){
    mp.units = buildMPUnits(mp.baseUnit);
  } else {
    var normalized = {};
    Object.keys(mp.units).forEach(function(k){
      normalized[normalizeUnitCode(k)] = Number(mp.units[k] || 0);
    });

    var defaults = buildMPUnits(mp.baseUnit);
    Object.keys(defaults).forEach(function(k){
      if(!normalized[k]) normalized[k] = defaults[k];
    });

    normalized[mp.baseUnit] = 1;
    mp.units = normalized;
  }

  if(!isFinite(Number(mp.stockBase))) mp.stockBase = 0;
  if(!isFinite(Number(mp.costoPromBase))) mp.costoPromBase = 0;

  return mp;
}

function getUnitFactorForMP(mp, unidad){
  if(!mp) return 0;

  mp = ensureMPUnits(mp);

  var u = normalizeUnitCode(unidad);
  var units = mp.units || {};

  if(units[u] != null){
    return Number(units[u]) || 0;
  }

  var keys = Object.keys(units);
  for(var i = 0; i < keys.length; i++){
    if(normalizeUnitCode(keys[i]) === u){
      return Number(units[keys[i]]) || 0;
    }
  }

  var base = normalizeUnitCode(mp.baseUnit || "UNIDAD");
  if(u === base) return 1;

  return 0;
}

function getMPUnitFactor(mp, unidad){
  return getUnitFactorForMP(mp, unidad);
}

function convertToBaseUnits(qty, unit, mp){
  qty = Number(qty || 0);
  if(!qty) return 0;

  mp = ensureMPUnits(mp);
  var u = normalizeUnitCode(unit);
  var f = Number(mp.units[u] || 0);

  if(!f) throw new Error("Unidad no válida: " + u);

  return qty * f;
}

function convertirCantidadMPaBase(mp, cantidad, unidad){
  return convertToBaseUnits(cantidad, unidad, mp);
}

function convertQtyToMPBase(mp, cantidad, unidad){
  return convertirCantidadMPaBase(mp, cantidad, unidad);
}

function round6(n){
  return Math.round(Number(n || 0) * 1000000) / 1000000;
}

function roundTo6(n){
  return round6(n);
}

// =========================
// COSTOS
// =========================

function sumarIndirectosReceta(receta){
  var ind = (receta && receta.indirectos) || {};
  return Number(ind.gas || 0) +
         Number(ind.luz || 0) +
         Number(ind.salario || 0) +
         Number(ind.empaque || 0) +
         Number(ind.otros || 0);
}

function getRecetaByProducto(producto, db){
  db = db || getDB();
  var p = String(producto || "").trim().toLowerCase();

  return (db.recetas || []).find(function(r){
    var pf = String(r.productoFinal || r.nombre || "").trim().toLowerCase();
    return pf === p;
  }) || null;
}

function calcularCostoDirectoReceta(receta, db, factor){
  db = db || getDB();
  factor = Number(factor || 1);

  var total = 0;

  (receta && receta.ingredientes || []).forEach(function(ing){
    var mp = (db.materiasPrimas || []).find(function(x){
      return x.id === ing.mpId;
    });
    if(!mp) return;

    mp = ensureMPUnits(mp);

    var qtyBase = convertirCantidadMPaBase(
      mp,
      Number(ing.cantBase || ing.cant || 0) * factor,
      ing.unidad || mp.baseUnit || "UNIDAD"
    );

    total += qtyBase * Number(mp.costoPromBase || 0);
  });

  return total;
}

function calcularPrecioVentaReceta(receta, db){
  db = db || getDB();

  if(!receta) return 0;

  var costoDirecto = calcularCostoDirectoReceta(receta, db, 1);
  var costoIndirecto = sumarIndirectosReceta(receta);
  var costoTotalLote = costoDirecto + costoIndirecto;

  var rendimiento = Number(receta.rendimientoEsperado || receta.rendimiento || 1);
  if(!isFinite(rendimiento) || rendimiento <= 0) rendimiento = 1;

  var costoUnitario = costoTotalLote / rendimiento;

  var margenPct = Number(
    receta.margenPct != null ? receta.margenPct :
    receta.margen != null ? receta.margen :
    0
  );

  var precioVenta = costoUnitario * (1 + (margenPct / 100));
  return precioVenta;
}

// =========================
// INVENTARIO PT
// =========================

function _invDateValue(item){
  if(!item) return 0;
  if(item.ts != null) return Number(item.ts) || 0;

  var raw = item.fechaISO || item.fecha || "";
  var t = Date.parse(raw);
  return isNaN(t) ? 0 : t;
}

function getInventarioPTAgregado(){
  var db = getDB();
  var map = {};

  (db.inventarioPT || []).forEach(function(it){
    var qty = Number(it.cantidad || 0);
    if(qty <= 0) return;

    var key = String(it.producto || "") + "||" + String(it.lote || "");
    if(!map[key]){
      map[key] = {
        producto: it.producto || "",
        lote: it.lote || "",
        cantidad: 0,
        fechaISO: it.fechaISO || "",
        fecha: it.fecha || "",
        ts: it.ts || _invDateValue(it),
        costoTotal: 0,
        costoUnitario: Number(it.costoUnitario || 0),
        precioVenta: Number(it.precioVenta || 0)
      };
    }

    map[key].cantidad += qty;
    map[key].costoTotal += Number(
      it.costoTotal != null
        ? it.costoTotal
        : qty * Number(it.costoUnitario || 0)
    );

    if(!map[key].fechaISO && it.fechaISO) map[key].fechaISO = it.fechaISO;
    if(!map[key].fecha && it.fecha) map[key].fecha = it.fecha;
    if(!map[key].ts && it.ts) map[key].ts = it.ts;
    if(!map[key].precioVenta && Number(it.precioVenta || 0) > 0) map[key].precioVenta = Number(it.precioVenta || 0);

    if(!map[key].costoUnitario && map[key].cantidad > 0){
      map[key].costoUnitario = map[key].costoTotal / map[key].cantidad;
    }
  });

  return Object.values(map).filter(function(x){
    return Number(x.cantidad || 0) > 0;
  });
}

function getInventarioPTGeneral(){
  var db = getDB();
  var rows = getInventarioPTAgregado()
    .slice()
    .sort(function(a, b){
      return _invDateValue(a) - _invDateValue(b);
    });

  var map = {};

  rows.forEach(function(it){
    var producto = String(it.producto || "").trim();
    if(!producto) return;

    if(!map[producto]){
      map[producto] = {
        producto: producto,
        cantidad: 0,
        costoTotal: 0,
        costoUnitarioProm: 0,
        lotes: [],
        oldestLote: it.lote || "",
        oldestFecha: it.fechaISO || it.fecha || "",
        precioVenta: 0,
        precioVentaManual: 0
      };
    }

    map[producto].cantidad += Number(it.cantidad || 0);
    map[producto].costoTotal += Number(
      it.costoTotal != null
        ? it.costoTotal
        : (Number(it.cantidad || 0) * Number(it.costoUnitario || 0))
    );

    map[producto].lotes.push({
      lote: it.lote || "",
      cantidad: Number(it.cantidad || 0),
      fechaISO: it.fechaISO || "",
      fecha: it.fecha || "",
      costoUnitario: Number(it.costoUnitario || 0),
      costoTotal: Number(
        it.costoTotal != null
          ? it.costoTotal
          : (Number(it.cantidad || 0) * Number(it.costoUnitario || 0))
      ),
      precioVenta: Number(it.precioVenta || 0)
    });

    if(!map[producto].precioVentaManual && Number(it.precioVenta || 0) > 0){
      map[producto].precioVentaManual = Number(it.precioVenta || 0);
    }

    var fechaActual = _invDateValue(it);
    var fechaGuardada = Date.parse(map[producto].oldestFecha || "");

    if(!map[producto].oldestLote || isNaN(fechaGuardada) || fechaActual < fechaGuardada){
      map[producto].oldestLote = it.lote || "";
      map[producto].oldestFecha = it.fechaISO || it.fecha || "";
    }
  });

  return Object.values(map).map(function(x){
    x.costoUnitarioProm = x.cantidad > 0 ? (x.costoTotal / x.cantidad) : 0;

    var receta = getRecetaByProducto(x.producto, db);
    x.precioVenta = Number(x.precioVentaManual || 0) > 0
      ? Number(x.precioVentaManual || 0)
      : (receta ? calcularPrecioVentaReceta(receta, db) : 0);

    return x;
  });
}

function getInventarioPTAgregadoGeneral(){
  return getInventarioPTGeneral();
}

// =========================
// FIFO
// =========================

function descontarInventarioPTFIFO(db, producto, cantidad){
  db = db || getDB();

  var items = (db.inventarioPT||[])
    .filter(function(x){
      return x.producto === producto && Number(x.cantidad || 0) > 0;
    })
    .sort(function(a,b){
      return _invDateValue(a) - _invDateValue(b);
    });

  var restante = Number(cantidad || 0);
  var out = [];

  for(var i = 0; i < items.length && restante > 0; i++){
    var it = items[i];
    var tomar = Math.min(Number(it.cantidad || 0), restante);
    var costoU = Number(it.costoUnitario || 0);

    if(!costoU && Number(it.cantidad || 0) > 0){
      costoU = Number(it.costoTotal || 0) / Number(it.cantidad || 0);
    }

    out.push({
      producto: it.producto,
      lote: it.lote,
      cantidad: tomar,
      costoUnitario: costoU,
      costoTotal: tomar * costoU,
      fecha: it.fecha || "",
      fechaISO: it.fechaISO || ""
    });

    it.cantidad = Number(it.cantidad || 0) - tomar;
    it.costoTotal = Math.max(0, Number(it.costoTotal || 0) - (tomar * costoU));
    restante -= tomar;
  }

  if(restante > 0){
    throw new Error("Inventario insuficiente para: " + producto);
  }

  return out;
}

function estimarSalidaInventarioPTFIFO(db, producto, cantidad, carritoActual, idxExcluir){
  db = db || getDB();

  var inventario = JSON.parse(JSON.stringify(db.inventarioPT || []));
  var fakeDb = { inventarioPT: inventario };
  var reservado = 0;

  (carritoActual || []).forEach(function(it, idx){
    if(idx === idxExcluir) return;
    if(it.producto === producto){
      reservado += Number(it.cantidad || 0);
    }
  });

  if(reservado > 0){
    descontarInventarioPTFIFO(fakeDb, producto, reservado);
  }

  var allocations = descontarInventarioPTFIFO(fakeDb, producto, cantidad);

  var costoTotal = allocations.reduce(function(acc, x){
    return acc + Number(x.costoTotal || 0);
  }, 0);

  return {
    allocations: allocations,
    costoTotal: costoTotal,
    costoUnitario: Number(cantidad || 0) > 0
      ? (costoTotal / Number(cantidad || 0))
      : 0
  };
}

// =========================
// UI / COMPATIBILIDAD
// =========================

function semaforoRend(real, sem){
  const r = Number(real || 0);
  if(r >= sem.greenMin && r <= sem.greenMax) return "VERDE";
  if(r >= sem.yellowMin && r <= sem.yellowMax) return "AMARILLO";
  return "ROJO";
}

function cssSemaforo(status){
  if(status === "VERDE") return "tag green";
  if(status === "AMARILLO") return "tag yellow";
  return "tag red";
}

function toast(msg){
  alert(msg);
}

// =========================
// SELF CHECK
// =========================

(function(){
  var required = [
    "money",
    "escapeHtml",
    "getUserName",
    "normalizeUnitCode",
    "buildMPUnits",
    "ensureMPUnits",
    "getUnitFactorForMP",
    "convertirCantidadMPaBase",
    "convertQtyToMPBase",
    "round6",
    "sumarIndirectosReceta",
    "calcularCostoDirectoReceta",
    "calcularPrecioVentaReceta",
    "getInventarioPTAgregado",
    "getInventarioPTGeneral",
    "descontarInventarioPTFIFO",
    "estimarSalidaInventarioPTFIFO",
    "semaforoRend",
    "cssSemaforo",
    "toast"
  ];

  var missing = required.filter(function(name){
    return typeof window[name] !== "function";
  });

  if(missing.length){
    console.error("[UTILS SELF-CHECK] Faltan funciones:", missing);
  } else {
    console.log("[UTILS SELF-CHECK] OK");
  }
})();
