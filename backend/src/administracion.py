"""
Funciones reservadas al administrador: gestión del catálogo de redes públicas
[RF 17] y gestión de los usuarios registrados [RF 18, RF 18.1].
"""

from flask import Blueprint, jsonify, request

from auth import requiere_administrador, usuario_actual
from models import ROLES, Red, Usuario, db

bp_admin = Blueprint('admin', __name__, url_prefix='/api/admin')


@bp_admin.get('/usuarios')
@requiere_administrador
def listar_usuarios():
    usuarios = Usuario.query.order_by(Usuario.creado.asc()).all()
    return jsonify({'usuarios': [u.to_json(incluir_conteo=True) for u in usuarios]})


@bp_admin.patch('/usuarios/<int:uid>')
@requiere_administrador
def cambiar_rol(uid):
    """Asignar o revocar el rol de investigador [RF 18.1]."""
    datos = request.get_json(silent=True) or {}
    rol = datos.get('rol')
    if rol not in ROLES:
        return jsonify({'error': f"Rol no válido. Debe ser uno de: {', '.join(ROLES)}."}), 400

    objetivo = db.session.get(Usuario, uid)
    if objetivo is None:
        return jsonify({'error': 'El usuario no existe.'}), 404

    # Un administrador no puede quitarse a sí mismo el rol: si fuera el único,
    # el sistema se quedaría sin nadie que pudiera administrarlo.
    yo = usuario_actual()
    if objetivo.id == yo.id and rol != 'administrador':
        return jsonify({'error': 'No puedes retirarte a ti mismo el rol de administrador.'}), 400

    objetivo.rol = rol
    db.session.commit()
    return jsonify({'usuario': objetivo.to_json(incluir_conteo=True)})


@bp_admin.delete('/usuarios/<int:uid>')
@requiere_administrador
def eliminar_usuario(uid):
    objetivo = db.session.get(Usuario, uid)
    if objetivo is None:
        return jsonify({'error': 'El usuario no existe.'}), 404

    yo = usuario_actual()
    if objetivo.id == yo.id:
        return jsonify({'error': 'No puedes eliminar tu propia cuenta desde aquí.'}), 400

    # Al borrar el usuario se borran también sus redes privadas, pero las que
    # se hubieran publicado siguen en el catálogo: pasan a quedar sin dueño para
    # no desaparecer del catálogo público sin previo aviso.
    for red in list(objetivo.redes):
        if red.publica:
            red.propietario_id = None

    db.session.delete(objetivo)
    db.session.commit()
    return jsonify({'ok': True})


@bp_admin.patch('/redes/<int:red_id>')
@requiere_administrador
def editar_red(red_id):
    """Editar los metadatos de una red o publicarla y retirarla [RF 17]."""
    red = db.session.get(Red, red_id)
    if red is None:
        return jsonify({'error': 'La red no existe.'}), 404

    datos = request.get_json(silent=True) or {}
    if 'nombre' in datos:
        nombre = (datos['nombre'] or '').strip()
        if len(nombre) < 2:
            return jsonify({'error': 'El nombre debe tener al menos 2 caracteres.'}), 400
        red.nombre = nombre
    if 'descripcion' in datos:
        red.descripcion = (datos['descripcion'] or '').strip()[:300]
    if 'publica' in datos:
        red.publica = bool(datos['publica'])

    db.session.commit()
    return jsonify({'red': red.to_json()})


@bp_admin.delete('/redes/<int:red_id>')
@requiere_administrador
def eliminar_red(red_id):
    red = db.session.get(Red, red_id)
    if red is None:
        return jsonify({'error': 'La red no existe.'}), 404
    db.session.delete(red)
    db.session.commit()
    return jsonify({'ok': True})
