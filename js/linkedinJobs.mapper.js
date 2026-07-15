function mapJornadaToCreateValue(jornada) {
  if (jornada === "medio tiempo") return "medio_tiempo";
  if (jornada === "completa") return "completa";
  return undefined;
}

function sanitizeText(value) {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function mapScrapedToCreatePayload(item, idFuenteLinkedin) {
  const jornada = mapJornadaToCreateValue(item?.jornada);

  const payload = {
    nombre_empresa: sanitizeText(item?.nombre_empresa) || "Empresa no especificada",
    posicion_ofertada:
      sanitizeText(item?.posicion_ofertada) || "Posición no especificada",
    ciudad: sanitizeText(item?.ciudad),
    pais: sanitizeText(item?.pais),
    dpto_estado: sanitizeText(item?.dpto_estado),
    modalidad: sanitizeText(item?.modalidad),
    jornada,
    id_fuente:
      Number.isFinite(idFuenteLinkedin) && idFuenteLinkedin > 0
        ? idFuenteLinkedin
        : undefined,
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
}

function validateCreatePayload(payload) {
  const nombre = sanitizeText(payload?.nombre_empresa);
  const posicion = sanitizeText(payload?.posicion_ofertada);

  if (!nombre) return "nombre_empresa es requerido.";
  if (!posicion) return "posicion_ofertada es requerido.";

  return null;
}

window.linkedinJobsMapper = {
  mapScrapedToCreatePayload,
  validateCreatePayload,
  mapJornadaToCreateValue,
};
