"""
Pruebas de la API del Sprint 4.

Comprueban el registro y el acceso [RF 13], la carga y validación de redes
propias [RF 14, RF 14.1], su gestión [RF 15], la exportación de métricas
[RF 16], las funciones de administración [RF 17, RF 18, RF 18.1] y, sobre todo,
la confidencialidad entre usuarios [RNF 2], que es el punto donde un fallo
tendría peores consecuencias.

Se ejecutan con:  python -m pytest backend/tests -q
"""

import io
import os
import sys

import pytest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'src'))

DATOS = os.path.join(RAIZ, 'data')


@pytest.fixture()
def aplicacion(tmp_path, monkeypatch):
    """Aplicación con una base de datos limpia para cada prueba."""
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{tmp_path}/prueba.db')
    monkeypatch.setenv('ADMIN_EMAIL', 'admin@brainviz.test')
    monkeypatch.setenv('ADMIN_PASSWORD', 'administrador1')
    for modulo in ('app', 'models', 'auth', 'redes', 'administracion'):
        sys.modules.pop(modulo, None)
    import app as modulo_app
    return modulo_app.app


@pytest.fixture()
def ficheros():
    with open(os.path.join(DATOS, 'AAL90.node'), 'rb') as f:
        nodos = f.read()
    with open(os.path.join(DATOS, 'AAL90.edge'), 'rb') as f:
        aristas = f.read()
    return nodos, aristas


def registrar(cliente, email, nombre='Usuario'):
    return cliente.post('/api/auth/registro',
                        json={'email': email, 'nombre': nombre, 'password': 'contrasena1'})


def subir(cliente, nodos, aristas, nombre='Mi red'):
    return cliente.post('/api/networks', content_type='multipart/form-data', data={
        'nombre': nombre,
        'nodos': (io.BytesIO(nodos), 'x.node'),
        'aristas': (io.BytesIO(aristas), 'x.edge'),
    })


# --------------------------------------------------------------- visitante
def test_visitante_ve_solo_el_catalogo_publico(aplicacion):
    c = aplicacion.test_client()
    redes = c.get('/api/networks').get_json()['redes']
    assert len(redes) == 1 and redes[0]['publica'] is True
    assert c.get('/api/auth/sesion').get_json()['usuario'] is None


def test_visitante_no_puede_subir_ni_administrar(aplicacion):
    c = aplicacion.test_client()
    assert c.post('/api/networks').status_code == 401
    assert c.get('/api/admin/usuarios').status_code == 401


# ------------------------------------------------------------------ acceso
@pytest.mark.parametrize('datos', [
    {'email': 'malo', 'nombre': 'X', 'password': 'contrasena1'},
    {'email': 'a@b.com', 'nombre': 'A', 'password': 'corta'},
    {'email': 'a@b.com', 'nombre': 'X', 'password': 'contrasena1'},
])
def test_registro_rechaza_datos_invalidos(aplicacion, datos):
    assert aplicacion.test_client().post('/api/auth/registro', json=datos).status_code == 400


def test_registro_y_sesion(aplicacion):
    c = aplicacion.test_client()
    r = registrar(c, 'ana@ugr.es', 'Ana')
    assert r.status_code == 201 and r.get_json()['usuario']['rol'] == 'investigador'
    assert registrar(c, 'ana@ugr.es', 'Otra').status_code == 409
    assert c.get('/api/auth/sesion').get_json()['usuario']['email'] == 'ana@ugr.es'
    assert c.post('/api/auth/logout').status_code == 200
    assert c.get('/api/auth/sesion').get_json()['usuario'] is None
    assert c.post('/api/auth/login', json={'email': 'ana@ugr.es', 'password': 'mal'}).status_code == 401
    assert c.post('/api/auth/login', json={'email': 'ana@ugr.es', 'password': 'contrasena1'}).status_code == 200


def test_la_contrasena_no_se_almacena_en_claro(aplicacion):
    c = aplicacion.test_client()
    registrar(c, 'ana@ugr.es')
    with aplicacion.app_context():
        from models import Usuario
        u = Usuario.query.filter_by(email='ana@ugr.es').first()
        assert 'contrasena1' not in u.hash_password
        assert u.comprueba_password('contrasena1')


# ------------------------------------------------------- carga y validación
@pytest.mark.parametrize('aristas_malas, motivo', [
    (b'0 1\n1 0\n', 'dimensiones que no cuadran con el fichero de nodos'),
    (b'0 1 2\n1 0 3\n', 'matriz no cuadrada'),
    (b'a b\nc d\n', 'valores no numericos'),
    (b'', 'fichero vacio'),
])
def test_subida_rechaza_ficheros_incorrectos(aplicacion, ficheros, aristas_malas, motivo):
    nodos, _ = ficheros
    c = aplicacion.test_client()
    registrar(c, 'ana@ugr.es')
    assert subir(c, nodos, aristas_malas).status_code in (400, 422), motivo


def test_subida_correcta_y_borrado(aplicacion, ficheros):
    nodos, aristas = ficheros
    c = aplicacion.test_client()
    registrar(c, 'ana@ugr.es')
    r = subir(c, nodos, aristas)
    assert r.status_code == 201
    red = r.get_json()['red']
    assert red['nodos'] == 90 and red['aristas'] == 411 and red['publica'] is False
    assert len(c.get('/api/networks').get_json()['redes']) == 2
    assert c.delete(f"/api/networks/{red['id']}").status_code == 200
    assert c.get(f"/api/networks/{red['id']}").status_code == 404


# ------------------------------------------------------------ exportación
def test_exportacion_de_metricas(aplicacion, ficheros):
    nodos, aristas = ficheros
    c = aplicacion.test_client()
    registrar(c, 'ana@ugr.es')
    rid = subir(c, nodos, aristas).get_json()['red']['id']

    csv = c.get(f'/api/networks/{rid}/metricas.csv')
    assert csv.status_code == 200 and b'intermediacion' in csv.data
    assert len(csv.data.decode().strip().splitlines()) > 90

    js = c.get(f'/api/networks/{rid}/metricas.json').get_json()
    assert len(js['nodos']) == 90
    assert set(js['metricas_globales']) == {'density', 'avg_degree', 'avg_clustering', 'components'}
    assert c.get(f'/api/networks/{rid}/metricas.xml').status_code == 400


# ------------------------------------------------- confidencialidad [RNF 2]
def test_una_red_privada_no_es_accesible_para_otros(aplicacion, ficheros):
    nodos, aristas = ficheros
    ana, luis, visitante = (aplicacion.test_client() for _ in range(3))
    registrar(ana, 'ana@ugr.es', 'Ana')
    registrar(luis, 'luis@ugr.es', 'Luis')
    rid = subir(ana, nodos, aristas).get_json()['red']['id']

    assert all(r['id'] != rid for r in luis.get('/api/networks').get_json()['redes'])
    assert luis.get(f'/api/networks/{rid}').status_code == 403
    assert luis.get(f'/api/networks/{rid}/metricas.csv').status_code == 403
    assert luis.delete(f'/api/networks/{rid}').status_code == 403
    assert visitante.get(f'/api/networks/{rid}').status_code == 403
    assert ana.get(f'/api/networks/{rid}').status_code == 200


# ---------------------------------------------------------- administración
def test_gestion_de_usuarios_y_catalogo(aplicacion, ficheros):
    nodos, aristas = ficheros
    adm, ana, luis = (aplicacion.test_client() for _ in range(3))
    adm.post('/api/auth/login', json={'email': 'admin@brainviz.test', 'password': 'administrador1'})
    registrar(ana, 'ana@ugr.es', 'Ana')
    registrar(luis, 'luis@ugr.es', 'Luis')
    rid = subir(ana, nodos, aristas).get_json()['red']['id']

    assert luis.get('/api/admin/usuarios').status_code == 403
    usuarios = adm.get('/api/admin/usuarios').get_json()['usuarios']
    assert len(usuarios) == 3

    luis_id = next(u['id'] for u in usuarios if u['email'] == 'luis@ugr.es')
    assert adm.patch(f'/api/admin/usuarios/{luis_id}',
                     json={'rol': 'administrador'}).get_json()['usuario']['rol'] == 'administrador'
    assert adm.patch(f'/api/admin/usuarios/{luis_id}',
                     json={'rol': 'investigador'}).get_json()['usuario']['rol'] == 'investigador'
    assert adm.patch(f'/api/admin/usuarios/{luis_id}', json={'rol': 'jefe'}).status_code == 400

    yo = next(u['id'] for u in usuarios if u['email'] == 'admin@brainviz.test')
    assert adm.patch(f'/api/admin/usuarios/{yo}', json={'rol': 'investigador'}).status_code == 400
    assert adm.delete(f'/api/admin/usuarios/{yo}').status_code == 400

    assert adm.get(f'/api/networks/{rid}').status_code == 200
    assert adm.patch(f'/api/admin/redes/{rid}', json={'publica': True}).get_json()['red']['publica']
    assert luis.get(f'/api/networks/{rid}').status_code == 200
    adm.patch(f'/api/admin/redes/{rid}', json={'publica': False})
    assert luis.get(f'/api/networks/{rid}').status_code == 403


# ------------------------------------------------------------------ caché
def test_la_red_procesada_se_guarda_para_no_recalcularla(aplicacion, ficheros):
    nodos, aristas = ficheros
    c = aplicacion.test_client()
    registrar(c, 'ana@ugr.es')
    rid = subir(c, nodos, aristas).get_json()['red']['id']
    with aplicacion.app_context():
        from models import Red, db
        assert db.session.get(Red, rid).json_procesado is not None


def test_compatibilidad_del_endpoint_original(aplicacion):
    d = aplicacion.test_client().get('/api/brain-data').get_json()
    assert d['meta']['total_nodes'] == 90 and d['meta']['total_edges'] == 411
    assert 'metrics' in d['meta']
