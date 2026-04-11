const apiURL = `http://localhost:3000/profesionales`;

const filterForm = document.getElementById("filterForm");
const resultsContainer = document.getElementById("resultsContainer");
const totalProfessionals = document.getElementById("totalProfessionals");

const showResults = (dataProfessionals) => {
  const divResultsList = document.getElementById("resultsList");
  divResultsList.innerHTML = "";
  totalProfessionals.innerText = `${dataProfessionals.length} profesionales`;

  for (let professional of dataProfessionals) {
    console.log(professional);
    const fecha = professional.fecha_publicacion;
    const fechaFormato = new Date(fecha).toLocaleDateString("es-Es");
    divResultsList.insertAdjacentHTML(
      "beforeend",
      `
    
    <div class="card bg-dark my-3">
              <div class="card-body">
                <div
                  class="d-flex flex-column flex-md-row justify-content-between align-items-start"
                >
                  <div>
                    <h5 class="card-title text-light my-1">${professional.nombre} ${professional.apellido}</h5>
                    <p class="card-text my-2 fw-semibold">
                      ${professional.profesion}
                    </p>
                    <p class="card-text text-secondary my-2">
                      <i class="bi bi-geo-alt me-1"></i> ${professional.pais}, ${professional.departamento.nombre},
                      ${professional.ciudad.nombre}
                    </p>
                  </div>
                  <button class="btn btn-primary mt-3 mt-md-0">
                    Ver Perfil
                  </button>
                </div>
                <hr />
                <div
                  class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center"
                >
                  <h6 class="text-body-secondary">Fuente: ${professional.fuente.nombre}</h6>
                  <h6 class="text-body-secondary">${fechaFormato}</h6>
                </div>
              </div>
            </div>
    `,
    );
  }
};

const populateSelects = (data) => {
  const selectDepartamento = document.getElementById("selectDepartamento");
  const selectCiudad = document.getElementById("selectCiudad");

  // Obtener valores únicos
  const departamentos = [
    ...new Map(
      data.map((p) => [p.departamento.id_departamento, p.departamento]),
    ).values(),
  ];
  const ciudades = [
    ...new Map(data.map((p) => [p.ciudad.id_ciudad, p.ciudad])).values(),
  ];

  // Limpiar opciones anteriores (excepto el placeholder)
  selectDepartamento.innerHTML = `<option value="" selected disabled hidden>Seleccione un departamento:</option>`;
  selectCiudad.innerHTML = `<option value="" selected disabled hidden>Seleccione una ciudad:</option>`;

  departamentos.forEach((d) => {
    selectDepartamento.insertAdjacentHTML(
      "beforeend",
      `<option value="${d.nombre}">${d.nombre}</option>`,
    );
  });

  ciudades.forEach((c) => {
    selectCiudad.insertAdjacentHTML(
      "beforeend",
      `<option value="${c.nombre}">${c.nombre}</option>`,
    );
  });
};

const getProfessionals = () => {
  fetch(apiURL)
    .then((reply) => reply.json())
    .then((data) => {
      populateSelects(data); // 👈 poblar selects al cargar
      showResults(data);
    });
};

getProfessionals();

const allFilters = (filters) => {
  fetch(apiURL)
    .then((reply) => reply.json())
    .then((data) => {
      const resultadosFiltrados = data.filter((p) => {
        const matchProfesion =
          filters.profesion === "" ||
          p.profesion.toLowerCase().includes(filters.profesion.toLowerCase());

        const matchPais =
          filters.pais === "" ||
          p.pais.toLowerCase().includes(filters.pais.toLowerCase());

        const matchDepartamento =
          filters.departamento === "" ||
          p.departamento.nombre === filters.departamento; // 👈 string directo

        const matchCiudad =
          filters.ciudad === "" || p.ciudad.nombre === filters.ciudad; // 👈 string directo

        return matchProfesion && matchPais && matchDepartamento && matchCiudad;
      });

      showResults(resultadosFiltrados);
    });
};

filterForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const valoresFiltros = {
    profesion: document.getElementById("inputProfesion").value.trim(),
    pais: document.getElementById("inputPais").value.trim(),
    departamento: document.getElementById("selectDepartamento").value || "",
    ciudad: document.getElementById("selectCiudad").value || "",
  };

  allFilters(valoresFiltros);
});

filterForm.addEventListener("reset", () => {
  document.getElementById("selectDepartamento").selectedIndex = 0;
  document.getElementById("selectCiudad").selectedIndex = 0;
  setTimeout(getProfessionals, 10);
});
