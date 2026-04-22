import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Login from './Login';

const GROUP_PALETTE = [
  '#7dd3fc', '#a78bfa', '#f472b6', '#fbbf24',
  '#34d399', '#f87171', '#60a5fa', '#c084fc',
  '#fb923c', '#22d3ee',
];

const groupColor = (g) => GROUP_PALETTE[(g ?? 0) % GROUP_PALETTE.length];

function BrainVis({ setMeta, hovered, setHovered, settings }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const groupRef = useRef();

  useEffect(() => {
    fetch('http://localhost:5000/api/brain-data')
      .then((res) => res.json())
      .then((brainData) => {
        if (brainData?.error) {
          setError(brainData.error);
        } else {
          setData(brainData);
          const groups = new Set(brainData.nodes.map((n) => n.group));
          setMeta({
            nodes: brainData.meta?.total_nodes ?? brainData.nodes?.length ?? 0,
            edges: brainData.meta?.total_edges ?? brainData.links?.length ?? 0,
            groups: Array.from(groups).sort((a, b) => a - b),
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useFrame((_, dt) => {
    if (groupRef.current && settings.autoRotate) {
      groupRef.current.rotation.y += dt * 0.08;
    }
  });

  const linesGeometry = useMemo(() => {
    if (!data) return null;
    const positions = [];
    const colors = [];
    data.links.forEach((link) => {
      const s = data.nodes[link.source];
      const t = data.nodes[link.target];
      if (!s || !t) return;
      positions.push(s.x, s.y, s.z, t.x, t.y, t.z);
      const c1 = new THREE.Color(groupColor(s.group));
      const c2 = new THREE.Color(groupColor(t.group));
      colors.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, [data]);

  if (loading) return <StatusOverlay><Loader label="Cargando conectoma..." /></StatusOverlay>;
  if (error || !data) return <StatusOverlay><ErrorCard message={error || 'No hay datos'} /></StatusOverlay>;

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {data.nodes.map((node, i) => {
        const isHovered = hovered === i;
        const color = groupColor(node.group);
        return (
          <mesh
            key={i}
            position={[node.x, node.y, node.z]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(i); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(null); document.body.style.cursor = 'default'; }}
            scale={isHovered ? 1.8 : 1}
          >
            <sphereGeometry args={[1.6, 24, 24]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isHovered ? 1.2 : 0.55}
              roughness={0.3}
              metalness={0.2}
            />
          </mesh>
        );
      })}

      {settings.showLinks && linesGeometry && (
        <lineSegments geometry={linesGeometry}>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={settings.linkOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {hovered != null && data.nodes[hovered] && (
        <Html
          position={[data.nodes[hovered].x, data.nodes[hovered].y, data.nodes[hovered].z]}
          style={{ pointerEvents: 'none', transform: 'translate(12px, -50%)' }}
        >
          <div style={tooltipStyle}>
            <div style={{ fontWeight: 600, fontSize: 12 }}>
              {data.nodes[hovered].name || `Nodo #${hovered}`}
            </div>
            <div style={{ fontSize: 10, color: '#8b93a7', marginTop: 2 }}>
              Grupo {data.nodes[hovered].group}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Loader({ label }) {
  return (
    <div style={loaderStyle}>
      <div style={spinnerStyle} />
      <div style={{ fontSize: 12, color: '#8b93a7', letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

function ErrorCard({ message }) {
  return (
    <div style={errorStyle}>
      <div style={{ fontSize: 12, color: '#fb7185', fontWeight: 600, marginBottom: 4 }}>⚠ Error</div>
      <div style={{ fontSize: 12, color: '#e6e9ef' }}>{message}</div>
    </div>
  );
}

function StatusOverlay({ children }) {
  return <Html center>{children}</Html>;
}

export default function App() {
  const [meta, setMeta] = useState({ nodes: 0, edges: 0, groups: [] });
  const [hovered, setHovered] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [settings, setSettings] = useState({
    showLinks: true,
    linkOpacity: 0.25,
    autoRotate: false,
    showAxes: false,
  });

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', zIndex: 2 }}>
      <Canvas camera={{ position: [0, 100, 180], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={[0]} />
        <fog attach="fog" args={['#070a10', 180, 420]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[80, 120, 80]} intensity={1.1} color="#7dd3fc" />
        <pointLight position={[-80, -40, -80]} intensity={0.7} color="#a78bfa" />
        <Stars radius={260} depth={60} count={1200} factor={3} saturation={0} fade speed={0.4} />

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          minDistance={40}
          maxDistance={360}
        />

        <BrainVis
          setMeta={setMeta}
          hovered={hovered}
          setHovered={setHovered}
          settings={settings}
        />

        {settings.showAxes && <axesHelper args={[50]} />}
      </Canvas>

      {/* Top-left: brand + stats */}
      <div style={hudTop}>
        <div style={brandRow}>
          <div style={brandOrb} />
          <div>
            <div style={brandTitle}>Brain Viz</div>
            <div style={brandSub}>Connectome Explorer</div>
          </div>
        </div>
        <div style={statGrid}>
          <Stat label="Nodos" value={meta.nodes} />
          <Stat label="Conexiones" value={meta.edges} />
          <Stat label="Grupos" value={meta.groups.length} />
        </div>
      </div>

      {/* Top-right: controls */}
      <div style={hudRight}>
        <PanelTitle>Controles</PanelTitle>
        <Toggle
          label="Mostrar conexiones"
          value={settings.showLinks}
          onChange={(v) => setSettings((s) => ({ ...s, showLinks: v }))}
        />
        <Toggle
          label="Rotación automática"
          value={settings.autoRotate}
          onChange={(v) => setSettings((s) => ({ ...s, autoRotate: v }))}
        />
        <Toggle
          label="Ejes de referencia"
          value={settings.showAxes}
          onChange={(v) => setSettings((s) => ({ ...s, showAxes: v }))}
        />
        <div style={{ marginTop: 10 }}>
          <div style={sliderLabel}>
            <span>Opacidad conexiones</span>
            <span style={{ color: '#8b93a7', fontFamily: 'JetBrains Mono, monospace' }}>
              {settings.linkOpacity.toFixed(2)}
            </span>
          </div>
          <input
            type="range" min={0} max={1} step={0.01}
            value={settings.linkOpacity}
            onChange={(e) => setSettings((s) => ({ ...s, linkOpacity: parseFloat(e.target.value) }))}
            style={sliderStyle}
          />
        </div>
      </div>

      {/* Bottom-left: legend */}
      {meta.groups.length > 0 && (
        <div style={hudLegend}>
          <PanelTitle>Leyenda</PanelTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {meta.groups.map((g) => (
              <div key={g} style={legendChip}>
                <span style={{ ...legendDot, background: groupColor(g) }} />
                <span>G{g}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom-right: quick links */}
      <div style={hudBottomRight}>
        <a href="http://localhost:5000/health" target="_blank" rel="noreferrer" style={linkStyle}>
          <span style={{ ...pulse, background: '#4ade80' }} /> Health
        </a>
        <a href="http://localhost:5000/api/brain-data?format=html" target="_blank" rel="noreferrer" style={linkStyle}>
          API Data
        </a>
      </div>

      {/* Bottom-center: hint */}
      <div style={hintStyle}>
        Arrastra para rotar · Rueda para zoom · Hover sobre nodos
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={statBox}>
      <div style={statValue}>{value.toLocaleString()}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

function PanelTitle({ children }) {
  return <div style={panelTitleStyle}>{children}</div>;
}

function Toggle({ label, value, onChange }) {
  return (
    <label style={toggleRow}>
      <span style={{ fontSize: 12, color: '#cbd1dd' }}>{label}</span>
      <span
        onClick={() => onChange(!value)}
        style={{
          ...toggleTrack,
          background: value ? 'linear-gradient(135deg, #7dd3fc, #a78bfa)' : 'rgba(255,255,255,0.12)',
        }}
      >
        <span style={{ ...toggleThumb, transform: value ? 'translateX(16px)' : 'translateX(0)' }} />
      </span>
    </label>
  );
}

/* ---------- styles ---------- */

const panelBase = {
  position: 'absolute',
  padding: 14,
  minWidth: 200,
  color: '#e6e9ef',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 12,
  background: 'linear-gradient(160deg, rgba(24,29,40,0.82), rgba(14,18,26,0.72))',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  boxShadow: '0 20px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
};

const hudTop = { ...panelBase, top: 16, left: 16, minWidth: 240 };
const hudRight = { ...panelBase, top: 16, right: 16, minWidth: 240 };
const hudLegend = { ...panelBase, bottom: 16, left: 16, maxWidth: 280 };
const hudBottomRight = {
  position: 'absolute', bottom: 16, right: 16,
  display: 'flex', gap: 8,
};

const brandRow = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 };
const brandOrb = {
  width: 32, height: 32, borderRadius: '50%',
  background: 'conic-gradient(from 200deg, #7dd3fc, #a78bfa, #f472b6, #7dd3fc)',
  boxShadow: '0 6px 20px rgba(125,211,252,0.35)',
};
const brandTitle = {
  fontSize: 15, fontWeight: 700, letterSpacing: -0.2,
  background: 'linear-gradient(135deg, #fff, #7dd3fc)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
};
const brandSub = { fontSize: 10, color: '#8b93a7', letterSpacing: 0.4, textTransform: 'uppercase' };

const statGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 };
const statBox = {
  padding: '10px 8px', textAlign: 'center',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
};
const statValue = {
  fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
  fontFamily: 'JetBrains Mono, monospace', color: '#fff',
};
const statLabel = {
  fontSize: 9.5, color: '#8b93a7', marginTop: 2,
  textTransform: 'uppercase', letterSpacing: 0.5,
};

const panelTitleStyle = {
  fontSize: 10, fontWeight: 600, color: '#8b93a7',
  textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10,
};

const toggleRow = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '6px 0', cursor: 'pointer',
};
const toggleTrack = {
  position: 'relative', width: 34, height: 18, borderRadius: 20,
  transition: 'background 0.2s ease', display: 'inline-block',
};
const toggleThumb = {
  position: 'absolute', top: 2, left: 2, width: 14, height: 14,
  borderRadius: '50%', background: '#fff',
  boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
  transition: 'transform 0.2s ease',
};

const sliderLabel = { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd1dd', marginBottom: 6 };
const sliderStyle = {
  width: '100%', accentColor: '#7dd3fc',
  height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4,
};

const legendChip = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '4px 8px', fontSize: 11,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 20, color: '#cbd1dd',
};
const legendDot = { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' };

const linkStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  color: '#e6e9ef', textDecoration: 'none',
  fontSize: 11, fontWeight: 500,
  padding: '8px 12px',
  background: 'linear-gradient(160deg, rgba(24,29,40,0.82), rgba(14,18,26,0.72))',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 10px 24px rgba(0,0,0,0.3)',
};
const pulse = {
  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
  boxShadow: '0 0 8px currentColor',
};

const hintStyle = {
  position: 'absolute', bottom: 20, left: '50%',
  transform: 'translateX(-50%)',
  fontSize: 11, color: '#6b7280', letterSpacing: 0.4,
  padding: '6px 14px',
  background: 'rgba(14,18,26,0.5)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 20,
  backdropFilter: 'blur(8px)',
  pointerEvents: 'none',
};

const tooltipStyle = {
  padding: '8px 12px',
  background: 'rgba(14,18,26,0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e6e9ef',
  fontFamily: 'Inter, system-ui, sans-serif',
  whiteSpace: 'nowrap',
  boxShadow: '0 10px 24px rgba(0,0,0,0.5)',
};

const loaderStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  padding: '24px 32px',
  background: 'rgba(14,18,26,0.85)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
  backdropFilter: 'blur(12px)',
};
const spinnerStyle = {
  width: 32, height: 32, borderRadius: '50%',
  border: '2px solid rgba(255,255,255,0.1)',
  borderTopColor: '#7dd3fc',
  borderRightColor: '#a78bfa',
  animation: 'spin 0.9s linear infinite',
};
const errorStyle = {
  padding: '14px 18px',
  background: 'rgba(40,14,20,0.9)',
  border: '1px solid rgba(251,113,133,0.4)',
  borderRadius: 12,
  color: '#e6e9ef',
  fontFamily: 'Inter, system-ui, sans-serif',
  maxWidth: 320,
};
