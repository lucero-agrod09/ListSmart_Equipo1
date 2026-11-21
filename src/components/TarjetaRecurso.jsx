
import { Link } from 'react-router';

// Recibe el modelo de producto de FakeStoreAPI
export default function TarjetaRecurso({ recurso }) {
  return (
    <Link
      to={`/recursos/${recurso.id}`}
      className="card h-100 text-decoration-none text-body"
    >
      <div className="card-body d-flex align-items-center gap-3">

        {/* Imagen del producto */}
        {recurso.imagen && (
          <img
            src={recurso.imagen}
            alt={recurso.titulo}
            loading="lazy"
            className="flex-shrink-0"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain'
            }}
          />
        )}

        {/* Información del producto */}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>

          <h2 className="h6 mb-1 text-truncate">
            {recurso.titulo}
          </h2>

          {recurso.categoria && (
            <p className="small text-body-secondary mb-1">
              {recurso.categoria}
            </p>
          )}

          {recurso.precio != null && (
            <p className="fw-semibold text-primary mb-1">
              ${Number(recurso.precio).toFixed(2)} USD
            </p>
          )}

          <p className="small text-body-secondary mb-0 text-truncate">
            {recurso.descripcion}
          </p>

        </div>
      </div>
    </Link>
  );
}
