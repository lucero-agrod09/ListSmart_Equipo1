import { auth } from '../config/firebase';

import {
  obtenerFotosPendientes,
  registrarFotoSubida,
  confirmarFotoSincronizada
} from './fotosListasDB';

import { subirFotoCloudinary } from './cloudinary';

import { guardarFotoNube } from './fotosNube';

// Evitar sincronizaciones simultáneas
// de la misma cuenta en esta instancia.
const sincronizaciones = new Map();

// Comprobar que la cuenta no haya cambiado
function verificarCuenta(uid) {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error(
      'La sesión cambió. Inicia sesión nuevamente.'
    );
  }
}

// Procesar las fotografías pendientes
async function ejecutarSincronizacion(uid) {
  await auth.authStateReady();

  verificarCuenta(uid);

  if (!navigator.onLine) {
    throw new Error(
      'No hay conexión a Internet. ' +
      'Las fotografías permanecen guardadas localmente.'
    );
  }

  const fotos = await obtenerFotosPendientes(uid);

  let sincronizadas = 0;
  const errores = [];

  for (const foto of fotos) {
    verificarCuenta(uid);

    try {
      let fotoActual = foto;

      // Subir solamente si todavía no existe
      // una URL de Cloudinary guardada.
      if (!foto.urlImagen || !foto.publicId) {

        if (!(foto.imagen instanceof Blob)) {
          throw new Error(
            'No se encontró la imagen local.'
          );
        }

        const datos = await subirFotoCloudinary(
          foto.imagen
        );

        // Guardamos la URL inmediatamente.
        // Así podemos reutilizarla si falla Firestore.
        fotoActual = await registrarFotoSubida(
          uid,
          foto.id,
          datos
        );
      }

      verificarCuenta(uid);

      // Guardar los metadatos en Firestore
      await guardarFotoNube(uid, fotoActual);

      verificarCuenta(uid);

      // Firestore confirmó el guardado:
      // retirar la fotografía de los pendientes.
      await confirmarFotoSincronizada(
        uid,
        foto.id
      );

      sincronizadas++;

    } catch (error) {

      // Si cambió la sesión, detener todo.
        if (auth.currentUser?.uid !== uid) {
        throw new Error(
            'La sesión cambió durante la sincronización.',
            { cause: error }
        );
        }

      // No perder la fotografía que falló.
      errores.push({
        fotoId: foto.id,
        mensaje:
          error?.message ||
          'No se pudo sincronizar la fotografía.'
      });
    }
  }

  verificarCuenta(uid);

  const restantes = await obtenerFotosPendientes(uid);

  return {
    sincronizadas,
    pendientes: restantes.length,
    errores
  };
}

// Función principal de sincronización
export function sincronizarFotos(uid) {

  // Reutilizar la tarea si ya está en ejecución
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