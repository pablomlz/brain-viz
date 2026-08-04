import React, { useState } from 'react';
import Modal, { Aviso } from './Modal';
import { api } from './api';

/**
 * Registro e inicio de sesión [RF 13].
 *
 * Las dos operaciones comparten ventana porque son la misma decisión desde el
 * punto de vista del usuario: entrar en su cuenta. Se alterna entre una y otra
 * sin cerrar nada, conservando lo que ya hubiera escrito.
 */
export default function Acceso({ onEntrar, onCerrar }) {
  const [modo, setModo] = useState('login');   // 'login' o 'registro'
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const esRegistro = modo === 'registro';

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const datos = esRegistro
        ? await api.registro({ email, nombre, password })
        : await api.login({ email, password });
      onEntrar(datos.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo={esRegistro ? 'Crear una cuenta' : 'Iniciar sesión'}
      subtitulo={esRegistro
        ? 'Con una cuenta puedes cargar tus propias redes y guardarlas.'
        : 'Accede para gestionar tus conjuntos de datos.'}
      onCerrar={onCerrar}
      ancho={430}
    >
      <form onSubmit={enviar} className="formulario">
        {esRegistro && (
          <label className="campo">
            <span>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                   placeholder="Tu nombre" autoComplete="name" />
          </label>
        )}
        <label className="campo">
          <span>Correo electrónico</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                 placeholder="nombre@ejemplo.com" autoComplete="email" />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                 placeholder={esRegistro ? 'Al menos 8 caracteres' : ''}
                 autoComplete={esRegistro ? 'new-password' : 'current-password'} />
        </label>

        <Aviso>{error}</Aviso>

        <button className="btn btn-principal" type="submit" disabled={enviando}>
          {enviando ? 'Un momento…' : (esRegistro ? 'Crear cuenta' : 'Entrar')}
        </button>

        <p className="alterna">
          {esRegistro ? '¿Ya tienes cuenta?' : '¿Todavía no tienes cuenta?'}{' '}
          <button type="button" className="enlace"
                  onClick={() => { setModo(esRegistro ? 'login' : 'registro'); setError(''); }}>
            {esRegistro ? 'Inicia sesión' : 'Créala aquí'}
          </button>
        </p>
        <p className="nota">
          Sin cuenta puedes explorar igualmente todas las redes públicas del catálogo.
        </p>
      </form>
    </Modal>
  );
}
