
import { useSyncExternalStore } from 'react'

// =========================================
// LISTSMART - INSTALACIÓN DE LA PWA
// =========================================

// Guarda el evento de instalación de ListSmart
let aviso = null

// Componentes que escuchan cambios
const oyentes = new Set()

// Notifica a los componentes suscritos
const notificar = () => {
  oyentes.forEach((fn) => fn())
}

// Detecta cuándo el navegador permite
// instalar ListSmart
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evento) => {
    // Evita que el navegador muestre
    // automáticamente la instalación
    evento.preventDefault()

    // Guarda el evento para nuestro botón
    aviso = evento

    notificar()
  })

  // Detecta cuando ListSmart ya fue instalada
  window.addEventListener('appinstalled', () => {
    aviso = null
    notificar()
  })
}

// Suscribe un componente a los cambios
function suscribir(fn) {
  oyentes.add(fn)

  return () => {
    oyentes.delete(fn)
  }
}

// Obtiene el estado actual de instalación
function obtenerAviso() {
  return aviso
}

// Valor seguro para renderizado en servidor
function obtenerAvisoServidor() {
  return null
}

// =========================================
// HOOK PERSONALIZADO useInstalacion
// =========================================

export function useInstalacion() {
  const evento = useSyncExternalStore(
    suscribir,
    obtenerAviso,
    obtenerAvisoServidor
  )

  async function instalar() {
    if (!evento) return

    // El evento solo se puede utilizar una vez
    aviso = null
    notificar()

    try {
      // Muestra el diálogo de instalación
      await evento.prompt()

      // Resultado de la decisión del usuario
      const { outcome } = await evento.userChoice

      console.log(
        'Instalación de ListSmart:',
        outcome
      )

      return outcome
    } catch (error) {
      console.error(
        'Error al instalar ListSmart:',
        error
      )

      return 'error'
    }
  }

  return {
    puedeInstalar: evento !== null,
    instalar,
  }
}
