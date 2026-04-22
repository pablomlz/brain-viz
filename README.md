# Brain Viz Connectome - Visualización Interactiva de Redes Cerebrales

Este proyecto es una aplicación web para la visualización y análisis de grafos cerebrales (connectomes) en 3D. Permite cargar matrices de adyacencia y coordenadas nodales para renderizar redes neuronales interactivas en el navegador.

## Arquitectura

El sistema sigue una arquitectura de microservicios contenerizada:

* **Backend:** Python (Flask + NetworkX). Procesa los archivos `.node` y `.edge` y expone una API REST.
* **Frontend:** JavaScript (React + Vite + Three.js). Consume la API y renderiza la escena 3D usando WebGL.
* **Infraestructura:** Docker Compose para orquestación.

## Requisitos Funcionales (Priorizados)

### 🎯 Sprint 1 - MVP (Completado)
**RF1. Visualización básica de red cerebral 3D**
- Cargar nodos desde fichero `.node` (coordenadas x,y,z + metadatos)
- Cargar aristas desde fichero `.edge` (matriz de adyacencia)
- Renderizar nodos como esferas 3D con color por grupo/lóbulo
- Renderizar conexiones como líneas entre nodos
- Controles básicos de cámara (órbita, zoom, pan)
- Pantalla de login simple

**RF2. API REST backend**
- Endpoint `/health` para verificación de estado
- Endpoint `/api/brain-data` para servir el grafo en formato JSON
- Parseo y validación de ficheros de entrada
- Filtrado de aristas por umbral de peso

### 🚀 Sprint 2 - Interacción Avanzada
**RF3. Selección y detalle de nodos**
- Click en nodo para seleccionar
- Resaltado del nodo seleccionado (cambio de color/tamaño)
- Panel lateral con información del nodo (ID, label, coordenadas, grado)
- Botón para resetear selección

**RF4. Tooltips informativos**
- Hover sobre nodo → mostrar tooltip con label y métricas básicas
- Tooltip flotante que sigue al cursor
- Opción para fijarlo al hacer click

**RF5. Control de cámara mejorado**
- Botón "Centrar en nodo seleccionado"
- Botón "Vista frontal / lateral / superior"
- Smoothing en transiciones de cámara
- Restablecer vista inicial

### 📊 Sprint 3 - Filtrado y Métricas
**RF6. Filtrado dinámico de aristas**
- Slider para ajustar umbral de peso en tiempo real
- Contador de aristas visibles/totales
- Toggle "Mostrar/Ocultar todas las aristas"
- Persistencia del umbral en la sesión

**RF7. Coloreo y agrupación**
- Selector de esquema de color (por lóbulo, por grado, por métrica)
- Leyenda visual de grupos/colores
- Toggle para mostrar/ocultar grupos específicos

**RF8. Métricas básicas de red**
- Cálculo en backend: grado medio, clustering, componentes conexas
- Panel de estadísticas globales en UI
- Métricas por nodo: grado, betweenness, closeness (bajo demanda)

### 📁 Sprint 4 - Carga de Datos
**RF9. Carga de ficheros por usuario**
- Drag & drop para ficheros `.node` y `.edge`
- Validación de formato y contenido
- Mensajes de error descriptivos
- Previsualización de primeras filas

**RF10. Gestión de datasets**
- Lista de datasets de ejemplo precargados
- Selector dropdown para cambiar de dataset
- Persistencia del dataset activo en sesión

**RF11. Descarga de datos procesados**
- Exportar grafo actual en JSON
- Exportar métricas calculadas en CSV
- Exportar captura de pantalla (PNG)

### 🔍 Sprint 5 - Análisis Avanzado
**RF12. Búsqueda de nodos**
- Barra de búsqueda por label/ID
- Autocompletado con resultados en lista
- Centrar cámara en nodo encontrado
- Resaltar nodos que coinciden con búsqueda

**RF13. Visualización de caminos**
- Seleccionar dos nodos → calcular camino más corto
- Resaltar nodos y aristas del camino con color especial
- Mostrar longitud del camino y pesos

**RF14. Subgrafos y comunidades**
- Detección de comunidades (Louvain, Girvan-Newman)
- Coloreo por comunidad detectada
- Extraer y visualizar solo una comunidad

### 🎨 Sprint 6 - UX/UI Avanzada
**RF15. Configuración de visualización**
- Ajustar tamaño de nodos (slider)
- Ajustar opacidad de aristas (slider)
- Modo claro/oscuro
- Mostrar/ocultar ejes de coordenadas
- Mostrar/ocultar grid de referencia

**RF16. Animaciones y transiciones**
- Animación de entrada inicial (fade-in)
- Transiciones suaves al filtrar/colorear
- Loading spinner durante cálculos pesados

**RF17. Atajos de teclado**
- Espacio: resetear vista
- R: rotar automático
- H: mostrar/ocultar HUD
- Números 1-5: vistas predefinidas

### 🔐 Sprint 7 - Autenticación y Persistencia (Opcional)
**RF18. Autenticación básica**
- Login con usuario/contraseña
- Sesión persistente (JWT)
- Logout funcional

**RF19. Guardar configuración de usuario**
- Preferencias de visualización (colores, tamaños, umbrales)
- Datasets favoritos
- Vistas guardadas (posición cámara, filtros activos)

**RF20. Historial de análisis**
- Registro de datasets cargados
- Registro de métricas calculadas
- Exportar historial

### 🚢 Sprint 8 - Despliegue y Optimización
**RF21. Optimización de rendimiento**
- LOD (Level of Detail) para grafos grandes (>1000 nodos)
- Web Workers para cálculos pesados
- Paginación/virtualización de listas largas

**RF22. Despliegue en producción**
- Dockerfile optimizado (multi-stage)
- Configuración de CI/CD básica
- Variables de entorno para configuración

**RF23. Documentación de usuario**
- Tutorial interactivo (tour guiado)
- Sección de ayuda con GIFs/videos
- FAQ común

---

### Prioridad de implementación recomendada:
1. ✅ **Sprint 1** (MVP) - RF1, RF2
2. **Sprint 2** (Interacción) - RF3, RF4, RF5
3. **Sprint 3** (Análisis básico) - RF6, RF7, RF8
4. **Sprint 4** (Datos) - RF9, RF10, RF11
5. **Sprint 5** (Análisis avanzado) - RF12, RF13, RF14
6. **Sprint 6** (UX) - RF15, RF16, RF17
7. **Sprint 7** (Opcional) - RF18, RF19, RF20
8. **Sprint 8** (Despliegue) - RF21, RF22, RF23

##  Despliegue (Quick Start)

Instrucciones para levantar el entorno de desarrollo desde cero.

### Prerrequisitos
* Docker y Docker Compose instalados.
* Archivos de datos (`AAL90.node`, `AAL90.edge`) ubicados en `backend/data/`.

### Comandos de Ejecución

1.  **Clonar/Descargar** el repositorio.
2.  **Construir y levantar** los contenedores:
    ```bash
    docker compose up --build
    ```
3.  **Acceso a la Aplicación:**
    * Frontend (Visualizador): [http://localhost:3000](http://localhost:3000)
    * Backend (API Status): [http://localhost:5000/health](http://localhost:5000/health)
    * API Datos (JSON): [http://localhost:5000/api/brain-data](http://localhost:5000/api/brain-data)

4.  **Detener la aplicación:**
    ```bash
    docker compose down
    ```

##  Configuración de Puertos y Red

| Servicio | Puerto Interno (Container) | Puerto Externo (Host) | Descripción |
| :--- | :--- | :--- | :--- |
| **Frontend** | 5173 (Vite default) | **3000** | Puerto estándar para desarrollo React. |
| **Backend** | 5000 (Flask default) | **5000** | Puerto estándar API Python. |



TU ORDENADOR (HOST)                DOCKER (CONTENEDORES)
┌───────────────────────┐          ┌───────────────────────────┐
│ Navegador Web         │          │                           │
│ (Chrome/Firefox)      │          │  Servicio Frontend        │
│          ⬇            │          │  (Node/Vite)              │
│ Entra a localhost:3000│ ───────► │  Escucha en puerto 5173   │
│                       │ MAPPING  │                           │
└───────────────────────┘ 3000:5173└───────────────────────────┘
                                                ⬇
                                   (Petición interna JS fetch)
                                                ⬇
┌───────────────────────┐          ┌───────────────────────────┐
│                       │          │                           │
│ El JS en el navegador │          │  Servicio Backend         │
│ pide datos a:         │          │  (Python/Flask)           │
│ localhost:5000        │ ───────► │  Escucha en puerto 5000   │
│                       │ MAPPING  │                           │
└───────────────────────┘ 5000:5000└───────────────────────────┘


---
**Autor:** Pablo Moliz Arias - TFG Ingeniería Informática