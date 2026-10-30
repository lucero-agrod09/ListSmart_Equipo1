import { Link } from 'react-router'

export default function Inicio() {
  return (
    <section className="py-4">
      <h1 className="fw-bold">Hola :3</h1>

      <p className="text-secondary">
        Bienvenido a ListSmart.
        Organiza tus compras, listas y pendientes.
      </p>

      <div className="row g-3 mt-3">
        <div className="col-12 col-md-6">
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body p-4">
              <h2 className="h5">📋 Mis listas</h2>
              <p className="text-secondary">
                Consulta tus listas de compras y pendientes.
              </p>
              <Link to="/listas" className="btn btn-primary">
                Ver listas
              </Link>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body p-4">
              <h2 className="h5">➕ Nueva lista</h2>
              <p className="text-secondary">
                Prepara una nueva lista para organizarte.
              </p>
              <Link to="/nueva-lista" className="btn btn-primary">
                Crear lista
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}