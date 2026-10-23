import { Component } from 'react'

// Si una vista falla (p. ej. su código no se descargó sin conexión),
// el error se queda AQUÍ: header y navegación siguen funcionando.
export default class ViewErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="text-center py-5">
        <i className="bi bi-cloud-slash display-4 text-secondary"></i>
        <h2 className="h5 mt-3">No se pudo cargar esta sección</h2>
        <p className="small text-body-secondary">
          Revisa tu conexión. En la semana 4 el service worker guardará
          estas vistas.
        </p>
        <button type="button" className="btn btn-librero"
          onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    )
  }
}
