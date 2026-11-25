
import { Link } from 'react-router'

export default function Inicio() {
  return (
    <section className="py-3 py-md-4">

      {/* PRESENTACIÓN */}
      <div
        className="rounded-4 p-4 p-md-5 mb-4"
        style={{
          background:
            'linear-gradient(135deg, #168af0 0%, #0b72c7 100%)',
          color: '#ffffff'
        }}
      >

        <div className="d-flex align-items-center gap-2 mb-3">
          <i className="bi bi-check2-square fs-3"></i>

          <span className="fw-bold fs-4">
            ListSmart
          </span>
        </div>

        <h1 className="fw-bold mb-3">
          ¡Bienvenido a ListSmart!
        </h1>

        <p
          className="mb-0"
          style={{
            maxWidth: '650px',
            opacity: 0.95
          }}
        >
          Organiza tus compras y pendientes,
          crea listas personalizadas y consulta
          productos desde un solo lugar.
          ¡Haz que tus actividades sean más sencillas!
        </p>

      </div>

      {/* SECCIÓN PRINCIPAL */}
      <div className="mb-4">

        <h2 className="h4 fw-bold mb-2">
          ¿Qué puedes hacer en ListSmart?
        </h2>

        <p className="text-secondary">
          Conoce las funciones principales de la aplicación.
        </p>

      </div>

      <div className="row g-4">

        {/* MIS LISTAS */}
        <div className="col-md-6">

          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4 d-flex flex-column">

              <div
                className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                style={{
                  width: '56px',
                  height: '56px',
                  backgroundColor: '#eaf5ff',
                  color: '#168af0'
                }}
              >
                <i className="bi bi-card-checklist fs-3"></i>
              </div>

              <h3 className="h5 fw-bold">
                Mis listas
              </h3>

              <p className="text-secondary mb-4">
                Consulta y administra las listas que
                hayas creado. Organiza tus pendientes,
                revisa su contenido y marca las
                actividades que ya completaste.
              </p>

              <Link
                to="/listas"
                className="btn btn-primary mt-auto"
              >
                <i className="bi bi-list-check me-2"></i>
                Ver mis listas
              </Link>

            </div>
          </div>

        </div>

        {/* NUEVA LISTA */}
        <div className="col-md-6">

          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4 d-flex flex-column">

              <div
                className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                style={{
                  width: '56px',
                  height: '56px',
                  backgroundColor: '#eaf5ff',
                  color: '#168af0'
                }}
              >
                <i className="bi bi-plus-square fs-3"></i>
              </div>

              <h3 className="h5 fw-bold">
                Nueva lista
              </h3>

              <p className="text-secondary mb-4">
                Crea listas para tus compras,
                tareas escolares o actividades
                personales. Agrega lo que necesites
                y mantén todo organizado.
              </p>

              <Link
                to="/listas"
                className="btn btn-outline-primary mt-auto"
              >
                <i className="bi bi-plus-circle me-2"></i>
                Crear una lista
              </Link>

            </div>
          </div>

        </div>

        {/* CONSULTAR PRECIOS */}
        <div className="col-12">

          <div className="card border-0 shadow-sm">

            <div className="card-body p-4 p-md-5">

              <div className="row align-items-center g-4">

                <div className="col-md-8">

                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center mb-3"
                    style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: '#eaf5ff',
                      color: '#168af0'
                    }}
                  >
                    <i className="bi bi-tags fs-3"></i>
                  </div>

                  <h3 className="h5 fw-bold">
                    Consultar productos y precios
                  </h3>

                  <p className="text-secondary mb-2">
                    ¿Quieres conocer el precio de referencia
                    de un producto?
                  </p>

                  <p className="text-secondary mb-3">
                    Explora nuestro catálogo, consulta
                    imágenes, descripciones y precios
                    de ejemplo para tener una orientación
                    al organizar tus compras.
                  </p>

                  <p className="small text-secondary mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Los datos provienen de FakeStoreAPI.
                    Son precios ilustrativos y no
                    cotizaciones de tiendas en tiempo real.
                  </p>

                </div>

                <div className="col-md-4">

                  <div
                    className="rounded-4 p-4 text-center"
                    style={{
                      backgroundColor: '#edf7ff'
                    }}
                  >

                    <i
                      className="bi bi-search fs-1 d-block mb-3"
                      style={{ color: '#168af0' }}
                    ></i>

                    <p className="fw-semibold mb-3">
                      Explora el catálogo
                    </p>

                    <Link
                      to="/recursos"
                      className="btn btn-primary w-100"
                    >
                      <i className="bi bi-bag-check me-2"></i>
                      Consultar precios
                    </Link>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* INFORMACIÓN ADICIONAL */}
      <div
        className="rounded-4 p-4 mt-4"
        style={{
          backgroundColor: '#eaf5ff'
        }}
      >

        <div className="d-flex align-items-start gap-3">

          <i
            className="bi bi-cloud-check fs-3"
            style={{ color: '#168af0' }}
          ></i>

          <div>

            <h3 className="h6 fw-bold mb-2">
              Tus listas, cuando las necesites
            </h3>

            <p className="text-secondary small mb-0">
              ListSmart permite consultar y gestionar
              tus listas sin conexión a Internet.
              Cuando recuperes la conexión, los cambios
              pendientes podrán sincronizarse
              con tu cuenta de Firebase.
            </p>

          </div>

        </div>

      </div>

    </section>
  )
}
