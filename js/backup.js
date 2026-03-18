// js/backup.js
(function () {
  const DB_KEY = "LAS_PICONAS_ERP_V2";

  // Ajustes
  const BACKUP_DEBOUNCE_MS = 1200;  // agrupa muchos cambios seguidos
  const MAX_AUTO_BACKUPS_PER_MIN = 6;

  let lastDownloadTs = 0;
  let downloadsThisMinute = 0;
  let minuteWindowStart = Date.now();
  let pendingTimer = null;

  function nowYmdHms() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() +
      "-" + pad(d.getMonth() + 1) +
      "-" + pad(d.getDate()) +
      "__" + pad(d.getHours()) +
      "-" + pad(d.getMinutes()) +
      "-" + pad(d.getSeconds())
    );
  }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function buildBackupPayload() {
    const dbRaw = localStorage.getItem(DB_KEY);
    const sessionRaw = localStorage.getItem("SESSION");

    return {
      meta: {
        app: "LAS_PICONAS_ERP_V2",
        createdAt: Date.now(),
        createdAtIso: new Date().toISOString(),
        user: (() => {
          const sess = safeJsonParse(sessionRaw);
          return sess?.user?.username || null;
        })(),
      },
      keys: {
        [DB_KEY]: safeJsonParse(dbRaw) ?? dbRaw,
        SESSION: safeJsonParse(sessionRaw) ?? sessionRaw,
      },
    };
  }

  function downloadJson(obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `BACKUP_LAS_PICONAS_${nowYmdHms()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function rateLimitOk() {
    const now = Date.now();
    if (now - minuteWindowStart >= 60_000) {
      minuteWindowStart = now;
      downloadsThisMinute = 0;
    }
    if (downloadsThisMinute >= MAX_AUTO_BACKUPS_PER_MIN) return false;
    downloadsThisMinute++;
    lastDownloadTs = now;
    return true;
  }

  function scheduleBackup(reason = "change") {
    // debounce
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      if (!rateLimitOk()) return;

      const payload = buildBackupPayload();
      payload.meta.reason = reason;
      downloadJson(payload);
    }, BACKUP_DEBOUNCE_MS);
  }

  // Hook: detecta cambios a localStorage del DB_KEY
  const _setItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    _setItem(k, v);
    if (k === DB_KEY) scheduleBackup("localStorage.setItem DB");
    return undefined;
  };

  // Si en el mismo tab se usa setDB/saveDB sin tocar setItem, igual cae aquí porque casi seguro llaman setItem.
  // Hook extra por si hay escrituras “raras”:
  window.addEventListener("storage", (e) => {
    if (e.key === DB_KEY) scheduleBackup("storage event DB");
  });

  // API manual (por si quieres botón "Backup ahora")
  window.__BACKUP_NOW__ = function (reason = "manual") {
    const payload = buildBackupPayload();
    payload.meta.reason = reason;
    downloadJson(payload);
  };
})();