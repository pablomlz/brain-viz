# Requisitos del software — Brain Viz

> **La especificación completa y vigente de los requisitos está en el capítulo 2
> de la memoria del TFG** (`doc/secciones/02_requisitos.tex`, compilado en
> `doc/proyecto.pdf`).
>
> Este documento es solo un resumen de consulta rápida. Mantener dos
> especificaciones completas en paralelo provocó en su momento que ambas se
> desincronizaran, así que la memoria es la **única fuente de verdad**: ante
> cualquier discrepancia, prevalece lo que diga el capítulo 2.

## Perfiles de usuario

Los roles se heredan en el orden **Administrador ⊃ Investigador ⊃ Visitante**:

| Sigla | Rol | Puede hacer |
|:---:|---|---|
| **[V]** | Visitante | Explorar las redes públicas sin registro: visualizar, navegar, filtrar, inspeccionar nodos, consultar métricas y personalizar la vista |
| **[I]** | Investigador | Todo lo anterior, más cargar sus propias redes, gestionar sus conjuntos de datos privados y exportar resultados |
| **[A]** | Administrador | Todo lo anterior, más gestionar el catálogo de redes públicas y los usuarios del sistema |

## Requisitos funcionales

La prioridad determina el sprint en que se implementa cada requisito: primero los
más prioritarios, de modo que si alguno quedara sin implementar fuese de los
menos importantes.

| RF | Resumen | Rol mínimo | Prioridad | Estado |
|:---:|---|---|:---:|:---:|
| RF 1 | Acceso como visitante y exploración de redes públicas | Visitante | 1 | Hecho |
| RF 2 | Visualización 3D de la red (nodos y aristas) | Visitante | 1 | Hecho |
| RF 2.1 | Procesamiento en el servidor y exposición mediante una API | Visitante | 1 | Hecho |
| RF 3 | Navegación con cámara orbital | Visitante | 1 | Hecho |
| RF 4 | Panel de estadísticas globales (HUD) | Visitante | 1 | Hecho |
| RF 5 | Filtrado de aristas por umbral de peso | Visitante | 2 | Hecho |
| RF 6 | Selección e inspección de un nodo | Visitante | 2 | Hecho |
| RF 7 | Coloreado de nodos por grupo o lóbulo | Visitante | 2 | Hecho |
| RF 6.1 | Métricas de centralidad por nodo | Visitante | 3 | Hecho |
| RF 8 | Métricas globales de la red (en el servidor) | Visitante | 3 | Hecho |
| RF 9 | Mapeo visual de métricas (tamaño/color) | Visitante | 3 | Hecho |
| RF 10 | Búsqueda de nodo por etiqueta | Visitante | 3 | Hecho |
| RF 11 | Personalización y restablecimiento de la vista | Visitante | 4 | Pendiente |
| RF 12 | Exportación de la vista como imagen | Visitante | 4 | Pendiente |
| RF 13 | Registro e inicio de sesión | Investigador | 4 | Pendiente |
| RF 14 | Carga de redes propias | Investigador | 4 | Pendiente |
| RF 14.1 | Validación de los ficheros cargados | Investigador | 4 | Pendiente |
| RF 15 | Gestión de conjuntos de datos propios | Investigador | 4 | Pendiente |
| RF 16 | Exportación de métricas | Investigador | 4 | Pendiente |
| RF 17 | Gestión del catálogo de redes públicas | Administrador | 4 | Pendiente |
| RF 18 | Gestión de usuarios | Administrador | 4 | Pendiente |
| RF 18.1 | Asignación y revocación del rol de investigador | Administrador | 4 | Pendiente |

## Requisitos no funcionales

| RNF | Resumen |
|:---:|---|
| RNF 1 | Rendimiento gráfico fluido en la manipulación del modelo 3D |
| RNF 2 | Confidencialidad de los conjuntos de datos privados |
| RNF 3 | Aviso claro al usuario ante errores ajenos a él |
| RNF 4 | Interfaz intuitiva, utilizable sin documentación externa |
| RNF 5 | Empaquetado en contenedores y despliegue con un único comando |
| RNF 6 | Funcionamiento en los navegadores modernos habituales |

## Requisitos de información

| RI | Resumen |
|:---:|---|
| RI 1 | Fichero de nodos en texto plano: `x y z color_id size label` |
| RI 2 | Fichero de aristas: matriz de adyacencia cuadrada *N×N*, `0` = sin conexión |
| RI 3 | Codificación UTF-8 en todos los datos de entrada |
| RI 4 | Almacenamiento consistente y privado de usuarios y conjuntos de datos |

## Casos de uso

Los quince casos de uso (CU-01 a CU-15), sus diagramas y sus fichas detalladas
—con actor, precondiciones, secuencia, postcondición y excepciones— están en el
apartado 2.3 de la memoria.
