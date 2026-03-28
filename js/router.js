// js/router.js

function setActiveSidebar(view){
  const buttons = document.querySelectorAll(".sidebar button[data-view]");
  buttons.forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

function loadView(view) {
  console.log("loadView =>", view);
  const container = document.getElementById("view-container");
  if(!container) return;

  setActiveSidebar(view);

  try {
    switch(view) {
      case "dashboard":
        container.innerHTML = renderDashboard();
        if (typeof afterRenderDashboard === "function") afterRenderDashboard();
        break;

      case "clientes":
        container.innerHTML = renderClientes();
        break;

      case "vehiculos":
        container.innerHTML = renderVehiculos();
        break;

      case "usuarios":
        container.innerHTML = renderUsuarios();
        break;

      case "recetas":
        container.innerHTML = renderRecetas();
        break;

      case "produccion":
        container.innerHTML = renderProduccion();
        break;

      case "inventarioPT":
        container.innerHTML = renderInventarioPT();
        break;

      case "mp":
        container.innerHTML = renderMateriasPrimas();
        break;

      case "comprasMP":
        container.innerHTML = renderComprasMP();
        if (typeof syncCompraMPUnits === "function") syncCompraMPUnits();
        break;

      case "envios":
        container.innerHTML = renderEnvios();
        break;

      case "historialEnvios":
        container.innerHTML = renderHistorialEnvios();
        break;

      default:
        container.innerHTML = renderDashboard();
        if (typeof afterRenderDashboard === "function") afterRenderDashboard();
        break;
    }
  } catch (err) {
    console.error("Error cargando vista:", view, err);
    container.innerHTML = `
      <div class="panel">
        <h2>Error en vista: ${escapeHtml(String(view))}</h2>
        <div class="muted">Mira la consola (F12) para ver el detalle.</div>
      </div>
    `;
  }
}