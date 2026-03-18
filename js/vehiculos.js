// js/vehiculos.js

function renderVehiculos() {
  const db = getDB();

  const rows = (db.vehiculos || []).map((v,i)=>`
    <tr>
      <td>${escapeHtml(v.placa || "")}</td>
      <td>${escapeHtml(v.piloto || "")}</td>
      <td class="right">
        <button class="btn danger sm" onclick="deleteVehiculo(${i})">🗑</button>
      </td>
    </tr>
  `).join("");

  return `
    <div class="page-head">
      <div>
        <div class="big">Vehículos</div>
        <div class="muted small">Registro de vehículos para envíos y despachos.</div>
      </div>
    </div>

    <div class="panel">
      <div class="grid-2">
        <div>
          <label>Placa</label>
          <input id="vehPlaca" placeholder="Ej: P-123ABC">
        </div>
        <div>
          <label>Piloto</label>
          <input id="vehPiloto" placeholder="Nombre del piloto">
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button class="btn accent" onclick="addVehiculo()">➕ Agregar</button>
        </div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Placa</th>
          <th>Piloto</th>
          <th class="right">Acción</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="3" class="muted">Sin vehículos registrados</td></tr>`}
      </tbody>
    </table>
  `;
}

function addVehiculo() {
  const db = getDB();

  const placa = (document.getElementById("vehPlaca").value || "").trim();
  const piloto = (document.getElementById("vehPiloto").value || "").trim();

  if(!placa){ alert("La placa es obligatoria"); return; }

  db.vehiculos.push({ placa, piloto });
  saveDB(db);
  loadView("vehiculos");
}

function deleteVehiculo(index) {
  const db = getDB();
  db.vehiculos.splice(index, 1);
  saveDB(db);
  loadView("vehiculos");
}