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


/*
 * Sincronización de fotografías
 * Cloudinary + Cloud Firestore
 */

// Obtener fotografías pendientes de sincronización
export async function obtenerFotosPendientes(uid) {
  const fotos = await obtenerFotosListas(uid);

  return fotos.filter(
    (foto) => foto.sincronizado !== true
  );
}

// Actualizar una fotografía existente en IndexedDB
function actualizarFotoLocal(uid, fotoId, modificar) {
  return new Promise((resolve, reject) => {
    if (!uid || !fotoId) {
      reject(new Error('Falta identificar la fotografía.'));
      return;
    }

    const solicitud = indexedDB.open('ListSmartListas', 2);

    solicitud.onerror = () => {
      reject(solicitud.error);
    };

    solicitud.onsuccess = () => {
      const bd = solicitud.result;

      if (!bd.objectStoreNames.contains('fotos')) {
        bd.close();
        reject(new Error('No existe el almacén de fotografías.'));
        return;
      }

      const tx = bd.transaction('fotos', 'readwrite');
      const almacen = tx.objectStore('fotos');
      const lectura = almacen.get(fotoId);

      let actualizada;
      let errorPropio = null;

      lectura.onsuccess = () => {
        try {
          const foto = lectura.result;

          // No modificar fotografías de otra cuenta
          if (!foto || foto.uid !== uid) {
            throw new Error(
              'La fotografía no pertenece a esta cuenta.'
            );
          }

          actualizada = modificar(foto);

          almacen.put(actualizada);
        } catch (error) {
          errorPropio = error;
          tx.abort();
        }
      };

      tx.oncomplete = () => {
        bd.close();
        resolve(actualizada);
      };

      tx.onabort = () => {
        bd.close();
        reject(
          errorPropio ??
          tx.error ??
          new Error('No se pudo actualizar la fotografía.')
        );
      };
    };
  });
}

// Guardar el resultado obtenido de Cloudinary
export function registrarFotoSubida(uid, fotoId, datos) {
  if (
    typeof datos?.url !== 'string' ||
    !datos.url.startsWith('https://res.cloudinary.com/') ||
    !datos.publicId
  ) {
    throw new Error(
      'Cloudinary no devolvió una URL válida.'
    );
  }

  return actualizarFotoLocal(uid, fotoId, (foto) => {
    if (foto.sincronizado === true) {
      return foto;
    }

    return {
      ...foto,
      urlImagen: datos.url,
      publicId: datos.publicId,
      estado: 'subida',
      sincronizado: false
    };
  });
}

// Confirmar que Firestore ya guardó la URL
export function confirmarFotoSincronizada(uid, fotoId) {
  return actualizarFotoLocal(uid, fotoId, (foto) => {
    if (!foto.urlImagen) {
      throw new Error(
        'Primero debe subirse la fotografía a Cloudinary.'
      );
    }

    return {
      ...foto,
      estado: 'sincronizada',
      sincronizado: true
    };
  });
}