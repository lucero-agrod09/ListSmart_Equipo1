import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import AppLayout from './layouts/AppLayout.jsx'

// Pantallas de ListSmart con carga diferida
const Inicio = lazy(() => import('./views/Inicio.jsx'))
const MisListas = lazy(() => import('./views/MisListas.jsx'))
const Notificaciones = lazy(() => import('./views/Notificaciones.jsx'))
const Perfil = lazy(() => import('./views/Perfil.jsx'))
const NoEncontrado = lazy(() => import('./views/NoEncontrado.jsx'))

// Pantallas de FakeStoreAPI
const ListaRecursos = lazy(() => import('./views/ListaRecursos.jsx'))
const DetalleRecurso = lazy(() => import('./views/DetalleRecurso.jsx'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Inicio />} />
        <Route path="listas" element={<MisListas />} />
        <Route path="nueva-lista" element={<Navigate to="/listas" replace />} />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="recursos" element={<ListaRecursos />} />
        <Route path="recursos/:id" element={<DetalleRecurso />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}