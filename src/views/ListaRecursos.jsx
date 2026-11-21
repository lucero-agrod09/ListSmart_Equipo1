
import { useEffect, useState } from 'react';
import { useListaRecursos } from '../hooks/useRecursos';
import { obtenerHistorial } from '../services/recursosDB';
import TarjetaRecurso from '../components/TarjetaRecurso';
import { Cargando, ErrorCarga, Vacio } from '../components/Estados';

export default function ListaRecursos() {
  const { cargando, datos, error, reintentar } = useListaRecursos();

  const [busqueda, setBusqueda] = useState('');
  const [historial, setHistorial] = useState([]);

  // Obtener los últimos 5 productos consultados
  useEffect(() => {
    let activo = true;

    obtenerHistorial()
      .then((productos) => {
        if (activo) setHistorial(productos);
      })
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, []);

  if (cargando) return <Cargando />;

  if (error) {
    return <ErrorCarga mensaje={error.message} onReintentar={reintentar} />;
  }

  if (!datos?.length) return <Vacio />;

  // Filtrar productos por nombre o categoría
  const textoBusqueda = busqueda.trim().toLowerCase();

  const productosFiltrados = datos.filter((recurso) =>
    recurso.titulo.toLowerCase().includes(textoBusqueda) ||
    recurso.categoria.toLowerCase().includes(textoBusqueda)
  );

  return (
    <section>
      <h1 className="h4 mb-3">Consultar Productos</h1>

      {/* Barra de búsqueda */}
      <div className="mb-4">
        <input
          type="search"
          className="form-control"
          placeholder="Buscar un producto..."
          aria-label="Buscar productos"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Últimos productos consultados */}
      {!textoBusqueda && historial.length > 0 && (
        <section className="mb-4">
          <h2 className="h5 mb-3">Consultados recientemente</h2>

          <div className="d-flex gap-3 overflow-auto pb-2">
            {historial.map((recurso) => (
              <div
                className="flex-shrink-0"
                style={{ width: '280px' }}
                key={recurso.id}
              >
                <TarjetaRecurso recurso={recurso} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catálogo de productos */}
      <h2 className="h5 mb-3">Productos disponibles</h2>

      {productosFiltrados.length === 0 ? (
        <Vacio texto="No se encontraron productos" />
      ) : (
        <div className="row row-cols-1 g-3">
          {productosFiltrados.map((recurso) => (
            <div className="col" key={recurso.id}>
              <TarjetaRecurso recurso={recurso} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
