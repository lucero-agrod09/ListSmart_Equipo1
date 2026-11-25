import { auth } from '../config/firebase';
import { obtenerEstadoListas } from './listasDB';

import {
  obtenerListasNube,
  guardarListaNube,
  eliminarListaNube
} from './listasNube';

const NOMBRE_BD = 'ListSmartListasUsuarios';
const ALMACEN = 'porUsuario';

const sincronizaciones = new Map();

// Verificar la sesión
function verificarCuenta(uid) {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error('La sesión cambió. Inicia sesión nuevamente.');
  }
}

// Actualizar un registro de IndexedDB
function actualizarRegistro(uid, modificar) {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BD, 1);

    solicitud.onerror = () => reject(solicitud.error);

    solicitud.onsuccess = () => {
      const bd = solicitud.result;
      const tx = bd.transaction(ALMACEN, 'readwrite');
      const almacen = tx.objectStore(ALMACEN);

      const lectura = almacen.get(uid);
      let resultado;
      let errorPropio = null;

      lectura.onsuccess = () => {
        try {
          const actual = lectura.result ?? {
            uid,
            listas: [],
            pendientes: [],
            nubePreparada: false
          };

          resultado = modificar(actual);

          almacen.put(resultado);
        } catch (error) {
          errorPropio = error;
          tx.abort();
        }
      };

      tx.oncomplete = () => {
        bd.close();
        resolve(resultado);
      };

      tx.onabort = () => {
        bd.close();
        reject(errorPropio ?? tx.error);
      };
    };
  });
}

// Confirmar una operación terminada en Firebase
async function confirmarPendiente(uid, operacion) {
  await actualizarRegistro(uid, (registro) => ({
    ...registro,
    pendientes: (registro.pendientes ?? []).filter(
      (item) =>
        item.id !== operacion.id ||
        item.token !== operacion.token
    )
  }));
}

// Incorporar los datos de la nube
async function incorporarNube(uid, remotas) {
  await actualizarRegistro(uid, (registro) => {
    const listasLocales = registro.listas ?? [];
    const pendientes = registro.pendientes ?? [];

    const mapa = new Map(
      remotas.map((lista) => [lista.id, lista])
    );

    // Las eliminaciones pendientes tienen prioridad
    for (const operacion of pendientes) {
      if (operacion.tipo === 'eliminar') {
        mapa.delete(operacion.id);
      }
    }

    // Conservar los cambios locales pendientes
    for (const lista of listasLocales) {
      if (
        pendientes.some(
          (item) =>
            item.id === lista.id &&
            item.tipo === 'guardar'
        )
      ) {
        mapa.set(lista.id, lista);
      }
    }

    return {
      ...registro,
      listas: [...mapa.values()],
      pendientes,
      nubePreparada: true
    };
  });
}

// Realizar la sincronización
async function ejecutarSincronizacion(uid) {
  await auth.authStateReady();
  verificarCuenta(uid);

  // Estado local antes de sincronizar
  const inicial = await obtenerEstadoListas(uid);

  // Consultar los documentos de Firebase
  const remotas = await obtenerListasNube(uid);
  verificarCuenta(uid);

  const idsNube = new Set(
    remotas.map((lista) => lista.id)
  );

  // Importar listas locales antiguas durante
  // la primera sincronización
  if (!inicial.nubePreparada) {
    for (const lista of inicial.listas) {
      verificarCuenta(uid);

      const tienePendiente = inicial.pendientes.some(
        (item) => item.id === lista.id
      );

      if (idsNube.has(lista.id) || tienePendiente) {
        continue;
      }

      const actual = await obtenerEstadoListas(uid);

      const cambio = actual.pendientes.some(
        (item) => item.id === lista.id
      );

      const listaActual = actual.listas.find(
        (item) => item.id === lista.id
      );

      if (!cambio && listaActual) {
        await guardarListaNube(uid, listaActual);
      }
    }
  }

  // Procesar operaciones pendientes
  for (const operacion of inicial.pendientes) {
    verificarCuenta(uid);

    const actual = await obtenerEstadoListas(uid);

    const pendienteActual = actual.pendientes.find(
      (item) => item.id === operacion.id
    );

    // No enviar una operación que haya cambiado
    if (
      !pendienteActual ||
      pendienteActual.token !== operacion.token
    ) {
      continue;
    }

    if (operacion.tipo === 'eliminar') {
      await eliminarListaNube(uid, operacion.id);
    } else {
      const lista = actual.listas.find(
        (item) => item.id === operacion.id
      );

      if (!lista) continue;

      await guardarListaNube(uid, lista);
    }

    verificarCuenta(uid);
    await confirmarPendiente(uid, operacion);
  }

  // Recuperar el estado actualizado del servidor
  const actualizadas = await obtenerListasNube(uid);
  verificarCuenta(uid);

  // Combinar con los cambios locales restantes
  await incorporarNube(uid, actualizadas);

  const resultado = await obtenerEstadoListas(uid);

  return resultado.listas;
}

// Evitar sincronizaciones simultáneas de la misma cuenta
export function sincronizarListas(uid) {
  if (sincronizaciones.has(uid)) {
    return sincronizaciones.get(uid);
  }

  const tarea = ejecutarSincronizacion(uid)
    .finally(() => {
      sincronizaciones.delete(uid);
    });

  sincronizaciones.set(uid, tarea);

  return tarea;
}