import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [focused, setFocused] = useState(null);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logoOrb}>
            <div style={styles.logoInner} />
          </div>
        </div>

        <div style={styles.header}>
          <h1 style={styles.title}>Brain Viz</h1>
          <p style={styles.subtitle}>Visualización interactiva de redes cerebrales</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} style={styles.form}>
          <Field
            label="Usuario"
            icon={IconUser}
            value={user}
            onChange={setUser}
            focused={focused === 'u'}
            onFocus={() => setFocused('u')}
            onBlur={() => setFocused(null)}
          />
          <Field
            label="Contraseña"
            type="password"
            icon={IconLock}
            value={pass}
            onChange={setPass}
            focused={focused === 'p'}
            onFocus={() => setFocused('p')}
            onBlur={() => setFocused(null)}
          />

          <button type="submit" style={styles.button}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.buttonHover)}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.button)}
          >
            <span>Acceder</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.dot} /> Conectado a backend local
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', icon: Icon, value, onChange, focused, onFocus, onBlur }) {
  return (
    <label style={{
      ...styles.field,
      borderColor: focused ? 'rgba(125,211,252,0.55)' : 'rgba(255,255,255,0.1)',
      boxShadow: focused ? '0 0 0 4px rgba(125,211,252,0.12)' : 'inset 0 1px 2px rgba(0,0,0,0.25)',
    }}>
      <Icon />
      <input
        type={type}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        style={styles.input}
      />
    </label>
  );
}

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8b93a7', flexShrink: 0 }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8b93a7', flexShrink: 0 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const styles = {
  container: {
    width: '100vw', height: '100vh',
    display: 'grid', placeItems: 'center',
    position: 'relative', zIndex: 2,
  },
  card: {
    position: 'relative',
    width: 'min(420px, 92vw)',
    padding: '44px 40px 32px',
    background: 'linear-gradient(160deg, rgba(24,29,40,0.85), rgba(14,18,26,0.75))',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  logoWrap: {
    display: 'flex', justifyContent: 'center', marginBottom: 18,
  },
  logoOrb: {
    width: 58, height: 58, borderRadius: '50%',
    background: 'conic-gradient(from 200deg, #7dd3fc, #a78bfa, #f472b6, #7dd3fc)',
    display: 'grid', placeItems: 'center',
    boxShadow: '0 10px 40px rgba(125,211,252,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset',
    animation: 'spin 8s linear infinite',
  },
  logoInner: {
    width: 46, height: 46, borderRadius: '50%',
    background: 'radial-gradient(circle at 30% 30%, #1a2030, #0a0d14)',
    boxShadow: 'inset 0 0 20px rgba(125,211,252,0.3)',
  },
  header: { textAlign: 'center', marginBottom: 28 },
  title: {
    margin: '0 0 6px', fontSize: 34, fontWeight: 700, letterSpacing: -0.8,
    background: 'linear-gradient(135deg, #ffffff 0%, #7dd3fc 60%, #a78bfa 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  subtitle: { margin: 0, fontSize: 13, color: '#8b93a7', fontWeight: 400, letterSpacing: 0.1 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  field: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    transition: 'all 0.2s ease',
  },
  input: {
    flex: 1, width: '100%', background: 'transparent', border: 'none',
    color: '#e6e9ef', fontSize: 14, fontFamily: 'inherit', padding: 0,
  },
  button: {
    marginTop: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '13px 18px',
    fontSize: 14, fontWeight: 600, letterSpacing: 0.2,
    color: '#0a0d14',
    background: 'linear-gradient(135deg, #7dd3fc 0%, #a78bfa 100%)',
    border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 12px 28px rgba(125,211,252,0.28), inset 0 1px 0 rgba(255,255,255,0.3)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  buttonHover: {
    marginTop: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '13px 18px',
    fontSize: 14, fontWeight: 600, letterSpacing: 0.2,
    color: '#0a0d14',
    background: 'linear-gradient(135deg, #7dd3fc 0%, #a78bfa 100%)',
    border: 'none', borderRadius: 12, cursor: 'pointer',
    transform: 'translateY(-1px)',
    boxShadow: '0 18px 36px rgba(125,211,252,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
  },
  footer: {
    marginTop: 20, textAlign: 'center',
    fontSize: 11, color: '#6b7280', fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  dot: {
    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
    background: '#4ade80', boxShadow: '0 0 8px #4ade80',
  },
};

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('login-keyframes')) {
  const s = document.createElement('style');
  s.id = 'login-keyframes';
  s.textContent = `@keyframes spin { to { transform: rotate(360deg); } }
  input::placeholder { color: #6b7280; }`;
  document.head.appendChild(s);
}
