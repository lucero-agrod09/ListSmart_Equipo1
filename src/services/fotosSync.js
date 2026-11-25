import { auth } from '../config/firebase';

import {
  obtenerFotosPendientes,
  obtenerFotosEliminadas,
  registrarFotoSubida,
  confirmarFotoSincronizada,
  confirmarEliminacionFoto
} from './fotosListasDB';

import { subirFotoCloudinary } from './cloudinary';

import {
  guardarFotoNube,
  eliminarFotoNube
} from './fotosNube';

// Evitar sincronizaciones simultáneas
// de la misma cuenta en esta instancia
const sincronizaciones = new Map();

// Comprobar que la sesión no haya cambiado
function verificarCuenta(uid) {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error(
      'La sesión cambió. Inicia sesión nuevamente.'
    );
  }
}

// Procesar fotografías pendientes
async function ejecutarSincronizacion(uid) {
  await auth.authStateReady();

  verificarCuenta(uid);

  if (!navigator.onLine) {
    throw new Error(
      'No hay conexión a Internet. ' +
      'Las fotografías permanecen guardadas localmente.'
    );
  }

  let sincronizadas = 0;
  let eliminadas = 0;

  const errores = [];

  // -----------------------------------------
  // 1. Subir fotografías pendientes
  // -----------------------------------------

  const fotos = await obtenerFotosPendientes(uid);

  for (const foto of fotos) {
    verificarCuenta(uid);

    try {
      // Revisar si la fotografía sigue pendiente.
      // Pudo haber sido marcada para eliminar
      // después de obtener la lista inicial.
      const actuales = await obtenerFotosPendientes(uid);

      let fotoActual = actuales.find(
        (item) => item.id === foto.id
      );

      if (!fotoActual) {
        continue;
      }

      // Subir a Cloudinary únicamente si
      // todavía no tenemos su URL guardada.
      if (!fotoActual.urlImagen || !fotoActual.publicId) {

        if (!(fotoActual.imagen instanceof Blob)) {
          throw new Error(
            'No se encontró la imagen local.'
          );
        }

        const datos = await subirFotoCloudinary(
          fotoActual.imagen
        );

        // Guardar inmediatamente la URL en IndexedDB,
        // para reutilizarla si falla Firebase.
        fotoActual = await registrarFotoSubida(
          uid,
          fotoActual.id,
          datos
        );
      }

      verificarCuenta(uid);

      // Si se eliminó mientras se subía,
      // no crear nuevamente su documento.
      const eliminaciones = await obtenerFotosEliminadas(uid);

      const fueEliminada = eliminaciones.some(
        (item) => item.id === fotoActual.id
      );

      if (fueEliminada) {
        continue;
      }

      // Registrar la URL en Firestore
      await guardarFotoNube(uid, fotoActual);

      verificarCuenta(uid);

      // Confirmar que la fotografía está sincronizada
      await confirmarFotoSincronizada(
        uid,
        fotoActual.id
      );

      sincronizadas++;

    } catch (error) {

      if (auth.currentUser?.uid !== uid) {
        throw new Error(
          'La sesión cambió durante la sincronización.',
          { cause: error }
        );
      }

      errores.push({
        fotoId: foto.id,
        tipo: 'subida',
        mensaje:
          error?.message ||
          'No se pudo subir la fotografía.'
      });
    }
  }

  // -----------------------------------------
  // 2. Eliminar fotografías pendientes
  // -----------------------------------------

  // Se consultan después de las subidas para
  // detectar eliminaciones realizadas mientras
  // una fotografía se estaba sincronizando.

  verificarCuenta(uid);

  const fotosEliminadas = await obtenerFotosEliminadas(uid);

  for (const foto of fotosEliminadas) {
    verificarCuenta(uid);

    try {
      // Eliminar el documento en Firestore
      await eliminarFotoNube(uid, foto.id);

      verificarCuenta(uid);

      // Confirmar la eliminación en IndexedDB.
      // Esto también libera el Blob local.
      await confirmarEliminacionFoto(
        uid,
        foto.id
      );

      eliminadas++;

    } catch (error) {

      if (auth.currentUser?.uid !== uid) {
        throw new Error(
          'La sesión cambió durante la eliminación.',
          { cause: error }
        );
      }

      // Conservar la eliminación pendiente
      // para volver a intentarla después.
      errores.push({
        fotoId: foto.id,
        tipo: 'eliminacion',
        mensaje:
          error?.message ||
          'No se pudo eliminar la fotografía.'
      });
    }
  }

  // -----------------------------------------
  // 3. Consultar operaciones pendientes
  // -----------------------------------------

  verificarCuenta(uid);

  const subidasRestantes = await obtenerFotosPendientes(uid);
  const eliminacionesRestantes = await obtenerFotosEliminadas(uid);

  return {
    sincronizadas,
    eliminadas,
    pendientes:
      subidasRestantes.length +
      eliminacionesRestantes.length,
    subidasPendientes: subidasRestantes.length,
    eliminacionesPendientes: eliminacionesRestantes.length,
    errores
  };
}

// Función principal de sincronización
export function sincronizarFotos(uid) {

  // Reutilizar una sincronización que ya esté en curso
  if (sincronizaciones.has(uid)) {
    return sincronizaciones.get(uid);
  }

  const tarea = ejecutarSincronizacion(uid)
    .finally(() => {
      if (sincronizaciones.get(uid) === tarea) {
        sincronizaciones.delete(uid);
      }
    });

  sincronizaciones.set(uid, tarea);

  return tarea;
}