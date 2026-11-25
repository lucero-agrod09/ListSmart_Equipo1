const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const TAMANO_MAXIMO = 10 * 1024 * 1024;

const FORMATOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

// Subir una fotografía a Cloudinary
export async function subirFotoCloudinary(archivo) {

  if (!(archivo instanceof Blob)) {
    throw new Error('Selecciona una imagen válida.');
  }

  if (!FORMATOS[archivo.type]) {
    throw new Error(
      'Solo se permiten imágenes JPG, PNG o WebP.'
    );
  }

  if (archivo.size > TAMANO_MAXIMO) {
    throw new Error(
      'La imagen no debe superar los 10 MB.'
    );
  }

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Falta configurar Cloudinary en el archivo .env.'
    );
  }

  const formulario = new FormData();

  const nombreArchivo =
    archivo.name ||
    `foto-listasmart.${FORMATOS[archivo.type]}`;

  formulario.append('file', archivo, nombreArchivo);
  formulario.append('upload_preset', UPLOAD_PRESET);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  let respuesta;

  try {
    respuesta = await fetch(url, {
      method: 'POST',
      body: formulario
    });
  } catch {
    throw new Error(
      'No se pudo conectar con Cloudinary. ' +
      'La fotografía se conservará localmente.'
    );
  }

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(
      datos?.error?.message ||
      'No se pudo subir la fotografía.'
    );
  }

  if (!datos?.secure_url || !datos?.public_id) {
    throw new Error(
      'Cloudinary no devolvió los datos esperados.'
    );
  }

  return {
    url: datos.secure_url,
    publicId: datos.public_id
  };
}