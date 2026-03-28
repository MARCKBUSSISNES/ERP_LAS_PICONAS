// js/auth.js

function login(usuario, clave) {
  const db = getDB();
  const u = (usuario || "").trim().toLowerCase();
  const p = (clave || "").trim();

  const user = (db.usuarios || []).find(x =>
    (x.usuario || "").trim().toLowerCase() === u && String(x.clave || "").trim() === p
  );

  if (user) {
    // guarda sesión sin exponer clave
    localStorage.setItem("SESSION", JSON.stringify({ usuario: user.usuario, rol: user.rol }));
    return true;
  }
  return false;
}

function getSession() {
  try { return JSON.parse(localStorage.getItem("SESSION")); }
  catch { return null; }
}

function logout() {
    localStorage.removeItem("SESSION");
    location.reload();
}
function getCurrentUser(){
  const s = getSession();
  if(!s) return null;
  const db = getDB();
  return (db.usuarios||[]).find(u => (u.usuario||"").toLowerCase() === (s.usuario||"").toLowerCase()) || null;
}

function getRoleDef(roleName){
  const db = getDB();
  return (db.roles||[]).find(r => r.nombre === roleName) || null;
}

function can(permKey){
  const u = getCurrentUser();
  if(!u) return false;
  if(u.rol === "ADMIN") return true; // ADMIN siempre
  const role = getRoleDef(u.rol);
  return !!(role && role.permisos && role.permisos[permKey]);
}
function isAdmin(){
  const s = getSession();
  return s && String(s.rol||"").toUpperCase() === "ADMIN";
}

function canEditReceta(rec){
  if(!rec) return false;
  if(rec.locked) return isAdmin();    // 🔥 locked = solo admin
  return can("recetas_editar");       // normal
}
function deleteReceta(i){
  const db = getDB();
  const r = db.recetas[i];
  if(!canEditReceta(r)){
    alert("No tienes permiso para modificar esta receta.");
    return;
  }
  db.recetas.splice(i,1);
  saveDB(db);
  loadView("recetas");
}