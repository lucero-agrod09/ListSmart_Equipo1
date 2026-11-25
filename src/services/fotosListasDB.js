const NOMBRE_BD = 'ListSmartListas';
const ALMACEN = 'fotos';

// Abrir la base de datos local
function abrirBD() {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BD, 2);

    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result;

      const almacen = bd.objectStoreNames.contains(ALMACEN)
        ? solicitud.transaction.objectStore(ALMACEN)
        : bd.createObjectStore(ALMACEN, { keyPath: 'id' });

      // Índice para identificar al propietario
      if (!almacen.indexNames.contains('porUid')) {
        almacen.createIndex('porUid', 'uid', {
          unique: false
        });
      }
    };

    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

// Guardar fotografía asociada a una cuenta
export async function guardarFotoLista(archivo, uid) {
  if (!uid) {
    throw new Error('Debes iniciar sesión para guardar fotografías.');
  }

  if (!archivo?.type?.startsWith('image/')) {
    throw new Error('Selecciona una imagen válida.');
  }

  if (archivo.size > 10 * 1024 * 1024) {
    throw new Error('La imagen no debe superar los 10 MB.');
  }

  const foto = {
    id: crypto.randomUUID(),
    uid,
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

    tx.onabort = () => {
      bd.close();
      reject(tx.error);
    };
  });
}

// Obtener fotografías de la cuenta activa
export async function obtenerFotosListas(uid) {
  if (!uid) {
    throw new Error('Debes iniciar sesión.');
  }

  const bd = await abrirBD();

  return new Promise((resolve, reject) => {
    const tx = bd.transaction(ALMACEN, 'readonly');

    const solicitud = tx
      .objectStore(ALMACEN)
      .index('porUid')
      .getAll(uid);

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

    tx.onabort = () => {
      bd.close();
      reject(tx.error);
    };
  });
}