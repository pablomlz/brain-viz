# Especificación de Requisitos Funcionales
## Aplicación Web para Visualización 3D de Redes Cerebrales

**Proyecto:** Brain Viz Connectome  
**Autor:** Pablo Moliz Arias  
**Tipo:** Trabajo Fin de Grado - Ingeniería Informática  
**Fecha:** Enero 2026  
**Versión:** 1.0

---

## Índice
1. [Introducción](#1-introducción)
2. [Alcance del Sistema](#2-alcance-del-sistema)
3. [Requisitos Funcionales](#3-requisitos-funcionales)
4. [Matriz de Trazabilidad](#4-matriz-de-trazabilidad)
5. [Criterios de Validación](#5-criterios-de-validación)

---

## 1. Introducción

### 1.1. Propósito
Este documento define los requisitos funcionales de Brain Viz Connectome, una aplicación web para la visualización interactiva y análisis de redes de conectividad cerebral (connectomas) en tres dimensiones. El sistema está orientado a investigadores en neurociencia que necesitan explorar y comprender la topología de redes neuronales representadas como grafos espaciales.

### 1.2. Contexto
Las redes cerebrales se modelan como grafos donde:
- **Nodos** representan regiones anatómicas (ROIs) con coordenadas 3D en espacio MNI
- **Aristas** representan conexiones funcionales o estructurales (matriz de adyacencia ponderada)

Los datos provienen de bases públicas de neuroimagen (Human Connectome Project, AAL, Desikan-Killiany, etc.)

### 1.3. Usuarios objetivo
- Investigadores en neurociencia computacional
- Estudiantes de máster/doctorado en neuroimagen
- Clínicos interesados en análisis de conectividad

### 1.4. Convenciones
- **Prioridad Alta (P1)**: Funcionalidad esencial para MVP, sin ella el sistema no es viable
- **Prioridad Media (P2)**: Funcionalidad importante que aporta valor significativo
- **Prioridad Baja (P3)**: Funcionalidad deseable, mejora la experiencia pero no es crítica

---

## 2. Alcance del Sistema

### 2.1. Objetivos del sistema
1. Cargar y validar datasets de conectomas desde ficheros estándar
2. Renderizar redes cerebrales en espacio 3D interactivo vía WebGL
3. Facilitar exploración visual mediante controles de navegación y filtrado
4. Calcular métricas básicas de teoría de grafos sobre las redes cargadas
5. Permitir exportación de visualizaciones y datos procesados

### 2.2. Límites del sistema
**Incluye:**
- Visualización de grafos con hasta 1000 nodos
- Métricas locales (grado, clustering) y globales (componentes, densidad)
- Detección básica de comunidades
- Interfaz web responsiva (desktop/tablet)

**No incluye:**
- Procesamiento de imágenes de resonancia magnética (fMRI/DTI)
- Construcción de matrices de conectividad desde señales raw
- Análisis estadístico inferencial (requiere R/Python notebooks externos)
- Edición colaborativa en tiempo real

---

## 3. Requisitos del Sistema

### 3.1. Requisitos Funcionales

#### **[RF 1] Inicio del sistema con datasets precargados**
- **Prioridad:** P1 (Alta)
- **Descripción:** El usuario podrá iniciar el sistema y comenzar a usar la aplicación de manera funcional visualizando redes cerebrales de prueba precargadas.
- **Precondiciones:** 
  - Aplicación desplegada y accesible
  - Datasets de ejemplo disponibles en servidor
- **Postcondiciones:** 
  - Usuario accede a interfaz con visualización 3D funcional
  - Red de prueba renderizada por defecto
- **Relacionado con:** [RI 1], [RI 2], [RNF 3]

#### **[RF 1.1] Selección de dataset precargado**
- **Descripción:** El usuario podrá seleccionar un conjunto de datos (dataset) de prueba precargado en el sistema (ej. Atlas AAL90) para iniciar la visualización 3D sin necesidad de subir archivos locales.
- **Criterios de aceptación:**
  - Mínimo un dataset de ejemplo disponible (AAL90)
  - Selector visible en interfaz (dropdown o botones)
  - Cambio de dataset limpia visualización anterior
  - Metadatos mostrados: nombre, número de nodos, fuente

#### **[RF 2] Carga y visualización de redes cerebrales personalizadas**
- **Prioridad:** P1 (Alta)
- **Descripción:** El usuario será capaz tanto de cargar sus propias redes cerebrales mediante la selección simultánea de dos ficheros de texto locales compatibles [RI 1] [RI 2] como también de visualizar la red cerebral renderizada en un espacio tridimensional de forma interactiva.
- **Entrada:** 
  - Fichero `.node` conforme a [RI 1] y [RI 1.1]
  - Fichero `.edge` conforme a [RI 2] y [RI 2.1]
- **Precondiciones:**
  - Ficheros cumplen formato especificado
  - Codificación UTF-8 [RI 3]
  - Dimensiones consistentes entre ambos ficheros
- **Postcondiciones:**
  - Grafo procesado en backend
  - Nodos renderizados como esferas 3D en coordenadas (x, y, z)
  - Aristas renderizadas como líneas entre nodos
- **Criterios de aceptación:**
  - Carga simultánea de ambos ficheros
  - Validación de integridad [RNF 2]
  - Tiempo de carga < 2 segundos para grafos de 500 nodos
  - Renderizado a 60 FPS [RNF 1]
- **Relacionado con:** [RI 1], [RI 2], [RI 3], [RI 4], [RNF 1], [RNF 2]

#### **[RF 3] Controles de cámara 3D**
- **Prioridad:** P1 (Alta)
- **Descripción:** El usuario podrá interactuar espacialmente con la visualización 3D a través de controles de cámara. A su vez, podrá rotar (orbitar), hacer zoom y desplazar panorámicamente el modelo cerebral de manera libre.
- **Interacciones requeridas:**
  - **Rotación (órbita):** Click izquierdo + arrastrar
  - **Zoom:** Rueda del ratón o gesto pinch (tablet)
  - **Pan (desplazamiento panorámico):** Click derecho + arrastrar o dos dedos (tablet)
- **Precondiciones:**
  - Escena 3D renderizada
  - WebGL activo [RNF 1]
- **Postcondiciones:**
  - Cámara actualizada en tiempo real
  - Navegación fluida sin lag
- **Criterios de aceptación:**
  - Implementación con `OrbitControls` de Three.js
  - Movimiento suave con damping
  - Límites de zoom configurados (no penetrar ni alejarse infinitamente)
  - Funciona con mouse, trackpad y gestos táctiles básicos
- **Relacionado con:** [RNF 1], [RNF 3]

#### **[RF 4] Filtrado dinámico de conexiones por umbral**
- **Prioridad:** P1 (Alta)
- **Descripción:** El usuario podrá filtrar las conexiones visibles en tiempo real y editar el umbral de las ya existentes a través de un control deslizante. Estas conexiones quedarán actualizadas en el lienzo 3D instantáneamente.
- **Entrada:** 
  - Valor de umbral ajustado mediante slider (rango 0.0 a 1.0)
- **Precondiciones:**
  - Dataset cargado con pesos de aristas
- **Postcondiciones:**
  - Solo aristas con peso ≥ umbral son visibles
  - Visualización actualizada sin recarga de página
- **Criterios de aceptación:**
  - Control deslizante accesible en interfaz
  - Actualización reactiva e instantánea
  - Contador "N de M aristas visibles" actualizado en vivo
  - Sin degradación de rendimiento al ajustar [RNF 1]
- **Relacionado con:** [RF 4.1], [RF 7], [RNF 1]

#### **[RF 4.1] Ocultación automática de aristas por peso**
- **Descripción:** El usuario podrá ocultar automáticamente aquellas aristas cuyo peso sea inferior al valor seleccionado, reduciendo la oclusión visual de la red.
- **Criterios de aceptación:**
  - Aristas filtradas tienen `opacity = 0` o no se renderizan
  - Reducción visual de saturación en redes densas
  - Cálculo eficiente en backend o frontend según estrategia

#### **[RF 5] Consulta de información detallada de nodos**
- **Prioridad:** P2 (Media)
- **Descripción:** El usuario podrá consultar el progreso y la información detallada de los nodos de la red. Esto incluye las coordenadas anatómicas de los nodos, su etiqueta y su grado de conexión.
- **Información mostrada:**
  - ID del nodo
  - Etiqueta (label) [RI 1]
  - Coordenadas anatómicas (x, y, z) [RI 1.1]
  - Grado de conexión (número de aristas conectadas)
  - Grupo o lóbulo anatómico (si disponible)
- **Precondiciones:**
  - Nodo seleccionado por el usuario [RF 6]
- **Postcondiciones:**
  - Panel de información visible en interfaz
- **Criterios de aceptación:**
  - Información legible y bien estructurada
  - Actualización instantánea al cambiar de nodo
  - Panel modal o lateral con opción de cierre
- **Relacionado con:** [RF 6], [RF 7], [RI 1]

#### **[RF 6] Selección de nodos mediante click**
- **Prioridad:** P2 (Media)
- **Descripción:** El usuario podrá seleccionar el nodo que quiera inspeccionar haciendo clic sobre él en el entorno 3D. El sistema es el encargado de realizar ese resaltado visual frente al resto de la red.
- **Entrada:**
  - Click del ratón sobre esfera 3D
- **Precondiciones:**
  - Escena renderizada
  - Controles de cámara activos
- **Postcondiciones:**
  - Nodo seleccionado visualmente resaltado
  - Estado de selección almacenado en memoria [RI 4]
  - Panel de información activado [RF 5]
- **Criterios de aceptación:**
  - Detección mediante `Raycaster` de Three.js
  - Resaltado visual: aumento de tamaño (x1.5) y/o cambio de color
  - Solo un nodo seleccionado simultáneamente
  - Click en espacio vacío deselecciona
- **Relacionado con:** [RF 5], [RI 4], [RNF 3]

#### **[RF 7] Panel de estadísticas globales**
- **Prioridad:** P1 (Alta)
- **Descripción:** El usuario dispondrá de un panel de información global donde podrá consultar en tiempo real las estadísticas generales de la red cargada. Estas métricas incluyen el número de nodos procesados y el total de aristas visibles tras aplicar el umbral.
- **Información mostrada:**
  - Nombre del dataset (si disponible)
  - Número total de nodos
  - Número de aristas visibles / totales
  - Umbral actual aplicado
- **Precondiciones:**
  - Dataset cargado y procesado
- **Postcondiciones:**
  - Panel visible permanentemente (HUD)
  - Métricas actualizadas al cambiar umbral [RF 4]
- **Criterios de aceptación:**
  - Posicionado en esquina de interfaz (no obstruye visualización)
  - Estilo coherente con diseño general
  - Actualización en tiempo real de métricas
- **Relacionado con:** [RF 4], [RI 1], [RI 2]

#### **[RF 8] Exportación de visualización como imagen**
- **Prioridad:** P3 (Baja)
- **Descripción:** El usuario podrá exportar la visualización actual de la red cerebral. El sistema generará una captura de imagen del lienzo 3D que se descargará automáticamente en el equipo.
- **Entrada:**
  - Click en botón "Exportar" o "Capturar Vista"
- **Precondiciones:**
  - Escena renderizada en canvas WebGL
- **Postcondiciones:**
  - Imagen PNG descargada en equipo del usuario
  - Nombre de fichero con timestamp
- **Criterios de aceptación:**
  - Captura en resolución actual del canvas
  - Formato PNG con compresión
  - Descarga automática sin intervención adicional
  - Fondo configurable (transparente u opaco)

---

### 3.2. Requisitos No Funcionales

#### **[RNF 1] Rendimiento gráfico fluido**
- **Descripción:** La aplicación deberá garantizar un rendimiento gráfico fluido en la renderización de los datos, de forma que el usuario pueda manipular el modelo 3D manteniendo una tasa de fotogramas estable gracias a la aceleración por hardware de WebGL.
- **Criterios de aceptación:**
  - Renderizado a ≥ 60 FPS con grafos de hasta 500 nodos
  - Renderizado a ≥ 30 FPS con grafos de hasta 1000 nodos
  - Uso de aceleración por hardware WebGL 2.0
  - Geometrías optimizadas (LOD, instancing si aplica)
  - Sin congelamiento de interfaz durante interacción
- **Método de verificación:** 
  - Profiler de navegador (Chrome DevTools Performance)
  - Pruebas con datasets de tamaños variable
- **Relacionado con:** [RF 2], [RF 3], [RF 4]

#### **[RNF 2] Gestión transparente de errores**
- **Descripción:** La aplicación deberá avisar al usuario cuando surja algún tipo de error que no dependa de él, como la incompatibilidad en las dimensiones de los ficheros introducidos [RI 1] [RI 2], siendo lo más transparente posible en cada caso.
- **Errores cubiertos:**
  - Dimensiones incongruentes entre `.node` y `.edge`
  - Formato de fichero incorrecto
  - Caracteres no válidos o codificación incorrecta
  - Ficheros vacíos o corruptos
  - Valores numéricos fuera de rango esperado
- **Criterios de aceptación:**
  - Mensajes de error descriptivos y específicos
  - Sin terminología técnica incomprensible para usuario final
  - Indicación de qué fichero falla y por qué
  - Sin crashes o pantallas en blanco
  - Opción de reintentar carga
- **Relacionado con:** [RF 2], [RI 1], [RI 2], [RI 3]

#### **[RNF 3] Interfaz intuitiva y autoexplicativa**
- **Descripción:** La interfaz de navegación deberá ser suficientemente intuitiva para que cada usuario sepa en cada momento cómo interactuar con el modelo 3D y lo que está visualizando de forma que no sea precisa una fuente de información externa.
- **Criterios de aceptación:**
  - Controles visualmente reconocibles (iconografía estándar)
  - Tooltips o labels explicativos en controles principales
  - Feedback visual inmediato a las acciones del usuario
  - Jerarquía visual clara (HUD, paneles, controles)
  - Navegación sin necesidad de manual o tutorial
- **Método de verificación:**
  - Test de usuario con persona sin conocimiento previo
  - Tiempo promedio para realizar tarea básica < 2 minutos
- **Relacionado con:** [RF 3], [RF 4], [RF 6], [RF 7]

---

### 3.3. Requisitos de Información

#### **[RI 1] Formato de fichero de nodos**
- **Descripción:** El documento para introducir la topología de los nodos de la red debe tener una extensión de texto plano compatible (`.node`).
- **Especificaciones:**
  - Extensión: `.node`
  - Formato: texto plano ASCII
  - Codificación: UTF-8 [RI 3]
  - Sin cabecera (no headers)
- **Relacionado con:** [RF 2], [RI 1.1], [RI 3]

#### **[RI 1.1] Estructura de columnas del fichero de nodos**
- **Descripción:** El formato del documento debe ser en columnas separadas por espacios, siendo las tres primeras columnas las coordenadas espaciales X, Y, Z de cada nodo. El orden de las demás columnas dependerá de los atributos del nodo.
- **Estructura mínima requerida:**
  ```
  <x> <y> <z> [color_id] [size] [label]
  ```
- **Especificaciones:**
  - **Columnas obligatorias:** `x`, `y`, `z` (coordenadas espaciales, valores numéricos)
  - **Columnas opcionales:** 
    - `color_id` o `group` (identificador de grupo/lóbulo, entero)
    - `size` (tamaño de nodo, numérico)
    - `label` (etiqueta textual, string sin espacios o entrecomillado)
  - Separador: uno o más espacios o tabs (`\s+`)
  - Una fila por nodo
- **Ejemplo:**
  ```
  -45.3 12.8 50.1 1 1.0 Frontal_Sup_L
  48.2 15.4 48.9 1 1.0 Frontal_Sup_R
  -32.1 -65.4 -15.2 2 1.0 Occipital_Mid_L
  ```
- **Relacionado con:** [RI 1], [RF 2], [RF 5]

#### **[RI 2] Formato de fichero de aristas**
- **Descripción:** El documento para introducir las conexiones de la red debe tener una extensión de texto plano compatible (`.edge`).
- **Especificaciones:**
  - Extensión: `.edge`
  - Formato: texto plano ASCII
  - Codificación: UTF-8 [RI 3]
  - Sin cabecera
- **Relacionado con:** [RF 2], [RI 2.1], [RI 3]

#### **[RI 2.1] Estructura de matriz de adyacencia**
- **Descripción:** Este documento contendrá una matriz de adyacencia cuadrada. Los valores numéricos representarán el peso o la existencia de la conexión entre los nodos.
- **Especificaciones:**
  - Matriz cuadrada N×N (N = número de nodos en [RI 1])
  - Valores numéricos: pesos de conexión en rango [0, 1]
    - `0` = sin conexión
    - Valores > 0 = fuerza/peso de la conexión
  - Separador: uno o más espacios o tabs
  - Para grafos no dirigidos: matriz simétrica (elemento `[i,j]` = elemento `[j,i]`)
  - Una fila por nodo origen, columnas representan nodos destino
- **Ejemplo (matriz 3×3):**
  ```
  0.0 0.75 0.12
  0.75 0.0 0.43
  0.12 0.43 0.0
  ```
- **Validaciones esperadas:**
  - Dimensiones: número de filas = número de columnas = número de nodos
  - Diagonal principal con valores 0 (sin auto-conexiones)
  - Valores en rango válido [0, 1]
- **Relacionado con:** [RI 2], [RF 2], [RF 4], [RNF 2]

#### **[RI 3] Codificación de caracteres**
- **Descripción:** Cualquier dato introducido a través de los ficheros locales dentro de la aplicación deberá ser recogido en formato de codificación estándar UTF-8.
- **Especificaciones:**
  - Encoding: UTF-8
  - Permite caracteres internacionales en labels (ñ, á, ü, etc.)
  - Evita problemas de compatibilidad entre sistemas operativos
- **Relacionado con:** [RI 1], [RI 2], [RNF 2]

#### **[RI 4] Gestión de datos en memoria**
- **Descripción:** La aplicación procesará de forma consistente los datos de cada entidad que interactúe con el sistema, manteniéndolos en memoria únicamente durante su ejecución y sin almacenarlos de forma persistente.
- **Especificaciones:**
  - Datos cargados permanecen en memoria (RAM) durante la sesión
  - Sin almacenamiento persistente en disco o base de datos (excepto localStorage para preferencias de UI)
  - Al cerrar/recargar página, datos se pierden
  - Sin logs o caché de datos sensibles del usuario
  - Cumplimiento básico de privacidad: datos no persisten en servidor
- **Justificación:**
  - Simplicidad arquitectónica (MVP sin BBDD)
  - Privacidad por defecto (no tracking)
  - Adecuado para datasets públicos y de prueba
- **Relacionado con:** [RF 1], [RF 2], [RF 6]

---

## 4. Matriz de Trazabilidad

### 4.1. Correspondencia entre objetivos del TFG y requisitos

| Objetivo del TFG | Requisitos Funcionales | Requisitos No Funcionales | Requisitos de Información |
|------------------|----------------------|---------------------------|---------------------------|
| **Visualización 3D básica** | [RF 2], [RF 3], [RF 7] | [RNF 1], [RNF 3] | [RI 1], [RI 1.1], [RI 2], [RI 2.1] |
| **Carga de datos** | [RF 1], [RF 1.1], [RF 2] | [RNF 2] | [RI 1], [RI 2], [RI 3], [RI 4] |
| **Interacción con grafo** | [RF 5], [RF 6] | [RNF 3] | [RI 4] |
| **Filtrado dinámico** | [RF 4], [RF 4.1] | [RNF 1] | [RI 2.1] |
| **Análisis básico** | [RF 7] | - | [RI 1.1], [RI 2.1] |
| **Exportación** | [RF 8] | - | - |

### 4.2. Dependencias entre requisitos

```
[RI 1] + [RI 2] ──> [RF 2] ──┬──> [RF 3] (controles cámara)
                              ├──> [RF 7] (estadísticas)
                              └──> [RF 4] (filtrado)

[RF 2] ──> [RF 6] (selección) ──> [RF 5] (info detallada)

[RF 4] ──> [RF 4.1] (ocultación aristas)
       └──> [RF 7] (actualización métricas)

[RF 1] ──> [RF 1.1] (selección dataset precargado)
```

### 4.3. Priorización por nivel de implementación

| Nivel | Requisitos Incluidos | Justificación |
|-------|---------------------|---------------|
| **MVP (Mínimo Viable)** | [RF 1], [RF 1.1], [RF 2], [RF 3], [RF 7], [RNF 1], [RNF 2], [RNF 3], todos los [RI] | Funcionalidad básica operativa: cargar y visualizar red con controles |
| **Extensión 1** | [RF 4], [RF 4.1], [RF 6], [RF 5] | Interacción avanzada: filtrado y selección de nodos |
| **Extensión 2** | [RF 8] | Exportación de resultados |

---

## 5. Criterios de Validación del TFG

### 5.1. Criterios de Éxito por Calificación

#### **Nivel Aprobado (5.0 - 6.9)**
**Requisitos mínimos implementados:**
- [RF 1], [RF 1.1], [RF 2], [RF 3], [RF 7]
- [RNF 1], [RNF 2], [RNF 3]
- [RI 1], [RI 1.1], [RI 2], [RI 2.1], [RI 3], [RI 4]

**Evidencias requeridas:**
- Demo funcional con dataset AAL90 precargado
- Navegación 3D operativa (rotar, zoom, pan)
- Panel HUD con estadísticas visibles
- Documentación técnica básica (README + este documento de requisitos)
- Código fuente con comentarios mínimos

#### **Nivel Notable (7.0 - 8.9)**
**Requisitos implementados (además de los del nivel anterior):**
- [RF 4], [RF 4.1], [RF 6], [RF 5]

**Evidencias adicionales:**
- Filtrado dinámico funcional con slider
- Selección de nodos con panel de información
- Tests unitarios básicos (>30% cobertura)
- Despliegue en entorno accesible públicamente (Docker Compose funcional)
- Documentación de usuario (cómo usar la aplicación)
- Memoria técnica completa con justificación de decisiones

#### **Nivel Sobresaliente (9.0 - 10)**
**Requisitos implementados (todos los anteriores más):**
- [RF 8] (exportación de visualización)

**Evidencias adicionales:**
- Tests E2E o de integración
- Optimizaciones de rendimiento documentadas
- Análisis de complejidad temporal/espacial
- Comparativa con herramientas existentes (ej. BrainNet Viewer, Gephi)
- Contribución abierta: repositorio GitHub público con CI/CD
- Documentación de desarrollador (cómo extender el proyecto)
- Presentación/demo pulida con casos de uso reales

### 5.2. Método de Validación Técnica

| Aspecto | Criterio de Validación | Método de Verificación |
|---------|------------------------|------------------------|
| **Funcionalidad** | Todos los RF del nivel implementados correctamente | Checklist manual + tests automatizados |
| **Rendimiento** | 60 FPS con 500 nodos [RNF 1] | Chrome DevTools Performance Profiler |
| **Usabilidad** | Navegación sin manual [RNF 3] | Test con usuario no familiarizado (5 tareas básicas < 5 min) |
| **Manejo de errores** | Mensajes claros y recuperación [RNF 2] | Pruebas con ficheros inválidos (10 casos de error) |
| **Calidad de código** | ESLint/Pylint sin errores, >30% cobertura | Pipeline CI/CD |
| **Compatibilidad** | Funciona en Chrome, Firefox, Edge | Tests manuales en 3 navegadores |
| **Documentación** | README completo + este documento + memoria | Revisión por tutor/tribunal |
| **Despliegue** | `docker compose up` funciona sin intervención | Prueba en máquina limpia |

### 5.3. Plan de Validación por Sprint

| Sprint | Requisitos a Validar | Pruebas de Validación |
|--------|---------------------|----------------------|
| **Sprint 1 (MVP)** | [RF 1], [RF 1.1], [RF 2], [RF 3], [RF 7] | - Carga AAL90 correctamente<br>- Navegación fluida<br>- HUD muestra métricas<br>- Tests de rendimiento [RNF 1] |
| **Sprint 2** | [RF 4], [RF 4.1] | - Slider ajusta umbral<br>- Aristas se ocultan dinámicamente<br>- Contador actualizado |
| **Sprint 3** | [RF 5], [RF 6] | - Click selecciona nodo<br>- Panel muestra info correcta<br>- Resaltado visual funciona |
| **Sprint 4** | [RF 8] | - PNG se descarga<br>- Resolución adecuada |

### 5.4. Criterios de Aceptación Global

El TFG se considerará **exitoso** si cumple:

1. ✅ **Requisitos funcionales MVP** completamente operativos
2. ✅ **Requisitos no funcionales** validados técnicamente
3. ✅ **Formato de datos** [RI 1-4] correctamente implementado y validado con 2+ datasets
4. ✅ **Documentación completa**: memoria, manual de usuario, README técnico
5. ✅ **Demo funcional** presentable en defensa del TFG
6. ✅ **Código reproducible**: otra persona puede ejecutar `docker compose up --build` y usar la aplicación

---

**Fecha de aprobación:** Enero 2026  
**Revisión:** Versión 1.0  
**Próxima revisión:** Al finalizar implementación Sprint 1
