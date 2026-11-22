const NOMBRE_BD = 'ListSmartListasUsuarios';
const ALMACEN = 'porUsuario';
const CATEGORIAS = ['Compras', 'Pendientes', 'Trabajo'];

// Abrir la base de datos local
function abrirBD() {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BD, 1);

    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result;

      if (!bd.objectStoreNames.contains(ALMACEN)) {
        bd.createObjectStore(ALMACEN, { keyPath: 'uid' });
      }
    };

    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

// Consultar o modificar las listas de una cuenta
async function consultar(uid, modificar, completo = false) {
  if (!uid) {
    throw new Error('Debes iniciar sesión.');
  }

  const bd = await abrirBD();

  return new Promise((resolve, reject) => {
    const tx = bd.transaction(
      ALMACEN,
      modificar ? 'readwrite' : 'readonly'
    );

    const almacen = tx.objectStore(ALMACEN);
    const solicitud = almacen.get(uid);

    let resultado;
    let errorPropio = null;

    solicitud.onsuccess = () => {
      try {
        const registro = solicitud.result ?? {
          uid,
          listas: [],
          pendientes: [],
          nubePreparada: false
        };

        const actuales = Array.isArray(registro.listas)
          ? registro.listas
          : [];

        const pendientes = Array.isArray(registro.pendientes)
          ? registro.pendientes
          : [];

        // Consultar sin modificar
        if (!modificar) {
          resultado = completo
            ? {
                ...registro,
                listas: actuales,
                pendientes,
                nubePreparada: registro.nubePreparada === true
              }
            : actuales;

          return;
        }

        // Aplicar modificación local
        const cambio = modificar(actuales);

        const cambiosPendientes = new Map(
          pendientes.map((item) => [item.id, item])
        );

        // Conservar la última operación de cada lista
        for (const item of cambio.cambios) {
          cambiosPendientes.set(item.id, {
            ...item,
            token: crypto.randomUUID()
          });
        }

        resultado = cambio.listas;

        almacen.put({
          ...registro,
          uid,
          listas: resultado,
          pendientes: [...cambiosPendientes.values()]
        });

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
      reject(
        errorPropio ??
        tx.error ??
        new Error('No se pudieron guardar las listas.')
      );
    };
  });
}

// Obtener las listas de la cuenta
export function obtenerListas(uid) {
  return consultar(uid);
}

// Obtener listas y operaciones para sincronización
export function obtenerEstadoListas(uid) {
  return consultar(uid, null, true);
}

// Crear una lista
export function crearLista(uid, nombre, categoria) {
  const titulo = nombre.trim();

  if (!titulo || titulo.length > 80) {
    throw new Error('Escribe un nombre de hasta 80 caracteres.');
  }

  if (!CATEGORIAS.includes(categoria)) {
    throw new Error('Selecciona una categoría válida.');
  }

  return consultar(uid, (listas) => {
    const nueva = {
      id: crypto.randomUUID(),
      nombre: titulo,
      categoria,
      fechaCreacion: new Date().toISOString(),
      tareas: []
    };

    return {
      listas: [nueva, ...listas],
      cambios: [{ id: nueva.id, tipo: 'guardar' }]
    };
  });
}

// Eliminar una lista
export function eliminarLista(uid, listaId) {
  return consultar(uid, (listas) => ({
    listas: listas.filter(
      (lista) => lista.id !== listaId
    ),
    cambios: [{ id: listaId, tipo: 'eliminar' }]
  }));
}

// Agregar una tarea
export function agregarTarea(uid, listaId, titulo, fecha) {
  const texto = titulo.trim();

  if (!texto || texto.length > 100) {
    throw new Error('Escribe una tarea de hasta 100 caracteres.');
  }

  return consultar(uid, (listas) => {
    if (!listas.some((lista) => lista.id === listaId)) {
      throw new Error('La lista ya no existe.');
    }

    return {
      listas: listas.map((lista) =>
        lista.id === listaId
          ? {
              ...lista,
              tareas: [
                {
                  id: crypto.randomUUID(),
                  titulo: texto,
                  fecha,
                  completada: false
                },
                ...lista.tareas
              ]
            }
          : lista
      ),
      cambios: [{ id: listaId, tipo: 'guardar' }]
    };
  });
}

// Marcar o desmarcar una tarea
export function alternarTarea(uid, listaId, tareaId) {
  return consultar(uid, (listas) => ({
    listas: listas.map((lista) =>
      lista.id === listaId
        ? {
            ...lista,
            tareas: lista.tareas.map((tarea) =>
              tarea.id === tareaId
                ? { ...tarea, completada: !tarea.completada }
                : tarea
            )
          }
        : lista
    ),
    cambios: [{ id: listaId, tipo: 'guardar' }]
  }));
}

// Eliminar una tarea
export function eliminarTarea(uid, listaId, tareaId) {
  return consultar(uid, (listas) => ({
    listas: listas.map((lista) =>
      lista.id === listaId
        ? {
            ...lista,
            tareas: lista.tareas.filter(
              (tarea) => tarea.id !== tareaId
            )
          }
        : lista
    ),
    cambios: [{ id: listaId, tipo: 'guardar' }]
  }));
}