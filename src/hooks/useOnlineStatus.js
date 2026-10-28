import { useSyncExternalStore } from 'react'

// Se suscribe a los eventos 'online' y 'offline' del navegador
function suscribir(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export function useOnlineStatus() {
  return useSyncExternalStore(suscribir, () => navigator.onLine)
}
