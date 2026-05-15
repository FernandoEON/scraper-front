const API_URL = "http://localhost:3000/profesionales";
const CIUDADES_URL = "http://localhost:3000/ciudades";
const DEPARTAMENTOS_URL = "http://localhost:3000/departamentos";
const EMPLEOS_URL = "http://localhost:3000/empleos";
const AUTH_TOKEN_KEY = "access_token";
const LOGIN_URL = "Login.html";

const MIN_DB_LIMIT = 30;
const MAX_DB_LIMIT = 10000;

let currentDbPage = 1;
let totalDbPages = 1;
let dbLimit = MIN_DB_LIMIT;

let profesionales = [];
let profesionalesFiltrados = [];

let ciudadesCache = [];
let departamentosCache = [];
let empleosCache = [];
let selectedEmpleoId = null;

const profesionInput = document.getElementById("profesionInput");
const empleoInput = profesionInput;
const paisSelect = document.getElementById("paisSelect");
const ciudadInput = document.getElementById("ciudadInput");
const departamentoInput = document.getElementById("departamentoInput");
const limitInput = document.getElementById("limitInput");
const ciudadesList = document.getElementById("ciudadesList");
const departamentosList = document.getElementById("departamentosList");
const empleosList = document.getElementById("empleosList");

const filterForm = document.getElementById("filterForm");
const clearBtn = document.getElementById("clearBtn");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const logoutBtn = document.getElementById("logoutBtn");

const resultsContainer = document.getElementById("resultsContainer");
const resultsCount = document.getElementById("resultsCount");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const paginationContainer = document.getElementById("paginationContainer");

function getStoredToken() {
  return (
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("jwt_token") ||
    localStorage.getItem("accessToken")
  );
}

function getAuthHeaders() {
  const token = getStoredToken();

  if (!token) return null;

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function requireLogin(message = "Necesitas iniciar sesión.") {
  showError(message);

  setTimeout(() => {
    window.location.href = LOGIN_URL;
  }, 1500);
}

function showLoading(show) {
  loadingMessage.classList.toggle("d-none", !show);
}

function showError(message = "") {
  errorMessage.textContent = message;
  errorMessage.classList.toggle("d-none", !message);
}

function formatDate(dateString) {
  if (!dateString) return "Sin fecha";

  return new Date(dateString).toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function clampDbLimit(value) {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue)) return MIN_DB_LIMIT;

  return Math.min(MAX_DB_LIMIT, Math.max(MIN_DB_LIMIT, parsedValue));
}

function syncDbLimitFromInput() {
  dbLimit = clampDbLimit(limitInput.value);
  limitInput.value = dbLimit;
}

function normalizeListResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.empleos)) return response.empleos;

  return [];
}

function getEmpleoId(empleo) {
  return empleo?.id_empleo ?? empleo?.id ?? empleo?.idEmpleo ?? null;
}

function getEmpleoName(empleo) {
  return empleo?.nombre ?? empleo?.empleo ?? empleo?.titulo ?? empleo?.name ?? "";
}

function getProfesionalProfesion(profesional) {
  if (profesional?.profesion) return profesional.profesion;
  if (typeof profesional?.empleo === "string") return profesional.empleo;

  return getEmpleoName(profesional?.empleo);
}

function getProfesionalEmpleoId(profesional) {
  return (
    profesional?.id_empleo ??
    profesional?.empleo?.id_empleo ??
    profesional?.empleo?.id ??
    profesional?.empleo?.idEmpleo ??
    ""
  );
}

function syncSelectedEmpleo() {
  const empleoNombre = empleoInput.value.trim().toLowerCase();

  const empleo = empleosCache.find(
    (e) => getEmpleoName(e).toLowerCase() === empleoNombre
  );

  selectedEmpleoId = empleo ? getEmpleoId(empleo) : null;
}

async function fetchWithAuth(url) {
  const headers = getAuthHeaders();

  if (!headers) {
    requireLogin("No se encontró token de sesión.");
    throw new Error("Sin token");
  }

  const response = await fetch(url, { headers });

  if (response.status === 401 || response.status === 403) {
    requireLogin("Sesión expirada o no autorizada.");
    throw new Error("No autorizado");
  }

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  return response.json();
}

function buildProfesionalesUrl(page = 1) {
  const url = new URL(API_URL);

  url.searchParams.set("page", page);
  url.searchParams.set("limit", dbLimit);

  if (selectedEmpleoId) {
    url.searchParams.set("id_empleo", selectedEmpleoId);
  } else if (profesionInput.value.trim()) {
    url.searchParams.set("profesion", profesionInput.value.trim());
  }

  if (paisSelect.value.trim()) {
    url.searchParams.set("pais", paisSelect.value.trim());
  }

  if (ciudadInput.value.trim()) {
    url.searchParams.set("ciudad", ciudadInput.value.trim());
  }

  if (departamentoInput.value.trim()) {
    url.searchParams.set("departamento", departamentoInput.value.trim());
  }

  return url.toString();
}

async function loadOptionsFromBackend() {
  const [ciudades, departamentos, empleosResponse] = await Promise.all([
    fetchWithAuth(CIUDADES_URL),
    fetchWithAuth(DEPARTAMENTOS_URL),
    fetchWithAuth(EMPLEOS_URL),
  ]);
  const empleos = normalizeListResponse(empleosResponse);

  ciudadesCache = ciudades;
  departamentosCache = departamentos;
  empleosCache = empleos;

  ciudadesList.innerHTML = "";
  departamentosList.innerHTML = "";
  empleosList.innerHTML = "";

  ciudades.forEach((c) => {
    const option = document.createElement("option");
    option.value = c.nombre;
    ciudadesList.appendChild(option);
  });

  departamentos.forEach((d) => {
    const option = document.createElement("option");
    option.value = d.nombre;
    departamentosList.appendChild(option);
  });

  empleos.forEach((e) => {
    const empleoName = getEmpleoName(e);
    if (!empleoName) return;

    const option = document.createElement("option");
    option.value = empleoName;
    empleosList.appendChild(option);
  });
}

async function loadProfesionales(page = 1) {
  showLoading(true);
  showError();

  try {
    const response = await fetchWithAuth(buildProfesionalesUrl(page));

    profesionales = response.data ?? response.profesionales ?? response;
    profesionalesFiltrados = [...profesionales];

    currentDbPage = response.currentPage ?? page;
    totalDbPages = response.totalPages ?? 1;

    renderResults(profesionalesFiltrados);
    renderDbPagination(currentDbPage, totalDbPages);
  } catch (error) {
    console.error("Error al cargar profesionales:", error);
    showError("No se pudo conectar con el backend. Verifica que NestJS esté corriendo.");
  } finally {
    showLoading(false);
  }
}

function renderResults(data) {
  resultsContainer.innerHTML = "";
  resultsCount.textContent = `${data.length} profesional${data.length !== 1 ? "es" : ""}`;

  if (!data.length) {
    resultsContainer.innerHTML = `
      <div class="alert alert-warning">
        No se encontraron profesionales con los filtros seleccionados.
      </div>
    `;
    return;
  }

  data.forEach((profesional) => {
    const fullName = `${profesional.nombre ?? ""} ${profesional.apellido ?? ""}`.trim();
    const profesion = getProfesionalProfesion(profesional) || "Sin profesion";
    const pais = profesional.pais ?? "Sin país";
    const departamento = profesional.departamento?.nombre ?? "Sin departamento";
    const ciudad = profesional.ciudad?.nombre ?? "Sin ciudad";
    const fuente = profesional.fuente?.nombre ?? "Sin fuente";
    const fecha = formatDate(profesional.fecha_publicacion);

    const card = document.createElement("div");
    card.className = "card bg-dark my-3";

    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title text-light my-1">${fullName || "Sin nombre"}</h5>

        <p class="card-text my-2 fw-semibold text-info">${profesion}</p>

        <p class="card-text text-secondary my-2">
          <i class="bi bi-geo-alt me-1"></i>
          ${pais}, ${departamento}, ${ciudad}
        </p>

        <p class="card-text text-secondary my-2">
          <i class="bi bi-envelope me-1"></i>
          ${profesional.email ?? "Sin email"}
        </p>

        <p class="card-text text-secondary my-2">
          <i class="bi bi-telephone me-1"></i>
          ${profesional.telefono ?? "Sin teléfono"}
        </p>

        ${
          profesional.perfil_url
            ? `<a href="${profesional.perfil_url}" target="_blank" class="btn btn-outline-info btn-sm">
                Ver perfil
              </a>`
            : ""
        }

        <hr />

        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
          <h6 class="text-body-secondary">Fuente: ${fuente}</h6>
          <h6 class="text-body-secondary">${fecha}</h6>
        </div>
      </div>
    `;

    resultsContainer.appendChild(card);
  });
}

function renderDbPagination(currentPage, totalPages) {
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
      <button 
        class="page-link bg-dark text-light border-secondary"
        data-db-page="${page}"
        ${disabled ? "disabled" : ""}
      >
        ${label}
      </button>
    </li>
  `;

  let html = `
    <nav aria-label="Paginación de base de datos">
      <ul class="pagination justify-content-center flex-wrap gap-1">
        ${createPageItem("Anterior", currentPage - 1, currentPage === 1)}
  `;

  if (startPage > 1) {
    html += createPageItem("1", 1, false, currentPage === 1);

    if (startPage > 2) {
      html += `
        <li class="page-item disabled">
          <span class="page-link bg-dark text-light border-secondary">...</span>
        </li>
      `;
    }
  }

  for (let page = startPage; page <= endPage; page++) {
    html += createPageItem(page, page, false, page === currentPage);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `
        <li class="page-item disabled">
          <span class="page-link bg-dark text-light border-secondary">...</span>
        </li>
      `;
    }

    html += createPageItem(totalPages, totalPages, false, currentPage === totalPages);
  }

  html += `
        ${createPageItem("Siguiente", currentPage + 1, currentPage === totalPages)}
      </ul>
    </nav>
  `;

  paginationContainer.innerHTML = html;

  paginationContainer.querySelectorAll("[data-db-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = Number(btn.dataset.dbPage);

      if (!page || page === currentDbPage) return;

      loadProfesionales(page);
    });
  });
}

function applyFilters() {
  syncDbLimitFromInput();
  syncSelectedEmpleo();
  loadProfesionales(1);
}

function clearFilters() {
  profesionInput.value = "";
  empleoInput.value = "";
  paisSelect.value = "";
  ciudadInput.value = "";
  departamentoInput.value = "";
  selectedEmpleoId = null;
  limitInput.value = MIN_DB_LIMIT;
  syncDbLimitFromInput();

  loadProfesionales(1);
}

function hasActiveFilters() {
  return Boolean(
    profesionInput.value.trim() ||
    paisSelect.value.trim() ||
    ciudadInput.value.trim() ||
    departamentoInput.value.trim()
  );
}

function getFilterSummary() {
  const filtros = [];

  if (profesionInput.value.trim()) {
    filtros.push(`${selectedEmpleoId ? "Empleo" : "Profesion"}: ${profesionInput.value.trim()}`);
  }
  if (paisSelect.value.trim()) filtros.push(`País: ${paisSelect.value.trim()}`);
  if (ciudadInput.value.trim()) filtros.push(`Ciudad: ${ciudadInput.value.trim()}`);
  if (departamentoInput.value.trim()) filtros.push(`Estado/Departamento: ${departamentoInput.value.trim()}`);

  return filtros.join("\n");
}

function confirmFilteredDownload(type) {
  if (!hasActiveFilters()) return true;

  return confirm(
    `Vas a descargar un ${type} con filtros activos.\n\n${getFilterSummary()}\n\nSolo se exportarán los resultados filtrados de la página actual.`
  );
}

function getExportData(data) {
  return data.map((p) => ({
    id_profesional: p.id_profesional ?? "",
    nombre: p.nombre ?? "",
    apellido: p.apellido ?? "",
    profesion: getProfesionalProfesion(p) || "",
    id_empleo: getProfesionalEmpleoId(p),
    profesion_buscada: typeof p.empleo === "string" ? p.empleo : getEmpleoName(p.empleo),
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function convertToCSV(data, separator = ";") {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);

  const escapeCSVValue = (value) => {
    const stringValue = value == null ? "" : String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const rows = data.map((row) =>
    headers.map((header) => escapeCSVValue(row[header])).join(separator)
  );

  return [headers.map(escapeCSVValue).join(separator), ...rows].join("\n");
}

function downloadCSV() {
  if (!profesionalesFiltrados.length) {
    alert("No hay datos para exportar en CSV.");
    return;
  }

  if (!confirmFilteredDownload("CSV")) return;

  const exportData = getExportData(profesionalesFiltrados);
  const csvContent = "\uFEFFsep=;\n" + convertToCSV(exportData, ";");

  downloadFile(csvContent, "profesionales_db.csv", "text/csv;charset=utf-8;");
}

function downloadJSON() {
  if (!profesionalesFiltrados.length) {
    alert("No hay datos para exportar en JSON.");
    return;
  }

  if (!confirmFilteredDownload("JSON")) return;

  const exportData = getExportData(profesionalesFiltrados);
  const jsonContent = JSON.stringify(exportData, null, 2);

  downloadFile(jsonContent, "profesionales_db.json", "application/json;charset=utf-8;");
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("jwt");
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("accessToken");
}

async function handleLogout() {
  const headers = getAuthHeaders();

  clearSession();

  if (headers) {
    try {
      await fetch("http://localhost:3000/auth/logout", {
        method: "POST",
        headers,
      });
    } catch (error) {
      console.warn("Logout request failed:", error);
    }
  }

  window.location.href = LOGIN_URL;
}

ciudadInput.addEventListener("change", () => {
  const ciudadNombre = ciudadInput.value.trim().toLowerCase();

  const ciudad = ciudadesCache.find(
    (c) => c.nombre?.toLowerCase() === ciudadNombre
  );

  if (ciudad?.departamento?.nombre) {
    departamentoInput.value = ciudad.departamento.nombre;
  }
});

empleoInput.addEventListener("change", () => {
  syncSelectedEmpleo();
});

filterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  applyFilters();
});

clearBtn.addEventListener("click", clearFilters);
limitInput.addEventListener("change", () => {
  syncDbLimitFromInput();
  loadProfesionales(1);
});
downloadCsvBtn.addEventListener("click", downloadCSV);
downloadJsonBtn.addEventListener("click", downloadJSON);
logoutBtn.addEventListener("click", handleLogout);

async function initSearchDbView() {
  showLoading(true);
  showError();

  try {
    syncDbLimitFromInput();
    await loadOptionsFromBackend();
    await loadProfesionales(1);
  } catch (error) {
    console.error(error);
    showError("Error inicializando la vista.");
  } finally {
    showLoading(false);
  }
}

initSearchDbView();
