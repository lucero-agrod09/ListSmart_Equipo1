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

// Consultar y modificar listas de una cuenta
async function consultar(uid, modificar) {
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

    let resultado = [];
    let errorPropio = null;

    solicitud.onsuccess = () => {
      try {
        const actuales = Array.isArray(solicitud.result?.listas)
          ? solicitud.result.listas
          : [];

        resultado = modificar
          ? modificar(actuales)
          : actuales;

        if (modificar) {
          almacen.put({ uid, listas: resultado });
        }
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

// Obtener listas del usuario
export function obtenerListas(uid) {
  return consultar(uid);
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

  return consultar(uid, (listas) => [
    {
      id: crypto.randomUUID(),
      nombre: titulo,
      categoria,
      fechaCreacion: new Date().toISOString(),
      tareas: [],
    },
    ...listas
  ]);
}

// Eliminar una lista
export function eliminarLista(uid, listaId) {
  return consultar(
    uid,
    (listas) => listas.filter((lista) => lista.id !== listaId)
  );
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

    return listas.map((lista) =>
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
    );
  });
}

// Marcar o desmarcar tarea completada
export function alternarTarea(uid, listaId, tareaId) {
  return consultar(uid, (listas) =>
    listas.map((lista) =>
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
    )
  );
}

// Eliminar una tarea
export function eliminarTarea(uid, listaId, tareaId) {
  return consultar(uid, (listas) =>
    listas.map((lista) =>
      lista.id === listaId
        ? {
            ...lista,
            tareas: lista.tareas.filter(
              (tarea) => tarea.id !== tareaId
            )
          }
        : lista
    )
  );
}