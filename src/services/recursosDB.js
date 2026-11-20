
const NOMBRE_BD = 'ListSmartAPI';
const ALMACEN = 'datos';

// Abrir la base de datos local
function abrirBD() {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BD, 1);

    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result;

      if (!bd.objectStoreNames.contains(ALMACEN)) {
        bd.createObjectStore(ALMACEN);
      }
    };

    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

// Leer información guardada
async function leer(clave) {
  const bd = await abrirBD();

  return new Promise((resolve, reject) => {
    const tx = bd.transaction(ALMACEN, 'readonly');
    const solicitud = tx.objectStore(ALMACEN).get(clave);

    solicitud.onsuccess = () => resolve(solicitud.result ?? null);
    solicitud.onerror = () => reject(solicitud.error);

    tx.oncomplete = () => bd.close();
    tx.onabort = () => {
      bd.close();
      reject(tx.error);
    };
  });
}

// Guardar información
async function guardar(clave, valor) {
  const bd = await abrirBD();

  return new Promise((resolve, reject) => {
    const tx = bd.transaction(ALMACEN, 'readwrite');

    tx.objectStore(ALMACEN).put(valor, clave);

    tx.oncomplete = () => {
      bd.close();
      resolve();
    };

    tx.onerror = () => {
      bd.close();
      reject(tx.error);
    };

    tx.onabort = () => {
      bd.close();
      reject(tx.error);
    };
  });
}

// Guardar catálogo de productos
export function guardarCatalogo(productos) {
  return guardar('catalogo', {
    productos,
    fechaGuardado: new Date().toISOString(),
  });
}

// Obtener catálogo guardado
export function obtenerCatalogo() {
  return leer('catalogo');
}

// Obtener últimos productos consultados
export async function obtenerHistorial() {
  return (await leer('historial')) ?? [];
}

// Registrar uno de los últimos 5 productos
export async function registrarConsulta(recurso) {
  const historial = await obtenerHistorial();

  const actualizado = [
    recurso,
    ...historial.filter((item) => item.id !== recurso.id),
  ].slice(0, 5);

  await guardar('historial', actualizado);
}
