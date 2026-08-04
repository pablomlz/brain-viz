import React, { useEffect } from 'react';

/**
 * Ventana modal para las pantallas que no caben en el HUD: acceso, gestión de
 * redes y administración.
 *
 * La visualización 3D ocupa toda la pantalla, así que estas funciones no pueden
 * vivir en un panel lateral sin comerse el espacio del que dependen. Una ventana
 * que se abre solo cuando hace falta y se cierra al terminar mantiene la escena
 * como protagonista.
 */
export default function Modal({ titulo, subtitulo, onCerrar, ancho = 520, children }) {
  // Cerrar con la tecla de escape, que es lo que el usuario espera
  useEffect(() => {
    const alPulsar = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  return (
    <div className="modal-fondo" onMouseDown={onCerrar}>
      <div
        className="modal"
        style={{ maxWidth: ancho }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="modal-hd">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button className="panel-x" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-bd">{children}</div>
      </div>
    </div>
  );
}

export function Aviso({ tipo = 'error', children }) {
  if (!children) return null;
  return <div className={`aviso aviso-${tipo}`}>{children}</div>;
}
