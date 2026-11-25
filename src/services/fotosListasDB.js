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
    throw new Error(
      'Debes iniciar sesión para guardar fotografías.'
    );
  }

  if (!archivo?.type?.startsWith('image/')) {
    throw new Error('Selecciona una imagen válida.');
  }

  if (archivo.size > 10 * 1024 * 1024) {
    throw new Error(
      'La imagen no debe superar los 10 MB.'
    );
  }

  const foto = {
    id: crypto.randomUUID(),
    uid,
    nombre: archivo.name,
    imagen: new Blob([archivo], {
      type: archivo.type
    }),
    fechaGuardado: new Date().toISOString(),
    sincronizado: false,
    eliminada: false,
    eliminacionConfirmada: false
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

// Obtener todos los registros de una cuenta,
// incluyendo eliminaciones pendientes
async function obtenerTodosLosRegistros(uid) {
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

      const fotos = (solicitud.result ?? []).sort(
        (a, b) =>
          String(b.fechaGuardado ?? '').localeCompare(
            String(a.fechaGuardado ?? '')
          )
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

// Obtener solamente fotografías visibles
export async function obtenerFotosListas(uid) {
  const fotos = await obtenerTodosLosRegistros(uid);

  return fotos.filter(
    (foto) => foto.eliminada !== true
  );
}

// Obtener fotografías pendientes de subida
export async function obtenerFotosPendientes(uid) {
  const fotos = await obtenerFotosListas(uid);

  return fotos.filter(
    (foto) => foto.sincronizado !== true
  );
}

// Obtener fotografías pendientes de eliminación
export async function obtenerFotosEliminadas(uid) {
  const fotos = await obtenerTodosLosRegistros(uid);

  return fotos.filter(
    (foto) =>
      foto.eliminada === true &&
      foto.eliminacionConfirmada !== true
  );
}

// Actualizar un registro existente en IndexedDB.
// También permite crear un registro para una fotografía
// recuperada únicamente desde Firestore.
async function actualizarFotoLocal(
  uid,
  fotoId,
  modificar,
  fotoSiNoExiste = null
) {
  if (!uid || !fotoId) {
    throw new Error(
      'Falta identificar la fotografía.'
    );
  }

  const bd = await abrirBD();

  return new Promise((resolve, reject) => {
    const tx = bd.transaction(ALMACEN, 'readwrite');
    const almacen = tx.objectStore(ALMACEN);
    const lectura = almacen.get(fotoId);

    let actualizada;
    let errorPropio = null;

    lectura.onsuccess = () => {
      try {
        const foto = lectura.result ?? fotoSiNoExiste;

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
        new Error(
          'No se pudo actualizar la fotografía.'
        )
      );
    };
  });
}

// Guardar el resultado de Cloudinary
export function registrarFotoSubida(uid, fotoId, datos) {
  if (
    typeof datos?.url !== 'string' ||
    !datos.url.startsWith(
      'https://res.cloudinary.com/'
    ) ||
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

// Confirmar que Firestore guardó la URL
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

// Marcar una fotografía para eliminarla
export function marcarFotoEliminada(uid, foto) {
  if (!uid || !foto?.id) {
    throw new Error(
      'No se pudo identificar la fotografía.'
    );
  }

  // Evitar asociar a esta cuenta una fotografía
  // que explícitamente pertenece a otra
  if (foto.uid && foto.uid !== uid) {
    throw new Error(
      'La fotografía no pertenece a esta cuenta.'
    );
  }

  // Datos mínimos por si la fotografía solo
  // existe en la memoria de la interfaz
  const registroRemoto = {
    id: foto.id,
    uid,
    nombre: foto.nombre ?? 'Fotografía de lista',
    fechaGuardado:
      foto.fechaGuardado ??
      new Date().toISOString(),
    urlImagen: foto.urlImagen ?? null,
    publicId: foto.publicId ?? null,
    sincronizado: foto.sincronizado === true
  };

  return actualizarFotoLocal(
    uid,
    foto.id,
    (actual) => {
      if (actual.eliminada === true) {
        return actual;
      }

      return {
        ...actual,
        eliminada: true,
        eliminacionConfirmada: false,
        fechaEliminacion: new Date().toISOString(),
        estado: 'pendiente_eliminar'
      };
    },
    registroRemoto
  );
}

// Confirmar que Firestore eliminó la fotografía
export function confirmarEliminacionFoto(uid, fotoId) {
  return actualizarFotoLocal(uid, fotoId, (foto) => {
    if (foto.eliminada !== true) {
      throw new Error(
        'La fotografía no está marcada para eliminar.'
      );
    }

    // Conservar un registro pequeño de eliminación,
    // pero liberar el Blob de la fotografía.
    return {
      id: foto.id,
      uid: foto.uid,
      nombre: foto.nombre,
      fechaGuardado: foto.fechaGuardado,
      urlImagen: foto.urlImagen ?? null,
      publicId: foto.publicId ?? null,
      fechaEliminacion: foto.fechaEliminacion,
      eliminada: true,
      eliminacionConfirmada: true,
      sincronizado: true,
      estado: 'eliminada'
    };
  });
}


/*
 * Guardar en IndexedDB una fotografía
 * recuperada desde Cloudinary.
 */
export function guardarFotoDescargada(uid, fotoRemota, imagen) {
  // Validar la cuenta y la fotografía
  if (
    !uid ||
    typeof fotoRemota?.id !== 'string' ||
    !fotoRemota.id
  ) {
    throw new Error(
      'No se pudo identificar la fotografía.'
    );
  }

  if (fotoRemota.uid && fotoRemota.uid !== uid) {
    throw new Error(
      'La fotografía pertenece a otra cuenta.'
    );
  }

  // Comprobar que proviene de Cloudinary
  if (
    typeof fotoRemota.urlImagen !== 'string' ||
    !fotoRemota.urlImagen.startsWith(
      'https://res.cloudinary.com/'
    )
  ) {
    throw new Error(
      'La fotografía no tiene una URL válida.'
    );
  }

  // Validar el archivo descargado
  const formatosPermitidos = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (
    !(imagen instanceof Blob) ||
    imagen.size === 0 ||
    imagen.size > 10 * 1024 * 1024 ||
    !formatosPermitidos.includes(imagen.type)
  ) {
    throw new Error(
      'La imagen descargada no tiene un formato o tamaño válido.'
    );
  }

  // Datos de una fotografía recuperada
  // que todavía no existe en este dispositivo
  const nuevaFoto = {
    id: fotoRemota.id,
    uid,
    nombre: fotoRemota.nombre || 'Fotografía de lista',
    imagen,
    fechaGuardado:
      fotoRemota.fechaGuardado ||
      new Date().toISOString(),
    urlImagen: fotoRemota.urlImagen,
    publicId: fotoRemota.publicId ?? null,
    sincronizado: true,
    eliminada: false,
    eliminacionConfirmada: false,
    estado: 'sincronizada'
  };

  // Utilizar la función que ya tenemos
  // para actualizar IndexedDB
  return actualizarFotoLocal(
    uid,
    fotoRemota.id,
    (actual) => {

      // Nunca restaurar una fotografía eliminada
      if (actual.eliminada === true) {
        return actual;
      }

      // No duplicar una imagen que ya está
      // guardada localmente
      if (actual.imagen instanceof Blob) {
        return actual;
      }

      // Agregar la imagen al registro existente
      return {
        ...actual,
        imagen,
        urlImagen:
          actual.urlImagen || fotoRemota.urlImagen,
        publicId:
          actual.publicId || fotoRemota.publicId,
        sincronizado: true,
        estado: 'sincronizada'
      };
    },
    nuevaFoto
  );
}
