import json
import mimetypes
import os
from datetime import timedelta

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from administracion import bp_admin
from auth import bp_auth
from graph_parser import load_brain_graph
from models import ROL_ADMINISTRADOR, Red, Usuario, db, url_base_datos
from redes import bp_redes, grafo_de

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Clave con la que se firma la cookie de sesión. En producción debe venir del
# entorno; el valor por defecto solo sirve para desarrollo local.
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'clave-solo-para-desarrollo')
app.config['SQLALCHEMY_DATABASE_URI'] = url_base_datos()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
# La cookie solo viaja por HTTPS cuando la aplicación está publicada
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('COOKIE_SEGURA', '0') == '1'

db.init_app(app)
app.register_blueprint(bp_auth)
app.register_blueprint(bp_redes)
app.register_blueprint(bp_admin)


# Rutas a los archivos (asumiendo que corremos desde /app en Docker)
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # /app/src
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), 'data') # /app/data
NODE_FILE = os.path.join(DATA_DIR, 'AAL90.node')
EDGE_FILE = os.path.join(DATA_DIR, 'AAL90.edge')

# Ficheros estáticos de la interfaz ya compilada. Solo existen en la imagen de
# producción (ver Dockerfile de la raíz); en desarrollo la interfaz la sirve
# Vite con recarga en caliente y este directorio no está presente.
STATIC_DIR = os.path.join(os.path.dirname(BASE_DIR), 'static')
HAY_FRONTEND = os.path.isdir(STATIC_DIR)

# Python no conoce esta extensión, y sin el tipo correcto el navegador no lee el
# manifiesto y la aplicación no se puede añadir a la pantalla de inicio.
mimetypes.add_type('application/manifest+json', '.webmanifest')


def wants_html():
        """Detecta si el cliente prefiere HTML (header Accept o ?format=html)."""
        fmt = request.args.get('format', '').lower()
        if fmt == 'html':
                return True
        accept = request.headers.get('Accept', '').lower()
        return 'text/html' in accept


# --- Presentación de las páginas HTML de utilidad -------------------------------
# Mismo lenguaje visual que el frontend: minimalismo científico oscuro, superficies
# planas mate, líneas finas, acento cobalto, Space Grotesk + IBM Plex Mono.

_MARK = (
    "<svg width='24' height='24' viewBox='0 0 24 24' fill='none'>"
    "<line x1='5' y1='17' x2='13' y2='6' stroke='#31363d' stroke-width='1.2'/>"
    "<line x1='13' y1='6' x2='19' y2='14' stroke='#31363d' stroke-width='1.2'/>"
    "<line x1='5' y1='17' x2='19' y2='14' stroke='#31363d' stroke-width='1.2'/>"
    "<circle cx='5' cy='17' r='2.6' fill='#4c7df0'/>"
    "<circle cx='13' cy='6' r='2.6' fill='#e8e9eb'/>"
    "<circle cx='19' cy='14' r='2.6' fill='#8e949d'/>"
    "</svg>"
)

_CSS = """
:root{
  --bg:#0b0c0e; --surface:#131619; --surface-2:#0e1013; --line:#23272d; --line-2:#31363d;
  --text:#e8e9eb; --muted:#8e949d; --faint:#565c64;
  --accent:#4c7df0; --ok:#3bb37f; --danger:#e0574d;
  --ui:'Space Grotesk',system-ui,-apple-system,sans-serif; --mono:'IBM Plex Mono',ui-monospace,monospace;
}
*{box-sizing:border-box}
body{margin:0;padding:40px 24px;background:var(--bg);color:var(--text);font-family:var(--ui);-webkit-font-smoothing:antialiased}
.wrap{max-width:880px;margin:0 auto}
.topbar{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;margin-bottom:26px;border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:11px}
.brand h1{margin:0;font-size:16px;font-weight:600;letter-spacing:-.01em;line-height:1}
.brand p{margin:3px 0 0;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--faint);font-family:var(--mono)}
.route{font-family:var(--mono);font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:5px;padding:6px 11px;background:var(--surface)}
h2{margin:0 0 6px;font-size:21px;font-weight:600;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:13px;margin:0 0 20px}
.status{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--text);border:1px solid var(--line);background:var(--surface);border-radius:5px;padding:7px 12px}
.status.err{border-color:rgba(224,87,77,.4);color:var(--danger)}
.dot{width:6px;height:6px;border-radius:50%;background:var(--ok)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:20px 0}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:13px 15px}
.tile .k{font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}
.tile .v{margin-top:6px;font-size:15px;color:var(--text);font-family:var(--mono);font-variant-numeric:tabular-nums}
.sec{font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.14em;color:var(--faint);margin:22px 0 9px}
pre{background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:14px 16px;overflow:auto;
  font-family:var(--mono);font-size:12px;line-height:1.55;color:#c3c8d0;margin:0}
code{font-family:var(--mono);background:var(--surface);border:1px solid var(--line);border-radius:3px;padding:1px 6px;font-size:.88em;color:var(--text)}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.foot{margin-top:20px;font-size:12px;color:var(--muted)}
::-webkit-scrollbar{width:9px;height:9px}
::-webkit-scrollbar-thumb{background:var(--line-2);border-radius:6px}
::-webkit-scrollbar-track{background:transparent}
"""


def render_page(title: str, body: str, route: str, status_code: int = 200):
        """Envuelve el contenido en la plantilla de página de la API."""
        html = f"""<!doctype html>
<html lang='es'>
<head>
    <meta charset='utf-8'/>
    <meta name='viewport' content='width=device-width, initial-scale=1'/>
    <title>{title} · Brain Viz</title>
    <link rel='preconnect' href='https://fonts.googleapis.com'>
    <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>
    <link href='https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap' rel='stylesheet'>
    <style>{_CSS}</style>
</head>
<body>
    <div class='wrap'>
        <div class='topbar'>
            <div class='brand'>{_MARK}<div><h1>Brain Viz</h1><p>Connectome API</p></div></div>
            <span class='route'>{route}</span>
        </div>
        {body}
    </div>
</body>
</html>"""
        return html, status_code


@app.route('/health')
def health_check():
    payload = {"status": "ok", "backend": "Python Flask"}

    if wants_html():
        body = f"""
        <h2>Health check</h2>
        <p class='sub'>Estado del servicio de backend.</p>
        <span class='status'><span class='dot'></span>En línea</span>
        <div class='grid'>
          <div class='tile'><div class='k'>Backend</div><div class='v'>Python · Flask</div></div>
          <div class='tile'><div class='k'>Versión</div><div class='v'>API v1</div></div>
          <div class='tile'><div class='k'>Formato</div><div class='v'>JSON / HTML</div></div>
        </div>
        <div class='sec'>Respuesta</div>
        <pre>{json.dumps(payload, indent=2)}</pre>
        """
        return render_page("Health", body, "GET /health")

    return jsonify(payload)

@app.route('/api/brain-data')
def get_brain_data():
    """Red por defecto del catálogo.

    Este endpoint es el que existe desde el Sprint 1. Desde el Sprint 4 las
    redes viven en la base de datos, así que devuelve la primera red pública
    del catálogo en lugar de leer los ficheros del servidor. Se mantiene por
    compatibilidad: la interfaz utiliza ya /api/networks.
    """
    try:
        red = Red.query.filter_by(publica=True).order_by(Red.id.asc()).first()
        if red is not None:
            data = grafo_de(red)
        else:
            data = load_brain_graph(NODE_FILE, EDGE_FILE)

        if data is None:
            error_payload = {"error": "Error parsing data files"}
            if wants_html():
                body = f"""
                <h2>Brain data</h2>
                <p class='sub'>No se pudieron leer los archivos de red.</p>
                <span class='status err'>Error</span>
                <div class='sec'>Detalle</div>
                <pre>{json.dumps(error_payload, indent=2)}</pre>
                """
                return render_page("Brain Data", body, "GET /api/brain-data", 500)
            return jsonify(error_payload), 500

        if wants_html():
            total_nodes = data.get('meta', {}).get('total_nodes', len(data.get('nodes', [])))
            total_edges = data.get('meta', {}).get('total_edges', len(data.get('links', [])))
            sample_nodes = data.get('nodes', [])[:5]
            sample_links = data.get('links', [])[:5]

            body = f"""
            <h2>Brain data</h2>
            <p class='sub'>Vista legible del grafo servido por la API.</p>
            <span class='status'>AAL90 · Dataset activo</span>
            <div class='grid'>
              <div class='tile'><div class='k'>Nodos</div><div class='v'>{total_nodes}</div></div>
              <div class='tile'><div class='k'>Conexiones</div><div class='v'>{total_edges}</div></div>
              <div class='tile'><div class='k'>Formato</div><div class='v'>JSON / HTML</div></div>
            </div>
            <div class='sec'>Muestra de nodos · 5</div>
            <pre>{json.dumps(sample_nodes, indent=2)}</pre>
            <div class='sec'>Muestra de conexiones · 5</div>
            <pre>{json.dumps(sample_links, indent=2)}</pre>
            <div class='sec'>Respuesta completa</div>
            <pre>{json.dumps(data, indent=2)}</pre>
            <p class='foot'>Para JSON puro añade <code>?format=json</code> o usa la cabecera <code>Accept: application/json</code>.</p>
            """
            return render_page("Brain Data", body, "GET /api/brain-data")

        return jsonify(data)

    except Exception as e:
        error_payload = {"error": str(e)}
        if wants_html():
            body = f"""
            <h2>Brain data</h2>
            <p class='sub'>Se produjo un error al obtener los datos.</p>
            <span class='status err'>Error</span>
            <div class='sec'>Detalle</div>
            <pre>{json.dumps(error_payload, indent=2)}</pre>
            """
            return render_page("Brain Data", body, "GET /api/brain-data", 500)
        return jsonify(error_payload), 500

# --- Servicio de la interfaz en producción -----------------------------------
# En la imagen de producción, Flask sirve también la aplicación de React ya
# compilada, de modo que todo el sistema queda en un único contenedor y no es
# necesario ningún proxy entre servicios.

@app.route('/', defaults={'ruta': ''})
@app.route('/<path:ruta>')
def servir_frontend(ruta):
    if not HAY_FRONTEND:
        # Modo desarrollo: la interfaz la sirve Vite en su propio puerto.
        return jsonify({
            "mensaje": "API de Brain Viz en ejecución.",
            "endpoints": ["/health", "/api/brain-data"],
        })
    # Si la ruta corresponde a un fichero existente (JS, CSS, imágenes), se
    # devuelve tal cual; en cualquier otro caso se devuelve el index.html.
    if ruta and os.path.exists(os.path.join(STATIC_DIR, ruta)):
        return send_from_directory(STATIC_DIR, ruta)
    return send_from_directory(STATIC_DIR, 'index.html')


def preparar_base_de_datos():
    """Crea las tablas si no existen y siembra los datos iniciales.

    Se ejecuta al arrancar para que el despliegue no requiera ningún paso
    manual: la primera vez deja la red de ejemplo publicada en el catálogo y,
    si se han indicado por entorno, crea la cuenta de administrador.
    """
    db.create_all()

    # Red de ejemplo como red pública del catálogo
    if Red.query.filter_by(publica=True).count() == 0 and os.path.exists(NODE_FILE):
        with open(NODE_FILE, encoding='utf-8') as f:
            texto_nodos = f.read()
        with open(EDGE_FILE, encoding='utf-8') as f:
            texto_aristas = f.read()
        red = Red(
            nombre='AAL90',
            descripcion='Parcelación anatómica del cerebro en 90 regiones (atlas AAL).',
            publica=True,
            contenido_nodos=texto_nodos,
            contenido_aristas=texto_aristas,
        )
        db.session.add(red)
        db.session.commit()
        grafo_de(red)  # deja el resultado ya procesado en la caché

    # Cuenta de administrador inicial
    email = os.environ.get('ADMIN_EMAIL')
    password = os.environ.get('ADMIN_PASSWORD')
    if email and password and Usuario.query.filter_by(email=email.lower()).first() is None:
        admin = Usuario(email=email.lower(),
                        nombre=os.environ.get('ADMIN_NOMBRE', 'Administrador'),
                        rol=ROL_ADMINISTRADOR)
        admin.fijar_password(password)
        db.session.add(admin)
        db.session.commit()


with app.app_context():
    preparar_base_de_datos()


if __name__ == '__main__':
    # Arranque solo para DESARROLLO local. En producción se usa un servidor
    # WSGI (gunicorn), tal y como define el Dockerfile de la raíz; el modo
    # depuración nunca debe activarse en un servidor accesible públicamente.
    puerto = int(os.environ.get('PORT', 5000))
    depuracion = os.environ.get('FLASK_DEBUG', '1') == '1'
    app.run(host='0.0.0.0', port=puerto, debug=depuracion)
