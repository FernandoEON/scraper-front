const LINKEDIN_PEOPLE_SEARCH_URL =
  'https://www.linkedin.com/search/results/people/';

const LINKEDIN_GEO_URNS = {
  'el salvador': '106522560',
  guatemala: '100877388',
};

function buildLinkedinPeopleSearchUrl({
  profession,
  country,
  page = 1,
}) {
  const normalizedProfession =
    String(profession || '').trim();

  const normalizedCountry =
    String(country || '')
      .trim()
      .toLowerCase();

  const normalizedPage =
    Number(page) > 0
      ? Number(page)
      : 1;

  const url = new URL(
    LINKEDIN_PEOPLE_SEARCH_URL,
  );

  url.searchParams.set(
    'keywords',
    normalizedProfession,
  );

  url.searchParams.set(
    'origin',
    'FACETED_SEARCH',
  );

  const geoUrn =
    LINKEDIN_GEO_URNS[normalizedCountry];

  if (geoUrn) {
    url.searchParams.set(
      'geoUrn',
      `["${geoUrn}"]`,
    );
  }

  if (normalizedPage > 1) {
    url.searchParams.set(
      'page',
      String(normalizedPage),
    );
  }

  return url.toString();
}

function openLinkedinPeopleSearch(params) {
  const url =
    buildLinkedinPeopleSearchUrl(params);

  window.open(
    url,
    '_blank',
    'noopener,noreferrer',
  );

  return url;
}