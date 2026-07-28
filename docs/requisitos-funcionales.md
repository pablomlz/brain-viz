# Especificación de Requisitos del Software
## Aplicación Web para la Visualización 3D Interactiva de Redes Cerebrales

**Proyecto:** Brain Viz Connectome
**Autor:** Pablo Moliz Arias
**Tipo:** Trabajo Fin de Grado — Ingeniería Informática (UGR)
**Director:** Juan Ruíz de Miras
**Versión:** 2.0
**Última revisión:** 2026-07-06

---

## Índice
1. [Introducción y alcance](#1-introducción-y-alcance)
2. [Perfil de usuarios](#2-perfil-de-usuarios)
3. [Requisitos funcionales](#3-requisitos-funcionales)
4. [Requisitos no funcionales](#4-requisitos-no-funcionales)
5. [Requisitos de información](#5-requisitos-de-información)
6. [Casos de uso](#6-casos-de-uso)
7. [Matriz de trazabilidad](#7-matriz-de-trazabilidad)
8. [Criterios de validación](#8-criterios-de-validación)

---

## 1. Introducción y alcance

### 1.1. Propósito
Este documento define los requisitos de **Brain Viz Connectome**, una aplicación web para la
visualización interactiva en 3D y el análisis básico de redes de conectividad cerebral
(*connectomas*). El sistema permite cargar una red cerebral a partir de una matriz de adyacencia
y un fichero de coordenadas nodales, procesarla en el backend y explorarla de forma interactiva
en el navegador mediante WebGL.

### 1.2. Contexto del dominio
Una red cerebral (*connectoma*) se modela como un grafo ponderado:
- **Nodos**: regiones anatómicas (ROIs) con coordenadas espaciales 3D (típicamente en espacio MNI).
- **Aristas**: conexiones estructurales o funcionales entre regiones, con un peso asociado
  (matriz de adyacencia). El peso puede representar una correlación, un número de fibras u otra
  medida de conectividad; **0 indica ausencia de conexión**.

Los datos se obtienen de **matrices de adyacencia disponibles en bases de datos públicas de
neuroimagen** (p. ej. atlas AAL, Desikan-Killiany, o derivados del Human Connectome Project).
El formato de ficheros adoptado (`.node` / `.edge`) es el que popularizó **BrainNet Viewer**,
una herramienta de referencia en el ámbito, lo que garantiza compatibilidad con datasets ya
existentes en la comunidad.

### 1.3. Objetivos del sistema (alineados con los del TFG)
1. Cargar y validar redes cerebrales desde ficheros estándar y atlas precargados.
2. Renderizar la red en un espacio 3D interactivo mediante WebGL en el frontend.
3. Facilitar la exploración visual mediante navegación, filtrado, selección e inspección.
4. **Calcular métricas básicas de teoría de grafos sobre la red en el backend.**
5. Empaquetar y desplegar el sistema mediante contenedores (Docker).

### 1.4. Alcance
**Incluye:**
- Visualización de grafos de tamaño moderado (objetivo de referencia: hasta ~1000 nodos).
- Filtrado por umbral de peso e inspección de nodos.
- Métricas locales (grado, centralidades) y globales (densidad, clustering, componentes).
- Interfaz web para navegador de escritorio (soporte razonable en tablet).

**No incluye:**
- Procesamiento de imágenes de resonancia (fMRI/DTI) ni construcción de matrices desde señal cruda.
- Análisis estadístico inferencial (comparación entre grupos, tests, etc.).
- Persistencia en base de datos ni edición colaborativa en tiempo real.

### 1.5. Convenciones de prioridad
La prioridad determina el **orden de implementación por sprints**. Si al final del proyecto no se
implementan todos los requisitos, los que queden pendientes serán los de menor prioridad.

| Prioridad | Nivel | Sprint | Significado |
|:---:|:---|:---:|:---|
| **1** | Crítica | 1 | Imprescindible; sin ella el sistema no es viable (MVP). |
| **2** | Alta | 2 | Aporta el valor principal de exploración interactiva. |
| **3** | Media | 3 | Análisis de red; distingue la herramienta de un simple visor. |
| **4** | Baja | 4 | Utilidades y personalización; deseables, no críticas. |

---

## 2. Perfil de usuarios

El sistema está pensado para un **único rol de usuario final** (no hay administración ni
multiusuario en el alcance actual). Los perfiles a los que va dirigido son:

| Perfil | Descripción | Necesidad principal |
|:---|:---|:---|
| **Investigador en neurociencia** | Analiza connectomas y necesita explorar su topología. | Cargar sus matrices, filtrar e inspeccionar métricas. |
| **Estudiante / docente** | Usa la herramienta con fines didácticos o de aprendizaje. | Visualizar atlas de ejemplo de forma intuitiva y sin instalación. |
| **Usuario técnico general** | Curioso o evaluador sin conocimiento previo del dominio. | Interfaz autoexplicativa que funcione con datos precargados. |

Todos los perfiles comparten las mismas funcionalidades: no se requiere autenticación real para
operar (la pantalla de acceso es meramente presentacional en el alcance actual). Se asume que el
usuario dispone de un navegador moderno con soporte WebGL 2.0.

---

## 3. Requisitos funcionales

> Formato de cada requisito: identificador, prioridad (sprint), descripción, entradas/salidas,
> criterios de aceptación y requisitos relacionados.

### Prioridad 1 — Núcleo imprescindible (Sprint 1 · MVP)

#### [RF-01] Carga de red cerebral desde atlas precargado
- **Prioridad:** 1 (Crítica) · **Sprint 1**
- **Descripción:** Al iniciarse, el sistema carga automáticamente una red cerebral de ejemplo
  incluida en el servidor (atlas público AAL90), de modo que el usuario pueda empezar a
  visualizar sin necesidad de aportar ficheros propios.
- **Precondiciones:** Aplicación desplegada; dataset de ejemplo disponible en `backend/data/`.
- **Postcondiciones:** Red renderizada por defecto en la escena 3D al abrir la aplicación.
- **Criterios de aceptación:**
  - Al menos un dataset de ejemplo disponible (AAL90: 90 nodos).
  - La red se muestra sin intervención del usuario tras la carga inicial.
  - Se muestran sus metadatos básicos (nº de nodos, nº de aristas).
- **Relacionado con:** RF-02, RF-05, RI-01, RI-02.

#### [RF-02] Procesamiento de la red en el backend y exposición vía API
- **Prioridad:** 1 (Crítica) · **Sprint 1**
- **Descripción:** El backend parsea el fichero de nodos (`.node`) y la matriz de adyacencia
  (`.edge`), construye el grafo con una librería de análisis de grafos (NetworkX) y expone la red
  procesada a través de una API REST en formato JSON.
- **Entrada:** Ficheros `.node` [RI-01] y `.edge` [RI-02].
- **Salida:** JSON con `nodes` (id, label, x, y, z, group), `links` (source, target, value) y
  `meta` (total de nodos y aristas).
- **Criterios de aceptación:**
  - Endpoint `GET /api/brain-data` devuelve la red en JSON válido.
  - Endpoint `GET /health` para verificación de estado del servicio.
  - Validación de existencia y consistencia dimensional entre `.node` y `.edge` [RNF-02].
  - Construcción del grafo como no dirigido a partir de la matriz de adyacencia.
- **Relacionado con:** RF-01, RF-10, RI-01, RI-02, RNF-02.

#### [RF-03] Renderizado 3D de la red
- **Prioridad:** 1 (Crítica) · **Sprint 1**
- **Descripción:** El sistema renderiza los nodos como esferas situadas en sus coordenadas
  anatómicas (x, y, z) y las aristas como segmentos entre los nodos que conectan.
- **Precondiciones:** Red procesada y servida por el backend [RF-02]; WebGL activo.
- **Postcondiciones:** Escena 3D visible e interactiva en el navegador.
- **Criterios de aceptación:**
  - Cada nodo se posiciona según sus coordenadas reales.
  - Las aristas se dibujan entre los nodos origen y destino correctos.
  - Renderizado fluido acorde a [RNF-01].
- **Relacionado con:** RF-04, RF-09, RNF-01.

#### [RF-04] Navegación con cámara orbital
- **Prioridad:** 1 (Crítica) · **Sprint 1**
- **Descripción:** El usuario puede explorar la escena rotando (órbita), acercando/alejando (zoom)
  y desplazando (paneo) el modelo cerebral de forma libre y fluida.
- **Interacciones:** rotar = arrastrar con botón izquierdo; zoom = rueda/pinch; paneo = botón
  derecho o dos dedos.
- **Criterios de aceptación:**
  - Movimiento suave con amortiguación (*damping*).
  - Límites de zoom configurados (no atravesar ni perder el modelo).
  - Funciona con ratón, trackpad y gestos táctiles básicos.
- **Relacionado con:** RF-03, RNF-01, RNF-03.

#### [RF-05] Panel de estadísticas globales (HUD)
- **Prioridad:** 1 (Crítica) · **Sprint 1**
- **Descripción:** Un panel superpuesto (HUD) muestra en todo momento las estadísticas generales
  de la red activa.
- **Información mostrada:** nombre del dataset (si aplica), número total de nodos, número de
  aristas totales y visibles, número de grupos/lóbulos.
- **Criterios de aceptación:**
  - Panel visible de forma permanente sin obstruir la visualización.
  - Las cifras se actualizan al cambiar el umbral de filtrado [RF-06].
- **Relacionado con:** RF-06, RF-10.

### Prioridad 2 — Interacción y exploración (Sprint 2)

#### [RF-06] Filtrado dinámico de aristas por umbral de peso
- **Prioridad:** 2 (Alta) · **Sprint 2**
- **Descripción:** El usuario ajusta en tiempo real, mediante un control deslizante, el umbral
  mínimo de peso de las aristas visibles, reduciendo la saturación visual en redes densas.
- **Entrada:** valor de umbral (slider).
- **Postcondiciones:** solo las aristas con peso ≥ umbral se muestran; la escena se actualiza sin
  recargar la página.
- **Criterios de aceptación:**
  - Actualización reactiva e instantánea al mover el slider.
  - Contador "N de M aristas visibles" actualizado en vivo [RF-05].
  - Sin degradación perceptible del rendimiento [RNF-01].
  - El umbral deja de estar fijado en el backend y pasa a ser controlable por el usuario.
- **Relacionado con:** RF-05, RI-02, RNF-01.

#### [RF-07] Selección de nodo mediante clic
- **Prioridad:** 2 (Alta) · **Sprint 2**
- **Descripción:** El usuario selecciona un nodo haciendo clic sobre él; el sistema lo resalta
  visualmente respecto al resto de la red.
- **Entrada:** clic del ratón sobre una esfera 3D (detección por *raycasting*).
- **Postcondiciones:** nodo resaltado; información detallada disponible [RF-08].
- **Criterios de aceptación:**
  - Resaltado visual claro (mayor tamaño y/o cambio de color).
  - Solo un nodo seleccionado a la vez.
  - Clic en espacio vacío deselecciona.
- **Relacionado con:** RF-08, RF-13, RNF-03.

#### [RF-08] Panel de información del nodo seleccionado
- **Prioridad:** 2 (Alta) · **Sprint 2**
- **Descripción:** Al seleccionar un nodo, se muestra un panel con su información detallada.
- **Información mostrada:** ID, etiqueta anatómica, coordenadas (x, y, z), grado de conexión y
  grupo/lóbulo. Se ampliará con métricas de centralidad en [RF-11].
- **Criterios de aceptación:**
  - Información legible y estructurada; se actualiza al cambiar de nodo.
  - Panel con opción de cierre/deselección.
  - Muestra la **etiqueta real** del nodo (corrige el uso erróneo de `name` en lugar de `label`).
- **Relacionado con:** RF-07, RF-11.

#### [RF-09] Coloreado de nodos por grupo/lóbulo anatómico
- **Prioridad:** 2 (Alta) · **Sprint 2**
- **Descripción:** Los nodos se colorean según su grupo o lóbulo anatómico, con una leyenda que
  asocia cada color a su grupo.
- **Criterios de aceptación:**
  - Paleta consistente y distinguible entre grupos.
  - Leyenda visible que refleja los grupos presentes en la red activa.
- **Relacionado con:** RF-03, RF-12.

### Prioridad 3 — Análisis de red (Sprint 3)

#### [RF-10] Cálculo de métricas globales de la red en el backend
- **Prioridad:** 3 (Media) · **Sprint 3**
- **Descripción:** El backend calcula, mediante la librería de análisis de grafos, métricas
  globales de la red y las expone en la API para mostrarlas en la interfaz.
- **Métricas mínimas:** número de nodos y aristas, densidad, grado medio, coeficiente de
  clustering medio y número de componentes conexas.
- **Criterios de aceptación:**
  - Las métricas se calculan en el backend (no en el cliente) y se sirven vía API.
  - Se presentan en un panel de estadísticas de red en la interfaz.
  - El cálculo se realiza sobre la red completa cargada.
- **Relacionado con:** RF-02, RF-05, RF-11.

#### [RF-11] Métricas de centralidad por nodo
- **Prioridad:** 3 (Media) · **Sprint 3**
- **Descripción:** El backend calcula métricas de centralidad por nodo (grado, intermediación
  *betweenness* y cercanía *closeness*), que se muestran en el panel del nodo seleccionado.
- **Criterios de aceptación:**
  - Cada nodo dispone de sus valores de centralidad.
  - Se muestran al seleccionar el nodo, ampliando el panel de [RF-08].
  - El cálculo es eficiente para el tamaño de red objetivo [RNF-01].
- **Relacionado con:** RF-08, RF-10, RF-12.

#### [RF-12] Mapeo visual de métricas (tamaño/color por métrica)
- **Prioridad:** 3 (Media) · **Sprint 3**
- **Descripción:** El usuario puede elegir que el **tamaño** y/o el **color** de los nodos se
  determine en función de una métrica (p. ej. tamaño proporcional al grado, color según
  centralidad), además del coloreado por lóbulo de [RF-09].
- **Criterios de aceptación:**
  - Selector de esquema de coloreado/tamaño (por lóbulo, por grado, por centralidad).
  - Cambio de esquema actualiza la escena de forma inmediata.
  - Leyenda/escala coherente con el esquema activo.
- **Relacionado con:** RF-09, RF-11.

#### [RF-13] Búsqueda de nodo por etiqueta
- **Prioridad:** 3 (Media) · **Sprint 3**
- **Descripción:** El usuario busca un nodo por su etiqueta anatómica; el sistema lo resalta y
  centra la cámara sobre él.
- **Criterios de aceptación:**
  - Campo de búsqueda con coincidencias por etiqueta/ID.
  - Al elegir un resultado, el nodo se resalta [RF-07] y la cámara se centra en él.
- **Relacionado con:** RF-07, RF-04.

### Prioridad 4 — Utilidades y personalización (Sprint 4)

#### [RF-14] Carga de datasets personalizados del usuario
- **Prioridad:** 4 (Baja) · **Sprint 4**
- **Descripción:** El usuario puede cargar sus propios ficheros `.node` y `.edge` para visualizar
  redes distintas a las precargadas.
- **Criterios de aceptación:**
  - Carga simultánea de ambos ficheros (selección o *drag & drop*).
  - Validación de formato y de consistencia dimensional, con mensajes claros [RNF-02].
  - La red cargada sustituye a la anterior en la escena.
- **Relacionado con:** RF-01, RI-01, RI-02, RNF-02.

#### [RF-15] Gestión y selección de datasets precargados
- **Prioridad:** 4 (Baja) · **Sprint 4**
- **Descripción:** El sistema ofrece varios atlas/datasets de ejemplo entre los que el usuario
  puede elegir mediante un selector.
- **Criterios de aceptación:**
  - Lista de datasets precargados disponibles.
  - Cambiar de dataset limpia la visualización anterior y carga la nueva red.
- **Relacionado con:** RF-01, RF-14.

#### [RF-16] Ajustes de visualización
- **Prioridad:** 4 (Baja) · **Sprint 4**
- **Descripción:** El usuario personaliza aspectos visuales de la escena.
- **Ajustes:** tamaño de los nodos, opacidad de las aristas, mostrar/ocultar aristas, rotación
  automática, ejes de referencia y tema claro/oscuro.
- **Criterios de aceptación:**
  - Cada ajuste se refleja de inmediato en la escena.
  - Los ajustes no rompen la interacción ni el rendimiento.
- **Relacionado con:** RF-03, RF-09.

#### [RF-17] Restablecimiento de la vista y los parámetros
- **Prioridad:** 4 (Baja) · **Sprint 4**
- **Descripción:** El usuario restablece con un solo control la cámara y los parámetros de
  visualización a su estado inicial.
- **Criterios de aceptación:**
  - Restaura posición/orientación de cámara y ajustes por defecto.
- **Relacionado con:** RF-04, RF-16.

#### [RF-18] Exportación de la visualización y de las métricas
- **Prioridad:** 4 (Baja) · **Sprint 4**
- **Descripción:** El usuario exporta la vista actual como imagen y/o las métricas calculadas.
- **Criterios de aceptación:**
  - Captura del lienzo 3D descargada como PNG.
  - Métricas de red y por nodo exportables en CSV o JSON.
  - Descarga automática con nombre de fichero identificable (p. ej. con timestamp).
- **Relacionado con:** RF-10, RF-11.

---

## 4. Requisitos no funcionales

#### [RNF-01] Rendimiento gráfico fluido
- La aplicación mantiene una tasa de fotogramas estable manipulando el modelo 3D, apoyándose en
  la aceleración por hardware de WebGL.
- **Criterios:** ≥ 60 FPS con redes de hasta ~500 nodos; ≥ 30 FPS hasta ~1000 nodos; sin
  congelamiento de la interfaz durante la interacción.
- **Verificación:** *profiler* del navegador con datasets de tamaño variable.
- **Relacionado con:** RF-03, RF-04, RF-06.

#### [RNF-02] Gestión transparente de errores
- La aplicación informa al usuario de los errores de datos de forma clara (dimensiones
  incongruentes entre `.node` y `.edge`, formato incorrecto, ficheros vacíos o corruptos,
  codificación inválida).
- **Criterios:** mensajes descriptivos y sin jerga; indicación de qué fichero falla y por qué;
  sin caídas ni pantallas en blanco; posibilidad de reintentar.
- **Relacionado con:** RF-02, RF-14, RI-01, RI-02.

#### [RNF-03] Interfaz intuitiva y autoexplicativa
- La interfaz permite operar sin manual externo: controles reconocibles, *feedback* visual
  inmediato y jerarquía visual clara.
- **Verificación:** prueba con usuario sin conocimiento previo; tarea básica completada en < 2 min.
- **Relacionado con:** RF-04, RF-06, RF-07.

#### [RNF-04] Portabilidad y despliegue reproducible
- El sistema se empaqueta en contenedores y se levanta con un único comando, garantizando la
  reproducibilidad del entorno con independencia del sistema operativo anfitrión.
- **Criterios:** `docker compose up --build` levanta backend y frontend sin pasos manuales
  adicionales; los servicios se comunican dentro de la red de contenedores.
- **Relacionado con:** RF-02, objetivo de despliegue del TFG.

#### [RNF-05] Compatibilidad de navegador
- La aplicación funciona en navegadores modernos con soporte WebGL 2.0 (Chrome, Firefox, Edge).
- **Verificación:** pruebas manuales en al menos tres navegadores.

---

## 5. Requisitos de información

#### [RI-01] Fichero de nodos (`.node`)
- Texto plano, codificación UTF-8 [RI-05], sin cabecera, una fila por nodo.
- **Estructura de columnas** (convención BrainNet Viewer): `x  y  z  color_id  size  label`.
  - Obligatorias: `x`, `y`, `z` (coordenadas, numéricas).
  - Opcionales: `color_id`/`group` (entero, grupo/lóbulo), `size` (numérico), `label` (texto sin
    espacios).
  - Separador: uno o más espacios o tabuladores.
- **Ejemplo:**
  ```
  -45.3  12.8  50.1  1  1.0  Frontal_Sup_L
   48.2  15.4  48.9  1  1.0  Frontal_Sup_R
  -32.1 -65.4 -15.2  2  1.0  Occipital_Mid_L
  ```
- **Relacionado con:** RF-02, RF-08.

#### [RI-02] Fichero de aristas / matriz de adyacencia (`.edge`)
- Texto plano, UTF-8 [RI-05], sin cabecera. Matriz cuadrada N×N (N = nº de nodos de [RI-01]).
- **Semántica de los valores:** peso de la conexión entre dos nodos; **0 = sin conexión**. Los
  pesos son valores numéricos (correlaciones, conteos de fibras, etc.); **no se asume que estén
  normalizados a [0, 1]** — la aplicación puede normalizarlos internamente para el umbral de
  filtrado.
- **Validaciones esperadas:** nº de filas = nº de columnas = nº de nodos; matriz simétrica para
  grafos no dirigidos; diagonal a 0 (sin auto-conexiones).
- **Ejemplo (3×3):**
  ```
  0.00  0.75  0.12
  0.75  0.00  0.43
  0.12  0.43  0.00
  ```
- **Relacionado con:** RF-02, RF-06, RNF-02.

#### [RI-05] Codificación de caracteres
- Todos los ficheros de entrada se interpretan en **UTF-8**, permitiendo caracteres
  internacionales en las etiquetas y evitando problemas de compatibilidad entre sistemas.
- **Relacionado con:** RI-01, RI-02.

#### [RI-06] Gestión de datos en memoria (sin persistencia)
- Los datos cargados se mantienen en memoria únicamente durante la sesión; no se almacenan de
  forma persistente en servidor ni en base de datos. Al recargar la página, los datos se pierden.
- Solo se permite `localStorage` para preferencias de interfaz.
- **Justificación:** simplicidad arquitectónica (MVP sin BBDD) y privacidad por defecto.
- **Relacionado con:** RF-01, RF-14.

---

## 6. Casos de uso

> Esta sección se desarrollará con diagramas UML (diagrama de casos de uso) y las descripciones
> detalladas de cada caso para la memoria (capítulo *Requisitos del Software*). Se resumen aquí
> los casos de uso principales derivados de los requisitos funcionales. Al existir un único rol de
> usuario, todos los casos de uso los ejecuta el actor **Usuario**.

| CU | Nombre | RF asociados |
|:---:|:---|:---|
| CU-01 | Visualizar red precargada | RF-01, RF-02, RF-03 |
| CU-02 | Navegar por la escena 3D | RF-04, RF-17 |
| CU-03 | Filtrar aristas por umbral | RF-06 |
| CU-04 | Seleccionar e inspeccionar un nodo | RF-07, RF-08, RF-11 |
| CU-05 | Consultar métricas de la red | RF-10 |
| CU-06 | Cambiar el esquema de coloreado/tamaño | RF-09, RF-12 |
| CU-07 | Buscar un nodo | RF-13 |
| CU-08 | Cargar un dataset propio | RF-14, RF-15 |
| CU-09 | Personalizar la visualización | RF-16 |
| CU-10 | Exportar imagen o métricas | RF-18 |

*(Pendiente: diagrama de casos de uso y fichas detalladas por caso —actor, precondición, flujo
principal, flujos alternativos, postcondición— para la memoria.)*

---

## 7. Matriz de trazabilidad

### 7.1. Objetivos del TFG → requisitos

| Objetivo del TFG | Requisitos funcionales | RNF | RI |
|:---|:---|:---|:---|
| Visualización 3D interactiva (frontend) | RF-03, RF-04, RF-09, RF-12, RF-16 | RNF-01, RNF-03 | RI-01, RI-02 |
| Carga de redes desde datos públicos | RF-01, RF-02, RF-14, RF-15 | RNF-02 | RI-01, RI-02, RI-05, RI-06 |
| Exploración e inspección | RF-05, RF-06, RF-07, RF-08, RF-13 | RNF-03 | RI-06 |
| **Análisis básico de red (backend)** | RF-10, RF-11, RF-12 | RNF-01 | RI-02 |
| Exportación de resultados | RF-18 | — | — |
| Despliegue con contenedores | RF-02 | RNF-04 | — |

### 7.2. Asignación por sprint (orden de prioridad)

| Sprint | Prioridad | Requisitos funcionales |
|:---:|:---:|:---|
| 1 (MVP) | 1 | RF-01, RF-02, RF-03, RF-04, RF-05 |
| 2 | 2 | RF-06, RF-07, RF-08, RF-09 |
| 3 | 3 | RF-10, RF-11, RF-12, RF-13 |
| 4 | 4 | RF-14, RF-15, RF-16, RF-17, RF-18 |

---

## 8. Criterios de validación

### 8.1. Validación por sprint

| Sprint | Requisitos a validar | Pruebas |
|:---:|:---|:---|
| 1 | RF-01…RF-05 | Carga de AAL90; render 3D correcto; navegación fluida [RNF-01]; HUD con cifras. |
| 2 | RF-06…RF-09 | El slider filtra aristas y el contador se actualiza; clic selecciona y muestra info; coloreo + leyenda. |
| 3 | RF-10…RF-13 | Métricas globales y por nodo correctas (contraste manual con NetworkX); mapeo visual; búsqueda centra la cámara. |
| 4 | RF-14…RF-18 | Subida y validación de ficheros; cambio de dataset; ajustes visuales; reset; exportación PNG/CSV. |

### 8.2. Criterios de aceptación global
El TFG se considerará correctamente resuelto en su alcance cuando:
1. Los requisitos de **Prioridad 1** estén completamente operativos (MVP).
2. Los requisitos no funcionales estén validados técnicamente [RNF-01…RNF-05].
3. El formato de datos [RI-01, RI-02] esté implementado y validado con al menos dos datasets.
4. El sistema sea reproducible: otra persona pueda ejecutar `docker compose up --build` y usarlo.
5. La documentación (memoria, manual de usuario, manual de despliegue) esté completa.

---

**Nota de revisión (v2.0):** frente a la v1.0 se han corregido incoherencias de prioridad, se ha
eliminado terminología heredada de otras plantillas, se ha añadido el bloque de **análisis de red
en el backend** (RF-10, RF-11, RF-12) —objetivo central del TFG— junto con la búsqueda de nodos
(RF-13), se ha reorganizado la priorización en 4 sprints y se ha corregido la semántica de los
pesos de la matriz de adyacencia [RI-02].
