// js/clientes.js

function renderClientes() {
  const db = getDB();

  const rows = (db.clientes || []).map((c,i)=>`
    <tr>
      <td>${escapeHtml(c.nombre || "")}</td>
      <td>${escapeHtml(c.direccion || "")}</td>
      <td>${escapeHtml(c.telefono || "")}</td>
      <td class="right">
        <button class="btn danger sm" onclick="deleteCliente(${i})">🗑</button>
      </td>
    </tr>
  `).join("");

  return `
    <div class="page-head">
      <div>
        <div class="big">Sucursales</div>
        <div class="muted small">Registro de Sucursales para enviar productos.</div>
      </div>
    </div>

    <div class="panel">
      <div class="grid-2">
        <div>
          <label>Nombre</label>
          <input id="cliNombre" placeholder="Ej: Tienda San Juan">
        </div>
        <div>
          <label>Dirección</label>
          <input id="cliDireccion" placeholder="Ej: Zona 1, Guatemala">
        </div>
        <div>
          <label>Teléfono</label>
          <input id="cliTelefono" placeholder="Ej: 5555-5555">
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button class="btn accent" onclick="addCliente()">➕ Agregar</button>
        </div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Dirección</th>
          <th>Teléfono</th>
          <th class="right">Acción</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="4" class="muted">Sin clientes</td></tr>`}
      </tbody>
    </table>
  `;
}

function addCliente() {
  const db = getDB();

  const nombre = (document.getElementById("cliNombre").value || "").trim();
  const direccion = (document.getElementById("cliDireccion").value || "").trim();
  const telefono = (document.getElementById("cliTelefono").value || "").trim();

  if(!nombre){ alert("Nombre es obligatorio"); return; }

  db.clientes.push({ nombre, direccion, telefono });
  saveDB(db);
  loadView("clientes");
}

function deleteCliente(index) {
  const db = getDB();
  db.clientes.splice(index, 1);
  saveDB(db);
  loadView("clientes");
}