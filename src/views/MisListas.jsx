
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '../config/firebase';
import { sincronizarListas } from '../services/listasSync';

import {
  obtenerListas,
  obtenerEstadoListas,
  crearLista,
  eliminarLista,
  agregarTarea,
  alternarTarea,
  eliminarTarea
} from '../services/listasDB';

import FotosListas from '../components/FotosListas';
import '../styles/listas.css';

export default function MisListas() {
  const [uid, setUid] = useState(undefined);
  const [listas, setListas] = useState([]);
  const [listaId, setListaId] = useState(null);

  // NUEVO: sección seleccionada
  const [seccionActiva, setSeccionActiva] = useState('listas');

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Pendientes');

  const [tituloTarea, setTituloTarea] = useState('');
  const [fecha, setFecha] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todas');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Estado de sincronización
  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeNube, setMensajeNube] = useState('');
  const cambiosLocales = useRef(0);

  // Solicitar nueva sincronización
  const [solicitudSync, setSolicitudSync] = useState(0);

  // Obtener sesión y listas locales
  useEffect(() => {
    let activo = true;
    let version = 0;

    const cancelar = onAuthStateChanged(auth, async (usuario) => {
      const actual = ++version;

      cambiosLocales.current++;
      setUid(usuario?.uid ?? null);
      setListas([]);
      setListaId(null);
      setError('');
      setMensajeNube('');
      setSincronizando(false);
      setSeccionActiva('listas');

      if (!usuario) {
        setCargando(false);
        return;
      }

      setCargando(true);

      try {
        const datos = await obtenerListas(usuario.uid);

        if (activo && version === actual) {
          setListas(datos);
        }
      } catch {
        if (activo && version === actual) {
          setError('No se pudieron cargar las listas.');
        }
      } finally {
        if (activo && version === actual) {
          setCargando(false);
        }
      }
    });

    return () => {
      activo = false;
      version++;
      cancelar();
    };
  }, []);

  // Ejecutar cambios en IndexedDB
  async function ejecutar(operacion, alTerminar) {
    if (guardando || !uid || auth.currentUser?.uid !== uid) {
      return;
    }

    setGuardando(true);
    setError('');

    try {
      const actualizadas = await operacion();

      if (auth.currentUser?.uid !== uid) return;

      cambiosLocales.current++;
      setListas(actualizadas);

      setMensajeNube(
        'Tienes cambios locales pendientes de sincronizar.'
      );

      alTerminar?.(actualizadas);

      // Sincronizar después de guardar localmente
      setSolicitudSync((numero) => numero + 1);

    } catch (e) {
      setError(
        e.message || 'No se pudieron guardar los cambios.'
      );
    } finally {
      setGuardando(false);
    }
  }

  // Sincronización manual
  function sincronizarAhora() {
    setSolicitudSync((numero) => numero + 1);
  }

  // Sincronización automática con Firebase
  useEffect(() => {
    if (!uid || cargando) return;

    let cancelada = false;

    async function sincronizarAutomaticamente() {
      if (auth.currentUser?.uid !== uid) return;

      if (!navigator.onLine) {
        setSincronizando(false);

        setMensajeNube(
          'Sin conexión. Tus cambios permanecen guardados en este dispositivo.'
        );

        return;
      }

      setSincronizando(true);
      setMensajeNube('Sincronizando con Firebase...');

      try {
        for (let pasada = 0; pasada < 5; pasada++) {
          const versionAntes = cambiosLocales.current;

          await sincronizarListas(uid);

          if (
            cancelada ||
            auth.currentUser?.uid !== uid
          ) {
            return;
          }

          const estado = await obtenerEstadoListas(uid);

          if (
            cancelada ||
            auth.currentUser?.uid !== uid
          ) {
            return;
          }

          if (cambiosLocales.current === versionAntes) {
            setListas(estado.listas);
          }

          if (estado.pendientes.length === 0) {
            setMensajeNube(
              'Tus listas están sincronizadas con Firebase.'
            );
            return;
          }
        }

        if (!cancelada) {
          setMensajeNube(
            'Quedan cambios pendientes. Puedes volver a sincronizar.'
          );
        }

      } catch {
        if (
          !cancelada &&
          auth.currentUser?.uid === uid
        ) {
          setMensajeNube(
            'No se pudo sincronizar. Tus cambios siguen guardados localmente.'
          );
        }
      } finally {
        if (
          !cancelada &&
          auth.currentUser?.uid === uid
        ) {
          setSincronizando(false);
        }
      }
    }

    sincronizarAutomaticamente();

    return () => {
      cancelada = true;
    };
  }, [uid, cargando, solicitudSync]);

  // Reintentar cuando regrese Internet
  useEffect(() => {
    function alRecuperarConexion() {
      setSolicitudSync((numero) => numero + 1);
    }

    window.addEventListener('online', alRecuperarConexion);

    return () => {
      window.removeEventListener(
        'online',
        alRecuperarConexion
      );
    };
  }, []);

  // Crear una lista
  function guardarLista(e) {
    e.preventDefault();

    ejecutar(
      () => crearLista(uid, nombre, categoria),
      (actualizadas) => {
        setNombre('');
        setListaId(actualizadas[0]?.id ?? null);
        setBusqueda('');
        setFiltro('todas');
      }
    );
  }

  // Eliminar una lista
  function borrarLista(lista) {
    if (!window.confirm(`¿Eliminar la lista "${lista.nombre}"?`)) {
      return;
    }

    ejecutar(
      () => eliminarLista(uid, lista.id),
      (actualizadas) => {
        if (lista.id === listaId) {
          setListaId(actualizadas[0]?.id ?? null);
        }
      }
    );
  }

  // Lista seleccionada
  const listaSeleccionada =
    listas.find((lista) => lista.id === listaId) ??
    listas[0] ??
    null;

  // Agregar pendiente
  function guardarTarea(e) {
    e.preventDefault();

    if (!listaSeleccionada) return;

    ejecutar(
      () => agregarTarea(
        uid,
        listaSeleccionada.id,
        tituloTarea,
        fecha
      ),
      () => {
        setTituloTarea('');
        setFecha('');
      }
    );
  }

  // Estadísticas
  const totalTareas = listas.reduce(
    (total, lista) => total + lista.tareas.length,
    0
  );

  const completadas = listas.reduce(
    (total, lista) =>
      total + lista.tareas.filter(
        (tarea) => tarea.completada
      ).length,
    0
  );

  const pendientes = totalTareas - completadas;

  // Progreso de la lista seleccionada
  const totalLista = listaSeleccionada?.tareas.length ?? 0;

  const hechasLista = listaSeleccionada?.tareas.filter(
    (tarea) => tarea.completada
  ).length ?? 0;

  const progreso = totalLista
    ? Math.round((hechasLista / totalLista) * 100)
    : 0;

  // Búsqueda y filtros
  const tareasFiltradas = (
    listaSeleccionada?.tareas ?? []
  ).filter((tarea) => {
    const coincideTexto = tarea.titulo
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideEstado =
      filtro === 'todas' ||
      (filtro === 'pendientes' && !tarea.completada) ||
      (filtro === 'completadas' && tarea.completada);

    return coincideTexto && coincideEstado;
  });

  // Cargando
  if (cargando || uid === undefined) {
    return (
      <section className="py-4 listas-page">
        <p className="text-secondary">
          Cargando mis listas...
        </p>
      </section>
    );
  }

  // Sin sesión
  if (!uid) {
    return (
      <section className="py-4 listas-page">
        <h1 className="fw-bold">📋 Mis listas</h1>

        <div className="card border-0 shadow-sm mt-4">
          <div className="card-body p-4 text-center">

            <i className="bi bi-person-lock fs-1 text-primary"></i>

            <h2 className="h5 mt-3">
              Inicia sesión para continuar
            </h2>

            <p className="text-secondary">
              Accede a tu cuenta para crear y guardar
              tus listas personales.
            </p>

            <Link
              to="/perfil"
              className="btn btn-listasmart"
            >
              Ir a mi perfil
            </Link>

          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-4 listas-page">

      {/* ENCABEZADO */}
      <div className="mb-4">
        <h1 className="fw-bold mb-2">
          📋 Mis listas
        </h1>

        <p className="text-secondary mb-0">
          Selecciona qué deseas administrar en ListSmart.
        </p>
      </div>

      {/* =====================================
          NUEVO: BOTONES DE SECCIONES
      ===================================== */}
      <div className="row g-3 mb-4">

        {/* BOTÓN CREAR LISTAS */}
        <div className="col-12 col-md-6">
          <button
            type="button"
            className={`btn w-100 h-100 p-4 text-start rounded-4 ${
              seccionActiva === 'listas'
                ? 'btn-primary'
                : 'btn-outline-primary'
            }`}
            onClick={() => setSeccionActiva('listas')}
            aria-pressed={seccionActiva === 'listas'}
            aria-controls="seccion-listas"
          >
            <div className="d-flex align-items-center gap-3">

              <i
                className="bi bi-card-checklist fs-1"
                aria-hidden="true"
              ></i>

              <div>
                <h2 className="h5 fw-bold mb-1">
                  Crear listas
                </h2>

                <p className="small mb-0">
                  Crea, organiza y administra
                  tus listas y pendientes.
                </p>
              </div>

            </div>
          </button>
        </div>

        {/* BOTÓN FOTOGRAFIAR */}
        <div className="col-12 col-md-6">
          <button
            type="button"
            className={`btn w-100 h-100 p-4 text-start rounded-4 ${
              seccionActiva === 'fotos'
                ? 'btn-primary'
                : 'btn-outline-primary'
            }`}
            onClick={() => setSeccionActiva('fotos')}
            aria-pressed={seccionActiva === 'fotos'}
            aria-controls="seccion-fotos"
          >
            <div className="d-flex align-items-center gap-3">

              <i
                className="bi bi-camera fs-1"
                aria-hidden="true"
              ></i>

              <div>
                <h2 className="h5 fw-bold mb-1">
                  Fotografiar mis listas
                </h2>

                <p className="small mb-0">
                  Captura, guarda y consulta
                  fotografías de tus listas.
                </p>
              </div>

            </div>
          </button>
        </div>

      </div>

      {/* =====================================
          SECCIÓN 1: ADMINISTRAR LISTAS
      ===================================== */}
      <div
        id="seccion-listas"
        role="region"
        aria-label="Administrar listas"
        hidden={seccionActiva !== 'listas'}
      >

        {/* ESTADÍSTICAS */}
        <div className="row g-3 mb-4">

          <div className="col-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <p className="small text-secondary mb-1">
                  Listas
                </p>

                <h2 className="h3 fw-bold mb-0">
                  {listas.length}
                </h2>
              </div>
            </div>
          </div>

          <div className="col-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <p className="small text-secondary mb-1">
                  Pendientes
                </p>

                <h2 className="h3 fw-bold mb-0">
                  {pendientes}
                </h2>
              </div>
            </div>
          </div>

          <div className="col-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <p className="small text-secondary mb-1">
                  Hechas
                </p>

                <h2 className="h3 fw-bold mb-0 text-primary">
                  {completadas}
                </h2>
              </div>
            </div>
          </div>

        </div>

        {/* ERRORES */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* SINCRONIZACIÓN CON FIREBASE */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">

              <div>
                <h2 className="h5 fw-bold mb-1">
                  <i className="bi bi-cloud-arrow-up me-2 text-primary"></i>
                  Sincronización en la nube
                </h2>

                <p className="small text-secondary mb-0">
                  Guarda tus listas en Firebase
                  para consultarlas desde otros dispositivos.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-listasmart"
                onClick={sincronizarAhora}
                disabled={sincronizando || guardando}
              >
                <i className="bi bi-arrow-repeat me-2"></i>

                {sincronizando
                  ? 'Sincronizando...'
                  : 'Sincronizar con Firebase'}
              </button>

            </div>

            {mensajeNube && (
              <p
                className="small text-secondary mt-3 mb-0"
                role="status"
              >
                {mensajeNube}
              </p>
            )}

          </div>
        </div>

        {/* CREAR NUEVA LISTA */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">

            <h2 className="h5 fw-bold mb-3">
              <i className="bi bi-plus-circle me-2 text-primary"></i>
              Crear nueva lista
            </h2>

            <form onSubmit={guardarLista}>

              <div className="row g-3">

                <div className="col-md-7">
                  <label
                    htmlFor="nombreLista"
                    className="form-label"
                  >
                    Nombre de la lista
                  </label>

                  <input
                    id="nombreLista"
                    type="text"
                    className="form-control"
                    placeholder="Ej. Compras del sábado"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    maxLength={80}
                    required
                  />
                </div>

                <div className="col-md-5">
                  <label
                    htmlFor="categoriaLista"
                    className="form-label"
                  >
                    Categoría
                  </label>

                  <select
                    id="categoriaLista"
                    className="form-select"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    <option value="Compras">Compras</option>
                    <option value="Pendientes">Pendientes</option>
                    <option value="Trabajo">Trabajo</option>
                  </select>
                </div>

              </div>

              <button
                type="submit"
                className="btn btn-listasmart mt-3"
                disabled={guardando}
              >
                <i className="bi bi-plus-lg me-2"></i>
                Crear lista
              </button>

            </form>

          </div>
        </div>

        {/* LISTAS EXISTENTES */}
        {listas.length > 0 && (
          <div className="row g-4">

            {/* LISTADO DE LISTAS */}
            <div className="col-lg-4">

              <h2 className="h5 fw-bold mb-3">
                Mis listas guardadas
              </h2>

              <div className="d-flex flex-column gap-2">

                {listas.map((lista) => {
                  const hechas = lista.tareas.filter(
                    (tarea) => tarea.completada
                  ).length;

                  return (
                    <div
                      key={lista.id}
                      className="card border-0 shadow-sm"
                    >
                      <div className="card-body p-3">

                        <button
                          type="button"
                          className={`btn w-100 text-start ${
                            listaSeleccionada?.id === lista.id
                              ? 'btn-primary'
                              : 'btn-light'
                          }`}
                          onClick={() => {
                            setListaId(lista.id);
                            setBusqueda('');
                            setFiltro('todas');
                          }}
                        >
                          <span className="fw-semibold d-block">
                            {lista.nombre}
                          </span>

                          <span className="small">
                            {lista.categoria} ·{' '}
                            {hechas}/{lista.tareas.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger mt-2"
                          onClick={() => borrarLista(lista)}
                          disabled={guardando}
                        >
                          <i className="bi bi-trash me-1"></i>
                          Eliminar lista
                        </button>

                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* LISTA SELECCIONADA */}
            <div className="col-lg-8">

              {listaSeleccionada && (
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4">

                    <h2 className="h4 fw-bold mb-1">
                      {listaSeleccionada.nombre}
                    </h2>

                    <p className="text-secondary small">
                      {listaSeleccionada.categoria}
                    </p>

                    {/* PROGRESO */}
                    <div className="d-flex justify-content-between mb-2">
                      <span className="small text-secondary">
                        Progreso
                      </span>

                      <span className="small fw-bold">
                        {progreso}%
                      </span>
                    </div>

                    <div
                      className="progress mb-4"
                      role="progressbar"
                      aria-label="Progreso de la lista"
                      aria-valuenow={progreso}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      style={{ height: '8px' }}
                    >
                      <div
                        className="progress-bar"
                        style={{ width: `${progreso}%` }}
                      ></div>
                    </div>

                    {/* AGREGAR PENDIENTE */}
                    <h3 className="h6 fw-bold mb-3">
                      Agregar pendiente
                    </h3>

                    <form
                      onSubmit={guardarTarea}
                      className="mb-4"
                    >

                      <div className="row g-2">

                        <div className="col-md-7">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="¿Qué tienes que hacer?"
                            aria-label="Nombre del pendiente"
                            value={tituloTarea}
                            onChange={(e) =>
                              setTituloTarea(e.target.value)
                            }
                            maxLength={100}
                            required
                          />
                        </div>

                        <div className="col-md-5">
                          <input
                            type="date"
                            className="form-control"
                            aria-label="Fecha opcional"
                            value={fecha}
                            onChange={(e) =>
                              setFecha(e.target.value)
                            }
                          />
                        </div>

                      </div>

                      <button
                        type="submit"
                        className="btn btn-listasmart mt-2"
                        disabled={guardando}
                      >
                        <i className="bi bi-plus-lg me-2"></i>
                        Agregar
                      </button>

                    </form>

                    {/* BUSCAR Y FILTRAR PENDIENTES */}
                    <div className="row g-2 mb-3">

                      <div className="col-md-7">
                        <input
                          type="search"
                          className="form-control"
                          placeholder="Buscar pendientes..."
                          aria-label="Buscar pendientes"
                          value={busqueda}
                          onChange={(e) =>
                            setBusqueda(e.target.value)
                          }
                        />
                      </div>

                      <div className="col-md-5">
                        <select
                          className="form-select"
                          aria-label="Filtrar pendientes"
                          value={filtro}
                          onChange={(e) =>
                            setFiltro(e.target.value)
                          }
                        >
                          <option value="todas">Todas</option>
                          <option value="pendientes">Pendientes</option>
                          <option value="completadas">Completadas</option>
                        </select>
                      </div>

                    </div>

                    {/* TAREAS */}
                    {tareasFiltradas.length === 0 ? (

                      <p className="text-secondary small">
                        No hay pendientes que mostrar.
                      </p>

                    ) : (

                      <div className="list-group">

                        {tareasFiltradas.map((tarea) => (
                          <div
                            key={tarea.id}
                            className="list-group-item d-flex align-items-center gap-3"
                          >

                            <input
                              type="checkbox"
                              className="form-check-input mt-0"
                              checked={tarea.completada}
                              disabled={guardando}
                              aria-label={`Completar ${tarea.titulo}`}
                              onChange={() => ejecutar(
                                () => alternarTarea(
                                  uid,
                                  listaSeleccionada.id,
                                  tarea.id
                                )
                              )}
                            />

                            <div
                              className="flex-grow-1"
                              style={{ minWidth: 0 }}
                            >

                              <span
                                className={
                                  tarea.completada
                                    ? 'text-decoration-line-through text-secondary'
                                    : 'fw-medium'
                                }
                              >
                                {tarea.titulo}
                              </span>

                              {tarea.fecha && (
                                <div className="small text-secondary mt-1">
                                  <i className="bi bi-calendar me-1"></i>
                                  {tarea.fecha}
                                </div>
                              )}

                            </div>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              aria-label={`Eliminar ${tarea.titulo}`}
                              disabled={guardando}
                              onClick={() => ejecutar(
                                () => eliminarTarea(
                                  uid,
                                  listaSeleccionada.id,
                                  tarea.id
                                )
                              )}
                            >
                              <i className="bi bi-trash"></i>
                            </button>

                          </div>
                        ))}

                      </div>

                    )}

                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* SIN LISTAS */}
        {listas.length === 0 && (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4 text-center">

              <i className="bi bi-card-checklist fs-1 text-primary"></i>

              <h2 className="h5 mt-3">
                Todavía no tienes listas
              </h2>

              <p className="text-secondary mb-0">
                Crea tu primera lista para comenzar a organizarte.
              </p>

            </div>
          </div>
        )}

        {/* RESUMEN */}
        {listas.length > 0 && (
          <p className="text-secondary small mt-4">
            Tienes {totalTareas} tareas registradas en total.
          </p>
        )}

      </div>

      {/* =====================================
          SECCIÓN 2: FOTOGRAFIAR MIS LISTAS
      ===================================== */}
      <div
        id="seccion-fotos"
        role="region"
        aria-label="Fotografías de mis listas"
        hidden={seccionActiva !== 'fotos'}
      >

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">

            {/* Se mantiene el componente original */}
            <FotosListas />

          </div>
        </div>

      </div>

    </section>
  );
}
