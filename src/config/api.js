export const API = {
  base: import.meta.env.VITE_API_URL,              // viene de .env
  lista: '/products',                              // ← endpoint de la lista
  detalle: (id) => `/products/${encodeURIComponent(id)}`,  // ← del detalle
};

