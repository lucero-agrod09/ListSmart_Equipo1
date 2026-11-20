
import { API } from '../config/api';
import { getJSON, ErrorHttp } from '../services/http';

// Traductor: JSON de TU API → modelo de TU app
export function aRecurso(json) {
  return {
    id: String(json.id),
    titulo: json.title ?? 'Sin título',
    descripcion: json.description ?? '',
    imagen: json.image ?? null,
  };
}

// Unas APIs mandan [ … ]; otras { results: [ … ] } o { data: [ … ] }
function comoLista(datos) {
  if (Array.isArray(datos)) return datos;
  return datos.results ?? datos.data ?? [];
}

export async function listarRecursos({ signal } = {}) {
  const datos = await getJSON(`${API.base}${API.lista}`, { signal });
  return comoLista(datos).map(aRecurso);
}

export async function obtenerRecurso(id, { signal } = {}) {
  try {
    const datos = await getJSON(`${API.base}${API.detalle(id)}`, { signal });
    if (datos == null) return null;
    return aRecurso(datos);
  } catch (e) {
    if (e instanceof ErrorHttp && e.status === 404) return null;
    throw e;
  }
}
