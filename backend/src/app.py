from flask import Flask, jsonify, render_template_string, request
from flask_cors import CORS
import os
import json
from graph_parser import load_brain_graph

app = Flask(__name__)
CORS(app)


# Rutas a los archivos (asumiendo que corremos desde /app en Docker)
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # /app/src
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), 'data') # /app/data
NODE_FILE = os.path.join(DATA_DIR, 'AAL90.node')
EDGE_FILE = os.path.join(DATA_DIR, 'AAL90.edge')


def wants_html():
        """Detecta si el cliente prefiere HTML (header Accept o ?format=html)."""
        fmt = request.args.get('format', '').lower()
        if fmt == 'html':
                return True
        accept = request.headers.get('Accept', '').lower()
        return 'text/html' in accept


def render_page(title: str, body: str, status_code: int = 200):
        """Plantilla mínima coherente para endpoints HTML."""
        template = f"""
        <!doctype html>
        <html lang='es'>
        <head>
            <meta charset='utf-8'/>
            <meta name='viewport' content='width=device-width, initial-scale=1'/>
            <title>{title} · Brain Viz</title>
            <style>
                :root {{
                    --bg: #0c1117;
                    --panel: #111827;
                    --accent: #7dd3fc;
                    --text: #e5e7eb;
                    --muted: #9ca3af;
                }}
                body {{ margin: 0; padding: 24px; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: radial-gradient(circle at 20% 20%, rgba(125,211,252,0.08), transparent 30%), radial-gradient(circle at 80% 0%, rgba(139,92,246,0.12), transparent 25%), var(--bg); background-attachment: fixed; color: var(--text); }}
                .card {{ max-width: 820px; margin: 0 auto; background: linear-gradient(145deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 24px 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); backdrop-filter: blur(6px); }}
                h1 {{ margin: 0 0 12px; font-size: 26px; letter-spacing: -0.5px; }}
                .muted {{ color: var(--muted); font-size: 14px; margin-bottom: 18px; }}
                .pill {{ display: inline-flex; align-items: center; gap: 8px; background: rgba(125,211,252,0.12); color: var(--text); border: 1px solid rgba(125,211,252,0.3); border-radius: 999px; padding: 6px 12px; font-size: 13px; }}
                .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 16px 0; }}
                .stat {{ background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px 14px; }}
                .label {{ color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; }}
                pre {{ background: #0b1220; color: #cbd5e1; border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 14px; overflow: auto; font-size: 12px; line-height: 1.45; }}
                a {{ color: var(--accent); text-decoration: none; }}
                a:hover {{ text-decoration: underline; }}
            </style>
        </head>
        <body>
            <div class='card'>
                {body}
            </div>
        </body>
        </html>
        """
        return render_template_string(template), status_code

@app.route('/health')
def health_check():
    payload = {"status": "ok", "backend": "Python Flask"}

    if wants_html():
        body = f"""
        <h1>Health Check</h1>
        <div class='muted'>Estado del servicio backend</div>
        <div class='pill'> 🟢 En línea</div>
        <div class='grid'>
          <div class='stat'><div class='label'>Backend</div><div>Python · Flask</div></div>
          <div class='stat'><div class='label'>Versión</div><div>API v1</div></div>
          <div class='stat'><div class='label'>Formato</div><div>JSON / HTML</div></div>
        </div>
        <pre>{json.dumps(payload, indent=2)}</pre>
        """
        return render_page("Health", body)

    return jsonify(payload)

@app.route('/api/brain-data')
def get_brain_data():
    try:
        # Llamamos a nuestro parser
        data = load_brain_graph(NODE_FILE, EDGE_FILE)
        
        if data is None:
            error_payload = {"error": "Error parsing data files"}
            if wants_html():
                body = f"""
                <h1>Brain Data</h1>
                <div class='muted'>No se pudieron leer los archivos de red.</div>
                <div class='pill'>⚠️ Error</div>
                <pre>{json.dumps(error_payload, indent=2)}</pre>
                """
                return render_page("Brain Data", body, 500)
            return jsonify(error_payload), 500

        if wants_html():
            total_nodes = data.get('meta', {}).get('total_nodes', len(data.get('nodes', [])))
            total_edges = data.get('meta', {}).get('total_edges', len(data.get('links', [])))
            sample_nodes = data.get('nodes', [])[:5]
            sample_links = data.get('links', [])[:5]

            body = f"""
            <h1>Brain Data</h1>
            <div class='muted'>Vista legible del grafo servido por la API.</div>
            <div class='pill'>Dataset activo</div>
            <div class='grid'>
              <div class='stat'><div class='label'>Nodos</div><div>{total_nodes}</div></div>
              <div class='stat'><div class='label'>Conexiones</div><div>{total_edges}</div></div>
              <div class='stat'><div class='label'>Formato</div><div>JSON / HTML</div></div>
            </div>
            <div class='label'>Muestra de nodos (5)</div>
            <pre>{json.dumps(sample_nodes, indent=2)}</pre>
            <div class='label'>Muestra de conexiones (5)</div>
            <pre>{json.dumps(sample_links, indent=2)}</pre>
            <div class='label'>Respuesta completa</div>
            <pre>{json.dumps(data, indent=2)}</pre>
            <div class='muted'>Para JSON puro añade <code>?format=json</code> o usa el header <code>Accept: application/json</code>.</div>
            """
            return render_page("Brain Data", body)

        return jsonify(data)
        
    except Exception as e:
        error_payload = {"error": str(e)}
        if wants_html():
            body = f"""
            <h1>Brain Data</h1>
            <div class='muted'>Se produjo un error al obtener los datos.</div>
            <div class='pill'>⚠️ Error</div>
            <pre>{json.dumps(error_payload, indent=2)}</pre>
            """
            return render_page("Brain Data", body, 500)
        return jsonify(error_payload), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)