
import { Link } from 'react-router'
import NetworkBadge from './NetworkBadge.jsx'

// Encabezado principal de ListSmart
export default function AppHeader() {
  return (
    <header className="app-header navbar navbar-dark bg-listasmart sticky-top">
      <div className="container-fluid app-header__inner">

        <Link
          to="/"
          className="navbar-brand fw-bold mb-0"
        >
          <i
            className="bi bi-check2-square me-2"
            aria-hidden="true"
          ></i>

          ListSmart
        </Link>

        <NetworkBadge />

      </div>
    </header>
  )
}
