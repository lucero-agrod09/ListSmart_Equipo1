
import { useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { Navigate } from 'react-router';

import { auth } from '../config/firebase';

export default function AccesoVerificado({ children }) {
  const [sesion, setSesion] = useState(undefined);

  // Detectar inicio de sesión, cierre de sesión
  // y actualización del token de Firebase
  useEffect(() => {
    const cancelar = onIdTokenChanged(auth, (usuario) => {
      if (!usuario) {
        setSesion(null);
        return;
      }

      setSesion({
        uid: usuario.uid,
        verificado: usuario.emailVerified === true
      });
    });

    return () => cancelar();
  }, []);

  // Esperar a que Firebase compruebe la sesión
  if (sesion === undefined) {
    return (
      <div className="text-center py-5">
        <div
          className="spinner-border text-primary mb-3"
          role="status"
        >
          <span className="visually-hidden">
            Comprobando acceso...
          </span>
        </div>

        <p className="text-secondary">
          Comprobando tu cuenta...
        </p>
      </div>
    );
  }

  // Comprobar la cuenta activa
  const usuarioActual = auth.currentUser;

  const accesoPermitido =
    sesion !== null &&
    usuarioActual?.uid === sesion.uid &&
    sesion.verificado === true &&
    usuarioActual.emailVerified === true;

  // Sin sesión o sin verificar:
  // únicamente permitir el acceso a Perfil
  if (!accesoPermitido) {
    return <Navigate to="/perfil" replace />;
  }

  // Cuenta verificada: mostrar la sección solicitada
  return children;
}
