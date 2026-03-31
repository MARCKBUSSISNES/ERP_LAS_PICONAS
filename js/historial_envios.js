// js/historial_envios.js
console.log("[historial_envios.js] cargado OK");

var __envioEditState = null;

function getSessionHistorialEnvios(){
  try { return JSON.parse(localStorage.getItem("SESSION") || "null"); }
  catch { return null; }
}

function isAdminHistorialEnvios(){
  var s = getSessionHistorialEnvios();
  var rol = String(s?.rol || s?.user?.rol || "").trim().toUpperCase();
  return rol === "ADMIN" || rol === "ADMINISTRADOR" || rol === "SUPERADMIN" || rol === "OWNER";
}

function renderHistorialEnvios() {
  var html = (
    '<div class="page-head">' +
      "<div>" +
        "<h2>Historial de Envíos</h2>" +
        '<div class="muted">Consulta, filtrado, reimpresión y edición administrativa de envíos</div>' +
      "</div>" +
    "</div>" +

    '<div class="panel">' +
      "<label>Buscar</label>" +
      '<input id="busquedaEnvios" placeholder="Cliente, ID, producto..." oninput="filtrarHistorialEnvios()" />' +
      '<div class="muted small" style="margin-top:8px;">Solo ADMIN puede editar envíos o devolver producto al inventario.</div>' +
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
  var admin = isAdminHistorialEnvios();

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
          '<button class="btn accent" onclick="reimprimirEnvio(' + i + ')">Reimprimir</button> ' +
          (admin ? '<button class="btn" onclick="abrirEditorEnvio(' + i + ')">Editar</button>' : '') +
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

function _getEnvioByReverseIndex(index){
  var db = getDB();
  var envios = db.envios || [];
  var realIndex = envios.length - 1 - Number(index || 0);
  if (realIndex < 0 || realIndex >= envios.length) return { db: db, envio: null, realIndex: -1 };
  return { db: db, envio: envios[realIndex], realIndex: realIndex };
}

function _restoreItemsLotesToInventario(db, itemsLotes){
  db.inventarioPT = db.inventarioPT || [];

  (itemsLotes || []).forEach(function(it){
    var producto = String(it.producto || "").trim();
    var lote = String(it.lote || "").trim();
    var cantidad = Number(it.cantidad || 0);
    var costoUnitario = Number(it.costoUnitario || 0);
    var costoTotal = Number(it.costoTotal || (cantidad * costoUnitario) || 0);
    var precioVenta = Number(it.precio || 0);

    if (!producto || !lote || cantidad <= 0) return;

    var match = (db.inventarioPT || []).find(function(row){
      return String(row.producto || "").trim() === producto && String(row.lote || "").trim() === lote;
    });

    if (match) {
      match.cantidad = Number(match.cantidad || 0) + cantidad;
      match.costoTotal = Number(match.costoTotal || 0) + costoTotal;
      if (!Number(match.costoUnitario || 0) && costoUnitario > 0) match.costoUnitario = costoUnitario;
      if (!Number(match.precioVenta || 0) && precioVenta > 0) match.precioVenta = precioVenta;
    } else {
      db.inventarioPT.push({
        producto: producto,
        lote: lote,
        cantidad: cantidad,
        costoUnitario: costoUnitario,
        costoTotal: costoTotal,
        precioVenta: precioVenta,
        fecha: new Date().toLocaleDateString(),
        fechaISO: new Date().toISOString(),
        ts: Date.now(),
        origen: "REVERSO_EDICION_ENVIO"
      });
    }
  });
}

function _buildEnvioFromDraft(db, baseEnvio, draftItems, cliente, vehiculo){
  var itemsDetalle = [];
  var resumenItems = [];

  for (var k = 0; k < draftItems.length; k++) {
    var item = draftItems[k];
    var producto = String(item.producto || "").trim();
    var cantidad = Number(item.cantidad || 0);
    var precio = Number(item.precio || 0);

    if (!producto) throw new Error("Hay un producto vacío en el envío.");
    if (!cantidad || cantidad <= 0) throw new Error("Cantidad inválida para: " + producto);
    if (precio < 0) throw new Error("Precio inválido para: " + producto);

    var allocations = descontarInventarioPTFIFO(db, producto, cantidad);
    var subtotal = cantidad * precio;
    var costoTotalItem = allocations.reduce(function(acc, a){ return acc + Number(a.costoTotal || 0); }, 0);
    var costoUnitarioItem = cantidad > 0 ? (costoTotalItem / cantidad) : 0;
    var utilidadItem = subtotal - costoTotalItem;
    var margenItem = subtotal > 0 ? ((utilidadItem / subtotal) * 100) : 0;

    resumenItems.push({
      producto: producto,
      cantidad: cantidad,
      precio: precio,
      subtotal: subtotal,
      costoUnitario: costoUnitarioItem,
      costoTotal: costoTotalItem,
      utilidad: utilidadItem,
      margen: margenItem,
      lote: allocations.length ? allocations[0].lote : "",
      lotesConsumidos: allocations.map(function(x){
        return {
          lote: x.lote,
          cantidad: x.cantidad,
          costoUnitario: x.costoUnitario,
          costoTotal: x.costoTotal
        };
      })
    });

    allocations.forEach(function(a){
      var detalleSubtotal = Number(a.cantidad || 0) * precio;
      var detalleCostoTotal = Number(a.costoTotal || 0) || 0;
      itemsDetalle.push({
        producto: producto,
        lote: a.lote,
        cantidad: a.cantidad,
        precio: precio,
        subtotal: detalleSubtotal,
        costoUnitario: Number(a.costoUnitario || 0) || 0,
        costoTotal: detalleCostoTotal,
        utilidad: detalleSubtotal - detalleCostoTotal,
        fecha: a.fecha || ""
      });
    });
  }

  var total = resumenItems.reduce(function(a, b){ return a + Number(b.subtotal || 0); }, 0);
  var costoTotalEnvio = resumenItems.reduce(function(a, b){ return a + Number(b.costoTotal || 0); }, 0);
  var utilidadTotalEnvio = total - costoTotalEnvio;
  var margenTotalEnvio = total > 0 ? ((utilidadTotalEnvio / total) * 100) : 0;

  return {
    envioId: baseEnvio.envioId,
    fechaISO: baseEnvio.fechaISO,
    clienteNombre: cliente.nombre,
    clienteDireccion: cliente.direccion || "",
    clienteTelefono: cliente.telefono || "",
    vehiculoPlaca: vehiculo?.placa || baseEnvio.vehiculoPlaca || "",
    vehiculoPiloto: vehiculo?.piloto || baseEnvio.vehiculoPiloto || "",
    obs: baseEnvio.obs || "",
    items: resumenItems,
    itemsLotes: itemsDetalle,
    total: total,
    costoTotal: costoTotalEnvio,
    utilidadTotal: utilidadTotalEnvio,
    margenTotal: margenTotalEnvio,
    editadoPor: getSessionHistorialEnvios()?.usuario || "ADMIN",
    editadoEnISO: new Date().toISOString()
  };
}

function abrirEditorEnvio(index){
  if (!isAdminHistorialEnvios()) {
    alert("Solo ADMIN puede editar envíos.");
    return;
  }

  var pack = _getEnvioByReverseIndex(index);
  var db = pack.db;
  var envio = pack.envio;
  if (!envio) { alert("Envío no encontrado."); return; }

  var clientes = db.clientes || [];
  var vehiculos = db.vehiculos || [];
  var pt = getInventarioPTGeneral();

  __envioEditState = {
    reverseIndex: index,
    realIndex: pack.realIndex,
    envioId: envio.envioId,
    clienteNombreOriginal: envio.clienteNombre || "",
    vehiculoPilotoOriginal: envio.vehiculoPiloto || "",
    items: (envio.items || []).map(function(it){
      return {
        producto: String(it.producto || ""),
        cantidad: Number(it.cantidad || 0),
        precio: Number(it.precio || 0)
      };
    })
  };

  var clienteOptions = clientes.map(function(c, i){
    var selected = String(c.nombre || "") === String(envio.clienteNombre || "") ? ' selected' : '';
    return '<option value="' + i + '"' + selected + '>' + escapeHtml(c.nombre || ("Cliente " + (i + 1))) + '</option>';
  }).join("");

  if (!clienteOptions) clienteOptions = '<option value="">(No hay clientes)</option>';

  var vehiculoOptions = vehiculos.map(function(v, i){
    var txt = (v.placa || "") + " - " + (v.piloto || "");
    var selected = String(v.piloto || "") === String(envio.vehiculoPiloto || "") && String(v.placa || "") === String(envio.vehiculoPlaca || "") ? ' selected' : '';
    return '<option value="' + i + '"' + selected + '>' + escapeHtml(txt.trim()) + '</option>';
  }).join("");

  if (!vehiculoOptions) vehiculoOptions = '<option value="">(No hay vehículos)</option>';

  var productosMap = {};
  (pt || []).forEach(function(p){ productosMap[String(p.producto || "")] = p; });
  (__envioEditState.items || []).forEach(function(it){
    if (!productosMap[it.producto]) {
      productosMap[it.producto] = { producto: it.producto, precioVenta: it.precio, cantidad: 0, oldestLote: '-' };
    }
  });

  var productOptions = Object.keys(productosMap).sort().map(function(key){
    var p = productosMap[key];
    return '<option value="' + escapeHtml(p.producto) + '" data-precio="' + Number(p.precioVenta || 0) + '">' +
      escapeHtml(p.producto) + ' | Disp: ' + Number(p.cantidad || 0) + ' | FIFO: ' + escapeHtml(p.oldestLote || '-') +
    '</option>';
  }).join("");

  var modal = document.createElement("div");
  modal.id = "modalEditarEnvioAdmin";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,.55)";
  modal.style.zIndex = "9999";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.innerHTML = (
    '<div style="width:min(1100px,96vw);max-height:92vh;overflow:auto;background:#0f172a;color:#e5e7eb;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:18px;box-shadow:0 20px 50px rgba(0,0,0,.35);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">' +
        '<div>' +
          '<div style="font-size:22px;font-weight:700;">Editar envío</div>' +
          '<div class="muted small">' + escapeHtml(envio.envioId || '') + ' • Solo ADMIN • Si eliminas productos, se regresan al inventario al guardar.</div>' +
        '</div>' +
        '<button class="btn danger" onclick="cerrarEditorEnvio()">Cerrar</button>' +
      '</div>' +

      '<div class="grid-2" style="margin-top:14px;">' +
        '<div class="panel" style="background:rgba(255,255,255,.03);">' +
          '<h3>Datos del envío</h3>' +
          '<label>Cliente</label>' +
          '<select id="editEnvioCliente">' + clienteOptions + '</select>' +
          '<label>Vehículo / Piloto</label>' +
          '<select id="editEnvioVehiculo">' + vehiculoOptions + '</select>' +
          '<div class="muted small" style="margin-top:8px;">Al guardar se recalcula FIFO, costos y utilidad.</div>' +
        '</div>' +

        '<div class="panel" style="background:rgba(255,255,255,.03);">' +
          '<h3>Agregar producto</h3>' +
          '<label>Producto</label>' +
          '<select id="editEnvioProductoNuevo" onchange="autocompletarPrecioEditorEnvio()">' + (productOptions || '<option value="">(Sin productos)</option>') + '</select>' +
          '<div class="row">' +
            '<div><label>Cantidad</label><input id="editEnvioCantidadNueva" type="number" min="0.01" step="0.01" value="1"></div>' +
            '<div><label>Precio</label><input id="editEnvioPrecioNuevo" type="number" min="0" step="0.01"></div>' +
          '</div>' +
          '<button class="btn accent" onclick="agregarProductoEditorEnvio()">Agregar producto</button>' +
        '</div>' +
      '</div>' +

      '<div class="panel" style="margin-top:14px;background:rgba(255,255,255,.03);">' +
        '<h3>Productos del envío</h3>' +
        '<table class="table">' +
          '<thead><tr><th>Producto</th><th class="right">Cantidad</th><th class="right">Precio</th><th class="right">Subtotal</th><th></th></tr></thead>' +
          '<tbody id="editEnvioItemsBody"></tbody>' +
        '</table>' +
        '<div class="row" style="justify-content:space-between;align-items:center;margin-top:10px;">' +
          '<div class="muted small">Tip: también puedes cambiar cantidades y precios directamente en la tabla.</div>' +
          '<div><b>Total: <span id="editEnvioTotal">Q0.00</span></b></div>' +
        '</div>' +
      '</div>' +

      '<div class="row" style="justify-content:flex-end;margin-top:14px;">' +
        '<button class="btn" onclick="cerrarEditorEnvio()">Cancelar</button>' +
        '<button class="btn accent" onclick="guardarEdicionEnvio()">Guardar cambios</button>' +
      '</div>' +
    '</div>'
  );

  document.body.appendChild(modal);
  renderItemsEditorEnvio();
  autocompletarPrecioEditorEnvio();
}

function cerrarEditorEnvio(){
  var modal = document.getElementById("modalEditarEnvioAdmin");
  if (modal) modal.remove();
  __envioEditState = null;
}

function autocompletarPrecioEditorEnvio(){
  var sel = document.getElementById("editEnvioProductoNuevo");
  var precio = document.getElementById("editEnvioPrecioNuevo");
  if (!sel || !precio) return;
  var opt = sel.selectedOptions && sel.selectedOptions[0];
  var val = Number(opt?.getAttribute("data-precio") || 0);
  precio.value = isFinite(val) ? val.toFixed(2) : "0.00";
}

function renderItemsEditorEnvio(){
  var tbody = document.getElementById("editEnvioItemsBody");
  var totalEl = document.getElementById("editEnvioTotal");
  if (!tbody || !__envioEditState) return;

  var rows = (__envioEditState.items || []).map(function(it, idx){
    var subtotal = Number(it.cantidad || 0) * Number(it.precio || 0);
    return '<tr>' +
      '<td>' + escapeHtml(it.producto || '') + '</td>' +
      '<td class="right"><input type="number" min="0.01" step="0.01" value="' + Number(it.cantidad || 0) + '" onchange="actualizarCampoItemEnvio(' + idx + ',\'cantidad\', this.value)" style="width:110px;text-align:right;"></td>' +
      '<td class="right"><input type="number" min="0" step="0.01" value="' + Number(it.precio || 0).toFixed(2) + '" onchange="actualizarCampoItemEnvio(' + idx + ',\'precio\', this.value)" style="width:110px;text-align:right;"></td>' +
      '<td class="right">' + money(subtotal) + '</td>' +
      '<td class="right"><button class="btn danger" onclick="eliminarItemEditorEnvio(' + idx + ')">Quitar</button></td>' +
    '</tr>';
  }).join('');

  tbody.innerHTML = rows || '<tr><td colspan="5" class="muted">Sin productos</td></tr>';

  var total = (__envioEditState.items || []).reduce(function(acc, it){
    return acc + (Number(it.cantidad || 0) * Number(it.precio || 0));
  }, 0);
  if (totalEl) totalEl.textContent = money(total);
}

function actualizarCampoItemEnvio(idx, field, value){
  if (!__envioEditState || !__envioEditState.items[idx]) return;
  if (field === 'cantidad') __envioEditState.items[idx].cantidad = Number(value || 0);
  if (field === 'precio') __envioEditState.items[idx].precio = Number(value || 0);
  renderItemsEditorEnvio();
}

function agregarProductoEditorEnvio(){
  if (!__envioEditState) return;
  var sel = document.getElementById("editEnvioProductoNuevo");
  var qtyEl = document.getElementById("editEnvioCantidadNueva");
  var priceEl = document.getElementById("editEnvioPrecioNuevo");

  var producto = String(sel?.value || "").trim();
  var cantidad = Number(qtyEl?.value || 0);
  var precio = Number(priceEl?.value || 0);

  if (!producto) { alert("Selecciona un producto."); return; }
  if (!cantidad || cantidad <= 0) { alert("Cantidad inválida."); return; }
  if (precio < 0) { alert("Precio inválido."); return; }

  var found = (__envioEditState.items || []).find(function(it){
    return String(it.producto || "") === producto && Number(it.precio || 0) === precio;
  });

  if (found) found.cantidad = Number(found.cantidad || 0) + cantidad;
  else __envioEditState.items.push({ producto: producto, cantidad: cantidad, precio: precio });

  qtyEl.value = "1";
  renderItemsEditorEnvio();
}

function eliminarItemEditorEnvio(idx){
  if (!__envioEditState) return;
  __envioEditState.items.splice(idx, 1);
  renderItemsEditorEnvio();
}

function guardarEdicionEnvio(){
  if (!isAdminHistorialEnvios()) {
    alert("Solo ADMIN puede editar envíos.");
    return;
  }
  if (!__envioEditState) return;

  var pack = _getEnvioByReverseIndex(__envioEditState.reverseIndex);
  var db = pack.db;
  var envioActual = pack.envio;
  if (!envioActual) { alert("Envío no encontrado."); return; }

  var itemsDraft = (__envioEditState.items || []).map(function(it){
    return {
      producto: String(it.producto || "").trim(),
      cantidad: Number(it.cantidad || 0),
      precio: Number(it.precio || 0)
    };
  }).filter(function(it){ return it.producto; });

  if (!itemsDraft.length) {
    alert("El envío debe tener al menos un producto.");
    return;
  }

  for (var i = 0; i < itemsDraft.length; i++) {
    if (!itemsDraft[i].cantidad || itemsDraft[i].cantidad <= 0) {
      alert("Cantidad inválida para: " + itemsDraft[i].producto);
      return;
    }
    if (itemsDraft[i].precio < 0) {
      alert("Precio inválido para: " + itemsDraft[i].producto);
      return;
    }
  }

  var cliIdx = document.getElementById("editEnvioCliente")?.value;
  var vehIdx = document.getElementById("editEnvioVehiculo")?.value;
  var cliente = (db.clientes || [])[cliIdx];
  var vehiculo = (db.vehiculos || [])[vehIdx] || null;

  if (!cliente) {
    alert("Selecciona un cliente válido.");
    return;
  }

  try {
    _restoreItemsLotesToInventario(db, envioActual.itemsLotes || []);
    var nuevoEnvio = _buildEnvioFromDraft(db, envioActual, itemsDraft, cliente, vehiculo);
    db.envios[pack.realIndex] = nuevoEnvio;

    db.ventas = db.ventas || [];
    var ventaIdx = db.ventas.findIndex(function(v){ return String(v.ventaId || "") === String(envioActual.envioId || ""); });
    var ventaPayload = {
      ventaId: nuevoEnvio.envioId,
      fechaISO: nuevoEnvio.fechaISO,
      tipo: "ENVIO",
      clienteNombre: nuevoEnvio.clienteNombre,
      items: (nuevoEnvio.items || []).map(function(x){
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
      itemsLotes: (nuevoEnvio.itemsLotes || []).map(function(x){
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
      total: nuevoEnvio.total,
      costoTotal: nuevoEnvio.costoTotal,
      utilidadTotal: nuevoEnvio.utilidadTotal,
      margenTotal: nuevoEnvio.margenTotal
    };

    if (ventaIdx >= 0) db.ventas[ventaIdx] = ventaPayload;

    saveDB(db);
    cerrarEditorEnvio();
    loadView("historial_envios");
    alert("Envío actualizado correctamente. El inventario fue recalculado con FIFO.");
  } catch (err) {
    console.error("[historial_envios.js] Error editando envío:", err);
    alert(err && err.message ? err.message : "No se pudo editar el envío.");
  }
}
