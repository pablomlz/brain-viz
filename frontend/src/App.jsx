import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
// WebGL no permite dibujar líneas de más de un píxel de grosor, así que las
// aristas se dibujan con LineSegments2, que las representa como tiras de
// triángulos y sí admite un grosor configurable.
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
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

// Métricas por las que se puede colorear y dimensionar los nodos (RF 9).
// La opción por defecto mantiene el coloreado por grupo anatómico (RF 7).
const METRICAS = [
  { id: 'group',       nombre: 'Grupo anatómico' },
  { id: 'degree',      nombre: 'Grado' },
  { id: 'betweenness', nombre: 'Intermediación' },
  { id: 'closeness',   nombre: 'Cercanía' },
];

// Rampa de color para el mapeo por métrica: de azul apagado (valor bajo) a
// ámbar (valor alto), pasando por un tono intermedio.
const RAMPA = ['#2f4b7c', '#4c7df0', '#58c4a3', '#e0a458', '#d6685e'];

// El grado es un número entero; las centralidades son valores entre 0 y 1.
function formatoMetrica(id, v) {
  return id === 'degree' ? String(Math.round(v)) : v.toFixed(3);
}

function colorMetrica(t) {
  const x = Math.min(Math.max(t, 0), 1) * (RAMPA.length - 1);
  const i = Math.floor(x);
  const c1 = new THREE.Color(RAMPA[i]);
  if (i >= RAMPA.length - 1) return c1;
  return c1.lerp(new THREE.Color(RAMPA[i + 1]), x - i);
}

const ACCENT = '#4c7df0';    // Color de acento para el nodo seleccionado (RF 6)
const ACCENT_HI = '#6f97f5'; // Color de sus conexiones, algo más claro

// Grosor de las aristas en píxeles: el general y el de las conexiones del nodo
// seleccionado, que se dibujan más marcadas para distinguirlas (RF 6).
const LINK_WIDTH = 1.6;
const LINK_WIDTH_SELECTED = 3.2;

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

function BrainVis({ data, hovered, setHovered, selected, setSelected, settings, normaliza }) {
  const groupRef = useRef();

  useFrame((_, dt) => {
    if (groupRef.current && settings.autoRotate) {
      groupRef.current.rotation.y += dt * 0.08;
    }
  });

  const { size } = useThree();

  // Geometría de las aristas. El backend las envía ordenadas por peso
  // descendente, así que se construye UNA sola vez y el filtrado por umbral
  // (RF 5) se resuelve limitando el número de segmentos dibujados, sin
  // reconstruir la geometría en cada cambio del control.
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
    const g = new LineSegmentsGeometry();
    g.setPositions(positions);
    g.setColors(colors);
    return g;
  }, [data]);

  // Aristas del nodo seleccionado que siguen siendo visibles con el umbral
  // actual (RF 6). Se dibujan aparte para poder darles otro color y más grosor.
  const nodeLinesGeometry = useMemo(() => {
    if (!data || selected == null) return null;
    const positions = [];
    for (let i = 0; i < settings.visibleLinks; i++) {
      const link = data.links[i];
      if (link.source !== selected && link.target !== selected) continue;
      const s = data.nodes[link.source];
      const t = data.nodes[link.target];
      if (!s || !t) continue;
      positions.push(s.x, s.y, s.z, t.x, t.y, t.z);
    }
    if (positions.length === 0) return null;
    const g = new LineSegmentsGeometry();
    g.setPositions(positions);
    return g;
  }, [data, selected, settings.visibleLinks]);

  // Las geometrías reservan memoria en la tarjeta gráfica, así que se liberan
  // al reemplazarlas para no ir acumulando las de selecciones anteriores.
  useEffect(() => () => linesGeometry?.dispose(), [linesGeometry]);
  useEffect(() => () => nodeLinesGeometry?.dispose(), [nodeLinesGeometry]);

  // Aplica el umbral: como los enlaces están ordenados de mayor a menor peso,
  // los visibles son siempre los primeros `visibleLinks`.
  useEffect(() => {
    if (linesGeometry) linesGeometry.instanceCount = settings.visibleLinks;
  }, [linesGeometry, settings.visibleLinks]);

  // El grosor en píxeles necesita conocer el tamaño del lienzo.
  const resolution = useMemo(() => new THREE.Vector2(size.width, size.height), [size]);

  const linesMaterial = useMemo(() => new LineMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    linewidth: LINK_WIDTH,
  }), []);

  const nodeLinesMaterial = useMemo(() => new LineMaterial({
    color: new THREE.Color(ACCENT_HI),
    transparent: true,
    depthWrite: false,
    opacity: 0.95,
    linewidth: LINK_WIDTH_SELECTED,
  }), []);

  useEffect(() => {
    linesMaterial.resolution = resolution;
    nodeLinesMaterial.resolution = resolution;
  }, [linesMaterial, nodeLinesMaterial, resolution]);

  useEffect(() => {
    linesMaterial.opacity = settings.linkOpacity;
  }, [linesMaterial, settings.linkOpacity]);

  // Los materiales también reservan recursos gráficos y se crean una sola vez,
  // así que se liberan cuando el componente deja de usarse.
  useEffect(() => () => {
    linesMaterial.dispose();
    nodeLinesMaterial.dispose();
  }, [linesMaterial, nodeLinesMaterial]);

  // Los objetos de escena se crean una sola vez por geometría; si se crearan en
  // cada repintado, se acumularían objetos en la escena innecesariamente.
  const linesObject = useMemo(
    () => (linesGeometry ? new LineSegments2(linesGeometry, linesMaterial) : null),
    [linesGeometry, linesMaterial],
  );

  const nodeLinesObject = useMemo(() => {
    if (!nodeLinesGeometry) return null;
    const obj = new LineSegments2(nodeLinesGeometry, nodeLinesMaterial);
    obj.renderOrder = 1; // se dibujan después, para que queden por encima
    return obj;
  }, [nodeLinesGeometry, nodeLinesMaterial]);

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {data.nodes.map((node, i) => {
        const isHovered = hovered === i;
        const isSelected = selected === i;
        // Mapeo visual por métrica (RF 9): con la opción por defecto se
        // mantiene el coloreado por grupo y todos los nodos del mismo tamaño.
        const porMetrica = settings.metrica !== 'group';
        const t = porMetrica ? normaliza(node[settings.metrica]) : 0;
        const base = porMetrica ? 0.6 + 1.5 * t : 1;
        const color = isSelected
          ? ACCENT
          : (porMetrica ? colorMetrica(t) : groupColor(node.group));
        return (
          <mesh
            key={i}
            position={[node.x, node.y, node.z]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(i); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(null); document.body.style.cursor = 'default'; }}
            onClick={(e) => { e.stopPropagation(); setSelected(i === selected ? null : i); }}
            scale={base * (isSelected ? 2 : isHovered ? 1.6 : 1)}
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

      {settings.showLinks && linesObject && (
        <primitive object={linesObject} dispose={null} />
      )}

      {/* Conexiones del nodo seleccionado, por encima del resto (RF 6) */}
      {settings.showLinks && nodeLinesObject && (
        <primitive object={nodeLinesObject} dispose={null} />
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

// Lleva la cámara hasta el nodo buscado (RF 10). El grupo de la escena está
// girado -90 grados sobre X, así que un punto (x, y, z) del modelo se
// corresponde con (x, z, -y) en coordenadas de mundo.
function CamaraHaciaNodo({ data, objetivo, alLlegar }) {
  const controls = useThree((s) => s.controls);
  const camera = useThree((s) => s.camera);
  const destino = useRef(null);

  useEffect(() => {
    if (objetivo == null || !data) { destino.current = null; return; }
    const n = data.nodes[objetivo];
    if (n) destino.current = new THREE.Vector3(n.x, n.z, -n.y);
  }, [objetivo, data]);

  useFrame(() => {
    if (!destino.current || !controls) return;
    // Aproximación progresiva, para que el movimiento no sea un salto brusco
    controls.target.lerp(destino.current, 0.12);
    const vista = destino.current.clone().add(new THREE.Vector3(0, 55, 125));
    camera.position.lerp(vista, 0.12);
    controls.update();
    if (controls.target.distanceTo(destino.current) < 0.6) {
      destino.current = null;
      alLlegar();
    }
  });

  return null;
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
    metrica: 'group',   // Criterio de color y tamaño de los nodos (RF 9)
  });
  const [busqueda, setBusqueda] = useState('');   // Texto buscado (RF 10)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [objetivo, setObjetivo] = useState(null); // Nodo al que va la cámara

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
          metrics: brainData.meta?.metrics ?? null,   // métricas globales (RF 8)
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

  // Rango de la métrica activa, para normalizar los valores entre 0 y 1 (RF 9)
  const rangoMetrica = useMemo(() => {
    if (!data || settings.metrica === 'group') return null;
    const vals = data.nodes.map((n) => n[settings.metrica] ?? 0);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [data, settings.metrica]);

  const normaliza = useMemo(() => {
    if (!rangoMetrica) return () => 0;
    const { min, max } = rangoMetrica;
    const rango = max - min;
    return (v) => (rango > 0 ? ((v ?? 0) - min) / rango : 0);
  }, [rangoMetrica]);

  // Nodos cuya etiqueta contiene el texto buscado (RF 10)
  const resultados = useMemo(() => {
    if (!data) return [];
    const todos = data.nodes.map((n, i) => ({ i, label: n.label }));
    const q = busqueda.trim().toLowerCase();
    // Sin texto se ofrece la lista completa de regiones. Las etiquetas del atlas
    // son abreviaturas (PUT, HIP, SFGdor), imposibles de adivinar, así que el
    // usuario necesita poder verlas antes de escribir nada.
    if (q.length === 0) return todos;
    return todos.filter((n) => n.label.toLowerCase().includes(q));
  }, [data, busqueda]);

  // Al elegir un resultado se selecciona el nodo y la cámara viaja hasta él.
  // La rotación automática se detiene para que no se mueva mientras tanto.
  const irANodo = (i) => {
    setBuscadorAbierto(false);
    setSelected(i);
    setObjetivo(i);
    setSettings((s) => ({ ...s, autoRotate: false }));
  };

  const selectedNode = selected != null && data ? data.nodes[selected] : null;

  // Grado del nodo seleccionado contando solo sus conexiones visibles con el
  // umbral actual. Si el usuario sube el umbral y algunas desaparecen de la
  // escena, el grado que muestra el panel baja en consecuencia (RF 5, RF 6).
  const gradoVisible = useMemo(() => {
    if (!data || selected == null) return 0;
    let n = 0;
    for (let i = 0; i < settings.visibleLinks; i++) {
      const link = data.links[i];
      if (link.source === selected || link.target === selected) n++;
    }
    return n;
  }, [data, selected, settings.visibleLinks]);
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
          makeDefault
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
            normaliza={normaliza}
          />
        )}

        {/* Desplazamiento de la cámara hasta el nodo buscado (RF 10) */}
        {data && <CamaraHaciaNodo data={data} objetivo={objetivo} alLlegar={() => setObjetivo(null)} />}

        {loading && <Html center><Loader label="Cargando conectoma" /></Html>}
        {error && <Html center><ErrorCard message={error} /></Html>}

        {settings.showAxes && <axesHelper args={[70]} />}
      </Canvas>

      {/* Columna izquierda: estadísticas y métricas de la red */}
      <div className="stack-tl">
      <div className="panel">
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

      {/* Métricas globales de la red, calculadas en el servidor (RF 8) */}
      {meta.metrics && (
        <div className="panel">
          <div className="panel-hd">
            <span className="panel-ttl">Métricas de la red</span>
            <span className="panel-idx">GRAFO</span>
          </div>
          <div className="panel-bd" style={{ paddingTop: 4, paddingBottom: 4 }}>
            <Stat label="Densidad" value={meta.metrics.density.toFixed(3)} />
            <Stat label="Grado medio" value={meta.metrics.avg_degree.toFixed(2)} />
            <Stat label="Coef. de clustering" value={meta.metrics.avg_clustering.toFixed(3)} />
            <Stat label="Componentes conexas" value={meta.metrics.components} />
          </div>
        </div>
      )}
      {/* Búsqueda de un nodo por su etiqueta (RF 10) */}
      <div className="panel">
        <div className="panel-hd">
          <span className="panel-ttl">Buscar nodo</span>
          <span className="panel-idx">{data ? data.nodes.length : 0}</span>
        </div>
        <div className="panel-bd">
          <input
            className="buscar"
            type="text"
            placeholder="Etiqueta, p. ej. PUT o HIP"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setBuscadorAbierto(true); }}
            onFocus={() => setBuscadorAbierto(true)}
            onBlur={() => setBuscadorAbierto(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' && resultados.length) irANodo(resultados[0].i); }}
          />
          {(buscadorAbierto || busqueda.trim()) && (
            <div className="resultados">
              {resultados.length === 0 && <div className="sin-resultados">Sin coincidencias</div>}
              {resultados.map((r) => (
                /* onMouseDown, no onClick: el clic debe registrarse antes de
                   que el campo pierda el foco y la lista se cierre */
                <button key={r.i} className="resultado" onMouseDown={() => irANodo(r.i)}>
                  <span className="sw-sq" style={{ background: groupColor(data.nodes[r.i].group) }} />
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>{/* fin de la columna izquierda */}

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
          {/* Mapeo visual: color y tamaño de los nodos según una métrica (RF 9) */}
          <div className="sel-row">
            <span className="sel-lab">Colorear y dimensionar por</span>
            <select
              className="sel"
              value={settings.metrica}
              onChange={(e) => setSettings((s) => ({ ...s, metrica: e.target.value }))}
            >
              {METRICAS.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
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
            <Stat label="Grado" value={`${gradoVisible} / ${selectedNode.degree ?? 0}`} />
            {/* Centralidades calculadas en el servidor (RF 6.1) */}
            <Stat label="Intermediación" value={(selectedNode.betweenness ?? 0).toFixed(4)} />
            <Stat label="Cercanía" value={(selectedNode.closeness ?? 0).toFixed(4)} />
            <Stat label="Coordenada X" value={selectedNode.x.toFixed(1)} />
            <Stat label="Coordenada Y" value={selectedNode.y.toFixed(1)} />
            <Stat label="Coordenada Z" value={selectedNode.z.toFixed(1)} />
          </div>
        </div>
      )}
      </div>{/* fin de la columna derecha */}

      {/* Abajo izquierda: leyenda. Cambia según se coloree por grupo o por
          métrica, para que siempre explique lo que se está viendo (RF 7, RF 9) */}
      {meta.groups.length > 0 && rangoMetrica && (
        <div className="panel panel-bl">
          <div className="panel-hd">
            <span className="panel-ttl">Leyenda</span>
            <span className="panel-idx">
              {METRICAS.find((m) => m.id === settings.metrica)?.nombre.toUpperCase()}
            </span>
          </div>
          <div className="panel-bd">
            <div
              className="escala"
              style={{ background: `linear-gradient(90deg, ${RAMPA.join(', ')})` }}
            />
            <div className="escala-lab">
              <span>{formatoMetrica(settings.metrica, rangoMetrica.min)}</span>
              <span>{formatoMetrica(settings.metrica, rangoMetrica.max)}</span>
            </div>
          </div>
        </div>
      )}

      {meta.groups.length > 0 && !rangoMetrica && (
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
