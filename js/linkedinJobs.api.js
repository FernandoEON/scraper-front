const LINKEDIN_JOBS_SEARCH_URL =
  'https://www.linkedin.com/jobs/search-results/';
const EMPLEOS_API_URL =
  'http://localhost:3000/empleos';
const AUTH_KEYS = [
  'access_token',
  'token',
  'auth_token',
  'jwt',
  'jwt_token',
  'accessToken',
];

function getJobsStoredToken() {
  return AUTH_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
}

function getJobsAuthHeaders() {
  const token = getJobsStoredToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function fetchJobsEmpleos() {
  const headers = getJobsAuthHeaders();
  if (!headers) {
    throw new Error('No se encontró token de sesión.');
  }

  const response = await fetch(
    EMPLEOS_API_URL,
    { headers },
  );

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    throw new Error('Sesión expirada.');
  }

  if (!response.ok) {
    throw new Error(
      `No se pudieron cargar empleos (${response.status}).`,
    );
  }

  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.empleos)) return data.empleos;
  return [];
}

function buildLinkedinJobsSearchUrl({
  keyword,
  page = 1,
}) {
  const normalizedKeyword =
    String(keyword || '').trim();

  const normalizedPage =
    Number(page) > 0
      ? Number(page)
      : 1;

  const startOffset =
    Math.max(0, normalizedPage - 1) * 25;

  const url = new URL(
    LINKEDIN_JOBS_SEARCH_URL,
  );

  url.searchParams.set(
    'keywords',
    normalizedKeyword,
  );
  url.searchParams.set(
    'origin',
    'SEMANTIC_SEARCH_LANDING_PAGE',
  );
  url.searchParams.set(
    'start',
    String(startOffset),
  );

  return url.toString();
}

function openLinkedinJobsSearch(params) {
  const url =
    buildLinkedinJobsSearchUrl(params);

  window.open(
    url,
    '_blank',
    'noopener,noreferrer',
  );

  return url;
}
