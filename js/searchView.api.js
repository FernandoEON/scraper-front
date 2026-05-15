const API_URL = "http://localhost:3000/profesionales";
const SCRAPER_URL = "http://localhost:3000/hospitaljobs/scrape-doctors";
const CIUDADES_URL = "http://localhost:3000/ciudades";
const DEPARTAMENTOS_URL = "http://localhost:3000/departamentos";
const LOGIN_URL = "Login.html";
const AUTH_KEYS = [
  "access_token",
  "token",
  "auth_token",
  "jwt",
  "jwt_token",
  "accessToken",
];

function getStoredToken() {
  return AUTH_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
}

function getAuthHeaders() {
  const token = getStoredToken();

  if (!token) return null;

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function redirectToLogin() {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
  window.location.href = LOGIN_URL;
}

function ensureAuthHeaders() {
  const headers = getAuthHeaders();

  if (!headers) {
    redirectToLogin();
    throw new Error("No hay token de sesion");
  }

  return headers;
}

async function parseResponse(response) {
  const responseText = await response.text();

  if (!responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    return { message: responseText };
  }
}

async function fetchJsonWithAuth(url, options = {}) {
  const headers = ensureAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {}),
    },
  });

  const data = await parseResponse(response);

  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error("Sesion expirada o no autorizada");
  }

  if (!response.ok) {
    throw new Error(data?.message || `Error HTTP: ${response.status}`);
  }

  return data;
}

async function fetchProfesionales() {
  return fetchJsonWithAuth(API_URL);
}

async function fetchCiudades() {
  return fetchJsonWithAuth(CIUDADES_URL);
}

async function fetchDepartamentos() {
  return fetchJsonWithAuth(DEPARTAMENTOS_URL);
}

async function fetchScraper(page = 1) {
  const profesion = document.getElementById("profesionInput").value.trim();
  const ciudad = document.getElementById("ciudadInput").value.trim();
  const departamento = document.getElementById("departamentoInput").value.trim();

  const filters = {
    ...(profesion && { profesion }),
    ...(ciudad && { ciudad }),
    ...(departamento && { departamento }),
    page,
  };

  return fetchJsonWithAuth(SCRAPER_URL, {
    method: "POST",
    body: JSON.stringify(filters),
  });
}

async function saveProfesionales(profesionales) {
  return fetchJsonWithAuth(`${API_URL}/bulk`, {
    method: "POST",
    body: JSON.stringify(profesionales),
  });
}
