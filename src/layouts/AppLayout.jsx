
import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { onIdTokenChanged } from 'firebase/auth'

import { auth } from '../config/firebase'

import AppHeader from '../components/shell/AppHeader.jsx'
import OfflineBanner from '../components/shell/OfflineBanner.jsx'
import BottomNav from '../components/shell/BottomNav.jsx'
import ViewErrorBoundary from '../components/shell/ViewErrorBoundary.jsx'
import ViewSkeleton from '../components/ui/ViewSkeleton.jsx'

// APP SHELL: mantiene la estructura responsiva de ListSmart
export default function AppLayout() {
  const { pathname } = useLocation()

  // undefined: comprobando sesión
  // false: sin sesión o correo sin verificar
  // true: correo verificado
  const [accesoVerificado, setAccesoVerificado] =
    useState(undefined)

  useEffect(() => {
    const cancelar = onIdTokenChanged(auth, (usuario) => {
      setAccesoVerificado(
        usuario?.emailVerified === true
      )
    })

    return () => cancelar()
  }, [])

  return (
    <div
      className={
        accesoVerificado === true
          ? 'app-shell'
          : 'app-shell app-shell--sin-acceso'
      }
    >

      {/* ENCABEZADO */}
      {accesoVerificado === true ? (

        // Encabezado original de ListSmart
        <AppHeader />

      ) : (

        // Encabezado para cuentas sin verificar
        <header className="app-header navbar bg-white border-bottom shadow-sm">

          <div className="container-fluid app-header__inner d-flex justify-content-between align-items-center flex-nowrap">

            <div className="d-flex align-items-center gap-2">

              <i
                className="bi bi-check2-square fs-4"
                style={{ color: '#168af0' }}
              ></i>

              <span
                className="fw-bold fs-5"
                style={{ color: '#168af0' }}
              >
                ListSmart
              </span>

            </div>

            <Link
              to="/perfil"
              className="btn btn-outline-primary btn-sm"
            >
              <i className="bi bi-person-circle me-2"></i>
              Mi perfil
            </Link>

          </div>

        </header>

      )}

      {/* AVISO DE CONEXIÓN */}
      <OfflineBanner />

      {/* CONTENIDO */}
      <main className="app-main container py-3">

        <ViewErrorBoundary key={pathname}>

          <Suspense fallback={<ViewSkeleton />}>

            <Outlet />

          </Suspense>

        </ViewErrorBoundary>

      </main>

      {/* MENÚ LATERAL O INFERIOR */}
      {accesoVerificado === true && (
        <BottomNav />
      )}

    </div>
  )
}
