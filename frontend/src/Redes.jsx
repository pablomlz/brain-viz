import React, { useState } from 'react';
import Modal, { Aviso } from './Modal';
import { api } from './api';

/**
 * Catálogo de redes, carga de una red propia y gestión de los conjuntos de
 * datos [RF 14, RF 14.1, RF 15].
 *
 * Se reúnen en una sola ventana con dos pestañas porque responden a dos momentos
 * del mismo flujo: elegir qué red mirar y administrar las que uno ha subido.
 */
export default function Redes({ usuario, redes, activa, onElegir, onRecargar, onCerrar }) {
  const [pestana, setPestana] = useState('catalogo');

  return (
    <Modal
      titulo="Redes"
      subtitulo="Elige una red del catálogo o carga la tuya."
      onCerrar={onCerrar}
      ancho={620}
    >
      <div className="pestanas">
        <button className={pestana === 'catalogo' ? 'pestana activa' : 'pestana'}
                onClick={() => setPestana('catalogo')}>Catálogo</button>
        {usuario && (
          <button className={pestana === 'subir' ? 'pestana activa' : 'pestana'}
                  onClick={() => setPestana('subir')}>Cargar una red</button>
        )}
      </div>

      {pestana === 'catalogo'
        ? <Catalogo usuario={usuario} redes={redes} activa={activa}
                    onElegir={onElegir} onRecargar={onRecargar} />
        : <Subida onSubida={onRecargar} onIrAlCatalogo={() => setPestana('catalogo')} />}
    </Modal>
  );
}

function Catalogo({ usuario, redes, activa, onElegir, onRecargar }) {
  const [error, setError] = useState('');
  const publicas = redes.filter((r) => r.publica);
  const propias = redes.filter((r) => !r.publica);

  const eliminar = async (red) => {
    setError('');
    try {
      await api.eliminarRed(red.id);
      onRecargar();
    } catch (e) {
      setError(e.message);
    }
  };

  const lista = (titulo, items, borrable) => (
    <>
      <div className="grupo-titulo">{titulo}</div>
      {items.length === 0 && <p className="nota">No hay redes en esta sección.</p>}
      {items.map((r) => (
        <div key={r.id} className={r.id === activa ? 'fila fila-activa' : 'fila'}>
          <div className="fila-info">
            <div className="fila-nombre">
              {r.nombre}
              {r.id === activa && <span className="etiqueta">en pantalla</span>}
            </div>
            <div className="fila-sub">
              {r.nodos} nodos · {r.aristas} conexiones
              {r.descripcion ? ` · ${r.descripcion}` : ''}
            </div>
          </div>
          <div className="fila-acciones">
            <a className="btn btn-pequeno" href={api.urlMetricas(r.id, 'csv')}
               title="Descargar las métricas en CSV">CSV</a>
            <a className="btn btn-pequeno" href={api.urlMetricas(r.id, 'json')}
               title="Descargar las métricas en JSON">JSON</a>
            <button className="btn btn-pequeno btn-principal" onClick={() => onElegir(r.id)}>
              Visualizar
            </button>
            {borrable && (
              <button className="btn btn-pequeno btn-peligro" onClick={() => eliminar(r)}>
                Eliminar
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div>
      <Aviso>{error}</Aviso>
      {lista('Redes públicas', publicas, false)}
      {usuario && lista('Mis redes', propias, true)}
      {!usuario && (
        <p className="nota" style={{ marginTop: 14 }}>
          Inicia sesión para cargar tus propias redes y guardarlas.
        </p>
      )}
    </div>
  );
}

function Subida({ onSubida, onIrAlCatalogo }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [nodos, setNodos] = useState(null);
  const [aristas, setAristas] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    if (!nodos || !aristas) {
      setError('Selecciona los dos ficheros: el de nodos y el de conexiones.');
      return;
    }
    setEnviando(true);
    try {
      const r = await api.subirRed({ nombre, descripcion, nodos, aristas });
      setOk(`Red «${r.red.nombre}» cargada: ${r.red.nodos} nodos y ${r.red.aristas} conexiones.`);
      setNombre(''); setDescripcion(''); setNodos(null); setAristas(null);
      e.target.reset();
      onSubida();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="formulario">
      <p className="nota">
        Una red se describe con dos ficheros: uno con las coordenadas y la etiqueta de cada región
        y otro con la matriz de conexiones. Los dos son necesarios, así que se cargan juntos.
      </p>

      <label className="campo">
        <span>Nombre de la red</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Mi conectoma" />
      </label>
      <label className="campo">
        <span>Descripción <span className="opcional">(opcional)</span></span>
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
               placeholder="Procedencia de los datos, sujeto, condición…" />
      </label>
      <label className="campo">
        <span>Fichero de nodos <code>.node</code></span>
        <input type="file" accept=".node,.txt,text/plain"
               onChange={(e) => setNodos(e.target.files[0] || null)} />
      </label>
      <label className="campo">
        <span>Fichero de conexiones <code>.edge</code></span>
        <input type="file" accept=".edge,.txt,text/plain"
               onChange={(e) => setAristas(e.target.files[0] || null)} />
      </label>

      <Aviso>{error}</Aviso>
      {ok && <Aviso tipo="ok">{ok}</Aviso>}

      <div className="botonera">
        <button className="btn btn-principal" type="submit" disabled={enviando}>
          {enviando ? 'Comprobando y cargando…' : 'Cargar la red'}
        </button>
        <button className="btn" type="button" onClick={onIrAlCatalogo}>Ver el catálogo</button>
      </div>
    </form>
  );
}
