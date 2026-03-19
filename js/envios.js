// js/envios.js
console.log("[envios.js] cargado OK");

var envioCarrito = [];

function renderEnvios() {
  var db = getDB();

  var clientesOpts = (db.clientes || []).map(function (c, i) {
    return '<option value="' + i + '">' + escapeHtml(c.nombre) + "</option>";
  }).join("");

  var vehOpts = (db.vehiculos || []).map(function (v, i) {
    return '<option value="' + i + '">' + escapeHtml(v.placa) + " - " + escapeHtml(v.piloto) + "</option>";
  }).join("");

  var pt = getInventarioPTGeneral();
  var ptOpts = pt.map(function (p, idx) {
    return '<option value="' + idx + '" data-producto="' + escapeHtml(String(p.producto || "").toLowerCase()) + '">' +
      escapeHtml(p.producto) +
      " | Disp: " + Number(p.cantidad || 0) +
      " | FIFO: " + escapeHtml(p.oldestLote || "-") +
      "</option>";
  }).join("");

  var carritoRows = envioCarrito.map(function (it, i) {
    var salidaTxt = "FIFO automático";
    if (it.lotesConsumidos && it.lotesConsumidos.length) {
      salidaTxt = it.lotesConsumidos.map(function (x) {
        return x.lote + " (" + x.cantidad + ")";
      }).join(", ");
    }

    return (
      "<tr>" +
        "<td>" + escapeHtml(it.producto) + "</td>" +
        "<td>" + escapeHtml(salidaTxt) + "</td>" +
        '<td class="right">' + Number(it.cantidad || 0) + "</td>" +
        '<td class="right">' + money(it.precio || 0) + "</td>" +
        '<td class="right">' + money(it.subtotal || 0) + "</td>" +
        '<td class="right">' + money(it.costoTotal || 0) + "</td>" +
        '<td class="right">' + money(it.utilidad || 0) + "</td>" +
        '<td class="right"><button class="btn danger" onclick="quitarItemEnvio(' + i + ')">X</button></td>' +
      "</tr>"
    );
  }).join("");

  var total = envioCarrito.reduce(function (a, b) {
    return a + Number(b.subtotal || 0);
  }, 0);

  var costoTotal = envioCarrito.reduce(function (a, b) {
    return a + Number(b.costoTotal || 0);
  }, 0);

  var utilidadTotal = total - costoTotal;

  var html = (
    '<div class="page-head">' +
      "<div>" +
        "<h2>Envíos a Clientes</h2>" +
        '<div class="muted">Despacho por producto total. El sistema descarga automáticamente el lote más antiguo (FIFO).</div>' +
      "</div>" +
      '<div class="actions">' +
        '<button class="btn" onclick="exportarVentasXlsx()">Exportar Ventas (Excel)</button>' +
        '<button class="btn" onclick="exportarEnviosXlsx()">Exportar Envíos (Excel)</button>' +
      "</div>" +
    "</div>" +

    '<div class="grid-2">' +

      '<div class="panel">' +
        "<h3>Datos del Envío</h3>" +

        "<label>Cliente</label>" +
        '<select id="envCliente">' + (clientesOpts || '<option value="">(No hay clientes)</option>') + "</select>" +

        "<label>Vehículo / Piloto</label>" +
        '<select id="envVehiculo">' + (vehOpts || '<option value="">(No hay vehículos)</option>') + "</select>" +

        "<label>Observación</label>" +
        '<input id="envObs" placeholder="Ej: entrega urgente, evento, etc." />' +

        '<div class="hr"></div>' +

        "<h3>Agregar Producto (desde Inventario PT)</h3>" +

        "<label>Filtrar producto</label>" +
        '<input id="envPTFiltro" oninput="filtrarOpcionesEnvioPT()" placeholder="Ej: salsa, tortilla, aderezo" />' +

        "<label>Producto</label>" +
        '<select id="envPTSelect" onchange="autocompletarPrecioEnvioDesdeProducto()">' +
          (ptOpts || '<option value="">(Inventario PT vacío)</option>') +
        "</select>" +
        '<div class="muted small" style="margin-top:6px;">Se muestra el total del producto. Al confirmar, el sistema toma primero el lote más antiguo.</div>' +

        '<div class="row">' +
          "<div>" +
            "<label>Cantidad</label>" +
            '<input id="envQty" type="number" min="1" step="0.01" placeholder="0"/>' +
          "</div>" +
          "<div>" +
            "<label>Precio de venta</label>" +
            '<input id="envPrecio" type="number" min="0" step="0.01" placeholder="Q0.00" readonly />' +
          "</div>" +
        "</div>" +

        '<button class="btn accent" onclick="agregarItemEnvio()">Agregar al envío</button>' +
      "</div>" +

      '<div class="panel">' +
        "<h3>Detalle</h3>" +
        '<table class="table">' +
          "<thead>" +
            "<tr>" +
              "<th>Producto</th>" +
              "<th>Salida</th>" +
              '<th class="right">Cant</th>' +
              '<th class="right">P/U</th>' +
              '<th class="right">Venta</th>' +
              '<th class="right">Costo</th>' +
              '<th class="right">Utilidad</th>' +
              "<th></th>" +
            "</tr>" +
          "</thead>" +
          "<tbody>" +
            (carritoRows || '<tr><td colspan="8" class="muted">Sin productos agregados</td></tr>') +
          "</tbody>" +
        "</table>" +

        '<div class="totals">' +
          '<div class="muted">Venta total</div>' +
          '<div class="big">' + money(total) + "</div>" +
        "</div>" +

        '<div class="row" style="margin-top:8px;">' +
          '<div style="flex:1;">' +
            '<div class="muted small">Costo total</div>' +
            '<div><b>' + money(costoTotal) + '</b></div>' +
          '</div>' +
          '<div style="flex:1;">' +
            '<div class="muted small">Utilidad estimada</div>' +
            '<div><b>' + money(utilidadTotal) + '</b></div>' +
          '</div>' +
        '</div>' +

        '<div class="row">' +
          '<button class="btn" onclick="limpiarEnvio()">Limpiar</button>' +
          '<button class="btn accent" onclick="confirmarEnvio()">Confirmar + Imprimir Ticket</button>' +
        "</div>" +

        '<div class="hr"></div>' +
        '<button class="btn" onclick="enviarCorreoResumenEnvio()">Enviar resumen por correo (mailto)</button>' +
        '<div class="muted small">* El correo abre tu app de correo. El Excel lo descargas y lo adjuntas.</div>' +
      "</div>" +

    "</div>"
  );

  setTimeout(function () {
    autocompletarPrecioEnvioDesdeProducto();
  }, 0);

  return html;
}

function filtrarOpcionesEnvioPT() {
  var input = document.getElementById("envPTFiltro");
  var select = document.getElementById("envPTSelect");
  if (!select) return;

  var q = String(input ? input.value : "").trim().toLowerCase();

  Array.prototype.forEach.call(select.options, function (opt) {
    var prod = String(opt.getAttribute("data-producto") || opt.text || "").toLowerCase();
    opt.hidden = !!q && prod.indexOf(q) === -1;
  });

  if (select.selectedOptions && select.selectedOptions[0] && select.selectedOptions[0].hidden) {
    var nextVisible = Array.prototype.find.call(select.options, function (opt) {
      return !opt.hidden;
    });
    if (nextVisible) select.value = nextVisible.value;
  }

  autocompletarPrecioEnvioDesdeProducto();
}

function autocompletarPrecioEnvioDesdeProducto() {
  var ptList = getInventarioPTGeneral();
  var sel = document.getElementById("envPTSelect");
  var precioInput = document.getElementById("envPrecio");

  if (!sel || !precioInput) return;

  var idx = Number(sel.value);
  var item = ptList[idx];

  if (!item) {
    precioInput.value = "";
    return;
  }

  var precioVenta = Number(item.precioVenta || 0);

  if (!isFinite(precioVenta) || precioVenta <= 0) {
    precioInput.value = "";
    return;
  }

  precioInput.value = precioVenta.toFixed(2);
}

function estimarSalidaInventarioPTFIFO(db, producto, cantidad, carritoActual, idxExcluir) {
  var inv = (db.inventarioPT || [])
    .filter(function (x) {
      return x.producto === producto && Number(x.cantidad || 0) > 0;
    })
    .map(function (x) {
      return {
        ref: x,
        producto: x.producto,
        lote: x.lote,
        cantidad: Number(x.cantidad || 0),
        costoUnitario: Number(x.costoUnitario || 0),
        costoTotal: Number(x.costoTotal || 0),
        fecha: x.fecha || x.fechaISO || ""
      };
    });

  inv.sort(function (a, b) {
    var fa = new Date(a.fecha || 0).getTime();
    var fb = new Date(b.fecha || 0).getTime();
    return fa - fb;
  });

  var reservado = 0;
  (carritoActual || []).forEach(function (it, idx) {
    if (idx === idxExcluir) return;
    if (it.producto === producto) reservado += Number(it.cantidad || 0);
  });

  var porReservar = reservado;

  for (var i = 0; i < inv.length && porReservar > 0; i++) {
    var lotePrevio = inv[i];
    var tomarPrevio = Math.min(lotePrevio.cantidad, porReservar);
    lotePrevio.cantidad -= tomarPrevio;
    porReservar -= tomarPrevio;
  }

  if (porReservar > 0) {
    throw new Error("No hay suficiente inventario PT para simular FIFO de " + producto);
  }

  var restante = Number(cantidad || 0);
  var allocations = [];

  for (var j = 0; j < inv.length && restante > 0; j++) {
    var l = inv[j];
    if (l.cantidad <= 0) continue;

    var tomar = Math.min(l.cantidad, restante);
    var costoUnit = Number(l.costoUnitario || 0);
    var costoTot = tomar * costoUnit;

    allocations.push({
      producto: l.producto,
      lote: l.lote,
      cantidad: tomar,
      costoUnitario: costoUnit,
      costoTotal: costoTot,
      fecha: l.fecha || ""
    });

    restante -= tomar;
  }

  if (restante > 0) {
    throw new Error("No hay suficiente inventario PT para " + producto);
  }

  var costoTotal = allocations.reduce(function (acc, x) {
    return acc + Number(x.costoTotal || 0);
  }, 0);

  var costoUnitario = Number(cantidad || 0) > 0
    ? (costoTotal / Number(cantidad || 0))
    : 0;

  return {
    allocations: allocations,
    costoTotal: costoTotal,
    costoUnitario: costoUnitario
  };
}

function agregarItemEnvio() {
  var db = getDB();
  var ptList = getInventarioPTGeneral();
  var sel = document.getElementById("envPTSelect");
  var idx = sel ? Number(sel.value) : NaN;

  var qty = Number(document.getElementById("envQty").value);

  if (!ptList[idx]) { alert("Selecciona un producto válido."); return; }
  if (!qty || qty <= 0) { alert("Cantidad inválida."); return; }
  if (qty > Number(ptList[idx].cantidad || 0)) { alert("No hay suficiente inventario PT."); return; }

  var base = ptList[idx];
  var producto = base.producto;
  var precio = Number(base.precioVenta || 0);

  if (!isFinite(precio) || precio <= 0) {
    alert("Este producto no tiene precio de venta configurado.");
    return;
  }

  var foundIndex = -1;
  for (var i = 0; i < envioCarrito.length; i++) {
    var x = envioCarrito[i];
    if (x.producto === producto && Number(x.precio || 0) === precio) {
      foundIndex = i;
      break;
    }
  }

  try {
    if (foundIndex >= 0) {
      var existente = envioCarrito[foundIndex];
      var nuevaCantidad = Number(existente.cantidad || 0) + qty;

      var sim = estimarSalidaInventarioPTFIFO(db, producto, nuevaCantidad, envioCarrito, foundIndex);
      var nuevoSubtotal = nuevaCantidad * precio;
      var nuevaUtilidad = nuevoSubtotal - sim.costoTotal;

      existente.cantidad = nuevaCantidad;
      existente.precio = precio;
      existente.subtotal = nuevoSubtotal;
      existente.costoUnitario = sim.costoUnitario;
      existente.costoTotal = sim.costoTotal;
      existente.utilidad = nuevaUtilidad;
      existente.lotesConsumidos = sim.allocations;
    } else {
      var simNueva = estimarSalidaInventarioPTFIFO(db, producto, qty, envioCarrito, -1);
      var subtotal = qty * precio;
      var utilidad = subtotal - simNueva.costoTotal;

      envioCarrito.push({
        producto: producto,
        cantidad: qty,
        precio: precio,
        subtotal: subtotal,
        costoUnitario: simNueva.costoUnitario,
        costoTotal: simNueva.costoTotal,
        utilidad: utilidad,
        lotesConsumidos: simNueva.allocations
      });
    }
  } catch (err) {
    alert(err && err.message ? err.message : "No se pudo estimar el costo FIFO.");
    return;
  }

  document.getElementById("envQty").value = "";
  loadView("envios");
}

function quitarItemEnvio(i) {
  envioCarrito.splice(i, 1);
  loadView("envios");
}

function limpiarEnvio() {
  envioCarrito = [];
  loadView("envios");
}

function confirmarEnvio() {
  var db = getDB();
  if (!envioCarrito.length) { alert("Agrega productos al envío."); return; }

  var cliIdx = document.getElementById("envCliente").value;
  var vehIdx = document.getElementById("envVehiculo").value;

  var cliente = (db.clientes || [])[cliIdx];
  var vehiculo = (db.vehiculos || [])[vehIdx];

  if (!cliente) { alert("Selecciona un cliente."); return; }
  if (!vehiculo) { alert("Selecciona un vehículo/piloto."); return; }

  var agg = getInventarioPTGeneral();
  var requested = {};

  for (var i = 0; i < envioCarrito.length; i++) {
    var itReq = envioCarrito[i];
    requested[itReq.producto] = (requested[itReq.producto] || 0) + Number(itReq.cantidad || 0);
  }

  for (var producto in requested) {
    var match = null;
    for (var j = 0; j < agg.length; j++) {
      if (agg[j].producto === producto) { match = agg[j]; break; }
    }
    if (!match || requested[producto] > Number(match.cantidad || 0)) {
      alert("Inventario insuficiente para: " + producto);
      return;
    }
  }

  // 1) Generar correlativo
  var envioId = generarCorrelativo("ENV");

  // 2) Volver a leer DB para no pisar el correlativo actualizado
  db = getDB();

  var fechaISO = new Date().toISOString();
  var obs = (document.getElementById("envObs").value || "").trim();

  var itemsDetalle = [];
  var resumenItems = [];

  try {
    for (var k = 0; k < envioCarrito.length; k++) {
      var item = envioCarrito[k];
      var allocations = descontarInventarioPTFIFO(db, item.producto, item.cantidad);
      var subtotal = Number(item.cantidad || 0) * Number(item.precio || 0);
      var costoTotalItem = allocations.reduce(function (acc, a) {
        return acc + Number(a.costoTotal || 0);
      }, 0);
      var costoUnitarioItem = Number(item.cantidad || 0) > 0
        ? (costoTotalItem / Number(item.cantidad || 0))
        : 0;
      var utilidadItem = subtotal - costoTotalItem;
      var margenItem = subtotal > 0 ? ((utilidadItem / subtotal) * 100) : 0;

      resumenItems.push({
        producto: item.producto,
        cantidad: item.cantidad,
        precio: item.precio,
        subtotal: subtotal,
        costoUnitario: costoUnitarioItem,
        costoTotal: costoTotalItem,
        utilidad: utilidadItem,
        margen: margenItem,
        lote: allocations.length ? allocations[0].lote : "",
        lotesConsumidos: allocations.map(function (x) {
          return {
            lote: x.lote,
            cantidad: x.cantidad,
            costoUnitario: x.costoUnitario,
            costoTotal: x.costoTotal
          };
        })
      });

      allocations.forEach(function (a) {
        var detalleSubtotal = Number(a.cantidad || 0) * Number(item.precio || 0);
        var detalleCostoTotal = Number(a.costoTotal || 0) || 0;

        itemsDetalle.push({
          producto: item.producto,
          lote: a.lote,
          cantidad: a.cantidad,
          precio: item.precio,
          subtotal: detalleSubtotal,
          costoUnitario: Number(a.costoUnitario || 0) || 0,
          costoTotal: detalleCostoTotal,
          utilidad: detalleSubtotal - detalleCostoTotal,
          fecha: a.fecha || ""
        });
      });
    }
  } catch (err) {
    alert(err && err.message ? err.message : "No se pudo descontar inventario PT.");
    return;
  }

  var total = resumenItems.reduce(function (a, b) {
    return a + Number(b.subtotal || 0);
  }, 0);

  var costoTotalEnvio = resumenItems.reduce(function (a, b) {
    return a + Number(b.costoTotal || 0);
  }, 0);

  var utilidadTotalEnvio = total - costoTotalEnvio;
  var margenTotalEnvio = total > 0 ? ((utilidadTotalEnvio / total) * 100) : 0;

  var envio = {
    envioId: envioId,
    fechaISO: fechaISO,
    clienteNombre: cliente.nombre,
    clienteDireccion: cliente.direccion || "",
    clienteTelefono: cliente.telefono || "",
    vehiculoPlaca: vehiculo.placa || "",
    vehiculoPiloto: vehiculo.piloto || "",
    obs: obs,
    items: resumenItems,
    itemsLotes: itemsDetalle,
    total: total,
    costoTotal: costoTotalEnvio,
    utilidadTotal: utilidadTotalEnvio,
    margenTotal: margenTotalEnvio
  };

  db.envios = db.envios || [];
  db.ventas = db.ventas || [];

  db.envios.push(envio);
  db.ventas.push({
    ventaId: envioId,
    fechaISO: fechaISO,
    tipo: "ENVIO",
    clienteNombre: cliente.nombre,
    items: resumenItems.map(function (x) {
      return {
        producto: x.producto,
        lote: x.lote || "",
        cantidad: x.cantidad,
        precio: x.precio,
        subtotal: x.subtotal,
        costoUnitario: x.costoUnitario || 0,
        costoTotal: x.costoTotal || 0,
        utilidad: x.utilidad || 0,
        margen: x.margen || 0,
        lotesConsumidos: x.lotesConsumidos || []
      };
    }),
    itemsLotes: itemsDetalle.map(function (x) {
      return {
        producto: x.producto,
        lote: x.lote,
        cantidad: x.cantidad,
        precio: x.precio,
        subtotal: x.subtotal,
        costoUnitario: x.costoUnitario || 0,
        costoTotal: x.costoTotal || 0,
        utilidad: x.utilidad || 0,
        fecha: x.fecha || ""
      };
    }),
    total: total,
    costoTotal: costoTotalEnvio,
    utilidadTotal: utilidadTotalEnvio,
    margenTotal: margenTotalEnvio
  });

  saveDB(db);
  imprimirTicketEnvio(envio);

  envioCarrito = [];
  loadView("inventarioPT");
  alert("Envío confirmado: " + envioId);
}

function enviarCorreoResumenEnvio() {
  var db = getDB();
  var subject = "Las Piconas - Resumen de Envío";
  var body = "";

  if (envioCarrito.length > 0) {
    var total = envioCarrito.reduce(function (a, b) {
      return a + Number(b.subtotal || 0);
    }, 0);

    body += "RESUMEN (sin confirmar)\n\n";
    for (var i = 0; i < envioCarrito.length; i++) {
      var it = envioCarrito[i];
      body += "- " + it.producto +
              " | FIFO automático" +
              " | Cant " + it.cantidad +
              " | P/U " + money(it.precio) +
              " | " + money(it.subtotal) + "\n";
    }
    body += "\nTOTAL: " + money(total) + "\n\n";
    body += "Nota: Descarga el Excel desde el sistema y adjúntalo manualmente.\n";
  } else if ((db.envios || []).length > 0) {
    var envio = db.envios[db.envios.length - 1];
    subject = "Las Piconas - Envío " + envio.envioId;

    body += "ENVÍO: " + envio.envioId +
            "\nCLIENTE: " + envio.clienteNombre +
            "\nFECHA: " + new Date(envio.fechaISO).toLocaleString() + "\n\n";

    for (var j = 0; j < envio.items.length; j++) {
      var x = envio.items[j];
      body += "- " + x.producto +
              " | Cant " + x.cantidad +
              " | P/U " + money(x.precio) +
              " | " + money(x.subtotal) + "\n";
    }

    body += "\nTOTAL: " + money(envio.total) + "\n";
    body += "\nNota: Adjunta el Excel exportado desde el sistema.\n";
  } else {
    alert("No hay carrito ni envíos recientes.");
    return;
  }

  var mailto = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  window.location.href = mailto;
}
