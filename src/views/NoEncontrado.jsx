
import { Link } from 'react-router'
import EmptyState from '../components/ui/EmptyState.jsx'

// Pantalla cuando una ruta no existe
export default function NoEncontrado() {
  return (
    <EmptyState
      icono="bi-signpost-split"
      titulo="Página no encontrada"
    >
      <p>
        La sección que buscas no está disponible
        en ListSmart.
      </p>

      <Link
        to="/"
        className="btn btn-listasmart"
      >
        Volver al inicio
      </Link>
    </EmptyState>
  )
}
