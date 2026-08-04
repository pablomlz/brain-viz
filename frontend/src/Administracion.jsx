import React, { useEffect, useState } from 'react';
import Modal, { Aviso } from './Modal';
import { api } from './api';

/**
 * Funciones del administrador: catálogo de redes públicas [RF 17] y usuarios
 * registrados [RF 18, RF 18.1].
 */
export default function Administracion({ usuario, redes, onRecargar, onCerrar }) {
  const [pestana, setPestana] = useState('usuarios');
  return (
    <Modal
      titulo="Administración"
      subtitulo="Gestión del catálogo público y de los usuarios registrados."
      onCerrar={onCerrar}
      ancho={640}
    >
      <div className="pestanas">
        <button className={pestana === 'usuarios' ? 'pestana activa' : 'pestana'}
                onClick={() => setPestana('usuarios')}>Usuarios</button>
        <button className={pestana === 'redes' ? 'pestana activa' : 'pestana'}
                onClick={() => setPestana('redes')}>Catálogo</button>
      </div>
      {pestana === 'usuarios'
        ? <Usuarios yo={usuario} />
        : <CatalogoAdmin redes={redes} onRecargar={onRecargar} />}
    </Modal>
  );
}

function Usuarios({ yo }) {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      setUsuarios((await api.usuarios()).usuarios);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const cambiar = async (u, rol) => {
    setError('');
    try { await api.cambiarRol(u.id, rol); cargar(); } catch (e) { setError(e.message); }
  };
  const borrar = async (u) => {
    setError('');
    try { await api.eliminarUsuario(u.id); cargar(); } catch (e) { setError(e.message); }
  };

  if (cargando) return <p className="nota">Cargando usuarios…</p>;

  return (
    <div>
      <Aviso>{error}</Aviso>
      {usuarios.map((u) => (
        <div key={u.id} className="fila">
          <div className="fila-info">
            <div className="fila-nombre">
              {u.nombre}
              {u.id === yo.id && <span className="etiqueta">tú</span>}
            </div>
            <div className="fila-sub">{u.email} · {u.redes} redes · {u.rol}</div>
          </div>
          <div className="fila-acciones">
            <select className="sel sel-pequeno" value={u.rol}
                    onChange={(e) => cambiar(u, e.target.value)}>
              <option value="investigador">Investigador</option>
              <option value="administrador">Administrador</option>
            </select>
            <button className="btn btn-pequeno btn-peligro"
                    disabled={u.id === yo.id} onClick={() => borrar(u)}>Eliminar</button>
          </div>
        </div>
      ))}
      <p className="nota">
        Un administrador no puede retirarse a sí mismo el rol ni eliminar su propia cuenta: si fuera
        el único, el sistema se quedaría sin nadie que pudiera administrarlo.
      </p>
    </div>
  );
}

function CatalogoAdmin({ redes, onRecargar }) {
  const [error, setError] = useState('');

  const publicar = async (r, publica) => {
    setError('');
    try { await api.editarRed(r.id, { publica }); onRecargar(); } catch (e) { setError(e.message); }
  };
  const borrar = async (r) => {
    setError('');
    try { await api.eliminarRedAdmin(r.id); onRecargar(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <Aviso>{error}</Aviso>
      {redes.map((r) => (
        <div key={r.id} className="fila">
          <div className="fila-info">
            <div className="fila-nombre">
              {r.nombre}
              <span className="etiqueta">{r.publica ? 'pública' : 'privada'}</span>
            </div>
            <div className="fila-sub">
              {r.nodos} nodos · {r.aristas} conexiones
              {r.propietario ? ` · de ${r.propietario}` : ' · sin propietario'}
            </div>
          </div>
          <div className="fila-acciones">
            <button className="btn btn-pequeno" onClick={() => publicar(r, !r.publica)}>
              {r.publica ? 'Retirar' : 'Publicar'}
            </button>
            <button className="btn btn-pequeno btn-peligro" onClick={() => borrar(r)}>Eliminar</button>
          </div>
        </div>
      ))}
      <p className="nota">
        Publicar una red la hace visible para cualquier visitante; retirarla la devuelve a su
        propietario sin borrarla.
      </p>
    </div>
  );
}
