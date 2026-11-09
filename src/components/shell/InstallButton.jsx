
import { useState } from 'react'
import { useInstalacion } from '../../hooks/useInstalacion.js'

// ==========================================
// LISTSMART - BOTÓN DE INSTALACIÓN PWA
// ==========================================

// Comprueba si ListSmart ya está abierta
// como una aplicación instalada.
function estaInstalada() {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.matchMedia(
      '(display-mode: standalone)'
    ).matches ||
    window.navigator.standalone === true
  )
}

// Detecta dispositivos iPhone, iPad o iPod
function esDispositivoIOS() {
  if (typeof navigator === 'undefined') {
    return false
  }

  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1
    )
  )
}

export default function InstallButton() {
  const { puedeInstalar, instalar } = useInstalacion()

  const [mostrarAyuda, setMostrarAyuda] = useState(false)

  // Si ya está abierta como app, ocultamos el botón
  if (estaInstalada()) {
    return null
  }

  // Chrome, Edge y navegadores compatibles
  if (puedeInstalar) {
    return (
      <button
        type="button"
        className="btn btn-light btn-sm text-nowrap"
        onClick={instalar}
        aria-label="Instalar ListSmart"
      >
        <i
          className="bi bi-download me-1"
          aria-hidden="true"
        ></i>

        Instalar ListSmart
      </button>
    )
  }

  // En navegadores sin soporte, no mostramos nada
  if (!esDispositivoIOS()) {
    return null
  }

  // En iPhone/iPad mostramos instrucciones
  // para agregar ListSmart a la pantalla de inicio.
  return (
    <div className="position-relative">
      <button
        type="button"
        className="btn btn-light btn-sm text-nowrap"
        onClick={() => setMostrarAyuda(!mostrarAyuda)}
        aria-expanded={mostrarAyuda}
        aria-controls="ayuda-instalacion-ios"
      >
        <i
          className="bi bi-download me-1"
          aria-hidden="true"
        ></i>

        Instalar ListSmart
      </button>

      {mostrarAyuda && (
        <div
          id="ayuda-instalacion-ios"
          className="ayuda-ios alert alert-light shadow small mb-0"
          role="status"
        >
          <strong>Instalar ListSmart en iPhone o iPad</strong>

          <p className="mb-0 mt-2">
            Abre ListSmart en Safari, toca
            {' '}
            <i
              className="bi bi-box-arrow-up"
              aria-hidden="true"
            ></i>
            {' '}
            <strong>Compartir</strong>
            {' '}y selecciona{' '}
            <strong>Agregar a pantalla de inicio</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
