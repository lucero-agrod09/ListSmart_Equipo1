
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js'

// Aviso cuando el dispositivo pierde conexión
export default function OfflineBanner() {
  const enLinea = useOnlineStatus()

  if (enLinea) {
    return null
  }

  return (
    <div
      className="shell-offline-banner alert alert-warning rounded-0 mb-0 py-2 small text-center"
      role="status"
    >
      <i
        className="bi bi-wifi-off me-2"
        aria-hidden="true"
      ></i>

      Estás sin conexión a Internet.
      Algunas funciones de ListSmart podrían
      no estar disponibles.
    </div>
  )
}
