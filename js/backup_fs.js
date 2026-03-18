/* js/backup_fs.js
   File System Access backup (elige carpeta 1 vez) + admin-only
   Requiere: https:// o http://localhost
*/
(function(){
  "use strict";

  // Debe coincidir con tu DB
  const DB_KEY = "LAS_PICONAS_ERP_V2";
  const IDB_NAME = "LAS_PICONAS_BACKUP_FS";
  const IDB_STORE = "handles";
  const IDB_KEY = "backup_folder_handle";

  // ===== Helpers: sesión/rol =====
  function getSession(){
    try { return JSON.parse(localStorage.getItem("SESSION") || "null"); }
    catch { return null; }
  }
function isAdmin(){
  const s = getSession();
  return !!(s && String(s.rol || "").trim().toUpperCase() === "ADMIN");
}

  function assertFSAvailable(){
    if (!("showDirectoryPicker" in window)) {
      throw new Error("Tu navegador no soporta File System Access (usa Chrome/Edge).");
    }
    // Nota: en file:// suele fallar; en https o localhost funciona.
    const proto = location.protocol;
    if (proto !== "https:" && !(proto === "http:" && location.hostname === "localhost")) {
      throw new Error("File System Access requiere https:// o http://localhost (no file://).");
    }
  }
function fsAvailable(){
  const proto = location.protocol;
  const okProto = (proto === "https:" || (proto === "http:" && location.hostname === "localhost"));
  return okProto && ("showDirectoryPicker" in window);
}

function downloadJsonFile(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}
  // ===== IndexedDB (para guardar el handle de carpeta) =====
  function idbOpen(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("No se pudo abrir IndexedDB"));
    });
  }

  async function idbSet(key, val){
    const db = await idbOpen();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(val, key);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function idbGet(key){
    const db = await idbOpen();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => { db.close(); resolve(req.result || null); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  }

  // ===== DB payload =====
  function safeParse(s){
    try { return JSON.parse(s); } catch { return null; }
  }

  function buildBackupWrapper(reason){
    const dbRaw = localStorage.getItem(DB_KEY);
    const sessionRaw = localStorage.getItem("SESSION");
    return {
      meta: {
        app: DB_KEY,
        createdAt: Date.now(),
        createdAtIso: new Date().toISOString(),
        reason: reason || "auto",
        user: (() => {
          const sess = safeParse(sessionRaw);
          return sess?.user?.username || null;
        })(),
      },
      // OJO: aquí va el wrapper con keys (tu import ya debe soportarlo)
      keys: {
        [DB_KEY]: safeParse(dbRaw) ?? dbRaw,
        SESSION: safeParse(sessionRaw) ?? sessionRaw,
      }
    };
  }

  function nowStamp(){
    // 2026-03-03__21-15-01
    const d = new Date();
    const pad = (n)=> String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}__${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  }

  async function ensurePerm(dirHandle){
    // Pide permisos readwrite
    const opts = { mode: "readwrite" };
    let perm = await dirHandle.queryPermission?.(opts);
    if (perm !== "granted") perm = await dirHandle.requestPermission?.(opts);
    return perm === "granted";
  }

  async function writeJsonFile(dirHandle, filename, obj){
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([JSON.stringify(obj, null, 2)], { type:"application/json" }));
    await writable.close();
  }

  // ===== Public API =====
async function chooseBackupFolderFS(){
  try{
    if (!isAdmin()) throw new Error("Solo ADMIN puede seleccionar carpeta de backup.");

    // ✅ En file:// no se puede elegir carpeta. Aviso y salimos sin error fatal.
    if (!fsAvailable()) {
      alert(
        "Estás en modo pruebas (file://).\n\n" +
        "El navegador NO permite elegir carpeta en file://.\n" +
        "En este modo los backups se harán por DESCARGA automática.\n\n" +
        "Para elegir carpeta usa:\n" +
        "• http://localhost (servidor local)\n" +
        "• o https (GitHub Pages)"
      );
      return false;
    }

    // ✅ Modo carpeta (FS)
    const dir = await window.showDirectoryPicker({ id: "las_piconas_backup_folder", mode: "readwrite" });
    const ok = await ensurePerm(dir);
    if (!ok) throw new Error("Permiso denegado para escribir en la carpeta.");

    await idbSet(IDB_KEY, dir);

    await writeJsonFile(dir, "backup_folder_ok.json", { ok:true, savedAt: Date.now(), app: DB_KEY });

    if (typeof window.renderBackupFSStatus === "function") window.renderBackupFSStatus();
    return true;

  }catch(e){
    throw new Error("No se pudo seleccionar carpeta: " + (e?.message || e));
  }
}

  async function getBackupFolderHandle(){
    try{
      const dir = await idbGet(IDB_KEY);
      if (!dir) return null;
      const ok = await ensurePerm(dir);
      if (!ok) return null;
      return dir;
    }catch{
      return null;
    }
  }

async function backupNowFS(reason){
  const payload = buildBackupWrapper(reason || "manual");
  const stamp = nowStamp();

  // ✅ Si NO hay FS (file://), hacemos descarga
  if (!fsAvailable()) {
    downloadJsonFile(`backup_${stamp}.json`, payload);
    downloadJsonFile(`backup_latest.json`, payload); // opcional
    return true;
  }

  // ✅ Modo carpeta (FS)
  const dir = await getBackupFolderHandle();
  if (!dir) throw new Error("No hay carpeta de backup configurada (ADMIN debe elegirla).");

  await writeJsonFile(dir, `backup_${stamp}.json`, payload);
  await writeJsonFile(dir, `backup_latest.json`, payload);

  return true;
}

  // Hook para auto-backup cuando cambie el DB
  let debounce = null;
  function scheduleAuto(reason){
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(async ()=>{
      debounce = null;
      try{
        // No bloqueamos a usuarios no-admin: ellos NO eligen carpeta,
        // pero si la carpeta ya está configurada por admin, sí se guarda.
        await backupNowFS(reason || "auto");
      }catch{
        // silencio: si no hay carpeta o no hay permiso, no molestamos
      }
    }, 900);
  }

  const _setItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(k,v){
    _setItem(k,v);
    if (k === DB_KEY) scheduleAuto("localStorage.setItem DB");
  };

  window.addEventListener("storage", (e)=>{
    if (e.key === DB_KEY) scheduleAuto("storage event DB");
  });

  // Exponer globals (esto evita tus errores “not defined”)
  window.chooseBackupFolderFS = chooseBackupFolderFS;
  window.backupNowFS = backupNowFS;
  window.__getBackupFolderHandle__ = getBackupFolderHandle;

})();
