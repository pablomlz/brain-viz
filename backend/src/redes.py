"""
Catálogo de redes, subida de redes propias y exportación de métricas.

Cubre los requisitos RF 14 (cargar una red propia), RF 14.1 (validar los
ficheros antes de cargarla), RF 15 (gestionar los conjuntos de datos propios) y
RF 16 (exportar las métricas calculadas).
"""

import csv
import io
import json

from flask import Blueprint, Response, jsonify, request
from sqlalchemy import or_

from auth import requiere_sesion, usuario_actual
from graph_parser import parse_brain_graph
from models import Red, db

bp_redes = Blueprint('redes', __name__, url_prefix='/api/networks')

# Tamaño máximo de cada fichero. Una matriz de 1000x1000 ocupa unos 7 MB, así
# que el límite deja margen suficiente sin permitir subidas desmedidas.
MAX_BYTES = 8 * 1024 * 1024


def redes_visibles(usuario):
    """Redes públicas más, si hay sesión, las del propio usuario [RNF 2]."""
    if usuario is None:
        return Red.query.filter_by(publica=True)
    if usuario.es_administrador:
        return Red.query
    return Red.query.filter(or_(Red.publica.is_(True), Red.propietario_id == usuario.id))


def grafo_de(red):
    """Devuelve la red ya procesada, calculándola solo la primera vez.

    Procesar una red implica construir el grafo y calcular todas sus métricas.
    Como los ficheros no cambian después de subirse, el resultado se guarda y
    las siguientes peticiones lo reutilizan. Esta era la mejora que se dejó
    apuntada en el Sprint 1 y que con el cálculo de métricas del Sprint 3 pasó
    a ser necesaria.
    """
    if red.json_procesado:
        return json.loads(red.json_procesado)

    datos = parse_brain_graph(red.contenido_nodos, red.contenido_aristas)
    red.json_procesado = json.dumps(datos)
    red.n_nodos = datos['meta']['total_nodes']
    red.n_aristas = datos['meta']['total_edges']
    db.session.commit()
    return datos


@bp_redes.get('')
def listar():
    """Catálogo disponible para quien hace la petición."""
    u = usuario_actual()
    redes = redes_visibles(u).order_by(Red.publica.desc(), Red.nombre.asc()).all()
    return jsonify({'redes': [r.to_json() for r in redes]})


@bp_redes.get('/<int:red_id>')
def obtener(red_id):
    """Red procesada, lista para visualizar."""
    u = usuario_actual()
    red = db.session.get(Red, red_id)
    if red is None:
        return jsonify({'error': 'La red solicitada no existe.'}), 404
    if not red.visible_para(u):
        return jsonify({'error': 'No tienes acceso a esta red.'}), 403
    try:
        datos = grafo_de(red)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422
    datos['red'] = red.to_json()
    return jsonify(datos)


@bp_redes.post('')
@requiere_sesion
def subir():
    """Carga de una red propia a partir de sus dos ficheros [RF 14].

    Los dos ficheros se envían juntos porque una red no queda definida sin
    ambos: las coordenadas sin la matriz no tienen conexiones que dibujar, y la
    matriz sin las coordenadas no tiene dónde situar los nodos.
    """
    u = usuario_actual()

    f_nodos = request.files.get('nodos')
    f_aristas = request.files.get('aristas')
    if f_nodos is None or f_aristas is None:
        return jsonify({'error': 'Debes adjuntar los dos ficheros: el de nodos y el de conexiones.'}), 400

    nombre = (request.form.get('nombre') or '').strip()
    if len(nombre) < 2:
        return jsonify({'error': 'Ponle un nombre a la red (al menos 2 caracteres).'}), 400

    try:
        texto_nodos = f_nodos.read()
        texto_aristas = f_aristas.read()
    except Exception:
        return jsonify({'error': 'No se han podido leer los ficheros enviados.'}), 400

    for contenido, cual in ((texto_nodos, 'de nodos'), (texto_aristas, 'de conexiones')):
        if len(contenido) == 0:
            return jsonify({'error': f'El fichero {cual} está vacío.'}), 400
        if len(contenido) > MAX_BYTES:
            return jsonify({
                'error': f'El fichero {cual} supera el tamaño máximo permitido '
                         f'({MAX_BYTES // (1024 * 1024)} MB).'
            }), 413

    # Los datos deben venir en UTF-8 [RI 3]
    try:
        texto_nodos = texto_nodos.decode('utf-8')
        texto_aristas = texto_aristas.decode('utf-8')
    except UnicodeDecodeError:
        return jsonify({'error': 'Los ficheros deben estar codificados en UTF-8.'}), 400

    # Validación de formato y de consistencia dimensional [RF 14.1]. Se procesa
    # la red antes de guardarla: si algo no cuadra, no llega a almacenarse.
    try:
        datos = parse_brain_graph(texto_nodos, texto_aristas)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422

    red = Red(
        nombre=nombre,
        descripcion=(request.form.get('descripcion') or '').strip()[:300],
        publica=False,
        contenido_nodos=texto_nodos,
        contenido_aristas=texto_aristas,
        n_nodos=datos['meta']['total_nodes'],
        n_aristas=datos['meta']['total_edges'],
        json_procesado=json.dumps(datos),
        propietario_id=u.id,
    )
    db.session.add(red)
    db.session.commit()
    return jsonify({'red': red.to_json()}), 201


@bp_redes.delete('/<int:red_id>')
@requiere_sesion
def eliminar(red_id):
    """Baja de un conjunto de datos propio [RF 15]."""
    u = usuario_actual()
    red = db.session.get(Red, red_id)
    if red is None:
        return jsonify({'error': 'La red solicitada no existe.'}), 404
    if not red.editable_por(u):
        return jsonify({'error': 'Solo puedes eliminar tus propias redes.'}), 403
    db.session.delete(red)
    db.session.commit()
    return jsonify({'ok': True})


@bp_redes.get('/<int:red_id>/metricas.<formato>')
def exportar_metricas(red_id, formato):
    """Exportación de las métricas en un formato de intercambio [RF 16]."""
    if formato not in ('csv', 'json'):
        return jsonify({'error': 'Formato no admitido. Usa csv o json.'}), 400

    u = usuario_actual()
    red = db.session.get(Red, red_id)
    if red is None:
        return jsonify({'error': 'La red solicitada no existe.'}), 404
    if not red.visible_para(u):
        return jsonify({'error': 'No tienes acceso a esta red.'}), 403

    try:
        datos = grafo_de(red)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422

    base = ''.join(c if c.isalnum() else '_' for c in red.nombre)[:40] or 'red'

    if formato == 'json':
        cuerpo = json.dumps({
            'red': red.to_json(),
            'metricas_globales': datos['meta']['metrics'],
            'nodos': [
                {k: n[k] for k in ('id', 'label', 'group', 'degree', 'betweenness', 'closeness')}
                for n in datos['nodes']
            ],
        }, ensure_ascii=False, indent=2)
        return Response(cuerpo, mimetype='application/json', headers={
            'Content-Disposition': f'attachment; filename={base}_metricas.json'})

    salida = io.StringIO()
    escritor = csv.writer(salida)
    escritor.writerow(['id', 'etiqueta', 'grupo', 'grado', 'intermediacion', 'cercania'])
    for n in datos['nodes']:
        escritor.writerow([n['id'], n['label'], n['group'],
                           n['degree'], f"{n['betweenness']:.6f}", f"{n['closeness']:.6f}"])
    escritor.writerow([])
    escritor.writerow(['# metricas globales'])
    for clave, valor in datos['meta']['metrics'].items():
        escritor.writerow([clave, valor])

    return Response(salida.getvalue(), mimetype='text/csv', headers={
        'Content-Disposition': f'attachment; filename={base}_metricas.csv'})
