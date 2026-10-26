import { lazy } from 'react'
import { Routes, Route } from 'react-router'
import AppLayout from './layouts/AppLayout.jsx'

// Pantallas de ListSmart con carga diferida
const Inicio = lazy(() => import('./views/Inicio.jsx'))
const MisListas = lazy(() => import('./views/MisListas.jsx'))
const NuevaLista = lazy(() => import('./views/NuevaLista.jsx'))
const Notificaciones = lazy(() => import('./views/Notificaciones.jsx'))
const Perfil = lazy(() => import('./views/Perfil.jsx'))
const NoEncontrado = lazy(() => import('./views/NoEncontrado.jsx'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Inicio />} />
        <Route path="listas" element={<MisListas />} />
        <Route path="nueva-lista" element={<NuevaLista />} />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}