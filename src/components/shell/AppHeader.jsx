
import { Link } from 'react-router'
import InstallButton from './InstallButton.jsx'
import NetworkBadge from './NetworkBadge.jsx'

// ==========================================
// LISTSMART - ENCABEZADO PRINCIPAL
// ==========================================

export default function AppHeader() {
  return (
    <header className="app-header navbar navbar-dark bg-listasmart sticky-top">
      <div className="container-fluid app-header__inner flex-nowrap">

        {/* Nombre y logotipo de ListSmart */}
        <Link
          to="/"
          className="navbar-brand fw-bold text-truncate mb-0"
          aria-label="Ir al inicio de ListSmart"
        >
          <i
            className="bi bi-check2-square me-2"
            aria-hidden="true"
          ></i>

          ListSmart
        </Link>

        {/* Instalación PWA e indicador de conexión */}
        <div className="d-flex align-items-center gap-2">

          <InstallButton />

          <NetworkBadge />

        </div>

      </div>
    </header>
  )
}
