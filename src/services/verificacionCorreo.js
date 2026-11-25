
import {
  sendEmailVerification,
  reload
} from 'firebase/auth';

import { auth } from '../config/firebase';

// Obtener la cuenta que tiene iniciada la sesión
function obtenerCuenta() {
  const usuario = auth.currentUser;

  if (!usuario || !usuario.email) {
    throw new Error(
      'Debes iniciar sesión para verificar tu correo.'
    );
  }

  return usuario;
}

// Enviar correo de verificación
export async function enviarVerificacionCorreo() {
  await auth.authStateReady();

  const usuario = obtenerCuenta();

  // Evitar enviar correos innecesarios
  if (usuario.emailVerified) {
    return true;
  }

  // Mostrar el correo en español
  auth.languageCode = 'es';

  await sendEmailVerification(usuario);

  return false;
}

// Comprobar si el correo fue verificado
export async function comprobarVerificacionCorreo() {
  await auth.authStateReady();

  const usuario = obtenerCuenta();
  const uid = usuario.uid;

  // Actualizar la información desde Firebase
  await reload(usuario);

  // Evitar mezclar información si cambió la cuenta
  if (auth.currentUser?.uid !== uid) {
    throw new Error(
      'La sesión cambió. Inicia sesión nuevamente.'
    );
  }

  return usuario.emailVerified;
}
