import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '../config/firebase';

import {
  guardarFotoLista,
  obtenerFotosListas
} from '../services/fotosListasDB';

export default function FotosListas() {
  const [uid, setUid] = useState(undefined);
  const [fotos, setFotos] = useState([]);
  const [vista, setVista] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  // Detectar sesión y cargar fotografías de la cuenta
  useEffect(() => {
    let activo = true;
    let version = 0;

    const cancelar = onAuthStateChanged(auth, async (usuario) => {
      const actual = ++version;

      setUid(usuario?.uid ?? null);
      setFotos([]);
      setVista(null);
      setMensaje('');

      if (!usuario) {
        setCargando(false);
        return;
      }

      setCargando(true);

      try {
        const datos = await obtenerFotosListas(usuario.uid);

        if (activo && version === actual) {
          setFotos(datos);
        }
      } catch {
        if (activo && version === actual) {
          setMensaje('No se pudieron cargar las fotografías.');
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

  // Liberar URL temporal de la imagen
  useEffect(() => {
    return () => {
      if (vista?.url) {
        URL.revokeObjectURL(vista.url);
      }
    };
  }, [vista]);

  // Mostrar una fotografía
  function mostrarFoto(foto) {
    const url = URL.createObjectURL(foto.imagen);

    setVista({
      url,
      nombre: foto.nombre
    });
  }

  // Guardar nueva fotografía
  async function seleccionarFoto(e) {
    const input = e.target;
    const archivo = input.files?.[0];

    if (!archivo || !uid || guardando) return;

    const uidActual = uid;

    setGuardando(true);
    setMensaje('');

    try {
      const foto = await guardarFotoLista(archivo, uidActual);

      // Evitar mostrar datos si cambió la sesión
      if (auth.currentUser?.uid !== uidActual) return;

      const actualizadas = await obtenerFotosListas(uidActual);

      if (auth.currentUser?.uid !== uidActual) return;

      setFotos(actualizadas);
      mostrarFoto(foto);

      setMensaje('Fotografía guardada correctamente.');
    } catch (error) {
      if (auth.currentUser?.uid === uidActual) {
        setMensaje(error.message);
      }
    } finally {
      input.value = '';
      setGuardando(false);
    }
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

          <div className="d-flex flex-wrap gap-2 mb-3">

            <label className="btn btn-primary">
              <i className="bi bi-camera me-2"></i>
              Tomar foto

              <input
                type="file"
                accept="image/*"
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
                accept="image/*"
                className="visually-hidden"
                onChange={seleccionarFoto}
                disabled={guardando}
              />
            </label>

          </div>

          {guardando && (
            <p>Guardando fotografía...</p>
          )}

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
                alt={vista.nombre}
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
                  <span className="small text-break">
                    {foto.nombre}
                  </span>

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm flex-shrink-0"
                    onClick={() => mostrarFoto(foto)}
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