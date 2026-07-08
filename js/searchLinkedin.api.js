const LINKEDIN_SEARCH_URL = "http://localhost:3000/scraper/linkedin/people";

async function searchLinkedinPeople(params) {
  const query = new URLSearchParams({
    profession: params.profession || "",
    country: params.country || "",
    pageStart: String(params.pageStart ?? 1),
    pageEnd: String(params.pageEnd ?? 1),
    downloadPdf: String(params.downloadPdf ?? false),
  }).toString();

  const url = `${LINKEDIN_SEARCH_URL}?${query}`;

  if (typeof fetchJsonWithAuth === "function") {
    return fetchJsonWithAuth(url, { method: "GET" });
  }

  const response = await fetch(url, { method: "GET" });
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    const data = JSON.parse(text);
    if (!response.ok) {
      throw new Error(data?.message || `Error HTTP: ${response.status}`);
    }
    return data;
  } catch {
    if (!response.ok) {
      throw new Error(text || `Error HTTP: ${response.status}`);
    }
    return text;
  }
}
