
const NOMBRE_BD = 'ListSmartListas';
const ALMACEN = 'fotos';

// Abrir la base de datos local
function abrirBD() {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BD, 1);

    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result;

      if (!bd.objectStoreNames.contains(ALMACEN)) {
        bd.createObjectStore(ALMACEN, { keyPath: 'id' });
      }
    };

    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

// Guardar fotografía localmente
export async function guardarFotoLista(archivo) {
  if (!archivo?.type.startsWith('image/')) {
    throw new Error('Selecciona una imagen válida');
  }

  if (archivo.size > 10 * 1024 * 1024) {
    throw new Error('La imagen no debe superar los 10 MB');
  }

  const foto = {
    id: crypto.randomUUID(),
    nombre: archivo.name,
    imagen: new Blob([archivo], { type: archivo.type }),
    fechaGuardado: new Date().toISOString(),
    sincronizado: false,
  };

  const bd = await abrirBD();

  return new Promise((resolve, reject) => {
    const tx = bd.transaction(ALMACEN, 'readwrite');

    tx.objectStore(ALMACEN).put(foto);

    tx.oncomplete = () => {
      bd.close();
      resolve(foto);
    };

    tx.onerror = () => {
      bd.close();
      reject(tx.error);
    };
  });
}

// Obtener fotografías guardadas
export async function obtenerFotosListas() {
  const bd = await abrirBD();

  return new Promise((resolve, reject) => {
    const tx = bd.transaction(ALMACEN, 'readonly');
    const solicitud = tx.objectStore(ALMACEN).getAll();

    tx.oncomplete = () => {
      bd.close();

      const fotos = solicitud.result.sort((a, b) =>
        b.fechaGuardado.localeCompare(a.fechaGuardado)
      );

      resolve(fotos);
    };

    tx.onerror = () => {
      bd.close();
      reject(tx.error);
    };
  });
}
