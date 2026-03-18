// js/historial_envios.js
console.log("[historial_envios.js] cargado OK");

function renderHistorialEnvios() {
  var db = getDB();
  var envios = db.envios || [];

  var html = (
    '<div class="page-head">' +
      "<div>" +
        "<h2>Historial de Envíos</h2>" +
        '<div class="muted">Consulta, filtrado y reimpresión de envíos</div>' +
      "</div>" +
    "</div>" +

    '<div class="panel">' +

      "<label>Buscar</label>" +
      '<input id="busquedaEnvios" placeholder="Cliente, ID, producto..." oninput="filtrarHistorialEnvios()" />' +

      '<div style="margin-top:12px;">' +
        '<table class="table">' +
          "<thead>" +
            "<tr>" +
              "<th>ID</th>" +
              "<th>Fecha</th>" +
              "<th>Cliente</th>" +
              "<th>Piloto</th>" +
              "<th>Total</th>" +
              "<th></th>" +
            "</tr>" +
          "</thead>" +
          '<tbody id="tablaHistorialEnvios"></tbody>' +
        "</table>" +
      "</div>" +

    "</div>"
  );

  setTimeout(function () {
    pintarTablaHistorialEnvios();
  }, 0);

  return html;
}

function pintarTablaHistorialEnvios() {
  var db = getDB();
  var envios = (db.envios || []).slice().reverse();
  var tbody = document.getElementById("tablaHistorialEnvios");

  if (!tbody) return;

  var q = String(document.getElementById("busquedaEnvios")?.value || "").toLowerCase();

  var rows = envios.map(function (e, i) {

    var match =
      !q ||
      String(e.envioId || "").toLowerCase().includes(q) ||
      String(e.clienteNombre || "").toLowerCase().includes(q) ||
      (e.items || []).some(function (it) {
        return String(it.producto || "").toLowerCase().includes(q);
      });

    if (!match) return "";

    return (
      "<tr>" +
        "<td>" + escapeHtml(e.envioId) + "</td>" +
        "<td>" + escapeHtml(new Date(e.fechaISO).toLocaleString()) + "</td>" +
        "<td>" + escapeHtml(e.clienteNombre || "") + "</td>" +
        "<td>" + escapeHtml(e.vehiculoPiloto || "") + "</td>" +
        '<td class="right">' + money(e.total || 0) + "</td>" +
        '<td class="right">' +
          '<button class="btn" onclick="verDetalleEnvio(' + i + ')">Ver</button> ' +
          '<button class="btn accent" onclick="reimprimirEnvio(' + i + ')">Reimprimir</button>' +
        "</td>" +
      "</tr>"
    );

  }).join("");

  tbody.innerHTML = rows || '<tr><td colspan="6" class="muted">Sin resultados</td></tr>';
}

function filtrarHistorialEnvios() {
  pintarTablaHistorialEnvios();
}

function verDetalleEnvio(index) {
  var db = getDB();
  var envios = (db.envios || []).slice().reverse();
  var e = envios[index];

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

function reimprimirEnvio(index) {
  var db = getDB();
  var envios = (db.envios || []).slice().reverse();
  var envio = envios[index];

  if (!envio) {
    alert("Envío no encontrado.");
    return;
  }

  imprimirTicketEnvio(envio);
}