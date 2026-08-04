"""
Registro, inicio y cierre de sesión [RF 13].

La sesión se mantiene con una cookie firmada por el servidor en lugar de un
token guardado en el navegador. Como la interfaz y la API se sirven desde el
mismo origen, la cookie funciona sin configuración adicional y, al no ser
accesible desde JavaScript, no queda expuesta si algún día se colara código
malicioso en la página.
"""

import re
from functools import wraps

from flask import Blueprint, jsonify, request, session

from models import ROL_ADMINISTRADOR, ROL_INVESTIGADOR, Usuario, db

bp_auth = Blueprint('auth', __name__, url_prefix='/api/auth')

PATRON_EMAIL = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
MIN_PASSWORD = 8


def usuario_actual():
    """Usuario de la sesión, o None si se está navegando como visitante."""
    uid = session.get('usuario_id')
    if uid is None:
        return None
    return db.session.get(Usuario, uid)


def requiere_sesion(f):
    """Restringe el acceso a quien haya iniciado sesión."""
    @wraps(f)
    def envoltura(*args, **kwargs):
        u = usuario_actual()
        if u is None:
            return jsonify({'error': 'Necesitas iniciar sesión para hacer esto.'}), 401
        return f(*args, **kwargs)
    return envoltura


def requiere_administrador(f):
    """Restringe el acceso al rol de administrador."""
    @wraps(f)
    def envoltura(*args, **kwargs):
        u = usuario_actual()
        if u is None:
            return jsonify({'error': 'Necesitas iniciar sesión para hacer esto.'}), 401
        if not u.es_administrador:
            return jsonify({'error': 'Esta acción está reservada a los administradores.'}), 403
        return f(*args, **kwargs)
    return envoltura


def _validar_alta(datos):
    """Devuelve un mensaje de error, o None si los datos son correctos."""
    email = (datos.get('email') or '').strip().lower()
    nombre = (datos.get('nombre') or '').strip()
    password = datos.get('password') or ''

    if not PATRON_EMAIL.match(email):
        return 'Introduce una dirección de correo válida.'
    if len(nombre) < 2:
        return 'El nombre debe tener al menos 2 caracteres.'
    if len(password) < MIN_PASSWORD:
        return f'La contraseña debe tener al menos {MIN_PASSWORD} caracteres.'
    return None


@bp_auth.post('/registro')
def registro():
    datos = request.get_json(silent=True) or {}
    error = _validar_alta(datos)
    if error:
        return jsonify({'error': error}), 400

    email = datos['email'].strip().lower()
    if Usuario.query.filter_by(email=email).first():
        return jsonify({'error': 'Ya existe una cuenta con ese correo.'}), 409

    u = Usuario(email=email, nombre=datos['nombre'].strip(), rol=ROL_INVESTIGADOR)
    u.fijar_password(datos['password'])
    db.session.add(u)
    db.session.commit()

    session['usuario_id'] = u.id
    session.permanent = True
    return jsonify({'usuario': u.to_json()}), 201


@bp_auth.post('/login')
def login():
    datos = request.get_json(silent=True) or {}
    email = (datos.get('email') or '').strip().lower()
    password = datos.get('password') or ''

    u = Usuario.query.filter_by(email=email).first()
    # El mismo mensaje tanto si el correo no existe como si la contraseña no
    # coincide: distinguirlos permitiría averiguar qué cuentas están dadas de alta.
    if u is None or not u.comprueba_password(password):
        return jsonify({'error': 'El correo o la contraseña no son correctos.'}), 401

    session['usuario_id'] = u.id
    session.permanent = True
    return jsonify({'usuario': u.to_json()})


@bp_auth.post('/logout')
def logout():
    session.pop('usuario_id', None)
    return jsonify({'ok': True})


@bp_auth.get('/sesion')
def sesion():
    """Quién es el usuario actual. Sin sesión devuelve null, que es lo que
    corresponde a un visitante y no un error."""
    u = usuario_actual()
    return jsonify({'usuario': u.to_json() if u else None})
