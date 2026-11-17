import { Link } from 'react-router';
 
// Recibe el MODELO: { id, titulo, descripcion, imagen }
export default function TarjetaRecurso({ recurso }) {
  return (
    <Link to={`/recursos/${recurso.id}`} className="card h-100 text-decoration-none">
      {recurso.imagen && (
        <img src={recurso.imagen} alt="" className="card-img-top" loading="lazy" />
      )}
      <div className="card-body">
        <h2 className="h6 mb-1">{recurso.titulo}</h2>
        <p className="small text-body-secondary mb-0">{recurso.descripcion}</p>
      </div>
    </Link>
  );
}
