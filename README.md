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
- Métricas de la red calculadas en el servidor: densidad, grado medio, coeficiente
  de clustering y número de componentes conexas.
- Centralidades por nodo: grado, intermediación y cercanía.
- Mapeo visual: el color y el tamaño de los nodos pueden reflejar cualquiera de
  esas métricas, con una leyenda que se adapta a la escala.
- Búsqueda de una región por su etiqueta, con desplazamiento de la cámara hasta ella.
- Personalización de la vista (tamaño de nodos, opacidad, ejes, rotación y tema claro
  u oscuro) y restablecimiento a los valores iniciales.
- Exportación de la vista actual como imagen y de las métricas en CSV o JSON.
- Cuentas de usuario: cualquiera puede explorar el catálogo público sin registrarse, y
  quien se registra puede cargar sus propias redes y gestionarlas de forma privada.
- Administración del catálogo de redes públicas y de los usuarios registrados.

## Arquitectura

Sigue un modelo cliente-servidor desacoplado:

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| **Backend** | Python · Flask · NetworkX · SQLAlchemy | Procesa las redes, calcula sus métricas, las expone mediante una API y gestiona usuarios y conjuntos de datos |
| **Frontend** | React · Three.js (react-three-fiber) | Visualización 3D interactiva en el navegador |
| **Infraestructura** | Docker · Docker Compose | Entorno reproducible en desarrollo y despliegue |

### API

| Endpoint | Descripción |
|---|---|
| `GET /health` | Verificación del estado del servicio |
| `GET /api/brain-data` | Red por defecto del catálogo, en JSON: `nodes`, `links` y `meta` |
| `GET /api/networks` | Catálogo visible para quien hace la petición |
| `GET /api/networks/<id>` | Una red concreta, ya procesada |
| `POST /api/networks` | Carga de una red propia (dos ficheros) |
| `DELETE /api/networks/<id>` | Baja de una red propia |
| `GET /api/networks/<id>/metricas.csv\|json` | Exportación de las métricas |
| `POST /api/auth/registro` · `/login` · `/logout` | Gestión de la sesión |
| `GET /api/auth/sesion` | Usuario actual, o `null` si se navega como visitante |
| `GET`/`PATCH`/`DELETE /api/admin/usuarios[/<id>]` | Gestión de usuarios |
| `PATCH`/`DELETE /api/admin/redes/<id>` | Gestión del catálogo público |

`/health` y `/api/brain-data` devuelven una página HTML legible si se accede a ellos desde
el navegador (o añadiendo `?format=html`).

### Roles

| Rol | Puede |
|---|---|
| **Visitante** (sin registro) | Explorar, filtrar, analizar y exportar las redes públicas |
| **Investigador** (registrado) | Además, cargar sus propias redes y gestionarlas en privado |
| **Administrador** | Además, gestionar el catálogo público y los usuarios |

Las contraseñas se almacenan con hash y la sesión viaja en una cookie firmada por el
servidor. Una red privada solo es accesible para su propietario y para un administrador.

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

### Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto en el que escucha el servidor (8080 por defecto) |
| `SECRET_KEY` | Clave con la que se firma la cookie de sesión |
| `COOKIE_SEGURA` | A `1` en producción, para que la cookie solo viaje por HTTPS |
| `DATABASE_URL` | Base de datos a utilizar; sin ella se usa un fichero SQLite local |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE` | Crean la cuenta de administrador la primera vez que arranca |

> **Sobre la persistencia.** El disco del contenedor es efímero y se pierde en cada
> despliegue, así que con SQLite los usuarios y las redes cargadas no sobrevivirían a una
> nueva publicación. Por eso el despliegue emplea una base de datos PostgreSQL externa,
> indicada mediante `DATABASE_URL`. La base de datos debe estar en la misma región que el
> servicio para que se comuniquen por la red privada del proveedor.
>
> Si esa base de datos dejara de estar disponible, la aplicación no se queda sin arrancar:
> comprueba la conexión al iniciarse y, si no responde, continúa con la base de datos local.
> Se pierden los datos almacenados, pero el catálogo público sigue explorándose con
> normalidad.

## Pruebas

```bash
python -m pytest backend/tests -q
```

Cubren el acceso, la carga y validación de redes, la exportación, las funciones de
administración y la confidencialidad entre usuarios.

---

## Estructura del repositorio

```
backend/     Servicio de datos y análisis (Flask + NetworkX)
  data/      Red de ejemplo (.node y .edge) y base de datos SQLite
  src/       app.py (API), graph_parser.py (procesamiento), models.py,
             auth.py, redes.py y administracion.py
  tests/     Pruebas automatizadas de la API
frontend/    Aplicación cliente (React + Three.js)
  src/       Componentes e interfaz
doc/         Memoria del TFG (LaTeX) e imágenes/diagramas
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
| 3 | Métricas de teoría de grafos, mapeo visual por métrica y búsqueda de nodos | Completado |
| 4 | Cuentas de usuario, carga y gestión de redes propias, y administración | Completado |
