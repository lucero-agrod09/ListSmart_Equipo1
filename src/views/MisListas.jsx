
import { Link } from 'react-router'

export default function MisListas() {
  return (
    <section className="py-4">
      <h1 className="fw-bold">📋 Mis listas</h1>

      <p className="text-secondary">
        Aquí podrás consultar y organizar
        tus listas de compras y pendientes.
      </p>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">

          <h2 className="h5">
            Todavía no hay listas para mostrar
          </h2>

          <p className="text-secondary">
            Esta sección está en desarrollo.
          </p>

          <Link
            to="/nueva-lista"
            className="btn btn-listasmart"
          >
            Crear nueva lista
          </Link>

        </div>
      </div>
    </section>
  )
}
