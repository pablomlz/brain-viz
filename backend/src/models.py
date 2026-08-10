"""
Modelo de datos persistente de Brain Viz (Sprint 4).

Hasta este sprint la aplicación no almacenaba nada: las redes públicas vivían
como ficheros en el servidor y no había usuarios. Con la gestión de cuentas y de
conjuntos de datos propios [RI 4] aparece la necesidad de una base de datos.

Se emplea SQLAlchemy, de modo que el motor concreto es indiferente: por defecto
se usa SQLite, que no requiere ningún servicio adicional, pero basta con definir
la variable de entorno DATABASE_URL para apuntar a otro gestor.

Los ficheros de las redes se guardan como texto en la propia base de datos y no
en el sistema de archivos. La razón es práctica: en los alojamientos habituales
el disco del contenedor es efímero y se pierde en cada despliegue, mientras que
la base de datos puede ser externa y sobrevivir.
"""

import os
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()

# Roles del sistema, en orden creciente de permisos. El visitante no llega a
# tener cuenta, así que solo los dos siguientes se almacenan.
ROL_INVESTIGADOR = 'investigador'
ROL_ADMINISTRADOR = 'administrador'
ROLES = (ROL_INVESTIGADOR, ROL_ADMINISTRADOR)


def ahora():
    return datetime.now(timezone.utc)


class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(190), unique=True, nullable=False, index=True)
    nombre = db.Column(db.String(120), nullable=False)
    # Nunca se guarda la contraseña, solo su hash [RNF 2]
    hash_password = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default=ROL_INVESTIGADOR)
    creado = db.Column(db.DateTime, default=ahora, nullable=False)

    redes = db.relationship('Red', back_populates='propietario',
                            cascade='all, delete-orphan', lazy='select')

    def fijar_password(self, password):
        self.hash_password = generate_password_hash(password)

    def comprueba_password(self, password):
        return check_password_hash(self.hash_password, password)

    @property
    def es_administrador(self):
        return self.rol == ROL_ADMINISTRADOR

    def to_json(self, incluir_conteo=False):
        datos = {
            'id': self.id,
            'email': self.email,
            'nombre': self.nombre,
            'rol': self.rol,
            'creado': self.creado.isoformat() if self.creado else None,
        }
        if incluir_conteo:
            datos['redes'] = len(self.redes)
        return datos


class Red(db.Model):
    """Una red cerebral: sus dos ficheros y el resultado ya procesado."""

    __tablename__ = 'redes'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    descripcion = db.Column(db.String(300), default='')
    publica = db.Column(db.Boolean, default=False, nullable=False, index=True)

    # Contenido de los ficheros .node y .edge tal y como los subió el usuario
    contenido_nodos = db.Column(db.Text, nullable=False)
    contenido_aristas = db.Column(db.Text, nullable=False)

    # Resumen para poder listar las redes sin tener que procesarlas
    n_nodos = db.Column(db.Integer, default=0)
    n_aristas = db.Column(db.Integer, default=0)

    # Resultado ya procesado (nodos, aristas y métricas) en formato JSON.
    # Procesar una red implica construir el grafo y calcular sus métricas, que
    # en redes grandes cuesta cientos de milisegundos. Como los ficheros no
    # cambian una vez subidos, el resultado se guarda la primera vez que se
    # solicita y las siguientes peticiones lo reutilizan.
    json_procesado = db.Column(db.Text, nullable=True)

    propietario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True, index=True)
    propietario = db.relationship('Usuario', back_populates='redes')

    creada = db.Column(db.DateTime, default=ahora, nullable=False)

    def to_json(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'descripcion': self.descripcion or '',
            'publica': self.publica,
            'nodos': self.n_nodos,
            'aristas': self.n_aristas,
            'propietario': self.propietario.nombre if self.propietario else None,
            'propietario_id': self.propietario_id,
            'creada': self.creada.isoformat() if self.creada else None,
        }

    def visible_para(self, usuario):
        """Confidencialidad [RNF 2]: una red privada solo la ven su dueño y un
        administrador."""
        if self.publica:
            return True
        if usuario is None:
            return False
        return usuario.es_administrador or self.propietario_id == usuario.id

    def editable_por(self, usuario):
        """Solo el dueño de la red o un administrador pueden modificarla."""
        if usuario is None:
            return False
        return usuario.es_administrador or self.propietario_id == usuario.id


def url_sqlite_local():
    """Fichero SQLite junto a los datos de la aplicación."""
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return 'sqlite:///' + os.path.join(base, 'data', 'brainviz.db')


def _accesible(url):
    """Comprueba que se puede abrir una conexión con la base de datos."""
    try:
        opciones = {'connect_timeout': 5} if url.startswith('postgresql') else {}
        motor = create_engine(url, connect_args=opciones)
        with motor.connect():
            pass
        motor.dispose()
        return True
    except Exception:
        return False


def url_base_datos():
    """Dirección de la base de datos que se va a utilizar.

    Si DATABASE_URL está definida se emplea esa; en caso contrario, un fichero
    SQLite local.

    Ahora bien, una base de datos externa puede dejar de estar disponible: que
    caduque el plan contratado, que el proveedor la retire o que simplemente no
    responda. Si la aplicación se limitara a intentar conectarse, no llegaría a
    arrancar y no se vería absolutamente nada. Por eso se comprueba antes que
    responde y, si no lo hace, se recurre a la base de datos local: se pierden
    los datos almacenados, pero la aplicación sigue en pie y permite explorar
    las redes públicas, que es lo que la mayoría de visitantes va a hacer.
    """
    url = os.environ.get('DATABASE_URL')
    if not url:
        return url_sqlite_local()

    # Algunos proveedores publican la URL con el prefijo antiguo
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql://', 1)

    if _accesible(url):
        return url

    print('AVISO: la base de datos configurada no responde. Se continúa con la '
          'base de datos local, de modo que la aplicación sigue funcionando '
          'aunque no se conserven los datos.', flush=True)
    return url_sqlite_local()
