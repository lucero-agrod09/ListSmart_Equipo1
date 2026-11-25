
import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import { auth } from '../config/firebase';

import {
  enviarVerificacionCorreo,
  comprobarVerificacionCorreo
} from '../services/verificacionCorreo';

export default function Perfil() {
  const [usuario, setUsuario] = useState(undefined);
  const [registro, setRegistro] = useState(false);

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');

  // Mostrar u ocultar contraseña
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const [verificado, setVerificado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  // Detectar cambios en la sesión
  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setVerificado(user?.emailVerified ?? false);
    });

    return () => cancelar();
  }, []);

  // Verificar automáticamente el correo electrónico
  useEffect(() => {
    if (!usuario || verificado) return;

    let activo = true;
    let consultando = false;

    const uidActual = usuario.uid;

    async function verificarAutomaticamente() {
      if (
        !activo ||
        consultando ||
        !navigator.onLine ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }

      if (auth.currentUser?.uid !== uidActual) {
        return;
      }

      consultando = true;

      try {
        const confirmado = await comprobarVerificacionCorreo();

        if (
          !activo ||
          auth.currentUser?.uid !== uidActual
        ) {
          return;
        }

        if (confirmado) {
          await auth.currentUser.getIdToken(true);

          if (
            !activo ||
            auth.currentUser?.uid !== uidActual
          ) {
            return;
          }

          setVerificado(true);

          setAviso(
            '¡Tu correo ha sido verificado correctamente! ' +
            'Ya puedes utilizar ListSmart.'
          );

          setError('');
        }
      } catch {
        // Reintentar si falla la conexión.
      } finally {
        consultando = false;
      }
    }

    // Comprobar al entrar
    void verificarAutomaticamente();

    // Comprobar cada 10 segundos
    const intervalo = window.setInterval(() => {
      void verificarAutomaticamente();
    }, 10000);

    // Comprobar al regresar a la aplicación
    function alRegresar() {
      void verificarAutomaticamente();
    }

    window.addEventListener('focus', alRegresar);
    window.addEventListener('online', alRegresar);

    document.addEventListener(
      'visibilitychange',
      alRegresar
    );

    return () => {
      activo = false;

      window.clearInterval(intervalo);

      window.removeEventListener('focus', alRegresar);
      window.removeEventListener('online', alRegresar);

      document.removeEventListener(
        'visibilitychange',
        alRegresar
      );
    };
  }, [usuario, verificado]);

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

      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada.';

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
    setAviso('');
    setCargando(true);

    try {
      if (registro) {
        const credenciales =
          await createUserWithEmailAndPassword(
            auth,
            correo.trim(),
            contrasena
          );

        setCorreo('');
        setContrasena('');
        setMostrarContrasena(false);

        // Enviar verificación al crear una cuenta
        try {
          await enviarVerificacionCorreo();

          if (
            auth.currentUser?.uid ===
            credenciales.user.uid
          ) {
            setAviso(
              'Tu cuenta se creó correctamente. ' +
              'Enviamos un enlace de verificación ' +
              'a tu correo electrónico.'
            );
          }
        } catch (errorEnvio) {
          if (
            auth.currentUser?.uid ===
            credenciales.user.uid
          ) {
            setError(
              'Tu cuenta se creó, pero no pudimos ' +
              'enviar el correo de verificación. ' +
              mensajeError(errorEnvio.code)
            );
          }
        }

      } else {
        await signInWithEmailAndPassword(
          auth,
          correo.trim(),
          contrasena
        );

        setCorreo('');
        setContrasena('');
        setMostrarContrasena(false);
      }

    } catch (errorFirebase) {
      setError(
        mensajeError(errorFirebase.code)
      );
    } finally {
      setCargando(false);
    }
  }

  // Enviar o reenviar correo de verificación
  async function enviarCorreo() {
    setCargando(true);
    setError('');
    setAviso('');

    try {
      const yaVerificado =
        await enviarVerificacionCorreo();

      if (yaVerificado) {
        setVerificado(true);

        setAviso(
          'Tu correo electrónico ya está verificado.'
        );
      } else {
        setAviso(
          'Enviamos el enlace de verificación. ' +
          'Revisa tu bandeja de entrada y spam.'
        );
      }
    } catch (errorFirebase) {
      setError(
        mensajeError(errorFirebase.code)
      );
    } finally {
      setCargando(false);
    }
  }

  // Cerrar sesión
  async function cerrarSesion() {
    setCargando(true);
    setError('');
    setAviso('');

    try {
      await signOut(auth);

      setContrasena('');
      setMostrarContrasena(false);

      setAviso(
        'Sesión cerrada correctamente.'
      );
    } catch (errorFirebase) {
      setError(
        mensajeError(errorFirebase.code)
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <section
      className="py-4 py-lg-5"
      style={{
        maxWidth: '960px',
        margin: '0 auto'
      }}
    >

      {/* Encabezado */}
      <div
        className="rounded-4 p-4 mb-4"
        style={{
          background:
            'linear-gradient(135deg, #edf7ff 0%, #f8fbff 100%)'
        }}
      >
        <div className="d-flex align-items-center gap-3">

          <div
            className="bg-white rounded-3 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
            style={{
              width: '60px',
              height: '60px',
              color: '#168af0'
            }}
          >
            <i className="bi bi-person-circle fs-2"></i>
          </div>

          <div>
            <h1 className="h3 fw-bold mb-1">
              Mi perfil
            </h1>

            <p className="text-secondary mb-0">
              Administra tu cuenta y mantén tus listas
              sincronizadas en ListSmart.
            </p>
          </div>

        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div
          className="alert alert-danger rounded-3"
          role="alert"
        >
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {aviso && (
        <div
          className="alert alert-info rounded-3"
          role="status"
        >
          <i className="bi bi-info-circle me-2"></i>
          {aviso}
        </div>
      )}

      {usuario === undefined ? (

        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4">

            <div className="d-flex align-items-center gap-2">

              <span
                className="spinner-border spinner-border-sm text-primary"
                aria-hidden="true"
              ></span>

              <span className="text-secondary">
                Comprobando sesión...
              </span>

            </div>

          </div>
        </div>

      ) : usuario ? (

        /* Perfil con sesión iniciada */
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4 p-md-5">

            {/* Información principal */}
            <div className="d-flex flex-wrap align-items-center gap-3">

              <div
                className="rounded-circle d-flex justify-content-center align-items-center flex-shrink-0"
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#eaf5ff',
                  color: '#168af0'
                }}
              >
                <i className="bi bi-person-fill fs-2"></i>
              </div>

              <div className="flex-grow-1">

                <h2 className="h5 fw-bold mb-1">
                  Sesión iniciada
                </h2>

                <p className="text-secondary text-break mb-2">
                  {usuario.email}
                </p>

                {verificado ? (
                  <span className="badge bg-success">
                    <i className="bi bi-patch-check me-1"></i>
                    Correo verificado
                  </span>
                ) : (
                  <span className="badge bg-warning text-dark">
                    <i className="bi bi-clock-history me-1"></i>
                    Verificación pendiente
                  </span>
                )}

              </div>

            </div>

            <hr className="my-4" />

            {/* Verificación de correo */}
            <div
              className="rounded-3 p-3 p-md-4"
              style={{
                backgroundColor: '#f7f9fc',
                border: '1px solid #e6ecf2'
              }}
            >

              <div className="d-flex align-items-center gap-2 mb-3">

                <i
                  className="bi bi-envelope-check fs-4"
                  style={{
                    color: '#168af0'
                  }}
                ></i>

                <h3 className="h5 fw-bold mb-0">
                  Verificación de correo
                </h3>

              </div>

              {verificado ? (

                <div>
                  <p className="text-success fw-semibold mb-2">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    ¡Correo verificado correctamente!
                  </p>

                  <p className="text-secondary small mb-0">
                    Tu dirección de correo electrónico
                    está verificada en Firebase.
                  </p>
                </div>

              ) : (

                <>

                  <div className="d-flex align-items-start gap-2 mb-3">

                    <i className="bi bi-shield-lock text-warning fs-4"></i>

                    <div>
                      <p className="fw-semibold mb-1">
                        Confirma tu correo electrónico
                      </p>

                      <p className="text-secondary small mb-0">
                        Hemos enviado un enlace de verificación
                        a tu correo electrónico.
                        Debes abrirlo para completar la
                        verificación de tu cuenta.
                      </p>
                    </div>

                  </div>

                  {/* Comprobación automática */}
                  <div className="d-flex align-items-center gap-2 mb-3">

                    <span
                      className="spinner-border spinner-border-sm text-primary"
                      aria-hidden="true"
                    ></span>

                    <span className="small text-secondary">
                      Esperando verificación automáticamente...
                    </span>

                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={enviarCorreo}
                    disabled={cargando}
                  >
                    <i className="bi bi-envelope-arrow-up me-2"></i>
                    Reenviar verificación
                  </button>

                  <p className="small text-secondary mt-3 mb-0">
                    No necesitas actualizar la página.
                    ListSmart comprobará automáticamente
                    cuando hayas verificado tu correo.
                    Si no encuentras el mensaje,
                    revisa también tu carpeta de spam.
                  </p>

                </>

              )}

            </div>

            {/* Información de la cuenta */}
            <div className="mt-4">

              <h3 className="h6 fw-bold mb-3">
                Información de la cuenta
              </h3>

              <div className="border rounded-3">

                <div className="p-3 border-bottom">

                  <span className="small text-secondary d-block mb-1">
                    Correo electrónico
                  </span>

                  <span className="fw-medium text-break">
                    {usuario.email}
                  </span>

                </div>

                <div className="p-3">

                  <span className="small text-secondary d-block mb-1">
                    Estado de verificación
                  </span>

                  <span
                    className={
                      verificado
                        ? 'fw-medium text-success'
                        : 'fw-medium text-warning'
                    }
                  >
                    {verificado
                      ? 'Verificado'
                      : 'Pendiente'}
                  </span>

                </div>

              </div>

            </div>

            {/* Cerrar sesión */}
            <div className="mt-4 pt-3 border-top">

              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={cerrarSesion}
                disabled={cargando}
              >
                <i className="bi bi-box-arrow-right me-2"></i>

                {cargando
                  ? 'Procesando...'
                  : 'Cerrar sesión'}
              </button>

            </div>

          </div>
        </div>

      ) : (

        /* Inicio de sesión y registro */
        <div className="row g-4">

          {/* Panel de presentación */}
          <div className="col-lg-5">

            <div
              className="rounded-4 p-4 h-100"
              style={{
                backgroundColor: '#edf7ff'
              }}
            >

              <div
                className="bg-white rounded-3 d-inline-flex align-items-center justify-content-center mb-4"
                style={{
                  width: '56px',
                  height: '56px',
                  color: '#168af0'
                }}
              >
                <i className="bi bi-card-checklist fs-3"></i>
              </div>

              <h2 className="h4 fw-bold mb-3">
                Bienvenido a ListSmart
              </h2>

              <p className="text-secondary">
                Organiza tus listas, consulta productos
                y guarda fotografías desde un solo lugar.
              </p>

              <div className="d-flex align-items-start gap-3 mt-4">

                <i className="bi bi-cloud-check text-primary fs-5"></i>

                <div>
                  <span className="fw-semibold d-block">
                    Tus listas sincronizadas
                  </span>

                  <span className="small text-secondary">
                    Recupera tus pendientes desde
                    distintos dispositivos.
                  </span>
                </div>

              </div>

              <div className="d-flex align-items-start gap-3 mt-3">

                <i className="bi bi-wifi-off text-primary fs-5"></i>

                <div>
                  <span className="fw-semibold d-block">
                    Funciona sin conexión
                  </span>

                  <span className="small text-secondary">
                    Conserva tu información localmente
                    cuando no tengas Internet.
                  </span>
                </div>

              </div>

              <div className="d-flex align-items-start gap-3 mt-3">

                <i className="bi bi-shield-check text-primary fs-5"></i>

                <div>
                  <span className="fw-semibold d-block">
                    Tu propia cuenta
                  </span>

                  <span className="small text-secondary">
                    Organiza tus listas con Firebase
                    Authentication.
                  </span>
                </div>

              </div>

            </div>

          </div>

          {/* Formulario */}
          <div className="col-lg-7">

            <div className="card border-0 shadow-sm rounded-4 h-100">

              <div className="card-body p-4 p-md-5">

                <div className="text-center mb-4">

                  <div
                    className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: '#eaf5ff',
                      color: '#168af0'
                    }}
                  >
                    <i className="bi bi-person-lock fs-3"></i>
                  </div>

                  <h2 className="h4 fw-bold">
                    {registro
                      ? 'Crear una cuenta'
                      : 'Iniciar sesión'}
                  </h2>

                  <p className="text-secondary small mb-0">
                    {registro
                      ? 'Regístrate para comenzar a organizar tus listas.'
                      : 'Accede a tus listas y fotografías guardadas.'}
                  </p>

                </div>

                <form onSubmit={enviarFormulario}>

                  {/* Correo electrónico */}
                  <div className="mb-3">

                    <label
                      htmlFor="correo"
                      className="form-label fw-medium"
                    >
                      Correo electrónico
                    </label>

                    <div className="input-group">

                      <span className="input-group-text bg-light">
                        <i className="bi bi-envelope"></i>
                      </span>

                      <input
                        id="correo"
                        type="email"
                        className="form-control"
                        placeholder="ejemplo@correo.com"
                        value={correo}
                        onChange={(e) =>
                          setCorreo(e.target.value)
                        }
                        autoComplete="email"
                        required
                      />

                    </div>
                  </div>

                  {/* Contraseña con botón para mostrar u ocultar */}
                  <div className="mb-4">

                    <label
                      htmlFor="contrasena"
                      className="form-label fw-medium"
                    >
                      Contraseña
                    </label>

                    <div className="input-group">

                      <span className="input-group-text bg-light">
                        <i className="bi bi-lock"></i>
                      </span>

                      <input
                        id="contrasena"
                        type={
                          mostrarContrasena
                            ? 'text'
                            : 'password'
                        }
                        className="form-control"
                        placeholder="Ingresa tu contraseña"
                        value={contrasena}
                        onChange={(e) =>
                          setContrasena(e.target.value)
                        }
                        autoComplete={
                          registro
                            ? 'new-password'
                            : 'current-password'
                        }
                        minLength={
                          registro ? 6 : undefined
                        }
                        required
                      />

                      {/* Botón del ojito */}
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() =>
                          setMostrarContrasena(
                            (anterior) => !anterior
                          )
                        }
                        disabled={cargando}
                        aria-label={
                          mostrarContrasena
                            ? 'Ocultar contraseña'
                            : 'Mostrar contraseña'
                        }
                        aria-pressed={mostrarContrasena}
                        aria-controls="contrasena"
                        title={
                          mostrarContrasena
                            ? 'Ocultar contraseña'
                            : 'Mostrar contraseña'
                        }
                      >
                        <i
                          className={`bi ${
                            mostrarContrasena
                              ? 'bi-eye-slash'
                              : 'bi-eye'
                          }`}
                          aria-hidden="true"
                        ></i>
                      </button>

                    </div>

                    {registro && (
                      <p className="small text-secondary mt-2 mb-0">
                        Utiliza al menos 6 caracteres.
                      </p>
                    )}

                  </div>

                  {/* Iniciar sesión o crear cuenta */}
                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2 fw-semibold"
                    disabled={cargando}
                  >
                    <i
                      className={`bi ${
                        registro
                          ? 'bi-person-plus'
                          : 'bi-box-arrow-in-right'
                      } me-2`}
                    ></i>

                    {cargando
                      ? 'Procesando...'
                      : registro
                        ? 'Crear cuenta'
                        : 'Iniciar sesión'}
                  </button>

                </form>

                {/* Cambiar entre registro y acceso */}
                <div className="text-center mt-4 pt-3 border-top">

                  <p className="text-secondary small mb-2">
                    {registro
                      ? '¿Ya tienes una cuenta?'
                      : '¿Todavía no tienes cuenta?'}
                  </p>

                  <button
                    type="button"
                    className="btn btn-link fw-semibold text-decoration-none"
                    onClick={() => {
                      setRegistro(!registro);
                      setError('');
                      setAviso('');
                      setContrasena('');
                      setMostrarContrasena(false);
                    }}
                    disabled={cargando}
                  >
                    {registro
                      ? 'Iniciar sesión'
                      : 'Crear cuenta gratis'}
                  </button>

                </div>

              </div>
            </div>
          </div>

        </div>

      )}

    </section>
  );
}
