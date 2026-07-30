# Brain Viz — Visualización 3D interactiva de redes cerebrales

Aplicación web para visualizar y explorar redes de conectividad cerebral (*connectomas*)
en tres dimensiones, directamente desde el navegador y sin instalar nada.

**Aplicación desplegada:** https://brain-viz.onrender.com/

> Trabajo Fin de Grado — Ingeniería Informática, Universidad de Granada.
> Autor: Pablo Moliz Arias · Tutor: Juan Ruíz de Miras.
> La memoria del proyecto se encuentra en [`doc/`](doc/) (fuente LaTeX y PDF compilado).

---

## Qué hace

Una red cerebral se modela como un grafo: los **nodos** son regiones anatómicas con
coordenadas espaciales y las **aristas** son las conexiones entre ellas, con un peso
asociado. La aplicación carga esas redes a partir de matrices de adyacencia procedentes
de bases de datos públicas de neuroimagen, las procesa en el servidor y permite
explorarlas de forma interactiva.

Funcionalidades disponibles actualmente:

- Visualización 3D de la red, con los nodos situados en sus coordenadas anatómicas.
- Navegación con cámara orbital: rotar, zoom y desplazamiento.
- Panel de estadísticas globales (nodos, conexiones y grupos).
- Filtrado de conexiones en tiempo real mediante un umbral de peso.
- Selección de un nodo con el ratón e inspección de sus datos (etiqueta, identificador,
  grupo, grado y coordenadas).
- Coloreado de nodos por grupo o lóbulo anatómico, con su leyenda.

## Arquitectura

Sigue un modelo cliente-servidor desacoplado:

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| **Backend** | Python · Flask · NetworkX | Procesa los ficheros de la red, construye el grafo y lo expone mediante una API |
| **Frontend** | React · Three.js (react-three-fiber) | Visualización 3D interactiva en el navegador |
| **Infraestructura** | Docker · Docker Compose | Entorno reproducible en desarrollo y despliegue |

### API

| Endpoint | Descripción |
|---|---|
| `GET /health` | Verificación del estado del servicio |
| `GET /api/brain-data` | Devuelve la red procesada en JSON: `nodes`, `links` y `meta` |

Ambos endpoints devuelven una página HTML legible si se accede a ellos desde el navegador
(o añadiendo `?format=html`).

## Formato de los datos

Se adopta la convención de *BrainNet Viewer*, con dos ficheros de texto plano:

- **`.node`** — una fila por nodo: `x  y  z  color_id  size  label`
- **`.edge`** — matriz de adyacencia cuadrada *N×N* con los pesos de las conexiones
  (`0` indica ausencia de conexión)

La red de ejemplo incluida es el atlas **AAL90** (90 regiones), en `backend/data/`.

---

## Ejecución en local (desarrollo)

Requisitos: **Docker** y **Docker Compose**.

```bash
docker compose up --build
```

Los servicios se publican en puertos del anfitrión **asignados automáticamente**, para
evitar conflictos con otros procesos. Para conocerlos:

```bash
docker compose ps
```

La interfaz estará disponible en `http://localhost:<puerto-del-frontend>`. Para detenerla:

```bash
docker compose down
```

En este modo cada servicio se ejecuta por separado y con recarga en caliente: los cambios
en el código se reflejan sin reconstruir las imágenes.

## Despliegue (producción)

Para un servidor público se emplea una **imagen única** que compila la interfaz a ficheros
estáticos y los sirve desde el propio backend con **gunicorn**, de modo que todo el sistema
queda en un solo contenedor sin necesidad de proxy entre servicios:

```bash
docker build -t brain-viz:prod .
docker run -p 8080:8080 brain-viz:prod
```

El contenedor escucha en el puerto que indique la variable de entorno `PORT` (8080 por
defecto). El fichero [`render.yaml`](render.yaml) describe el servicio para su despliegue
automático.

---

## Estructura del repositorio

```
backend/     Servicio de datos y análisis (Flask + NetworkX)
  data/      Redes de ejemplo (.node y .edge)
  src/       Código: app.py (API) y graph_parser.py (procesamiento)
frontend/    Aplicación cliente (React + Three.js)
  src/       Componentes e interfaz
doc/         Memoria del TFG (LaTeX) e imágenes/diagramas
docs/        Documentación de trabajo
Dockerfile   Imagen única de producción
docker-compose.yml   Entorno de desarrollo
```

## Estado del desarrollo

El proyecto sigue una metodología ágil basada en *sprints*, implementando los requisitos
por orden de prioridad. Los requisitos completos, priorizados y trazados con los casos de
uso están en el capítulo 2 de la memoria.

| Sprint | Contenido | Estado |
|---|---|---|
| 1 | Carga y procesamiento de la red, visualización 3D, cámara y estadísticas | Completado |
| 2 | Filtrado por umbral, selección e inspección de nodos, coloreado por grupo | Completado |
| 3 | Métricas de teoría de grafos, mapeo visual por métrica y búsqueda de nodos | Pendiente |
| 4 | Cuentas de usuario, carga y gestión de redes propias, y administración | Pendiente |
