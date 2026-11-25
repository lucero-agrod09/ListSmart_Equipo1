import {
  getFirestore,
  collection,
  doc,
  getDocsFromServer,
  setDoc,
  deleteDoc
} from 'firebase/firestore';

import { app, auth } from '../config/firebase';

const db = getFirestore(app);

// Verificar que la cuenta sea la correcta
function verificarCuenta(uid) {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error(
      'Debes iniciar sesión con tu cuenta.'
    );
  }
}

// Guardar la URL de una fotografía en Firestore
export async function guardarFotoNube(uid, foto) {
  verificarCuenta(uid);

  if (!foto?.id || !foto?.urlImagen || !foto?.publicId) {
    throw new Error(
      'La fotografía todavía no tiene los datos de Cloudinary.'
    );
  }

  const referencia = doc(
    db,
    'usuarios',
    uid,
    'fotos',
    foto.id
  );

  await setDoc(referencia, {
    nombre: foto.nombre || 'Fotografía de lista',
    fechaGuardado: foto.fechaGuardado,
    urlImagen: foto.urlImagen,
    publicId: foto.publicId
  });
}

// Recuperar fotografías desde Firestore
export async function obtenerFotosNube(uid) {
  verificarCuenta(uid);

  const referencia = collection(
    db,
    'usuarios',
    uid,
    'fotos'
  );

  const resultado = await getDocsFromServer(referencia);

  verificarCuenta(uid);

  return resultado.docs.map((documento) => ({
    ...documento.data(),
    id: documento.id
  }));
}

// Eliminar el registro de una fotografía en Firestore
export async function eliminarFotoNube(uid, fotoId) {
  verificarCuenta(uid);

  if (
    typeof fotoId !== 'string' ||
    !fotoId.trim()
  ) {
    throw new Error(
      'No se encontró un identificador válido para la fotografía.'
    );
  }

  const referencia = doc(
    db,
    'usuarios',
    uid,
    'fotos',
    fotoId
  );

  await deleteDoc(referencia);
}