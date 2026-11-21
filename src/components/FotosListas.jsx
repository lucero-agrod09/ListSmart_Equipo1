
import { useEffect, useState } from 'react';
import {
  guardarFotoLista,
  obtenerFotosListas
} from '../services/fotosListasDB';

export default function FotosListas() {
  const [fotos, setFotos] = useState([]);
  const [vista, setVista] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Recuperar fotografías guardadas
  useEffect(() => {
    let activo = true;

    obtenerFotosListas()
      .then((datos) => {
        if (activo) setFotos(datos);
      })
      .catch(() => {
        if (activo) {
          setMensaje('No se pudieron cargar las fotografías');
        }
      });

    return () => {
      activo = false;
    };
  }, []);

  // Liberar la URL temporal de la vista previa
  useEffect(() => {
    return () => {
      if (vista?.url) URL.revokeObjectURL(vista.url);
    };
  }, [vista]);

  function mostrarFoto(foto) {
    const url = URL.createObjectURL(foto.imagen);

    setVista({
      url,
      nombre: foto.nombre
    });
  }

  // Guardar fotografía seleccionada
  async function seleccionarFoto(e) {
    const input = e.target;
    const archivo = input.files?.[0];

    if (!archivo) return;

    setGuardando(true);
    setMensaje('');

    try {
      const foto = await guardarFotoLista(archivo);

      setFotos(await obtenerFotosListas());
      mostrarFoto(foto);

      setMensaje('Fotografía guardada localmente');
    } catch (error) {
      setMensaje(error.message);
    } finally {
      input.value = '';
      setGuardando(false);
    }
  }

  return (
    <section className="mt-4">
      <h2 className="h5 mb-3">Fotografiar mi lista</h2>

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

      {guardando && <p>Guardando fotografía...</p>}

      {mensaje && (
        <p className="small text-body-secondary" role="status">
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

      {/* Fotografías almacenadas */}
      <h3 className="h6">Mis fotografías guardadas</h3>

      {fotos.length === 0 ? (
        <p className="text-body-secondary small">
          Todavía no hay fotografías guardadas.
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
    </section>
  );
}
