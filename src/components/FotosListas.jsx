import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '../config/firebase';

import {
  guardarFotoLista,
  obtenerFotosListas
} from '../services/fotosListasDB';

import { obtenerFotosNube } from '../services/fotosNube';
import { sincronizarFotos } from '../services/fotosSync';

// Combinar fotografías locales y de Firestore sin repetirlas
function unirFotos(locales, remotas) {
  const mapa = new Map();

  for (const foto of remotas) {
    mapa.set(foto.id, {
      ...foto,
      sincronizado: true
    });
  }

  for (const foto of locales) {
    mapa.set(foto.id, {
      ...(mapa.get(foto.id) ?? {}),
      ...foto
    });
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
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Controlar cambios de sesión y consultas anteriores
  const versionSesion = useRef(0);
  const versionCarga = useRef(0);
  const sincronizacionActual = useRef(null);

  // Comprobar que seguimos en la misma sesión
  const sesionValida = useCallback((uidActual, version) => {
    return (
      versionSesion.current === version &&
      auth.currentUser?.uid === uidActual
    );
  }, []);

  // Cargar fotografías locales y, si corresponde, remotas
  const cargarFotos = useCallback(
    async (uidActual, version, consultarNube = false) => {
      const solicitud = ++versionCarga.current;

      const locales = await obtenerFotosListas(uidActual);

      if (
        !sesionValida(uidActual, version) ||
        versionCarga.current !== solicitud
      ) {
        return;
      }

      // Mostrar primero las fotografías locales.
      // Conservar también las remotas ya cargadas.
      setFotos((anteriores) => {
        const remotasAnteriores = anteriores.filter(
          (foto) => !(foto.imagen instanceof Blob)
        );

        return unirFotos(locales, remotasAnteriores);
      });

      // Consultar Firestore cuando exista conexión
      if (!consultarNube || !navigator.onLine) {
        return;
      }

      const remotas = await obtenerFotosNube(uidActual);

      if (
        !sesionValida(uidActual, version) ||
        versionCarga.current !== solicitud
      ) {
        return;
      }

      setFotos(unirFotos(locales, remotas));
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
          'Sin conexión. Tus fotografías permanecen guardadas localmente.'
        );
        return;
      }

      // Si ya está sincronizando, solicitar otra pasada
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

            // Subir fotografías pendientes
            try {
              resultado = await sincronizarFotos(uidActual);
            } catch (error) {
              fallo = error;
            }

            if (!sesionValida(uidActual, version)) {
              return;
            }

            // Recuperar las fotografías desde Firestore
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
                'Tus fotografías locales se conservan.'
              );
            } else if (resultado.errores.length > 0) {
              setMensaje(
                `Hay ${resultado.pendientes} fotografía(s) ` +
                'pendiente(s). ' +
                resultado.errores[0].mensaje
              );
            } else if (resultado.pendientes > 0) {
              setMensaje(
                'Quedan fotografías pendientes de sincronización.'
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

  // Detectar sesión y cargar fotografías
    useEffect(() => {
      const referenciaSesion = versionSesion;

      const cancelar = onAuthStateChanged(auth, (usuario) => {
      const version = ++versionSesion.current;
      const uidActual = usuario?.uid ?? null;

      setUid(uidActual);
      setFotos([]);
      setVista(null);
      setMensaje('');
      setSincronizando(false);

      if (!usuario) {
        setCargando(false);
        return;
      }

      setCargando(true);

      async function iniciar() {
        try {
          // Las fotos locales se muestran primero
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

        // Después intentar sincronizar con la nube
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

  // Reintentar cuando regresa Internet
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

  // Liberar solamente las URL temporales de IndexedDB
  useEffect(() => {
    return () => {
      if (vista?.temporal) {
        URL.revokeObjectURL(vista.url);
      }
    };
  }, [vista]);

  // Mostrar una fotografía local o remota
  function mostrarFoto(foto) {
    if (foto.imagen instanceof Blob) {
      const url = URL.createObjectURL(foto.imagen);

      setVista({
        url,
        nombre: foto.nombre,
        temporal: true
      });

      return;
    }

    if (foto.urlImagen) {
      setVista({
        url: foto.urlImagen,
        nombre: foto.nombre,
        temporal: false
      });

      return;
    }

    setMensaje(
      'Esta fotografía todavía no tiene una imagen disponible.'
    );
  }

  // Guardar una fotografía nueva
  async function seleccionarFoto(e) {
    const input = e.target;
    const archivo = input.files?.[0];

    if (!archivo || !uid || guardando) return;

    // Utilizar formatos compatibles con el preset
    const permitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!permitidos.includes(archivo.type)) {
      setMensaje(
        'Selecciona una fotografía JPG, PNG o WebP.'
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
      // Primero guardar en IndexedDB
      const foto = await guardarFotoLista(
        archivo,
        uidActual
      );

      if (!sesionValida(uidActual, version)) return;

      // Actualizar fotografías visibles
      await cargarFotos(uidActual, version, false);

      if (!sesionValida(uidActual, version)) return;

      // Mostrar vista previa
      mostrarFoto(foto);

      setMensaje(
        'Fotografía guardada localmente. ' +
        'Se intentará sincronizar con la nube.'
      );

      // Solicitar sincronización automática
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

  // Botón manual de sincronización
  function sincronizarAhora() {
    if (!uid || guardando) return;

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
                disabled={guardando}
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
                disabled={guardando}
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
              disabled={sincronizando || guardando}
            >
              <i className="bi bi-arrow-repeat me-2"></i>

              {sincronizando
                ? 'Sincronizando...'
                : 'Sincronizar fotografías'}
            </button>

            {sincronizando && (
              <span className="spinner-border spinner-border-sm text-primary" />
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

          {/* Fotografías de la cuenta */}
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
                      {foto.sincronizado === true
                        ? 'En la nube'
                        : foto.urlImagen
                          ? 'Pendiente en Firebase'
                          : 'Pendiente de subir'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm flex-shrink-0"
                    onClick={() => mostrarFoto(foto)}
                    disabled={!foto.imagen && !foto.urlImagen}
                  >
                    Ver foto
                  </button>
                </li>
              ))}
            </ul>
          )}

        </>
      )}

    </section>
  );
}