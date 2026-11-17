
import { Link, useParams } from 'react-router';
import { useRecurso } from '../hooks/useRecursos';
import { Cargando, ErrorCarga, Vacio } from '../components/Estados';

export default function DetalleRecurso() {
  const { id } = useParams(); // sale de /recursos/:id

  const { cargando, datos: recurso, error, reintentar } = useRecurso(id);

  if (cargando) return <Cargando />;

  if (error) return <ErrorCarga mensaje={error.message} onReintentar={reintentar} />;

  if (!recurso) return <Vacio texto="Ese elemento no existe" />;

  return (
    <article>
      {recurso.imagen && (
        <img src={recurso.imagen} alt="" className="img-fluid rounded mb-3" />
      )}

      <h1 className="h3">{recurso.titulo}</h1>
      <p>{recurso.descripcion}</p>

      <Link to="/recursos" className="btn btn-outline-secondary btn-sm">
        Volver
      </Link>
    </article>
  );
}
