
import {
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup
} from 'firebase/auth';

import { auth } from '../config/firebase';

// Configurar el proveedor de Google
function crearProveedorGoogle() {
  const proveedor = new GoogleAuthProvider();

  // Permitir seleccionar la cuenta de Google
  proveedor.setCustomParameters({
    prompt: 'select_account'
  });

  return proveedor;
}

// Iniciar sesión con Google
export async function iniciarSesionGoogle() {
  // Esta función es para iniciar una sesión nueva
  if (auth.currentUser) {
    throw new Error(
      'Ya tienes una sesión iniciada. ' +
      'Utiliza la opción de vincular Google ' +
      'desde tu perfil.'
    );
  }

  auth.languageCode = 'es';

  const resultado = await signInWithPopup(
    auth,
    crearProveedorGoogle()
  );

  return resultado.user;
}

// Vincular Google a una cuenta existente
export async function vincularCuentaGoogle() {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error(
      'Debes iniciar sesión para vincular Google.'
    );
  }

  // Primero debe verificar su correo
  if (!usuario.emailVerified) {
    throw new Error(
      'Primero debes verificar tu correo electrónico.'
    );
  }

  // Evitar vincular dos veces el mismo proveedor
  const yaVinculada = usuario.providerData.some(
    (proveedor) => proveedor.providerId === 'google.com'
  );

  if (yaVinculada) {
    return {
      usuario,
      yaVinculada: true
    };
  }

  auth.languageCode = 'es';

  const uidOriginal = usuario.uid;

  // Agregar Google a la cuenta existente
  const resultado = await linkWithPopup(
    usuario,
    crearProveedorGoogle()
  );

  // Comprobar que conservamos el mismo UID
  if (resultado.user.uid !== uidOriginal) {
    throw new Error(
      'No se pudo confirmar la vinculación de la cuenta.'
    );
  }

  // Actualizar el token de autenticación
  await resultado.user.getIdToken(true);

  return {
    usuario: resultado.user,
    yaVinculada: false
  };
}
