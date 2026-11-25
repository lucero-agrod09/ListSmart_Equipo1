import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '../config/firebase';

import {
  guardarFotoLista,
  obtenerFotosListas,
  obtenerFotosEliminadas,
  marcarFotoEliminada,
  confirmarEliminacionFoto,
  guardarFotoDescargada
} from '../services/fotosListasDB';

import { obtenerFotosNube } from '../services/fotosNube';
import { sincronizarFotos } from '../services/fotosSync';

// Combinar fotografías sin repetirlas ni mostrar eliminadas
function unirFotos(locales, remotas, ocultas = new Set()) {
  const mapa = new Map();

  for (const foto of remotas) {
    if (!ocultas.has(foto.id)) {
      mapa.set(foto.id, {
        ...foto,
        sincronizado: true
      });
    }
  }

  for (const foto of locales) {
    if (!ocultas.has(foto.id) && foto.eliminada !== true) {
      mapa.set(foto.id, {
        ...(mapa.get(foto.id) ?? {}),
        ...foto
      });
    }
  }

  return [...mapa.values()].sort((a, b) =>
    String(b.fechaGuardado ?? '').localeCompare(
      String(a.fechaGuardado ?? '')
    )
  );
}

export default function FotosListas() {
  const [uid, setUid] = useState(undefined);
  const [fotos, setFotos] = useState([]);
  const [vista, setVista] = useState(null);

  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [descargando, setDescargando] = useState(null);
  const [mensaje, setMensaje] = useState('');

  const versionSesion = useRef(0);
  const versionCarga = useRef(0);
  const sincronizacionActual = useRef(null);
  const descargaActual = useRef(null);

  // Fotografías ocultas durante esta sesión
  const ocultasSesion = useRef(new Set());

  // Verificar que la cuenta no haya cambiado
  const sesionValida = useCallback((uidActual, version) => {
    return (
      versionSesion.current === version &&
      auth.currentUser?.uid === uidActual
    );
  }, []);

  // Cargar fotografías locales y remotas
  const cargarFotos = useCallback(
    async (uidActual, version, consultarNube = false) => {
      const solicitud = ++versionCarga.current;

      const locales = await obtenerFotosListas(uidActual);
      const eliminadas = await obtenerFotosEliminadas(uidActual);

      if (
        !sesionValida(uidActual, version) ||
        versionCarga.current !== solicitud
      ) {
        return;
      }

      const bloqueadas = new Set([
        ...ocultasSesion.current,
        ...eliminadas.map((foto) => foto.id)
      ]);

      // Mostrar primero las fotografías locales
      setFotos((anteriores) => {
        const remotasAnteriores = anteriores.filter(
          (foto) => !(foto.imagen instanceof Blob)
        );

        return unirFotos(
          locales,
          remotasAnteriores,
          bloqueadas
        );
      });

      if (!consultarNube || !navigator.onLine) {
        return;
      }

      // Obtener fotografías actuales de Firestore
      const remotas = await obtenerFotosNube(uidActual);

      if (
        !sesionValida(uidActual, version) ||
        versionCarga.current !== solicitud
      ) {
        return;
      }

      const idsRemotos = new Set(
        remotas.map((foto) => foto.id)
      );

      const actuales = await obtenerFotosListas(uidActual);

      // Detectar fotografías eliminadas
      // desde otro dispositivo
      for (const foto of actuales) {
        if (
          !sesionValida(uidActual, version) ||
          versionCarga.current !== solicitud
        ) {
          return;
        }

        if (
          foto.sincronizado === true &&
          !idsRemotos.has(foto.id)
        ) {
          await marcarFotoEliminada(uidActual, foto);

          await confirmarEliminacionFoto(
            uidActual,
            foto.id
          );

          ocultasSesion.current.add(foto.id);
        }
      }

      const localesFinales = await obtenerFotosListas(uidActual);
      const eliminadasFinales =
        await obtenerFotosEliminadas(uidActual);

      if (
        !sesionValida(uidActual, version) ||
        versionCarga.current !== solicitud
      ) {
        return;
      }

      const ocultas = new Set([
        ...ocultasSesion.current,
        ...eliminadasFinales.map((foto) => foto.id)
      ]);

      setFotos(unirFotos(localesFinales, remotas, ocultas));
    },
    [sesionValida]
  );

  // Sincronizar fotografías con Cloudinary y Firestore
  const intentarSincronizar = useCallback(
    async (uidActual, version) => {
      if (!sesionValida(uidActual, version)) {
        return;
      }

      if (!navigator.onLine) {
        setMensaje(
          'Sin conexión. Tus cambios permanecen guardados localmente.'
        );
        return;
      }

      const existente = sincronizacionActual.current;

      if (
        existente?.uid === uidActual &&
        existente?.version === version
      ) {
        existente.repetir = true;
        return existente.promesa;
      }

      const tarea = {
        uid: uidActual,
        version,
        repetir: false,
        promesa: null
      };

      sincronizacionActual.current = tarea;

      tarea.promesa = (async () => {
        setSincronizando(true);
        setMensaje('Sincronizando fotografías...');

        try {
          do {
            tarea.repetir = false;

            let resultado = null;
            let fallo = null;

            try {
              resultado = await sincronizarFotos(uidActual);
            } catch (error) {
              fallo = error;
            }

            if (!sesionValida(uidActual, version)) {
              return;
            }

            try {
              await cargarFotos(uidActual, version, true);
            } catch (error) {
              fallo ??= error;
            }

            if (!sesionValida(uidActual, version)) {
              return;
            }

            if (fallo) {
              setMensaje(
                `No se completó la sincronización: ${fallo.message}. ` +
                'Tus cambios locales se conservan.'
              );
            } else if (resultado.errores.length > 0) {
              setMensaje(
                `Quedan ${resultado.pendientes} operación(es) pendiente(s). ` +
                resultado.errores[0].mensaje
              );
            } else if (resultado.pendientes > 0) {
              setMensaje(
                'Todavía quedan cambios pendientes.'
              );
            } else {
              setMensaje(
                'Tus fotografías están sincronizadas con Firebase.'
              );
            }

          } while (
            tarea.repetir &&
            sesionValida(uidActual, version)
          );

        } finally {
          if (sesionValida(uidActual, version)) {
            setSincronizando(false);
          }

          if (sincronizacionActual.current === tarea) {
            sincronizacionActual.current = null;
          }
        }
      })();

      return tarea.promesa;
    },
    [cargarFotos, sesionValida]
  );

  // Detectar la cuenta activa
  useEffect(() => {
    const referenciaSesion = versionSesion;

    const cancelar = onAuthStateChanged(auth, (usuario) => {
      const version = ++versionSesion.current;
      const uidActual = usuario?.uid ?? null;

      versionCarga.current++;
      ocultasSesion.current = new Set();
      descargaActual.current = null;

      setUid(uidActual);
      setFotos([]);
      setVista(null);
      setMensaje('');
      setGuardando(false);
      setEliminando(null);
      setSincronizando(false);
      setDescargando(null);

      if (!usuario) {
        setCargando(false);
        return;
      }

      setCargando(true);

      async function iniciar() {
        try {
          await cargarFotos(uidActual, version, false);
        } catch {
          if (sesionValida(uidActual, version)) {
            setMensaje(
              'No se pudieron cargar las fotografías locales.'
            );
          }
        } finally {
          if (sesionValida(uidActual, version)) {
            setCargando(false);
          }
        }

        if (sesionValida(uidActual, version)) {
          void intentarSincronizar(uidActual, version);
        }
      }

      void iniciar();
    });

    return () => {
      referenciaSesion.current++;
      cancelar();
    };
  }, [cargarFotos, intentarSincronizar, sesionValida]);

  // Reintentar sincronización cuando vuelva Internet
  useEffect(() => {
    function alRecuperarConexion() {
      if (uid && auth.currentUser?.uid === uid) {
        void intentarSincronizar(
          uid,
          versionSesion.current
        );
      }
    }

    window.addEventListener('online', alRecuperarConexion);

    return () => {
      window.removeEventListener(
        'online',
        alRecuperarConexion
      );
    };
  }, [uid, intentarSincronizar]);

  // Liberar URL temporal de una imagen local
  useEffect(() => {
    return () => {
      if (vista?.temporal) {
        URL.revokeObjectURL(vista.url);
      }
    };
  }, [vista]);

  // NUEVO: descargar una imagen remota
  // y conservarla en IndexedDB
  async function guardarCopiaOffline(foto) {
    if (
      foto.imagen instanceof Blob ||
      !foto.urlImagen ||
      !uid
    ) {
      return;
    }

    const uidActual = uid;
    const version = versionSesion.current;

    if (!sesionValida(uidActual, version)) {
      return;
    }

    if (!navigator.onLine) {
      setMensaje(
        'Esta fotografía todavía no está disponible sin conexión.'
      );
      return;
    }

    // Evitar descargas simultáneas
    if (descargaActual.current) {
      return;
    }

    if (
      !foto.urlImagen.startsWith(
        'https://res.cloudinary.com/'
      )
    ) {
      setMensaje(
        'La fotografía no tiene una URL válida de Cloudinary.'
      );
      return;
    }

    const tarea = {
      id: foto.id,
      uid: uidActual,
      version
    };

    descargaActual.current = tarea;
    setDescargando(foto.id);

    try {
      const respuesta = await fetch(foto.urlImagen, {
        method: 'GET',
        redirect: 'error'
      });

      if (!respuesta.ok) {
        throw new Error(
          'No se pudo descargar la fotografía.'
        );
      }

      // Comprobar el tamaño cuando el servidor lo indique
      const tamano = Number(
        respuesta.headers.get('content-length')
      );

      if (tamano > 10 * 1024 * 1024) {
        throw new Error(
          'La fotografía supera el límite de 10 MB.'
        );
      }

      const imagen = await respuesta.blob();

      if (!sesionValida(uidActual, version)) {
        return;
      }

      // Guardar el archivo usando la función de IndexedDB
      const registro = await guardarFotoDescargada(
        uidActual,
        foto,
        imagen
      );

      if (!sesionValida(uidActual, version)) {
        return;
      }

      // No restaurar una fotografía eliminada
      if (
        registro.eliminada === true ||
        ocultasSesion.current.has(foto.id)
      ) {
        return;
      }

      // Actualizar el listado sin crear duplicados
      setFotos((anteriores) =>
        anteriores.map((item) =>
          item.id === foto.id
            ? {
                ...item,
                imagen: registro.imagen,
                sincronizado: true
              }
            : item
        )
      );

      setMensaje(
        'Fotografía guardada para consultarla sin conexión.'
      );

    } catch (error) {
      if (sesionValida(uidActual, version)) {
        setMensaje(
          'La fotografía puede seguir viéndose online, ' +
          'pero no se pudo guardar offline. ' +
          (error?.message || 'Revisa tu conexión.')
        );
      }
    } finally {
      if (descargaActual.current === tarea) {
        descargaActual.current = null;

        if (sesionValida(uidActual, version)) {
          setDescargando(null);
        }
      }
    }
  }

  // Mostrar fotografía local o remota
  function mostrarFoto(foto) {
    if (foto.imagen instanceof Blob) {
      setVista({
        id: foto.id,
        url: URL.createObjectURL(foto.imagen),
        nombre: foto.nombre,
        temporal: true
      });
      return;
    }

    if (foto.urlImagen) {
      if (!navigator.onLine) {
        setMensaje(
          'Esta fotografía necesita Internet porque aún ' +
          'no se ha descargado en este dispositivo.'
        );
        return;
      }

      setVista({
        id: foto.id,
        url: foto.urlImagen,
        nombre: foto.nombre,
        temporal: false
      });

      // Guardar una copia offline al verla
      void guardarCopiaOffline(foto);
      return;
    }

    setMensaje(
      'No se encontró la imagen de esta fotografía.'
    );
  }

  // Guardar una fotografía nueva
  async function seleccionarFoto(e) {
    const input = e.target;
    const archivo = input.files?.[0];

    if (!archivo || !uid || guardando || eliminando) return;

    const permitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!permitidos.includes(archivo.type)) {
      setMensaje(
        'Selecciona una imagen JPG, PNG o WebP.'
      );
      input.value = '';
      return;
    }

    const uidActual = uid;
    const version = versionSesion.current;

    if (!sesionValida(uidActual, version)) {
      input.value = '';
      return;
    }

    setGuardando(true);
    setMensaje('');

    try {
      const foto = await guardarFotoLista(
        archivo,
        uidActual
      );

      if (!sesionValida(uidActual, version)) {
        return;
      }

      await cargarFotos(uidActual, version, false);

      if (!sesionValida(uidActual, version)) {
        return;
      }

      mostrarFoto(foto);

      setMensaje(
        'Fotografía guardada localmente. ' +
        'Se intentará sincronizar.'
      );

      void intentarSincronizar(uidActual, version);

    } catch (error) {
      if (sesionValida(uidActual, version)) {
        setMensaje(
          error.message ||
          'No se pudo guardar la fotografía.'
        );
      }
    } finally {
      input.value = '';

      if (sesionValida(uidActual, version)) {
        setGuardando(false);
      }
    }
  }

  // Eliminar fotografía
  async function borrarFoto(foto) {
    if (!uid || guardando || eliminando) return;

    const confirmado = window.confirm(
      `¿Eliminar la fotografía "${foto.nombre}" de ListSmart?`
    );

    if (!confirmado) return;

    const uidActual = uid;
    const version = versionSesion.current;

    if (!sesionValida(uidActual, version)) {
      return;
    }

    setEliminando(foto.id);
    setMensaje('');

    // Invalidar consultas anteriores
    versionCarga.current++;

    try {
      await marcarFotoEliminada(uidActual, foto);

      if (!sesionValida(uidActual, version)) {
        return;
      }

      ocultasSesion.current.add(foto.id);

      setFotos((anteriores) =>
        anteriores.filter((item) => item.id !== foto.id)
      );

      setVista((anterior) =>
        anterior?.id === foto.id ? null : anterior
      );

      setMensaje(
        'Fotografía eliminada de ListSmart. ' +
        'Se intentará sincronizar la eliminación.'
      );

      void intentarSincronizar(uidActual, version);

    } catch (error) {
      if (sesionValida(uidActual, version)) {
        setMensaje(
          error.message ||
          'No se pudo eliminar la fotografía.'
        );
      }
    } finally {
      if (sesionValida(uidActual, version)) {
        setEliminando(null);
      }
    }
  }

  // Sincronizar manualmente
  function sincronizarAhora() {
    if (!uid || guardando || eliminando) return;

    void intentarSincronizar(
      uid,
      versionSesion.current
    );
  }

  return (
    <section className="mt-4">

      <h2 className="h5 mb-3">
        Fotografiar mi lista
      </h2>

      {cargando ? (
        <p className="text-secondary">
          Cargando fotografías...
        </p>
      ) : !uid ? (
        <p className="text-secondary">
          Inicia sesión desde Perfil para guardar tus fotografías.
        </p>
      ) : (
        <>

          {/* Cámara y galería */}
          <div className="d-flex flex-wrap gap-2 mb-3">

            <label className="btn btn-primary">
              <i className="bi bi-camera me-2"></i>
              Tomar foto

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="visually-hidden"
                onChange={seleccionarFoto}
                disabled={guardando || eliminando !== null}
              />
            </label>

            <label className="btn btn-outline-primary">
              <i className="bi bi-image me-2"></i>
              Elegir imagen

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="visually-hidden"
                onChange={seleccionarFoto}
                disabled={guardando || eliminando !== null}
              />
            </label>

          </div>

          {guardando && (
            <p className="small text-secondary">
              Guardando fotografía...
            </p>
          )}

          {/* Sincronización */}
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">

            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={sincronizarAhora}
              disabled={
                sincronizando ||
                guardando ||
                eliminando !== null
              }
            >
              <i className="bi bi-arrow-repeat me-2"></i>

              {sincronizando
                ? 'Sincronizando...'
                : 'Sincronizar fotografías'}
            </button>

            {sincronizando && (
              <span
                className="spinner-border spinner-border-sm text-primary"
                aria-hidden="true"
              />
            )}

          </div>

          {mensaje && (
            <p
              className="small text-body-secondary"
              role="status"
            >
              {mensaje}
            </p>
          )}

          {/* Vista previa */}
          {vista && (
            <div className="card mb-4">
              <img
                src={vista.url}
                alt={vista.nombre || 'Fotografía de lista'}
                className="card-img-top"
                style={{
                  maxHeight: '350px',
                  objectFit: 'contain'
                }}
              />
            </div>
          )}

          {/* Fotografías guardadas */}
          <h3 className="h6">
            Mis fotografías guardadas
          </h3>

          {fotos.length === 0 ? (
            <p className="text-body-secondary small">
              Todavía no tienes fotografías guardadas
              en esta cuenta.
            </p>
          ) : (
            <ul className="list-group">
              {fotos.map((foto) => (
                <li
                  key={foto.id}
                  className="list-group-item d-flex justify-content-between align-items-center gap-2"
                >

                  <div className="flex-grow-1">
                    <span className="small text-break d-block">
                      {foto.nombre}
                    </span>

                    <span className="text-body-secondary small">
                      {descargando === foto.id
                        ? 'Guardando copia offline...'
                        : foto.sincronizado === true
                          ? foto.imagen instanceof Blob
                            ? 'En la nube · Disponible offline'
                            : 'En la nube · Solo online'
                          : foto.urlImagen
                            ? 'Pendiente en Firebase'
                            : 'Pendiente de subir'}
                    </span>
                  </div>

                  <div className="d-flex flex-wrap gap-2">

                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => mostrarFoto(foto)}
                      disabled={
                        !foto.imagen && !foto.urlImagen
                      }
                    >
                      Ver foto
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => borrarFoto(foto)}
                      disabled={
                        guardando || eliminando !== null
                      }
                      aria-label={`Eliminar ${foto.nombre}`}
                    >
                      <i className="bi bi-trash me-1"></i>

                      {eliminando === foto.id
                        ? 'Eliminando...'
                        : 'Eliminar'}
                    </button>

                  </div>

                </li>
              ))}
            </ul>
          )}

        </>
      )}

    </section>
  );
}