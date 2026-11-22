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

// Verificar la cuenta activa
function verificarCuenta(uid) {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error('Debes iniciar sesión con tu cuenta.');
  }
}

// Obtener listas desde el servidor
export async function obtenerListasNube(uid) {
  verificarCuenta(uid);

  const referencia = collection(
    db,
    'usuarios',
    uid,
    'listas'
  );

  const resultado = await getDocsFromServer(referencia);

  return resultado.docs.map((documento) => ({
    ...documento.data(),
    id: documento.id
  }));
}

// Guardar o actualizar una lista
export async function guardarListaNube(uid, lista) {
  verificarCuenta(uid);

  if (!lista?.id) {
    throw new Error('La lista no tiene un ID válido.');
  }

  const referencia = doc(
    db,
    'usuarios',
    uid,
    'listas',
    lista.id
  );

  await setDoc(referencia, {
    nombre: lista.nombre,
    categoria: lista.categoria,
    fechaCreacion: lista.fechaCreacion,
    tareas: lista.tareas ?? []
  });
}

// Eliminar una lista de la nube
export async function eliminarListaNube(uid, listaId) {
  verificarCuenta(uid);

  const referencia = doc(
    db,
    'usuarios',
    uid,
    'listas',
    listaId
  );

  await deleteDoc(referencia);
}