import React, { useState } from 'react';

function Mark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
      <line x1="5" y1="17" x2="13" y2="6" stroke="#31363d" strokeWidth="1.2" />
      <line x1="13" y1="6" x2="19" y2="14" stroke="#31363d" strokeWidth="1.2" />
      <line x1="5" y1="17" x2="19" y2="14" stroke="#31363d" strokeWidth="1.2" />
      <circle cx="5" cy="17" r="2.6" fill="#4c7df0" />
      <circle cx="13" cy="6" r="2.6" fill="#e8e9eb" />
      <circle cx="19" cy="14" r="2.6" fill="#8e949d" />
    </svg>
  );
}

export default function Login({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-top">
          <Mark size={34} />
          <div>
            <h1>Brain Viz</h1>
            <p>Visualización 3D de redes cerebrales</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          <div className="login-field">
            <label htmlFor="bv-user">Usuario</label>
            <div className="login-inp">
              <IconUser />
              <input id="bv-user" placeholder="investigador" value={user}
                onChange={(e) => setUser(e.target.value)} />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="bv-pass">Contraseña</label>
            <div className="login-inp">
              <IconLock />
              <input id="bv-pass" type="password" placeholder="••••••••" value={pass}
                onChange={(e) => setPass(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="login-btn">
            Acceder
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        <div className="login-foot">
          <span className="dot" /> Backend local · Conectado
        </div>
      </div>
    </div>
  );
}

const IconUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconLock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
