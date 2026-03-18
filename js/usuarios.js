// js/usuarios.js
console.log("[usuarios.js] cargado OK");

// ===== Helpers (solo para este módulo) =====
function getSessionUsuarios(){
  try { return JSON.parse(localStorage.getItem("SESSION") || "null"); }
  catch { return null; }
}
function isAdminUsuarios(){
  const s = getSessionUsuarios();
  const role = String(s?.rol || s?.user?.rol || s?.user?.role || "").trim().toUpperCase();
  return role === "ADMIN" || role === "ADMINISTRADOR" || role === "SUPERADMIN" || role === "OWNER";
}
function smallAvatarHtml(dataUrl){
  if(!dataUrl) return `<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10)"></div>`;
  return `<img src="${dataUrl}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,.12)" />`;
}

// Temp avatar for "Crear usuario"
let __newUserAvatar = "";

async function optimizeImageForStorage(file, opts = {}){
  const {
    maxW = 220,
    maxH = 220,
    quality = 0.72,
    mimeType = "image/jpeg"
  } = opts;

  return new Promise((resolve, reject) => {
    if(!file) return resolve("");

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        const scale = Math.min(maxW / width, maxH / height, 1);
        const newW = Math.max(1, Math.round(width * scale));
        const newH = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = newW;
        canvas.height = newH;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if(!ctx){
          reject(new Error("No se pudo crear contexto canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, newW, newH);

        try{
          const out = canvas.toDataURL(mimeType, quality);
          resolve(out);
        }catch(err){
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function avatarTooLarge(dataUrl, maxChars = 350000){
  return String(dataUrl || "").length > maxChars;
}

function renderUsuarios(){
  if(!can("usuarios")){
    return `<div class="panel"><div class="big">Acceso denegado</div><div class="muted">No tienes permiso para administrar usuarios.</div></div>`;
  }

  const db = getDB();
  const roles = db.roles || [];
  const users = db.usuarios || [];

  const roleOpts = roles.map(r=>`<option value="${escapeHtml(r.nombre)}">${escapeHtml(r.nombre)}</option>`).join("");

  const rows = users.map((u,i)=>`
    <tr>
      <td style="display:flex;align-items:center;gap:10px;">
        ${smallAvatarHtml(u.avatar)}
        <div>
          <div style="font-weight:800;">${escapeHtml(u.usuario)}</div>
          <div class="muted small">${escapeHtml(u.rol || "")}</div>
        </div>
      </td>

      <td class="right">
        ${
          isAdminUsuarios()
          ? `
            <button class="btn secondary sm" onclick="editUsuario(${i})">✏️</button>
            <button class="btn secondary sm" onclick="triggerUserAvatar(${i})">🖼️</button>
            <input id="uAvatarEdit_${i}" type="file" accept="image/*" style="display:none" onchange="setUserAvatarFromInput(${i}, this)">
          `
          : `<span class="muted small">Solo ADMIN</span>`
        }

        ${
          (u.usuario||"").toLowerCase()==="juan luis"
            ? `<span class="muted small" style="margin-left:8px;">Protegido</span>`
            : `
              <button class="btn danger sm" style="margin-left:8px;" onclick="deleteUsuario(${i})">🗑</button>
            `
        }
      </td>
    </tr>
  `).join("");

  // roles table
  const roleRows = roles.map((r,idx)=>`
    <tr>
      <td style="font-weight:800">${escapeHtml(r.nombre)}</td>
      <td>
        ${renderPermTag("usuarios", r.permisos?.usuarios)}
        ${renderPermTag("recetas_editar", r.permisos?.recetas_editar)}
        ${renderPermTag("mp_editar", r.permisos?.mp_editar)}
        ${renderPermTag("compras_mp", r.permisos?.compras_mp)}
        ${renderPermTag("produccion", r.permisos?.produccion)}
        ${renderPermTag("envios", r.permisos?.envios)}
        ${renderPermTag("exportar", r.permisos?.exportar)}
      </td>
      <td class="right">
        ${r.nombre==="ADMIN" ? `<span class="muted small">Base</span>` : `
          <button class="btn secondary sm" onclick="editRole(${idx})">Editar</button>
        `}
      </td>
    </tr>
  `).join("");

  return `
    <div class="page-head">
      <div>
        <div class="big">Usuarios & Roles</div>
        <div class="muted small">Control de acceso por permisos (ERP).</div>
      </div>
    </div>

    <div class="panel">
      <div class="grid-2">
        <div>
          <div class="big" style="font-size:16px;">Crear usuario</div>

          <label>Usuario</label>
          <input id="uName" placeholder="Ej: maria">

          <label>Clave</label>
          <input id="uPass" type="password" placeholder="••••••••">

          <label>Rol</label>
          <select id="uRole">${roleOpts}</select>

          <label style="margin-top:10px;">Foto de perfil (opcional)</label>
          <div style="display:flex;align-items:center;gap:10px;">
            <div id="newUserAvatarPreview">${smallAvatarHtml(__newUserAvatar)}</div>
            <input id="uAvatar" type="file" accept="image/*" onchange="setNewUserAvatar(this)">
            <button class="btn secondary sm" onclick="clearNewUserAvatar()">Quitar</button>
          </div>

          <button class="btn accent" style="margin-top:10px;" onclick="addUsuario()">➕ Agregar</button>
        </div>

        <div>
          <div class="big" style="font-size:16px;">Crear rol</div>
          <label>Nombre del rol</label>
          <input id="rName" placeholder="Ej: CAJERO">
          <div class="row">
            <div><label><input type="checkbox" id="p_usuarios"> Usuarios</label></div>
            <div><label><input type="checkbox" id="p_recetas"> Editar Recetas</label></div>
          </div>
          <div class="row">
            <div><label><input type="checkbox" id="p_mp"> Editar MP</label></div>
            <div><label><input type="checkbox" id="p_compras"> Compras MP</label></div>
          </div>
          <div class="row">
            <div><label><input type="checkbox" id="p_prod" checked> Producción</label></div>
            <div><label><input type="checkbox" id="p_env" checked> Envíos</label></div>
          </div>
          <div class="row">
            <div><label><input type="checkbox" id="p_exp"> Exportar</label></div>
          </div>
          <button class="btn accent" onclick="addRole()">➕ Crear rol</button>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:14px;">
      <div class="big" style="font-size:16px;">Usuarios</div>
      <table class="table">
        <thead><tr><th>Usuario</th><th class="right">Acción</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="2" class="muted">Sin usuarios</td></tr>`}</tbody>
      </table>
    </div>

    <div class="panel" style="margin-top:14px;">
      <div class="big" style="font-size:16px;">Roles</div>
      <table class="table">
        <thead><tr><th>Rol</th><th>Permisos</th><th class="right">Acción</th></tr></thead>
        <tbody>${roleRows}</tbody>
      </table>
      <div class="muted small" style="margin-top:8px;">Nota: ADMIN tiene acceso total.</div>
    </div>
  `;
}

function renderPermTag(name, ok){
  const cls = ok ? "green" : "red";
  const label = name.replaceAll("_"," ");
  return `<span class="tag ${cls}" style="margin-right:6px;">${escapeHtml(label)}</span>`;
}

// ===== Avatar: crear usuario =====
async function setNewUserAvatar(input){
  const file = input?.files?.[0];
  if(!file) return;

  try{
    const optimized = await optimizeImageForStorage(file, {
      maxW: 220,
      maxH: 220,
      quality: 0.70,
      mimeType: "image/jpeg"
    });

    if(avatarTooLarge(optimized)){
      alert("La imagen sigue siendo muy pesada. Usa una foto más pequeña.");
      input.value = "";
      return;
    }

    __newUserAvatar = optimized;
    // refrescar vista sin perder campos ya llenados (simple: recargar modulo)
    loadView("usuarios");
  }catch(err){
    console.error("[usuarios.js] Error optimizando avatar nuevo:", err);
    alert("No se pudo procesar la imagen.");
  }
}

function clearNewUserAvatar(){
  __newUserAvatar = "";
  loadView("usuarios");
}

// ===== Usuarios CRUD =====
function addUsuario(){
  const db = getDB();
  const usuario = (document.getElementById("uName").value||"").trim();
  const clave = (document.getElementById("uPass").value||"").trim();
  const rol = (document.getElementById("uRole").value||"").trim();

  if(!usuario || !clave){ alert("Usuario y clave son obligatorios."); return; }
  if((db.usuarios||[]).some(u => (u.usuario||"").toLowerCase() === usuario.toLowerCase())){
    alert("Ese usuario ya existe."); return;
  }

  db.usuarios.push({ usuario, clave, rol: rol || "OPERADOR", avatar: avatarTooLarge(__newUserAvatar) ? "" : (__newUserAvatar || "") });
  __newUserAvatar = "";
  saveDB(db);
  loadView("usuarios");
}

function deleteUsuario(i){
  const db = getDB();
  const u = db.usuarios[i];
  if(!u) return;
  if((u.usuario||"").toLowerCase() === "juan luis"){
    alert("No se puede eliminar el ADMIN principal.");
    return;
  }
  db.usuarios.splice(i,1);
  saveDB(db);
  loadView("usuarios");
}

// ===== Editar usuario (solo ADMIN) =====
async function editUsuario(i){
  if(!isAdminUsuarios()){
    await mbAlert("Solo ADMIN puede editar usuarios.");
    return;
  }

  const db = getDB();
  const u = db.usuarios[i];
  if(!u) return;

  const nuevoUsuario = await mbPrompt("Usuario:", u.usuario || "", "Editar usuario");
  if(nuevoUsuario === null) return;

  const nuevoRol = await mbPrompt("Rol:", u.rol || "OPERADOR", "Editar rol");
  if(nuevoRol === null) return;

  const nuevaClave = await mbPrompt("Nueva clave (deja vacío para mantener la actual):", "", "Cambiar clave");
  if(nuevaClave === null) return;

  const usuarioFinal = String(nuevoUsuario||"").trim();
  const rolFinal = String(nuevoRol||"").trim().toUpperCase();

  if(!usuarioFinal){ await mbAlert("Usuario no puede quedar vacío."); return; }

  // evitar duplicados si cambian usuario
  if((db.usuarios||[]).some((x,idx)=>idx!==i && (x.usuario||"").toLowerCase() === usuarioFinal.toLowerCase())){
    await mbAlert("Ese usuario ya existe."); return;
  }

  u.usuario = usuarioFinal;
  u.rol = rolFinal || "OPERADOR";
  if(String(nuevaClave||"").trim()){
    u.clave = String(nuevaClave).trim();
  }

  saveDB(db);
  loadView("usuarios");
}

// ===== Avatar editar usuario (solo ADMIN) =====
function triggerUserAvatar(i){
  if(!isAdminUsuarios()){
    alert("Solo ADMIN puede cambiar foto de perfil.");
    return;
  }
  const inp = document.getElementById(`uAvatarEdit_${i}`);
  if(inp) inp.click();
}

async function setUserAvatarFromInput(i, input){
  if(!isAdminUsuarios()){
    alert("Solo ADMIN puede cambiar foto de perfil.");
    return;
  }
  const file = input?.files?.[0];
  if(!file) return;

  const db = getDB();
  const u = db.usuarios[i];
  if(!u) return;

  try{
    const optimized = await optimizeImageForStorage(file, {
      maxW: 220,
      maxH: 220,
      quality: 0.70,
      mimeType: "image/jpeg"
    });

    if(avatarTooLarge(optimized)){
      alert("La imagen sigue siendo muy pesada. Usa una foto más pequeña.");
      input.value = "";
      return;
    }

    u.avatar = optimized;
    saveDB(db);
    loadView("usuarios");
  }catch(err){
    console.error("[usuarios.js] Error guardando avatar de usuario:", err);
    alert("No se pudo procesar la imagen.");
  }
}

// ===== Roles =====
function addRole(){
  const db = getDB();
  db.roles = db.roles || [];

  const nombre = (document.getElementById("rName").value||"").trim().toUpperCase();
  if(!nombre){ alert("Nombre de rol es obligatorio."); return; }
  if(db.roles.some(r => r.nombre === nombre)){ alert("Ese rol ya existe."); return; }

  const permisos = {
    usuarios: !!document.getElementById("p_usuarios").checked,
    recetas_editar: !!document.getElementById("p_recetas").checked,
    mp_editar: !!document.getElementById("p_mp").checked,
    compras_mp: !!document.getElementById("p_compras").checked,
    produccion: !!document.getElementById("p_prod").checked,
    envios: !!document.getElementById("p_env").checked,
    exportar: !!document.getElementById("p_exp").checked,
  };

  db.roles.push({ nombre, permisos });
  saveDB(db);
  loadView("usuarios");
}

async function editRole(idx){
  const db = getDB();
  const r = (db.roles||[])[idx];
  if(!r || r.nombre==="ADMIN") return;

  const nuevo = await mbPrompt("Editar nombre del rol:", r.nombre, "Editar rol");
  if(nuevo === null) return;

  const name = nuevo.trim().toUpperCase();
  if(!name) return;
  if(db.roles.some((x,i)=>i!==idx && x.nombre===name)){
    await mbAlert("Ya existe un rol con ese nombre."); return;
  }
  r.nombre = name;
  saveDB(db);
  loadView("usuarios");
}