(function initLinkedinJobsView() {
  const LINKEDIN_JOBS_SOURCE_ID = 1;
  const CURRENT_SEARCH_STORAGE_KEY = 'currentSearch';
  const LIVE_RESULTS_STORAGE_KEY = 'linkedinJobsLiveResults';

  const form =
    document.getElementById('linkedinJobsForm');
  const empleoInput =
    document.getElementById('empleoInput');
  const pageInput =
    document.getElementById('pageInput');
  const pagesToScrapeInput = document.getElementById(
    'pagesToScrapeInput',
  );
  const loadingMessage =
    document.getElementById('loadingMessage');
  const errorMessage =
    document.getElementById('errorMessage');
  const successMessage =
    document.getElementById('successMessage');
  const currentSearchCard = document.getElementById(
    'currentSearchCard',
  );
  const searchKeyword =
    document.getElementById('searchKeyword');
  const searchPageRange = document.getElementById(
    'searchPageRange',
  );
  const refreshResultsBtn = document.getElementById(
    'refreshResultsBtn',
  );
  const resultsSummary =
    document.getElementById('resultsSummary');
  const resultsTableBody = document.getElementById(
    'resultsTableBody',
  );
  const logoutBtn =
    document.getElementById('logoutBtn');

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

  async function loadEmpleosOptions() {
    empleoInput.innerHTML =
      '<option value="">Cargando empleos...</option>';

    const empleos = await fetchJobsEmpleos();

    empleoInput.innerHTML =
      '<option value="">Selecciona un empleo</option>';

    empleos
      .sort((a, b) =>
        getEmpleoName(a).localeCompare(
          getEmpleoName(b),
          'es',
        ),
      )
      .forEach((empleo) => {
        const nombre = getEmpleoName(empleo);
        const id = getEmpleoId(empleo);
        if (!nombre || !id) return;

        const option =
          document.createElement('option');
        option.value = String(id);
        option.textContent = nombre;
        empleoInput.appendChild(option);
      });
  }

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

  function saveCurrentSearch(
    currentSearch,
  ) {
    localStorage.setItem(
      CURRENT_SEARCH_STORAGE_KEY,
      JSON.stringify(currentSearch),
    );
    localStorage.setItem(
      'linkedinJobsCurrentSearch',
      JSON.stringify(currentSearch),
    );
  }

  function getStoredCurrentSearch() {
    const value = localStorage.getItem(
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

  function getLiveResultsSnapshot() {
    const value = localStorage.getItem(
      LIVE_RESULTS_STORAGE_KEY,
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
      currentSearchCard.classList.add('d-none');
      return;
    }

    const pageStart =
      Number(currentSearch.pageStart) ||
      Number(currentSearch.page) ||
      1;
    const pageEnd =
      Number(currentSearch.pageEnd) ||
      pageStart;

    searchKeyword.textContent =
      currentSearch.keyword || '-';
    searchPageRange.textContent =
      `${pageStart} - ${pageEnd}`;
    currentSearchCard.classList.remove('d-none');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatLocation(job) {
    const parts = [
      job?.ciudad,
      job?.dpto_estado,
      job?.pais,
    ]
      .map(part => (part || '').trim())
      .filter(Boolean);

    return parts.length
      ? parts.join(', ')
      : '-';
  }

  function renderJobs(jobs) {
    if (!jobs.length) {
      resultsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-secondary">
            Aún no se ha recibido un lote en vivo desde la extensión.
          </td>
        </tr>
      `;
      return;
    }

    resultsTableBody.innerHTML = jobs
      .map(
        job => `
          <tr>
            <td>${escapeHtml(job?.nombre_empresa || '-')}</td>
            <td>${escapeHtml(job?.posicion_ofertada || '-')}</td>
            <td>${escapeHtml(formatLocation(job))}</td>
            <td>${escapeHtml(job?.modalidad || '-')}</td>
            <td>${escapeHtml(job?.jornada || '-')}</td>
          </tr>
        `,
      )
      .join('');
  }

  async function loadLiveResults() {
    const snapshot =
      getLiveResultsSnapshot();

    if (!snapshot) {
      resultsSummary.textContent =
        'Aún no hay resultados de scraping en esta sesión.';
      renderJobs([]);
      return;
    }

    const jobs = Array.isArray(snapshot.jobs)
      ? snapshot.jobs
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
        ? `Último lote ${phase}: ${jobs.length} ofertas. Insertadas: ${inserted}. Errores: ${errors}.`
        : `Último lote ${phase}: ${jobs.length} ofertas.`;

    renderJobs(jobs);
  }

  function validateSearch() {
    const selectedOption =
      empleoInput.options[empleoInput.selectedIndex];
    const empleoNombre =
      selectedOption?.textContent?.trim() || '';
    const empleoId = Number(empleoInput.value) || 0;
    const page =
      Number(pageInput.value) || 1;
    const pagesToScrape =
      Number(pagesToScrapeInput.value) || 1;

    if (!empleoId || !empleoNombre) {
      throw new Error(
        'Debes seleccionar un empleo.',
      );
    }

    if (page < 1) {
      throw new Error(
        'La página inicial debe ser mayor o igual a 1.',
      );
    }

    if (pagesToScrape < 1 || pagesToScrape > 20) {
      throw new Error(
        'La cantidad de páginas debe estar entre 1 y 20.',
      );
    }

    return {
      empleoId,
      empleoNombre,
      page,
      pagesToScrape,
    };
  }

  async function handleSearch(event) {
    event.preventDefault();
    showLoading(true, 'Preparando búsqueda...');
    showError();
    showSuccess();

    try {
      const {
        empleoId,
        empleoNombre,
        page,
        pagesToScrape,
      } = validateSearch();

      const searchUrl =
        buildLinkedinJobsSearchUrl({
          keyword: empleoNombre,
          page,
        });

      const currentSearch = {
        source: 'linkedin_jobs',
        id_fuente: LINKEDIN_JOBS_SOURCE_ID,
        keyword: empleoNombre,
        profesion: empleoNombre,
        id_empleo: empleoId,
        page,
        pageStart: page,
        pageEnd:
          page + pagesToScrape - 1,
        pagesToScrape,
        searchUrl,
        createdAt:
          new Date().toISOString(),
      };

      saveCurrentSearch(currentSearch);
      renderCurrentSearch(currentSearch);

      showSuccess(
        `Búsqueda guardada (${pagesToScrape} página(s)). Abre la extensión y usa la fuente LinkedIn Ofertas.`,
      );

      openLinkedinJobsSearch({
        keyword: empleoNombre,
        page,
      });
      await loadLiveResults();
    } catch (error) {
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
    window.location.href = 'Login.html';
  }

  refreshResultsBtn?.addEventListener(
    'click',
    async () => {
      showError();
      try {
        await loadLiveResults();
      } catch (error) {
        showError(
          error.message ||
            'No se pudieron cargar los resultados.',
        );
      }
    },
  );

  window.addEventListener('storage', (event) => {
    if (event.key === LIVE_RESULTS_STORAGE_KEY) {
      loadLiveResults().catch(() => null);
    }
  });

  form.addEventListener('submit', handleSearch);
  logoutBtn?.addEventListener(
    'click',
    handleLogout,
  );

  renderCurrentSearch(getStoredCurrentSearch());
  loadLiveResults().catch(() => null);
  loadEmpleosOptions().catch((error) => {
    showError(
      error.message ||
        'No se pudo cargar el catálogo de empleos.',
    );
    empleoInput.innerHTML =
      '<option value="">No se pudieron cargar empleos</option>';
  });
})();
