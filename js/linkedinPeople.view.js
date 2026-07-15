(function initLinkedinPeopleView() {
  const LINKEDIN_SOURCE_ID = 1;

  const CURRENT_SEARCH_STORAGE_KEY =
    'currentSearch';

  const form =
    document.getElementById(
      'linkedinForm',
    );

  const professionInput =
    document.getElementById(
      'profesionInput',
    );

  const countryInput =
    document.getElementById(
      'paisInput',
    );

  const pageInput =
    document.getElementById(
      'pageInput',
    );

  const pagesToScrapeInput =
    document.getElementById(
      'pagesToScrapeInput',
    );

  const empleosList =
    document.getElementById(
      'empleosList',
    );

  const loadingMessage =
    document.getElementById(
      'loadingMessage',
    );

  const errorMessage =
    document.getElementById(
      'errorMessage',
    );

  const successMessage =
    document.getElementById(
      'successMessage',
    );

  const currentSearchCard =
    document.getElementById(
      'currentSearchCard',
    );

  const searchProfession =
    document.getElementById(
      'searchProfession',
    );

  const searchCountry =
    document.getElementById(
      'searchCountry',
    );

  const searchPage =
    document.getElementById(
      'searchPage',
    );

  const searchPageRange =
    document.getElementById(
      'searchPageRange',
    );

  const refreshResultsBtn =
    document.getElementById(
      'refreshResultsBtn',
    );

  const resultsSummary =
    document.getElementById(
      'resultsSummary',
    );

  const resultsTableBody =
    document.getElementById(
      'resultsTableBody',
    );

  const logoutBtn =
    document.getElementById(
      'logoutBtn',
    );

  let empleosCache = [];
  let selectedEmpleoId = null;

  function showLoading(
    show,
    text = 'Preparando búsqueda...',
  ) {
    loadingMessage.textContent = text;

    loadingMessage.classList.toggle(
      'd-none',
      !show,
    );
  }

  function showError(message = '') {
    errorMessage.textContent = message;

    errorMessage.classList.toggle(
      'd-none',
      !message,
    );
  }

  function showSuccess(message = '') {
    successMessage.textContent = message;

    successMessage.classList.toggle(
      'd-none',
      !message,
    );
  }

  function normalizeListResponse(response) {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.empleos)) {
      return response.empleos;
    }

    return [];
  }

  function getEmpleoId(empleo) {
    return (
      empleo?.id_empleo ??
      empleo?.id ??
      empleo?.idEmpleo ??
      null
    );
  }

  function getEmpleoName(empleo) {
    return (
      empleo?.nombre ??
      empleo?.empleo ??
      empleo?.titulo ??
      empleo?.name ??
      ''
    );
  }

  function populateEmpleos() {
    empleosList.innerHTML = '';

    empleosCache.forEach((empleo) => {
      const id =
        getEmpleoId(empleo);

      const name =
        getEmpleoName(empleo);

      if (!id || !name) {
        return;
      }

      const option =
        document.createElement(
          'option',
        );

      option.value = name;

      option.dataset.id =
        String(id);

      empleosList.appendChild(
        option,
      );
    });
  }

  function syncSelectedEmpleo() {
    const inputValue =
      professionInput.value
        .trim()
        .toLowerCase();

    const selectedEmpleo =
      empleosCache.find(
        (empleo) =>
          getEmpleoName(empleo)
            .trim()
            .toLowerCase() ===
          inputValue,
      );

    selectedEmpleoId =
      getEmpleoId(selectedEmpleo);
  }

  function saveCurrentSearch(
    currentSearch,
  ) {
    localStorage.setItem(
      CURRENT_SEARCH_STORAGE_KEY,
      JSON.stringify(currentSearch),
    );

    localStorage.setItem(
      'linkedinCurrentSearch',
      JSON.stringify(currentSearch),
    );
  }

  function getStoredCurrentSearch() {
    const value =
      localStorage.getItem(
        CURRENT_SEARCH_STORAGE_KEY,
      );

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function renderCurrentSearch(
    currentSearch,
  ) {
    if (!currentSearch) {
      currentSearchCard.classList.add(
        'd-none',
      );

      return;
    }

    searchProfession.textContent =
      currentSearch.profesion || '-';

    searchCountry.textContent =
      currentSearch.pais || '-';

    searchPage.textContent =
      currentSearch.page || 1;

    const pageStart =
      Number(currentSearch.pageStart) || 1;
    const pageEnd =
      Number(currentSearch.pageEnd) ||
      pageStart;

    searchPageRange.textContent =
      `${pageStart} - ${pageEnd}`;

    currentSearchCard.classList.remove(
      'd-none',
    );
  }

  function normalizeDataList(response) {
    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [];
  }

  function getLiveResultsSnapshot() {
    const raw = localStorage.getItem(
      'linkedinLiveResults',
    );

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderImportedResults(items) {
    if (!items.length) {
      resultsTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-secondary">
            Aún no se ha recibido un lote en vivo desde la extensión.
          </td>
        </tr>
      `;
      return;
    }

    resultsTableBody.innerHTML = items
      .map((item) => {
        const profileUrl =
          item?.perfil_url || null;

        return `
          <tr>
            <td>${escapeHtml(item?.nombre || '-')}</td>
            <td>${escapeHtml(item?.profesion || item?.profession || '-')}</td>
            <td>${escapeHtml(item?.location || item?.ciudad_texto || '-')}</td>
            <td>
              ${
                profileUrl
                  ? `<a href="${escapeHtml(
                      profileUrl,
                    )}" target="_blank" rel="noopener noreferrer">Abrir</a>`
                  : '<span class="text-secondary">-</span>'
              }
            </td>
          </tr>
        `;
      })
      .join('');
  }

  async function loadImportedResults() {
    const snapshot =
      getLiveResultsSnapshot();

    if (!snapshot) {
      resultsSummary.textContent =
        'Aún no hay resultados de scraping en esta sesión.';
      renderImportedResults([]);
      return;
    }

    const items = Array.isArray(snapshot?.profiles)
      ? snapshot.profiles
      : [];

    const phase =
      snapshot?.phase === 'sent'
        ? 'enviado a API'
        : 'extraído (aún no enviado)';

    const inserted =
      Number(snapshot?.inserted) || 0;

    const errors =
      Number(snapshot?.errors) || 0;

    resultsSummary.textContent =
      snapshot?.phase === 'sent'
        ? `Último lote ${phase}: ${items.length} perfiles. Insertados: ${inserted}. Errores: ${errors}.`
        : `Último lote ${phase}: ${items.length} perfiles.`;

    renderImportedResults(items);
  }

  async function loadEmpleos() {
    try {
      const response =
        await fetchEmpleos();

      empleosCache =
        normalizeListResponse(response);

      populateEmpleos();

      showError();
    } catch (error) {
      console.error(
        'Error cargando empleos:',
        error,
      );

      showError(
        'No se pudo cargar el catálogo de empleos.',
      );
    }
  }

  function validateSearch() {
    syncSelectedEmpleo();

    const profession =
      professionInput.value.trim();

    const country =
      countryInput.value.trim();

    const page =
      Number(pageInput.value) || 1;

    const pagesToScrape =
      Number(pagesToScrapeInput.value) || 1;

    if (!profession) {
      throw new Error(
        'Selecciona una profesión.',
      );
    }

    if (!selectedEmpleoId) {
      throw new Error(
        'Selecciona una profesión válida del catálogo.',
      );
    }

    if (!country) {
      throw new Error(
        'Selecciona un país.',
      );
    }

    if (page < 1) {
      throw new Error(
        'La página debe ser mayor o igual a 1.',
      );
    }

    if (pagesToScrape < 1) {
      throw new Error(
        'La cantidad de páginas debe ser mayor o igual a 1.',
      );
    }

    if (pagesToScrape > 100) {
      throw new Error(
        'La cantidad de páginas no puede ser mayor a 100.',
      );
    }

    return {
      profession,
      country,
      page,
      pagesToScrape,
    };
  }

  async function handleSearch() {
    showLoading(
      true,
      'Preparando búsqueda...',
    );

    showError();
    showSuccess();

    try {
      const {
        profession,
        country,
        page,
        pagesToScrape,
      } = validateSearch();

      const searchUrl =
        buildLinkedinPeopleSearchUrl({
          profession,
          country,
          page,
        });

      const currentSearch = {
        source: 'linkedin',

        id_empleo:
          selectedEmpleoId,

        id_fuente:
          LINKEDIN_SOURCE_ID,

        id_departamento:
          null,

        id_ciudad:
          null,

        pais:
          country,

        profesion:
          profession,

        ciudad:
          null,

        departamento:
          null,

        page,

        pageStart:
          page,

        pageEnd:
          page + pagesToScrape - 1,

        pagesToScrape,

        searchUrl,

        createdAt:
          new Date().toISOString(),
      };

      saveCurrentSearch(
        currentSearch,
      );

      renderCurrentSearch(
        currentSearch,
      );

      showSuccess(
        `Búsqueda guardada (${pagesToScrape} página(s)). Cuando LinkedIn cargue, abre la extensión para extraer los perfiles.`,
      );

      openLinkedinPeopleSearch({
        profession,
        country,
        page,
      });

      await loadImportedResults();
    } catch (error) {
      console.error(error);

      showError(
        error.message ||
          'No se pudo preparar la búsqueda.',
      );
    } finally {
      showLoading(false);
    }
  }

  function handleLogout() {
    localStorage.clear();

    window.location.href =
      'Login.html';
  }

  professionInput.addEventListener(
    'change',
    syncSelectedEmpleo,
  );

  professionInput.addEventListener(
    'blur',
    syncSelectedEmpleo,
  );

  form.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      await handleSearch();
    },
  );

  logoutBtn?.addEventListener(
    'click',
    handleLogout,
  );

  refreshResultsBtn?.addEventListener(
    'click',
    async () => {
      showError();
      try {
        await loadImportedResults();
      } catch (error) {
        console.error(error);
        showError(
          error.message ||
            'No se pudieron cargar los resultados importados.',
        );
      }
    },
  );

  renderCurrentSearch(
    getStoredCurrentSearch(),
  );

  loadEmpleos();
  loadImportedResults().catch((error) => {
    console.error(error);
    showError(
      error.message ||
        'No se pudieron cargar los resultados importados.',
    );
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'linkedinLiveResults') {
      loadImportedResults().catch((error) => {
        console.error(error);
      });
    }
  });
})();