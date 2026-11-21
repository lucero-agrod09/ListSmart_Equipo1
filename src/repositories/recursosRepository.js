
import { API } from '../config/api';
import { getJSON, ErrorHttp } from '../services/http';
import {
  guardarCatalogo,
  obtenerCatalogo,
  registrarConsulta,
  obtenerHistorial,
} from '../services/recursosDB';

// Traductor: JSON de FakeStoreAPI → modelo de TU app
export function aRecurso(json) {
  return {
    id: String(json.id),
    titulo: json.title ?? 'Sin título',
    descripcion: json.description ?? '',
    imagen: json.image ?? null,
    precio: json.price ?? null,
    categoria: json.category ?? '',
  };
}

// Convertir respuesta de la API en lista
function comoLista(datos) {
  if (Array.isArray(datos)) return datos;
  return datos.results ?? datos.data ?? [];
}

// Obtener catálogo de productos
export async function listarRecursos({ signal } = {}) {
  try {
    const datos = await getJSON(`${API.base}${API.lista}`, { signal });
    const productos = comoLista(datos).map(aRecurso);

    await guardarCatalogo(productos).catch(() => {});

    return productos;
  } catch (e) {
    if (e.name === 'AbortError') throw e;

    // Recuperar catálogo desde IndexedDB
    const guardado = await obtenerCatalogo().catch(() => null);

    if (guardado?.productos) return guardado.productos;

    throw e;
  }
}

// Obtener detalle de un producto
export async function obtenerRecurso(id, { signal } = {}) {
  try {
    const datos = await getJSON(`${API.base}${API.detalle(id)}`, { signal });

    if (datos == null) return null;

    const recurso = aRecurso(datos);

    // Guardar producto en historial
    await registrarConsulta(recurso).catch(() => {});

    return recurso;
  } catch (e) {
    if (e.name === 'AbortError') throw e;

    if (e instanceof ErrorHttp && e.status === 404) return null;

    // Buscar producto guardado localmente
    const guardado = await obtenerCatalogo().catch(() => null);
    const historial = await obtenerHistorial().catch(() => []);

    const recurso =
      guardado?.productos?.find((p) => p.id === String(id)) ??
      historial.find((p) => p.id === String(id));

    if (!recurso) throw e;

    await registrarConsulta(recurso).catch(() => {});

    return recurso;
  }
}
