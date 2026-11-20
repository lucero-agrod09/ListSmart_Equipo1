import { useCallback } from 'react';
import { useConsulta } from './useConsulta';
import { listarRecursos, obtenerRecurso } from '../repositories/recursosRepository';
 
// Controladores: uno por pantalla
export function useListaRecursos() {
  const consultar = useCallback((signal) => listarRecursos({ signal }), []);
  return useConsulta('product', consultar);
}
 
export function useRecurso(id) {
  const consultar = useCallback(
    (signal) => obtenerRecurso(id, { signal }), [id]);
  return useConsulta(id ? `product:${id}` : null, consultar);
}
