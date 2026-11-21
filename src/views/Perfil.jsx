import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import { auth } from '../config/firebase';

export default function Perfil() {
  const [usuario, setUsuario] = useState(undefined);
  const [registro, setRegistro] = useState(false);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Detectar cambios en la sesión
  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
    });

    return () => cancelar();
  }, []);

  // Mostrar errores de Firebase
  function mensajeError(codigo) {
    switch (codigo) {
      case 'auth/email-already-in-use':
        return 'Este correo ya está registrado.';
      case 'auth/invalid-email':
        return 'El correo electrónico no es válido.';
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil.';
      case 'auth/invalid-credential':
        return 'Correo o contraseña incorrectos.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde.';
      case 'auth/network-request-failed':
        return 'No hay conexión con Firebase.';
      case 'auth/operation-not-allowed':
        return 'Este método de acceso no está habilitado.';
      default:
        return 'Ocurrió un error. Intenta nuevamente.';
    }
  }

  // Registro e inicio de sesión
  async function enviarFormulario(e) {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      if (registro) {
        await createUserWithEmailAndPassword(
          auth,
          correo.trim(),
          contrasena
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          correo.trim(),
          contrasena
        );
      }

      setCorreo('');
      setContrasena('');
    } catch (e) {
      setError(mensajeError(e.code));
    } finally {
      setCargando(false);
    }
  }

  // Cerrar sesión
  async function cerrarSesion() {
    setCargando(true);
    setError('');

    try {
      await signOut(auth);
    } catch (e) {
      setError(mensajeError(e.code));
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="py-4">

      <h1 className="fw-bold">
        👤 Mi perfil
      </h1>

      <p className="text-secondary">
        Personaliza tu experiencia
        dentro de ListSmart.
      </p>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">

          {usuario === undefined ? (

            <p className="text-secondary mb-0">
              Comprobando sesión...
            </p>

          ) : usuario ? (

            <>
              <h2 className="h5">
                Sesión iniciada
              </h2>

              <p className="text-secondary">
                <i className="bi bi-person-circle me-2"></i>
                {usuario.email}
              </p>

              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={cerrarSesion}
                disabled={cargando}
              >
                Cerrar sesión
              </button>
            </>

          ) : (

            <>
              <h2 className="h5 mb-3">
                {registro ? 'Crear cuenta' : 'Iniciar sesión'}
              </h2>

              <form onSubmit={enviarFormulario}>

                <div className="mb-3">
                  <label
                    htmlFor="correo"
                    className="form-label"
                  >
                    Correo electrónico
                  </label>

                  <input
                    id="correo"
                    type="email"
                    className="form-control"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="contrasena"
                    className="form-label"
                  >
                    Contraseña
                  </label>

                  <input
                    id="contrasena"
                    type="password"
                    className="form-control"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    autoComplete={
                      registro ? 'new-password' : 'current-password'
                    }
                    minLength={registro ? 6 : undefined}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={cargando}
                >
                  {cargando
                    ? 'Procesando...'
                    : registro
                      ? 'Registrarse'
                      : 'Iniciar sesión'}
                </button>

              </form>

              <div className="text-center mt-3">
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => {
                    setRegistro(!registro);
                    setError('');
                  }}
                  disabled={cargando}
                >
                  {registro
                    ? '¿Ya tienes cuenta? Iniciar sesión'
                    : '¿No tienes cuenta? Crear cuenta'}
                </button>
              </div>
            </>

          )}

          {error && (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {error}
            </div>
          )}

        </div>
      </div>

    </section>
  );
}