import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
// NOTA: el componente Login existe en el proyecto pero todavía no se utiliza.
// El acceso de usuarios (registro, inicio y cierre de sesión) corresponde al
// Sprint 4; hasta entonces la aplicación es de acceso libre (rol visitante).

const API_BASE_URL = ''; // Las peticiones van al mismo host; Vite proxy las redirige al backend

// Paleta categórica sobria para los grupos/lóbulos (no neón).
const GROUP_PALETTE = [
  '#6e9bf0', '#58c4a3', '#e0a458', '#d6685e', '#7fb3d5',
  '#a98bd0', '#e0894b', '#4fa3a0', '#8a94a6', '#c77ba6',
];
const groupColor = (g) => GROUP_PALETTE[(g ?? 0) % GROUP_PALETTE.length];

const ACCENT = '#4c7df0'; // Color de acento para el nodo seleccionado (RF 6)

// Nº de aristas cuyo peso alcanza el umbral (RF 5). Como la lista llega
// ordenada por peso descendente, ese número es la posición de la primera arista
// que ya no lo alcanza, y se localiza con una búsqueda binaria en O(log E) en
// lugar de recorrer toda la lista.
function contarVisibles(links, umbral) {
  let ini = 0;
  let fin = links.length;
  while (ini < fin) {
    const medio = (ini + fin) >> 1;
    if (links[medio].value >= umbral) ini = medio + 1;
    else fin = medio;
  }
  return ini;
}

function Mark({ size = 24 }) {
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

function BrainVis({ data, hovered, setHovered, selected, setSelected, settings }) {
  const groupRef = useRef();

  useFrame((_, dt) => {
    if (groupRef.current && settings.autoRotate) {
      groupRef.current.rotation.y += dt * 0.08;
    }
  });

  // Geometría de las aristas. El backend las envía ordenadas por peso
  // descendente, así que se construye UNA sola vez y el filtrado por umbral
  // (RF 5) se resuelve dibujando solo el prefijo correspondiente mediante
  // setDrawRange, sin reconstruir la geometría en cada cambio del control.
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

  // Aplica el umbral: como los enlaces están ordenados de mayor a menor peso,
  // los visibles son siempre los primeros `visibleLinks` (2 vértices por arista).
  useEffect(() => {
    if (linesGeometry) linesGeometry.setDrawRange(0, settings.visibleLinks * 2);
  }, [linesGeometry, settings.visibleLinks]);

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {data.nodes.map((node, i) => {
        const isHovered = hovered === i;
        const isSelected = selected === i;
        const color = isSelected ? ACCENT : groupColor(node.group);
        return (
          <mesh
            key={i}
            position={[node.x, node.y, node.z]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(i); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(null); document.body.style.cursor = 'default'; }}
            onClick={(e) => { e.stopPropagation(); setSelected(i === selected ? null : i); }}
            scale={isSelected ? 2 : isHovered ? 1.6 : 1}
          >
            <sphereGeometry args={[1.6, 24, 24]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isSelected ? 1.1 : isHovered ? 0.9 : 0.32}
              roughness={0.5}
              metalness={0.1}
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
            depthWrite={false}
          />
        </lineSegments>
      )}

      {hovered != null && data.nodes[hovered] && (
        <Html
          position={[data.nodes[hovered].x, data.nodes[hovered].y, data.nodes[hovered].z]}
          style={{ pointerEvents: 'none', transform: 'translate(12px, -50%)' }}
        >
          <div className="tip">
            <div className="tip-t">{data.nodes[hovered].label || `Nodo #${hovered}`}</div>
            <div className="tip-s">NODO {String(hovered).padStart(2, '0')} · GRUPO {data.nodes[hovered].group}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Loader({ label }) {
  return (
    <div className="loader">
      <div className="loader-bar"><span /></div>
      <div className="loader-lab">{label}</div>
    </div>
  );
}

function ErrorCard({ message }) {
  return (
    <div className="err">
      <div className="err-t">Error</div>
      <div className="err-m">{message}</div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ nodes: 0, edges: 0, groups: [] });
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [settings, setSettings] = useState({
    showLinks: true,
    linkOpacity: 0.25,
    autoRotate: false,
    showAxes: false,
    threshold: 0,       // Umbral de peso mínimo (RF 5)
    visibleLinks: 0,    // Nº de aristas que superan el umbral
  });

  // Carga de la red (RF 1, RF 2)
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/brain-data`)
      .then((res) => res.json())
      .then((brainData) => {
        if (brainData?.error) {
          setError(brainData.error);
          return;
        }
        setData(brainData);
        const groups = new Set(brainData.nodes.map((n) => n.group));
        setMeta({
          nodes: brainData.meta?.total_nodes ?? brainData.nodes.length,
          edges: brainData.meta?.total_edges ?? brainData.links.length,
          groups: Array.from(groups).sort((a, b) => a - b),
          minWeight: brainData.meta?.min_weight ?? 0,
          maxWeight: brainData.meta?.max_weight ?? 1,
        });
        // Se respeta el umbral que el usuario pudiera haber fijado mientras la
        // red se estaba cargando; si no tocó nada (umbral 0), se muestran todas.
        setSettings((s) => ({
          ...s,
          visibleLinks: contarVisibles(brainData.links, s.threshold),
        }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const onThresholdChange = (value) => {
    const visibles = data ? contarVisibles(data.links, value) : 0;
    setSettings((s) => ({ ...s, threshold: value, visibleLinks: visibles }));
  };

  const selectedNode = selected != null && data ? data.nodes[selected] : null;
  // Peso máximo de la red; el `|| 1` evita divisiones por cero y un control
  // degenerado si la red no tuviera ninguna arista.
  const maxWeight = meta.maxWeight || 1;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 100, 180], fov: 45 }}
        dpr={[1, 2]}
        onPointerMissed={() => setSelected(null)} /* clic en vacío: deselecciona (RF 6) */
      >
        <color attach="background" args={['#0b0c0e']} />
        <fog attach="fog" args={['#0b0c0e', 260, 520]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[100, 120, 80]} intensity={0.8} color="#ffffff" />
        <pointLight position={[-80, -40, -80]} intensity={0.35} color="#ffffff" />

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          minDistance={40}
          maxDistance={360}
        />

        {data && (
          <BrainVis
            data={data}
            hovered={hovered}
            setHovered={setHovered}
            selected={selected}
            setSelected={setSelected}
            settings={settings}
          />
        )}

        {loading && <Html center><Loader label="Cargando conectoma" /></Html>}
        {error && <Html center><ErrorCard message={error} /></Html>}

        {settings.showAxes && <axesHelper args={[70]} />}
      </Canvas>

      {/* Arriba izquierda: marca + estadísticas */}
      <div className="panel panel-tl">
        <div className="brand">
          <Mark size={24} />
          <div>
            <h1>Brain&nbsp;Viz</h1>
            <p>Connectome&nbsp;Explorer</p>
          </div>
        </div>
        <div className="panel-hd">
          <span className="panel-ttl">Red activa</span>
          <span className="panel-idx">AAL90</span>
        </div>
        <div className="panel-bd" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <Stat label="Nodos" value={meta.nodes} />
          <Stat
            label="Conexiones"
            value={`${settings.visibleLinks} / ${meta.edges}`}  /* visibles / totales (RF 5) */
          />
          <Stat label="Grupos" value={meta.groups.length} />
        </div>
      </div>

      {/* Columna derecha: controles y, si procede, el nodo seleccionado.
          Se apilan en una columna flexible para que nunca se solapen. */}
      <div className="stack-tr">
      <div className="panel">
        <div className="panel-hd">
          <span className="panel-ttl">Controles</span>
          <span className="panel-idx">02</span>
        </div>
        <div className="panel-bd">
          {/* Umbral de peso (RF 5). El rango del control se calibra con los
              pesos reales de la red, de modo que funcione con cualquier
              conjunto de datos y no solo con pesos normalizados en [0, 1]. */}
          <div className="slider-row">
            <div className="slider-lab">
              <span>Umbral de peso</span>
              <span className="slider-val">{settings.threshold.toFixed(2)}</span>
            </div>
            <input
              className="rng"
              type="range"
              min={0}
              max={maxWeight}
              step={maxWeight / 100}
              value={settings.threshold}
              onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(90deg, var(--accent) ${(settings.threshold / maxWeight) * 100}%, var(--line-2) ${(settings.threshold / maxWeight) * 100}%)`,
              }}
            />
            <div className="rng-range">
              <span>0.00</span>
              <span>{maxWeight.toFixed(2)}</span>
            </div>
          </div>
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
          <div className="slider-row">
            <div className="slider-lab">
              <span>Opacidad conexiones</span>
              <span className="slider-val">{settings.linkOpacity.toFixed(2)}</span>
            </div>
            <input
              className="rng"
              type="range" min={0} max={1} step={0.01}
              value={settings.linkOpacity}
              onChange={(e) => setSettings((s) => ({ ...s, linkOpacity: parseFloat(e.target.value) }))}
              style={{
                background: `linear-gradient(90deg, var(--accent) ${settings.linkOpacity * 100}%, var(--line-2) ${settings.linkOpacity * 100}%)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Información del nodo seleccionado (RF 6) */}
      {selectedNode && (
        <div className="panel">
          <div className="panel-hd">
            <span className="panel-ttl">Nodo seleccionado</span>
            <button className="panel-x" onClick={() => setSelected(null)} aria-label="Cerrar">×</button>
          </div>
          <div className="panel-bd">
            <div className="node-name">
              <span className="sw-sq" style={{ background: groupColor(selectedNode.group) }} />
              {selectedNode.label}
            </div>
            <Stat label="Identificador" value={selectedNode.id} />
            <Stat label="Grupo" value={`G${selectedNode.group}`} />
            <Stat label="Grado" value={selectedNode.degree ?? '—'} />
            <Stat label="Coordenada X" value={selectedNode.x.toFixed(1)} />
            <Stat label="Coordenada Y" value={selectedNode.y.toFixed(1)} />
            <Stat label="Coordenada Z" value={selectedNode.z.toFixed(1)} />
          </div>
        </div>
      )}
      </div>{/* fin de la columna derecha */}

      {/* Abajo izquierda: leyenda */}
      {meta.groups.length > 0 && (
        <div className="panel panel-bl">
          <div className="panel-hd">
            <span className="panel-ttl">Leyenda</span>
            <span className="panel-idx">GRUPOS</span>
          </div>
          <div className="panel-bd">
            <div className="legend">
              {meta.groups.map((g) => (
                <span key={g} className="chip">
                  <span className="sw-sq" style={{ background: groupColor(g) }} />
                  G{g}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Abajo derecha: enlaces */}
      <div className="links">
        <a href={`${API_BASE_URL}/health`} target="_blank" rel="noreferrer" className="btn-ghost">
          <span className="dot" /> Health
        </a>
        <a href={`${API_BASE_URL}/api/brain-data?format=html`} target="_blank" rel="noreferrer" className="btn-ghost">
          API
        </a>
      </div>

      {/* Abajo centro: pista */}
      <div className="hint">
        <span><b>Arrastra</b> rotar</span>
        <span><b>Rueda</b> zoom</span>
        <span><b>Clic</b> seleccionar</span>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-l">{label}</span>
      <span className="stat-v">{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="ctrl" onClick={() => onChange(!value)}>
      <span className="ctrl-l">{label}</span>
      <span className={`sw${value ? ' on' : ''}`} />
    </div>
  );
}
