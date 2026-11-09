
import { NavLink } from 'react-router'

// Secciones principales de ListSmart
const secciones = [
  {
    to: '/',
    texto: 'Inicio',
    icono: 'bi-house-door'
  },
  {
    to: '/listas',
    texto: 'Mis listas',
    icono: 'bi-card-checklist'
  },
  {
    to: '/nueva-lista',
    texto: 'Nueva lista',
    icono: 'bi-plus-circle'
  },
  {
    to: '/notificaciones',
    texto: 'Avisos',
    icono: 'bi-bell'
  },
  {
    to: '/perfil',
    texto: 'Perfil',
    icono: 'bi-person-circle'
  }
]

// En PC aparece como menú lateral.
// En celular aparece como barra inferior.
export default function BottomNav() {
  return (
    <nav
      className="bottom-nav bg-white"
      aria-label="Navegación principal"
    >
      <ul className="nav bottom-nav__items">

        {secciones.map((seccion) => (
          <li
            className="nav-item"
            key={seccion.to}
          >
            <NavLink
              to={seccion.to}
              end={seccion.to === '/'}
              className={({ isActive }) =>
                `nav-link bottom-nav__link ${
                  isActive ? 'active' : ''
                }`
              }
            >
              <i
                className={`bi ${seccion.icono} bottom-nav__icon`}
                aria-hidden="true"
              ></i>

              <span className="bottom-nav__text">
                {seccion.texto}
              </span>

            </NavLink>
          </li>
        ))}

      </ul>
    </nav>
  )
}
