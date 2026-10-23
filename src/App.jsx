import { lazy } from 'react'
import { Routes, Route } from 'react-router'
import AppLayout from './layouts/AppLayout.jsx'

// CONTENIDO: cada vista se descarga aparte (code splitting).
// El shell (AppLayout) no espera a que lleguen.
const Biblioteca = lazy(() => import('./views/Biblioteca.jsx'))
const Agregar = lazy(() => import('./views/Agregar.jsx'))
const Resenas = lazy(() => import('./views/Resenas.jsx'))
const Libro = lazy(() => import('./views/Libro.jsx'))
const NoEncontrado = lazy(() => import('./views/NoEncontrado.jsx'))

export default function App() {
  return (
    <Routes>
      {/* Ruta padre sin path: el App Shell envuelve a todas las vistas */}
      <Route element={<AppLayout />}>
        <Route index element={<Biblioteca />} />
        <Route path="agregar" element={<Agregar />} />
        <Route path="resenas" element={<Resenas />} />
        <Route path="libro/:isbn" element={<Libro />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}
