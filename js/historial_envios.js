// js/historial_envios.js
console.log("[historial_envios.js] cargado OK");

window.__historialEnviosSel = window.__historialEnviosSel || {};

function _envioFechaKey(fechaISO){
  var d = fechaISO ? new Date(fechaISO) : new Date();
  if (!isFinite(d.getTime())) d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var da = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + da;
}

function _envioFechaHoy(){
  return _envioFechaKey(new Date().toISOString());
}

function _fmtRutaFecha(fechaKey){
  var p = String(fechaKey || "").split("-");
  if (p.length !== 3) return fechaKey || "";
  return p[2] + "/" + p[1] + "/" + p[0];
}

function _nextDespachoAgrupadoId(db, fechaKey){
  db = db || getDB();
  db.configuracion = db.configuracion || { correlativos: {} };
  db.configuracion.correlativos = db.configuracion.correlativos || {};
  var key = "DESPACHO_AGRUPADO_" + String(fechaKey || _envioFechaHoy());
  var n = Number(db.configuracion.correlativos[key] || 0) + 1;
  db.configuracion.correlativos[key] = n;
  return "RUTA-" + _fmtRutaFecha(fechaKey) + "-" + String(n).padStart(5, "0");
}

function _getEnviosRaw(){
  var db = getDB();
  return db.envios || [];
}

function _getDespachosAgrupados(){
  var db = getDB();
  return db.despachosAgrupados || [];
}

function _toggleSeleccionEnvio(rawIndex, checked){
  if (checked) window.__historialEnviosSel[String(rawIndex)] = true;
  else delete window.__historialEnviosSel[String(rawIndex)];
}

function _clearSeleccionEnvios(){
  window.__historialEnviosSel = {};
}

function renderHistorialEnvios() {
  var db = getDB();
  var vehiculos = db.vehiculos || [];
  var fechaHoy = _envioFechaHoy();
  var vehOpts = vehiculos.map(function(v, i){
    return '<option value="' + i + '">' + escapeHtml(v.placa || "") + ' - ' + escapeHtml(v.piloto || "") + '</option>';
  }).join("");

  var html = (
    '<div class="page-head">' +
      "<div>" +
        "<h2>Historial de Envíos</h2>" +
        '<div class="muted">Consulta, filtrado, reimpresión y agrupación logística por día</div>' +
      "</div>" +
    "</div>" +

    '<div class="panel" style="margin-bottom:12px;">' +
      '<div class="page-head" style="margin-bottom:8px;">' +
        '<div>' +
          '<div class="big" style="font-size:18px;">Despacho agrupado del día</div>' +
          '<div class="muted small">Selecciona envíos del mismo día para que el operador saque el producto junto y el piloto lo distribuya por sucursal.</div>' +
        '</div>' +
      '</div>' +
      '<div class="row">' +
        '<div>' +
          '<label>Fecha operativa</label>' +
          '<input id="fechaAgruparEnvios" type="date" value="' + fechaHoy + '" onchange="pintarTablaHistorialEnvios();pintarDespachosAgrupados();">' +
        '</div>' +
        '<div>' +
          '<label>Piloto / Vehículo para la ruta</label>' +
          '<select id="vehiculoDespachoAgrupado">' + (vehOpts || '<option value="">(No hay vehículos)</option>') + '</select>' +
        '</div>' +
      '</div>' +
      '<div class="actions" style="margin-top:12px;">' +
        '<button class="btn accent" onclick="crearDespachoAgrupadoDesdeSeleccion()">Agrupar seleccionados + Imprimir ticket piloto</button>' +
        '<button class="btn" onclick="limpiarSeleccionEnviosAgrupados()">Limpiar selección</button>' +
      '</div>' +
    '</div>' +

    '<div class="panel">' +
      "<label>Buscar</label>" +
      '<input id="busquedaEnvios" placeholder="Cliente, ID, producto..." oninput="filtrarHistorialEnvios()" />' +
      '<div class="muted small" style="margin-top:8px;">Solo se pueden agrupar envíos de la fecha operativa seleccionada.</div>' +
      '<div style="margin-top:12px;">' +
        '<table class="table">' +
          "<thead>" +
            "<tr>" +
              '<th style="width:44px;">Ruta</th>' +
              "<th>ID</th>" +
              "<th>Fecha</th>" +
              "<th>Cliente</th>" +
              "<th>Piloto</th>" +
              '<th class="right">Total</th>' +
              '<th class="right">Acciones</th>' +
            "</tr>" +
          "</thead>" +
          '<tbody id="tablaHistorialEnvios"></tbody>' +
        "</table>" +
      "</div>" +
    "</div>" +

    '<div class="panel" style="margin-top:12px;">' +
      '<div class="page-head" style="margin-bottom:8px;">' +
        '<div>' +
          '<div class="big" style="font-size:18px;">Despachos agrupados</div>' +
          '<div class="muted small">Rutas consolidadas para impresión del piloto</div>' +
        '</div>' +
      '</div>' +
      '<table class="table">' +
        '<thead>' +
          '<tr>' +
            '<th>ID Ruta</th>' +
            '<th>Fecha</th>' +
            '<th>Piloto</th>' +
            '<th class="right">Sucursales</th>' +
            '<th class="right">Productos</th>' +
            '<th class="right">Acciones</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody id="tablaDespachosAgrupados"></tbody>' +
      '</table>' +
    '</div>'
  );

  setTimeout(function () {
    pintarTablaHistorialEnvios();
    pintarDespachosAgrupados();
  }, 0);

  return html;
}

function pintarTablaHistorialEnvios() {
  var db = getDB();
  var envios = (db.envios || []).map(function(e, rawIndex){
    return { rawIndex: rawIndex, envio: e };
  }).reverse();
  var tbody = document.getElementById("tablaHistorialEnvios");
  if (!tbody) return;

  var q = String(document.getElementById("busquedaEnvios")?.value || "").toLowerCase();
  var fechaOp = String(document.getElementById("fechaAgruparEnvios")?.value || _envioFechaHoy());

  var rows = envios.map(function (wrap) {
    var e = wrap.envio;
    var envioFecha = _envioFechaKey(e.fechaISO);
    var match =
      (!q ||
      String(e.envioId || "").toLowerCase().includes(q) ||
      String(e.clienteNombre || "").toLowerCase().includes(q) ||
      (e.items || []).some(function (it) {
        return String(it.producto || "").toLowerCase().includes(q);
      })) &&
      (!fechaOp || envioFecha === fechaOp);

    if (!match) return "";

    var checked = !!window.__historialEnviosSel[String(wrap.rawIndex)];
    var enRuta = e.despachoAgrupadoId ? '<span class="tag yellow">' + escapeHtml(e.despachoAgrupadoId) + '</span>' : '<span class="muted small">Disponible</span>';

    return (
      "<tr>" +
        '<td class="center">' +
          '<input type="checkbox" ' +
            (checked ? 'checked ' : '') +
            (e.despachoAgrupadoId ? 'disabled ' : '') +
            'onchange="seleccionarEnvioAgrupado(' + wrap.rawIndex + ', this.checked)">' +
        '</td>' +
        "<td>" + escapeHtml(e.envioId) + "</td>" +
        "<td>" + escapeHtml(new Date(e.fechaISO).toLocaleString()) + "</td>" +
        "<td>" + escapeHtml(e.clienteNombre || "") + '<div class="small muted" style="margin-top:4px;">' + enRuta + '</div></td>' +
        "<td>" + escapeHtml(e.vehiculoPiloto || "") + "</td>" +
        '<td class="right">' + money(e.total || 0) + "</td>" +
        '<td class="right">' +
          '<button class="btn" onclick="verDetalleEnvio(' + wrap.rawIndex + ')">Ver</button> ' +
          '<button class="btn accent" onclick="reimprimirEnvio(' + wrap.rawIndex + ')">Reimprimir</button>' +
        "</td>" +
      "</tr>"
    );
  }).join("");

  tbody.innerHTML = rows || '<tr><td colspan="7" class="muted">Sin resultados</td></tr>';
}

function pintarDespachosAgrupados(){
  var db = getDB();
  var fechaOp = String(document.getElementById("fechaAgruparEnvios")?.value || _envioFechaHoy());
  var tbody = document.getElementById("tablaDespachosAgrupados");
  if (!tbody) return;

  var rows = (db.despachosAgrupados || [])
    .slice()
    .reverse()
    .filter(function(d){ return !fechaOp || String(d.fechaKey || _envioFechaKey(d.fechaISO)) === fechaOp; })
    .map(function(d, idxRev){
      var realIndex = (db.despachosAgrupados || []).length - 1 - idxRev;
      return (
        '<tr>' +
          '<td>' + escapeHtml(d.despachoId || "") + '</td>' +
          '<td>' + escapeHtml(new Date(d.fechaISO || Date.now()).toLocaleString()) + '</td>' +
          '<td>' + escapeHtml(d.vehiculoPiloto || d.piloto || "") + '<div class="small muted">' + escapeHtml(d.vehiculoPlaca || "") + '</div></td>' +
          '<td class="right">' + Number(d.totalClientes || 0) + '</td>' +
          '<td class="right">' + Number((d.items || []).length) + '</td>' +
          '<td class="right">' +
            '<button class="btn" onclick="verDespachoAgrupado(' + realIndex + ')">Ver</button> ' +
            '<button class="btn accent" onclick="reimprimirDespachoAgrupado(' + realIndex + ')">Imprimir piloto</button>' +
          '</td>' +
        '</tr>'
      );
    }).join("");

  tbody.innerHTML = rows || '<tr><td colspan="6" class="muted">Sin despachos agrupados para esa fecha</td></tr>';
}

function seleccionarEnvioAgrupado(rawIndex, checked){
  var db = getDB();
  var envio = (db.envios || [])[rawIndex];
  if (!envio) return;
  if (envio.despachoAgrupadoId) {
    alert("Ese envío ya fue incluido en una ruta agrupada.");
    return;
  }

  var fechaOp = String(document.getElementById("fechaAgruparEnvios")?.value || _envioFechaHoy());
  var fechaEnvio = _envioFechaKey(envio.fechaISO);
  if (checked && fechaOp && fechaEnvio !== fechaOp) {
    alert("Solo puedes agrupar envíos de la fecha operativa seleccionada.");
    pintarTablaHistorialEnvios();
    return;
  }

  _toggleSeleccionEnvio(rawIndex, checked);
}

function limpiarSeleccionEnviosAgrupados(){
  _clearSeleccionEnvios();
  pintarTablaHistorialEnvios();
}

function filtrarHistorialEnvios() {
  pintarTablaHistorialEnvios();
}

function verDetalleEnvio(rawIndex) {
  var db = getDB();
  var e = (db.envios || [])[rawIndex];

  if (!e) return;

  var detalle = (e.items || []).map(function (it) {
    return "- " + it.producto +
           " | Cant: " + it.cantidad +
           " | P/U: " + money(it.precio) +
           " | " + money(it.subtotal);
  }).join("\n");

  alert(
    "ENVÍO: " + e.envioId + "\n\n" +
    "Cliente: " + e.clienteNombre + "\n" +
    "Fecha: " + new Date(e.fechaISO).toLocaleString() + "\n\n" +
    detalle + "\n\n" +
    "TOTAL: " + money(e.total)
  );
}

function reimprimirEnvio(rawIndex) {
  var db = getDB();
  var envio = (db.envios || [])[rawIndex];

  if (!envio) {
    alert("Envío no encontrado.");
    return;
  }

  imprimirTicketEnvio(envio);
}

function crearDespachoAgrupadoDesdeSeleccion(){
  var db = getDB();
  db.despachosAgrupados = db.despachosAgrupados || [];
  var fechaOp = String(document.getElementById("fechaAgruparEnvios")?.value || _envioFechaHoy());
  var vehIdx = Number(document.getElementById("vehiculoDespachoAgrupado")?.value || -1);
  var vehiculo = (db.vehiculos || [])[vehIdx];

  if (!vehiculo) {
    alert("Selecciona el vehículo / piloto para la ruta.");
    return;
  }

  var seleccion = Object.keys(window.__historialEnviosSel || {}).filter(function(k){
    return window.__historialEnviosSel[k];
  }).map(function(k){ return Number(k); }).filter(function(n){ return !isNaN(n); });

  if (seleccion.length < 2) {
    alert("Selecciona al menos 2 envíos del mismo día para agruparlos.");
    return;
  }

  var enviosSel = [];
  for (var i = 0; i < seleccion.length; i++) {
    var envio = (db.envios || [])[seleccion[i]];
    if (!envio) continue;
    if (envio.despachoAgrupadoId) {
      alert("Uno de los envíos seleccionados ya pertenece a una ruta agrupada.");
      return;
    }
    if (_envioFechaKey(envio.fechaISO) !== fechaOp) {
      alert("Todos los envíos agrupados deben ser del mismo día seleccionado.");
      return;
    }
    enviosSel.push(envio);
  }

  if (enviosSel.length < 2) {
    alert("No se encontraron suficientes envíos válidos para agrupar.");
    return;
  }

  var mapa = {};
  enviosSel.forEach(function(e){
    (e.items || []).forEach(function(it){
      var key = String(it.producto || "").trim();
      if (!mapa[key]) {
        mapa[key] = { producto: key, cantidad: 0, sucursales: [] };
      }
      mapa[key].cantidad += Number(it.cantidad || 0);
      if (e.clienteNombre && mapa[key].sucursales.indexOf(e.clienteNombre) === -1) {
        mapa[key].sucursales.push(e.clienteNombre);
      }
    });
  });

  var items = Object.keys(mapa).sort().map(function(k){ return mapa[k]; });
  var despachoId = _nextDespachoAgrupadoId(db, fechaOp);
  var despacho = {
    despachoId: despachoId,
    fechaISO: new Date().toISOString(),
    fechaKey: fechaOp,
    vehiculoPlaca: vehiculo.placa || "",
    vehiculoPiloto: vehiculo.piloto || "",
    creadoPor: (typeof getUserName === "function") ? getUserName() : "USUARIO",
    enviosIds: enviosSel.map(function(e){ return e.envioId; }),
    clientes: enviosSel.map(function(e){
      return {
        envioId: e.envioId,
        clienteNombre: e.clienteNombre || "",
        direccion: e.clienteDireccion || "",
        telefono: e.clienteTelefono || "",
        total: Number(e.total || 0),
        items: (e.items || []).map(function(it){
          return { producto: it.producto, cantidad: it.cantidad };
        })
      };
    }),
    items: items,
    totalClientes: enviosSel.length,
    totalUnidades: items.reduce(function(acc, it){ return acc + Number(it.cantidad || 0); }, 0)
  };

  db.despachosAgrupados.push(despacho);
  seleccion.forEach(function(idx){
    if (db.envios[idx]) db.envios[idx].despachoAgrupadoId = despachoId;
  });

  saveDB(db);
  _clearSeleccionEnvios();
  pintarTablaHistorialEnvios();
  pintarDespachosAgrupados();
  if (typeof imprimirTicketDespachoAgrupado === "function") {
    imprimirTicketDespachoAgrupado(despacho);
  }
  alert("Despacho agrupado creado: " + despachoId);
}

function verDespachoAgrupado(index){
  var db = getDB();
  var d = (db.despachosAgrupados || [])[index];
  if (!d) return;

  var detalle = (d.items || []).map(function(it){
    return "- " + it.producto + " | Total: " + it.cantidad;
  }).join("\n");

  var clientes = (d.clientes || []).map(function(c){
    return "- " + c.clienteNombre + " (" + c.envioId + ")";
  }).join("\n");

  alert(
    "RUTA: " + d.despachoId + "\n\n" +
    "Piloto: " + (d.vehiculoPiloto || "") + "\n" +
    "Vehículo: " + (d.vehiculoPlaca || "") + "\n" +
    "Fecha: " + new Date(d.fechaISO || Date.now()).toLocaleString() + "\n\n" +
    "SUCURSALES:\n" + clientes + "\n\n" +
    "CONSOLIDADO:\n" + detalle
  );
}

function reimprimirDespachoAgrupado(index){
  var db = getDB();
  var d = (db.despachosAgrupados || [])[index];
  if (!d) {
    alert("Despacho agrupado no encontrado.");
    return;
  }
  if (typeof imprimirTicketDespachoAgrupado === "function") {
    imprimirTicketDespachoAgrupado(d);
  }
}
