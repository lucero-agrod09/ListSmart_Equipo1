
import { useState } from 'react';

export default function SeccionesMisListas({
  listas,
  fotos
}) {
  const [seccion, setSeccion] = useState('listas');

  return (
    <section>

      {/* BOTONES PRINCIPALES */}
      <div className="row g-3 mb-4">

        {/* CREAR LISTAS */}
        <div className="col-12 col-md-6">
          <button
            type="button"
            className={`btn w-100 h-100 text-start p-4 rounded-4 ${
              seccion === 'listas'
                ? 'btn-primary'
                : 'btn-outline-primary'
            }`}
            onClick={() => setSeccion('listas')}
            aria-pressed={seccion === 'listas'}
            aria-controls="contenido-listas"
          >

            <div className="d-flex align-items-center gap-3">

              <i className="bi bi-card-checklist fs-1"></i>

              <div>
                <h2 className="h5 fw-bold mb-1">
                  Crear listas
                </h2>

                <p className="small mb-0">
                  Crea, organiza y administra tus listas.
                </p>
              </div>

            </div>

          </button>
        </div>

        {/* FOTOGRAFIAR MIS LISTAS */}
        <div className="col-12 col-md-6">
          <button
            type="button"
            className={`btn w-100 h-100 text-start p-4 rounded-4 ${
              seccion === 'fotos'
                ? 'btn-primary'
                : 'btn-outline-primary'
            }`}
            onClick={() => setSeccion('fotos')}
            aria-pressed={seccion === 'fotos'}
            aria-controls="contenido-fotos"
          >

            <div className="d-flex align-items-center gap-3">

              <i className="bi bi-camera fs-1"></i>

              <div>
                <h2 className="h5 fw-bold mb-1">
                  Fotografiar mis listas
                </h2>

                <p className="small mb-0">
                  Guarda y consulta fotografías de tus listas.
                </p>
              </div>

            </div>

          </button>
        </div>

      </div>

      {/* CONTENIDO DE LA SECCIÓN SELECCIONADA */}
      {seccion === 'listas' ? (

        <div
          id="contenido-listas"
          role="region"
          aria-label="Administrar listas"
        >
          {listas}
        </div>

      ) : (

        <div
          id="contenido-fotos"
          role="region"
          aria-label="Fotografías de mis listas"
        >
          {fotos}
        </div>

      )}

    </section>
  );
}
