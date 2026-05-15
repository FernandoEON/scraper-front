const pageIndicator = document.getElementById("pageIndicator");

const autoSaveDbBtn = document.getElementById("autoSaveDbBtn");


let selectedCiudadId = null;
let selectedDepartamentoId = null;

let currentPage = 1;
let totalPages = 1;

let profesionales = [];
let profesionalesFiltrados = [];

let ciudadesCache = [];
let departamentosCache = [];

const paginationContainer = document.getElementById("paginationContainer");

const profesionInput = document.getElementById("profesionInput");
const ciudadInput = document.getElementById("ciudadInput");
const departamentoInput = document.getElementById("departamentoInput");
const ciudadesList = document.getElementById("ciudadesList");
const departamentosList = document.getElementById("departamentosList");

const scrapeBtn = document.getElementById("scrapeBtn");
const savedDbBtn = document.getElementById("savedDbBtn");

const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const logoutBtn = document.getElementById("logoutBtn");

const resultsContainer = document.getElementById("resultsContainer");
const resultsCount = document.getElementById("resultsCount");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const AUTO_SAVE_DELAY_MS = 3000;

function showLoading(show, text = "Cargando profesionales...") {
  loadingMessage.textContent = text;
  loadingMessage.classList.toggle("d-none", !show);
}

function showError(message = "") {
  errorMessage.textContent = message;
  errorMessage.classList.toggle("d-none", !message);
}

function formatDate(dateString) {
  if (!dateString) return "Sin fecha";
  return new Date(dateString).toLocaleDateString("es-SV");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSavePayload(data) {
  return data.map((p) => ({
    nombre: p.nombre ?? "",
    apellido: p.apellido ?? "",
    profesion: p.profesion ?? "",
    pais: p.pais ?? "Estados Unidos",

    id_departamento: selectedDepartamentoId,
    id_ciudad: selectedCiudadId,
    id_fuente: 5,

    email: p.email === "No encontrado" ? null : p.email,
    telefono: p.telefono ?? null,
    perfil_url: p.perfil_url ?? null,
    fecha_publicacion: p.fecha_publicacion,
  }));
}

function getSavedCount(saveResponse, fallbackCount) {
  if (Array.isArray(saveResponse)) return saveResponse.length;
  if (Array.isArray(saveResponse?.data)) return saveResponse.data.length;

  return (
    saveResponse?.count ??
    saveResponse?.saved ??
    saveResponse?.inserted ??
    saveResponse?.affected ??
    fallbackCount
  );
}

function normalizeListResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.ciudades)) return response.ciudades;
  if (Array.isArray(response?.departamentos)) return response.departamentos;

  return [];
}

function mapDoctorToProfesional(doctor, index) {
  const today = new Date().toISOString();

  return {
    id_profesional: index + 1,
    nombre: doctor.name ?? "Sin nombre",
    apellido: "",
    profesion: doctor.profession ?? "No encontrado",
    pais: "Estados Unidos",
    departamento: { nombre: doctor.state ?? "No encontrado" },
    ciudad: { nombre: doctor.city ?? "No encontrado" },
    fuente: { nombre: "Páginas Amarillas" },
    fecha_publicacion: today,
    email: "No encontrado",
    telefono: doctor.phone ?? "Sin teléfono",
    perfil_url: doctor.profileUrl ?? "",
    fecha_creacion: today,
    rawLocality: doctor.rawLocality ?? "",
    categories: doctor.categories ?? [],
  };
}

function render(data) {
  resultsContainer.innerHTML = "";
  resultsCount.textContent = `${data.length} profesional${data.length !== 1 ? "es" : ""}`;

  if (!data.length) {
    resultsContainer.innerHTML = `
      <div class="alert alert-warning">
        No se encontraron profesionales.
      </div>
    `;
    return;
  }

  data.forEach((p) => {
    const fullName = `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim();
    const fuente = p.fuente?.nombre ?? "Sin fuente";
    const fecha = formatDate(p.fecha_publicacion);
    const profesion = p.profesion ?? "Sin profesión";
    const departamento = p.departamento?.nombre ?? "Sin departamento";
    const ciudad = p.ciudad?.nombre ?? "Sin ciudad";

    const div = document.createElement("div");
    div.className = "card bg-dark my-3";

    div.innerHTML = `
      <div class="card-body">
        <h5 class="card-title text-light">${fullName || "Sin nombre"}</h5>

        <p class="card-text fw-semibold text-info">${profesion}</p>

        <p class="card-text text-secondary">
          <i class="bi bi-geo-alt me-1"></i>
          ${p.pais ?? "Sin país"}, ${departamento}, ${ciudad}
        </p>

        <p class="card-text text-secondary">
          <i class="bi bi-envelope me-1"></i>
          ${p.email ?? "Sin email"}
        </p>

        <p class="card-text text-secondary">
          <i class="bi bi-telephone me-1"></i>
          ${p.telefono ?? "Sin teléfono"}
        </p>

        ${
          p.perfil_url
            ? `<a href="${p.perfil_url}" target="_blank" class="btn btn-outline-info btn-sm">
                Ver perfil
              </a>`
            : ""
        }

        <hr />

        <div class="d-flex justify-content-between">
          <h6 class="text-body-secondary">Fuente: ${fuente}</h6>
          <h6 class="text-body-secondary">${fecha}</h6>
        </div>
      </div>
    `;

    resultsContainer.appendChild(div);
  });
}

async function handleScrape(page = 1) {
  showLoading(true, "Ejecutando scraper...");
  showError();

  try {
    const data = await fetchScraper(page);

    currentPage = data.currentPage ?? page;
    totalPages = data.totalPages ?? 1;

    profesionales = (data.doctors ?? []).map(mapDoctorToProfesional);
    profesionalesFiltrados = profesionales;

    render(profesionalesFiltrados);
    renderPagination(currentPage, totalPages);
  } catch (error) {
    console.error(error);
    showError("Error ejecutando scraper.");
  } finally {
    showLoading(false);
  }
}

function renderPagination(currentPage, totalPages) {
  
if (totalPages > 1) {
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    pageIndicator.classList.remove("d-none");
  } else {
    pageIndicator.classList.add("d-none");
  }
  
  paginationContainer.innerHTML = "";

  if (!totalPages || totalPages <= 1) return;

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  const createPageItem = (label, page, disabled = false, active = false) => `
    <li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
      <button class="page-link bg-dark text-light border-secondary"
        data-page="${page}"
        ${disabled ? "disabled" : ""}>
        ${label}
      </button>
    </li>
  `;

  let html = `
    <nav aria-label="Paginación de resultados">
      <ul class="pagination justify-content-center flex-wrap gap-1">
        ${createPageItem("Anterior", currentPage - 1, currentPage === 1)}
  `;

  if (startPage > 1) {
    html += createPageItem("1", 1, false, currentPage === 1);
    if (startPage > 2) {
      html += `<li class="page-item disabled"><span class="page-link bg-dark text-light border-secondary">...</span></li>`;
    }
  }

  for (let page = startPage; page <= endPage; page++) {
    html += createPageItem(page, page, false, page === currentPage);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<li class="page-item disabled"><span class="page-link bg-dark text-light border-secondary">...</span></li>`;
    }

    html += createPageItem(totalPages, totalPages, false, currentPage === totalPages);
  }

  html += `
        ${createPageItem("Siguiente", currentPage + 1, currentPage === totalPages)}
      </ul>
    </nav>
  `;

  paginationContainer.innerHTML = html;

  paginationContainer.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = Number(btn.dataset.page);
      if (!page || page === currentPage) return;
      handleScrape(page);
    });
  });
}

// function clearFilters() {
//   profesionInput.value = "";
//   ciudadInput.value = "";
//   departamentoInput.value = "";

//   selectedCiudadId = null;
//   selectedDepartamentoId = null;

//   profesionalesFiltrados = [...profesionales];
//   render(profesionalesFiltrados);
// }

function getExportData(data) {
  return data.map((p) => ({
    id_profesional: p.id_profesional ?? "",
    nombre: p.nombre ?? "",
    apellido: p.apellido ?? "",
    profesion: p.profesion ?? "",
    pais: p.pais ?? "",
    departamento: p.departamento?.nombre ?? "",
    ciudad: p.ciudad?.nombre ?? "",
    fuente: p.fuente?.nombre ?? "",
    fecha_publicacion: p.fecha_publicacion ?? "",
    email: p.email ?? "",
    telefono: p.telefono ?? "",
    perfil_url: p.perfil_url ?? "",
    fecha_creacion: p.fecha_creacion ?? "",
  }));
}

function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();

  URL.revokeObjectURL(url);
}

function convertToCSV(data, separator = ";") {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);

  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
  };

  const rows = data.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(separator)
  );

  return [
    headers.map(escapeCSV).join(separator),
    ...rows,
  ].join("\n");
}

function downloadCSV() {
  const data = getExportData(profesionalesFiltrados);
  if (!data.length) return alert("No hay datos para exportar.");

  const csv = "\uFEFFsep=;\n" + convertToCSV(data, ";");
  downloadFile(csv, "profesionales.csv", "text/csv;charset=utf-8;");
}

function downloadJSON() {
  const data = getExportData(profesionalesFiltrados);
  if (!data.length) return alert("No hay datos para exportar.");

  downloadFile(
    JSON.stringify(data, null, 2),
    "profesionales.json",
    "application/json"
  );
}

function handleLogout() {
  localStorage.clear();
  window.location.href = "Login.html";
}

async function loadFilterOptions() {
  try {
    ciudadesList.innerHTML = "";
    departamentosList.innerHTML = "";

    const [ciudadesResponse, departamentosResponse] = await Promise.all([
      fetchCiudades(),
      fetchDepartamentos(),
    ]);

    const ciudades = normalizeListResponse(ciudadesResponse);
    const departamentos = normalizeListResponse(departamentosResponse);

    ciudadesCache = ciudades;
    departamentosCache = departamentos;

    ciudades.forEach((c) => {
      if (!c?.nombre) return;

      const option = document.createElement("option");
      option.value = c.nombre;
      ciudadesList.appendChild(option);
    });

    departamentos.forEach((d) => {
      if (!d?.nombre) return;

      const option = document.createElement("option");
      option.value = d.nombre;
      departamentosList.appendChild(option);
    });

    if (!ciudades.length || !departamentos.length) {
      showError("No se encontraron ciudades o estados para mostrar.");
      return;
    }

    showError();
  } catch (error) {
    console.error("Error cargando opciones:", error);
    showError("No se pudieron cargar las ciudades y estados. Verifica sesión y backend.");
  }
}

ciudadInput.addEventListener("change", () => {
  const ciudadNombre = ciudadInput.value.trim().toLowerCase();

  const ciudad = ciudadesCache.find(
    (c) => c.nombre.toLowerCase() === ciudadNombre
  );

  if (!ciudad) {
    selectedCiudadId = null;
    selectedDepartamentoId = null;
    return;
  }

  selectedCiudadId = ciudad.id_ciudad;

  if (ciudad.departamento) {
    departamentoInput.value = ciudad.departamento.nombre;
    selectedDepartamentoId = ciudad.departamento.id_departamento;
  }
});

async function handleSaveToDb() {
  try {
    if (!profesionalesFiltrados.length) {
      return alert("No hay profesionales para guardar.");
    }

    if (!selectedCiudadId || !selectedDepartamentoId) {
      return alert("Selecciona una ciudad válida de la lista antes de guardar.");
    }

    const payload = buildSavePayload(profesionalesFiltrados);

    console.log("Payload a guardar:", payload);

    const saveResponse = await saveProfesionales(payload);
    const savedCount = getSavedCount(saveResponse, payload.length);

    alert(`Profesionales guardados correctamente: ${savedCount}`);
  } catch (error) {
    console.error(error);
    alert("Error guardando profesionales.");
  }
}

async function handleAutoSavePagesToDb() {
  const MAX_AUTO_PAGES = 5;
  const startPage = currentPage || 1;
  const targetPage = startPage + MAX_AUTO_PAGES;

  if (!selectedCiudadId || !selectedDepartamentoId) {
    return alert("Selecciona una ciudad válida de la lista antes de auto guardar.");
  }

  const confirmSave = confirm(
    `Se scrapearán y guardarán hasta ${MAX_AUTO_PAGES} páginas en la base de datos.\n\n¿Deseas continuar?`
  );

  if (!confirmSave) return;

  showLoading(true, "Auto guardando páginas...");
  showError();

  try {
    let totalSaved = 0;
    let lastProcessedPage = startPage - 1;

    for (let page = startPage; page < targetPage; page++) {
      showLoading(true, `Scrapeando y guardando página ${page} de ${MAX_AUTO_PAGES}...`);

      const data = await fetchScraper(page);
      totalPages = data.totalPages ?? totalPages;

      const profesionalesPage = (data.doctors ?? []).map(mapDoctorToProfesional);

      if (!profesionalesPage.length) break;

      const payload = buildSavePayload(profesionalesPage);
      const saveResponse = await saveProfesionales(payload);
      const savedCount = getSavedCount(saveResponse, payload.length);

      totalSaved += savedCount;
      lastProcessedPage = page;

      console.log(`Página ${page} guardada:`, {
        enviados: payload.length,
        guardados: savedCount,
        respuesta: saveResponse,
      });

      if (data.totalPages && page >= data.totalPages) {
        break;
      }

      if (page < targetPage - 1) {
        showLoading(true, `Esperando ${AUTO_SAVE_DELAY_MS / 1000}s antes de la siguiente página...`);
        await wait(AUTO_SAVE_DELAY_MS);
      }
    }

    currentPage = lastProcessedPage + 1;
    renderPagination(currentPage, totalPages);

    alert(`Auto guardado completado. Registros guardados: ${totalSaved}. Siguiente página: ${currentPage}`);
  } catch (error) {
    console.error(error);
    showError("Error en el auto guardado.");
  } finally {
    showLoading(false);
  }
}

scrapeBtn.addEventListener("click", () => handleScrape(1));
downloadCsvBtn.addEventListener("click", downloadCSV);
downloadJsonBtn.addEventListener("click", downloadJSON);
logoutBtn.addEventListener("click", handleLogout);
savedDbBtn.addEventListener("click", handleSaveToDb);
autoSaveDbBtn?.addEventListener("click", handleAutoSavePagesToDb);

loadFilterOptions();
