
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

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

import {
  iniciarSesionGoogle,
  vincularCuentaGoogle
} from '../services/accesoGoogle';

// ==========================================
// SKELETON DE INICIO DE SESIÓN
// ==========================================

function PerfilSkeleton() {
  return (
    <div
      className="row g-4"
      role="status"
      aria-label="Preparando inicio de sesión"
      aria-busy="true"
    >
      <span className="visually-hidden">
        Preparando el inicio de sesión...
      </span>

      {/* Panel de presentación */}
      <div className="col-lg-5">
        <div
          className="rounded-4 p-4 h-100"
          style={{ backgroundColor: '#edf7ff' }}
          aria-hidden="true"
        >
          <div className="placeholder-glow">

            <span
              className="placeholder rounded-3 mb-4"
              style={{
                width: '56px',
                height: '56px'
              }}
            ></span>

            <div className="mb-3">
              <span className="placeholder col-9 rounded"></span>
            </div>

            <div className="mb-2">
              <span className="placeholder col-12 rounded"></span>
            </div>

            <div className="mb-4">
              <span className="placeholder col-8 rounded"></span>
            </div>

            {[1, 2, 3].map((item) => (
              <div
                className="d-flex gap-3 mb-4"
                key={item}
              >
                <span
                  className="placeholder rounded flex-shrink-0"
                  style={{
                    width: '25px',
                    height: '25px'
                  }}
                ></span>

                <div className="flex-grow-1">
                  <span className="placeholder col-8 rounded d-block mb-2"></span>
                  <span className="placeholder col-11 rounded d-block"></span>
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* Esqueleto del formulario */}
      <div className="col-lg-7">
        <div className="card border-0 shadow-sm rounded-4 h-100">
          <div className="card-body p-4 p-md-5">

            <div className="placeholder-glow">

              {/* Encabezado */}
              <div className="text-center mb-4">

                <span
                  className="placeholder rounded-circle d-inline-block mb-3"
                  style={{
                    width: '60px',
                    height: '60px'
                  }}
                ></span>

                <div className="mb-2">
                  <span className="placeholder col-6 rounded"></span>
                </div>

                <div>
                  <span className="placeholder col-9 rounded"></span>
                </div>

              </div>

              {/* Correo */}
              <div className="mb-3">

                <div className="mb-2">
                  <span className="placeholder col-4 rounded"></span>
                </div>

                <span
                  className="placeholder col-12 rounded-2"
                  style={{ height: '42px' }}
                ></span>

              </div>

              {/* Contraseña */}
              <div className="mb-4">

                <div className="mb-2">
                  <span className="placeholder col-3 rounded"></span>
                </div>

                <span
                  className="placeholder col-12 rounded-2"
                  style={{ height: '42px' }}
                ></span>

              </div>

              {/* Botón */}
              <div className="mb-4">
                <span
                  className="placeholder col-12 rounded-2 bg-primary"
                  style={{
                    height: '42px',
                    opacity: 0.35
                  }}
                ></span>
              </div>

              {/* Acceso con Google */}
              <div className="text-center mb-3">
                <span className="placeholder col-5 rounded"></span>
              </div>

              <span
                className="placeholder col-12 rounded-2"
                style={{ height: '42px' }}
              ></span>

              {/* Registro */}
              <div className="text-center mt-4 pt-3 border-top">
                <span className="placeholder col-7 rounded"></span>
              </div>

            </div>

          </div>
        </div>
      </div>

    </div>
  );
}

// ==========================================
// MENSAJES DE ERROR
// ==========================================

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

    case 'auth/popup-closed-by-user':
      return 'Se cerró la ventana de Google sin completar el acceso.';

    case 'auth/cancelled-popup-request':
      return 'Se canceló la solicitud de acceso con Google.';

    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google.';

    case 'auth/unauthorized-domain':
      return 'El dominio de ListSmart no está autorizado en Firebase.';

    case 'auth/account-exists-with-different-credential':
      return 'Ya existe una cuenta con ese correo. Inicia sesión con tu contraseña y después vincula Google desde Perfil.';

    case 'auth/credential-already-in-use':
      return 'Esta cuenta de Google ya está vinculada a otra cuenta.';

    case 'auth/provider-already-linked':
      return 'Google ya está vinculado a esta cuenta.';

    case 'auth/requires-recent-login':
      return 'Cierra sesión, vuelve a iniciarla e intenta nuevamente.';

    default:
      return 'Ocurrió un error. Intenta nuevamente.';
  }
}

// ==========================================
// PERFIL DE LISTSMART
// ==========================================

export default function Perfil() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(undefined);
  const [registro, setRegistro] = useState(false);

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] =
    useState(false);

  const [verificado, setVerificado] = useState(false);
  const [googleVinculado, setGoogleVinculado] =
    useState(false);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  // Detectar la sesión de Firebase
  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setVerificado(user?.emailVerified ?? false);

      setGoogleVinculado(
        user?.providerData.some(
          (proveedor) =>
            proveedor.providerId === 'google.com'
        ) ?? false
      );
    });

    return () => cancelar();
  }, []);

  // Verificación automática del correo
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
        const confirmado =
          await comprobarVerificacionCorreo();

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
          setError('');

          navigate('/', { replace: true });
        }
      } catch {
        // Reintentar automáticamente.
      } finally {
        consultando = false;
      }
    }

    void verificarAutomaticamente();

    const intervalo = window.setInterval(() => {
      void verificarAutomaticamente();
    }, 10000);

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
  }, [usuario, verificado, navigate]);

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
        const credenciales =
          await signInWithEmailAndPassword(
            auth,
            correo.trim(),
            contrasena
          );

        setCorreo('');
        setContrasena('');
        setMostrarContrasena(false);

        if (credenciales.user.emailVerified) {
          await credenciales.user.getIdToken(true);
          navigate('/', { replace: true });
        } else {
          setAviso(
            'Debes verificar tu correo electrónico ' +
            'para utilizar ListSmart.'
          );
        }
      }

    } catch (errorFirebase) {
      setError(mensajeError(errorFirebase.code));
    } finally {
      setCargando(false);
    }
  }

  // Iniciar sesión con Google
  async function accederConGoogle() {
    setCargando(true);
    setError('');
    setAviso('');

    try {
      const cuenta = await iniciarSesionGoogle();

      setVerificado(cuenta.emailVerified);

      setGoogleVinculado(
        cuenta.providerData.some(
          (proveedor) =>
            proveedor.providerId === 'google.com'
        )
      );

      setCorreo('');
      setContrasena('');
      setMostrarContrasena(false);

      if (cuenta.emailVerified) {
        await cuenta.getIdToken(true);
        navigate('/', { replace: true });
      } else {
        setAviso(
          'Iniciaste sesión con Google, pero tu correo ' +
          'todavía necesita verificación.'
        );
      }

    } catch (errorFirebase) {
      setError(mensajeError(errorFirebase.code));
    } finally {
      setCargando(false);
    }
  }

  // Vincular Google a una cuenta existente
  async function vincularGoogle() {
    if (!usuario || !verificado) return;

    const uidOriginal = usuario.uid;

    setCargando(true);
    setError('');
    setAviso('');

    try {
      const resultado = await vincularCuentaGoogle();

      if (auth.currentUser?.uid !== uidOriginal) {
        throw new Error(
          'La sesión cambió durante la vinculación.'
        );
      }

      setGoogleVinculado(true);

      if (resultado.yaVinculada) {
        setAviso(
          'Google ya estaba vinculado a tu cuenta.'
        );
      } else {
        setAviso(
          '¡Google se vinculó correctamente! ' +
          'Tus datos conservan el mismo UID.'
        );
      }

    } catch (errorFirebase) {
      setError(
        errorFirebase.code
          ? mensajeError(errorFirebase.code)
          : errorFirebase.message ||
            'No se pudo vincular Google.'
      );
    } finally {
      setCargando(false);
    }
  }

  // Reenviar correo de verificación
  async function enviarCorreo() {
    setCargando(true);
    setError('');
    setAviso('');

    try {
      const yaVerificado =
        await enviarVerificacionCorreo();

      if (yaVerificado) {
        await auth.currentUser?.getIdToken(true);

        setVerificado(true);
        navigate('/', { replace: true });

      } else {
        setAviso(
          'Enviamos el enlace de verificación. ' +
          'Revisa tu bandeja de entrada y spam.'
        );
      }

    } catch (errorFirebase) {
      setError(mensajeError(errorFirebase.code));
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
      setGoogleVinculado(false);

      setAviso('Sesión cerrada correctamente.');

    } catch (errorFirebase) {
      setError(mensajeError(errorFirebase.code));
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

      {/* Mostrar skeleton mientras se comprueba
          la sesión o se procesa el login */}
      {usuario === undefined ||
      (usuario === null && cargando) ? (

        <PerfilSkeleton />

      ) : usuario ? (

        /* PERFIL CON SESIÓN INICIADA */
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

            {/* Verificación del correo */}
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
                  style={{ color: '#168af0' }}
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
                        Debes abrir el enlace recibido
                        en tu correo para completar
                        la verificación de tu cuenta.
                      </p>
                    </div>

                  </div>

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
                    ListSmart comprobará automáticamente
                    cuando hayas verificado tu correo.
                    Revisa también la carpeta de spam.
                  </p>
                </>

              )}

            </div>

            {/* Cuenta de Google */}
            <div
              className="rounded-3 p-3 p-md-4 mt-4"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e6ecf2'
              }}
            >

              <div className="d-flex align-items-center gap-2 mb-3">

                <i
                  className="bi bi-google fs-4"
                  style={{ color: '#4285F4' }}
                ></i>

                <h3 className="h5 fw-bold mb-0">
                  Cuenta de Google
                </h3>
              </div>

              {googleVinculado ? (

                <>
                  <p className="text-success fw-semibold mb-2">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Google vinculado correctamente
                  </p>

                  <p className="text-secondary small mb-0">
                    Puedes iniciar sesión en ListSmart
                    con Google utilizando esta misma cuenta.
                  </p>
                </>

              ) : verificado ? (

                <>
                  <p className="text-secondary small mb-3">
                    Vincula Google a tu cuenta actual
                    para iniciar sesión sin escribir
                    tu contraseña. Tus listas y fotografías
                    conservarán el mismo UID.
                  </p>

                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={vincularGoogle}
                    disabled={cargando}
                  >
                    <i className="bi bi-google me-2"></i>

                    {cargando
                      ? 'Procesando...'
                      : 'Vincular mi cuenta con Google'}
                  </button>
                </>

              ) : (

                <p className="text-secondary small mb-0">
                  Primero verifica tu correo electrónico
                  para habilitar la vinculación con Google.
                </p>

              )}

            </div>

            {/* Información de cuenta */}
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

                <div className="p-3 border-bottom">
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

                <div className="p-3">
                  <span className="small text-secondary d-block mb-1">
                    Acceso con Google
                  </span>

                  <span
                    className={
                      googleVinculado
                        ? 'fw-medium text-success'
                        : 'fw-medium text-secondary'
                    }
                  >
                    {googleVinculado
                      ? 'Vinculado'
                      : 'No vinculado'}
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

        /* LOGIN Y REGISTRO */
        <div className="row g-4">

          {/* Presentación */}
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

                  {/* Correo */}
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

                  {/* Contraseña con ojito */}
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
                        minLength={registro ? 6 : undefined}
                        required
                      />

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

                  {/* Botón de acceso */}
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

                    {registro
                      ? 'Crear cuenta'
                      : 'Iniciar sesión'}
                  </button>

                </form>

                {/* Separador */}
                <div className="d-flex align-items-center gap-3 my-4">
                  <div className="border-top flex-grow-1"></div>

                  <span className="small text-secondary text-nowrap">
                    O continuar con
                  </span>

                  <div className="border-top flex-grow-1"></div>
                </div>

                {/* Acceso con Google */}
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100 py-2 fw-semibold"
                  onClick={accederConGoogle}
                  disabled={cargando}
                >
                  <i
                    className="bi bi-google me-2"
                    style={{ color: '#4285F4' }}
                  ></i>

                  Continuar con Google
                </button>

                {/* Cambio de formulario */}
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
