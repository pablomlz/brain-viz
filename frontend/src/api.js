/**
 * Acceso a la API del servidor.
 *
 * Todas las peticiones incluyen las credenciales para que viaje la cookie de
 * sesión; sin ella el servidor trataría cada llamada como la de un visitante.
 * Los errores del servidor llegan siempre con un mensaje explicativo, así que
 * se lanzan como excepción para que la interfaz pueda mostrarlo tal cual y el
 * usuario sepa qué ha pasado y por qué.
 */

async function peticion(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, { credentials: 'include', ...opciones });
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }
  if (!respuesta.ok) {
    throw new Error(datos?.error || `No se ha podido completar la operación (${respuesta.status}).`);
  }
  return datos;
}

const conJson = (metodo, cuerpo) => ({
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
});

export const api = {
  // --- sesión (RF 13) ---
  sesion: () => peticion('/api/auth/sesion'),
  registro: (datos) => peticion('/api/auth/registro', conJson('POST', datos)),
  login: (datos) => peticion('/api/auth/login', conJson('POST', datos)),
  logout: () => peticion('/api/auth/logout', { method: 'POST' }),

  // --- catálogo de redes ---
  redes: () => peticion('/api/networks'),
  red: (id) => peticion(`/api/networks/${id}`),
  eliminarRed: (id) => peticion(`/api/networks/${id}`, { method: 'DELETE' }),

  // --- carga de una red propia (RF 14) ---
  subirRed: ({ nombre, descripcion, nodos, aristas }) => {
    const cuerpo = new FormData();
    cuerpo.append('nombre', nombre);
    cuerpo.append('descripcion', descripcion || '');
    cuerpo.append('nodos', nodos);
    cuerpo.append('aristas', aristas);
    return peticion('/api/networks', { method: 'POST', body: cuerpo });
  },

  // --- exportación de métricas (RF 16) ---
  urlMetricas: (id, formato) => `/api/networks/${id}/metricas.${formato}`,

  // --- administración (RF 17, RF 18) ---
  usuarios: () => peticion('/api/admin/usuarios'),
  cambiarRol: (id, rol) => peticion(`/api/admin/usuarios/${id}`, conJson('PATCH', { rol })),
  eliminarUsuario: (id) => peticion(`/api/admin/usuarios/${id}`, { method: 'DELETE' }),
  editarRed: (id, cambios) => peticion(`/api/admin/redes/${id}`, conJson('PATCH', cambios)),
  eliminarRedAdmin: (id) => peticion(`/api/admin/redes/${id}`, { method: 'DELETE' }),
};
