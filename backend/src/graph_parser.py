import io
import os

import networkx as nx
import pandas as pd

# Peso mínimo para considerar que existe una conexión. No es el umbral de
# visualización (ese lo controla el usuario en el cliente, RF 5), sino el valor
# a partir del cual la matriz de adyacencia declara una arista.
MIN_WEIGHT = 0.0


def load_brain_graph(node_path, edge_path):
    """
    Lee archivos .node y .edge y devuelve un objeto JSON listo para el frontend.

    La red se envía completa: el filtrado por umbral de peso lo aplica el
    cliente en tiempo real (RF 5), por lo que aquí no se descarta ninguna
    arista existente. Las aristas se devuelven ordenadas por peso descendente
    para que el cliente pueda filtrarlas de forma eficiente.
    """

    # 1. Validación de existencia de archivos
    if not os.path.exists(node_path) or not os.path.exists(edge_path):
        raise FileNotFoundError("No se encuentran los archivos de datos de la red.")

    with open(node_path, encoding='utf-8') as f:
        texto_nodos = f.read()
    with open(edge_path, encoding='utf-8') as f:
        texto_aristas = f.read()

    return parse_brain_graph(texto_nodos, texto_aristas)


def parse_brain_graph(texto_nodos, texto_aristas):
    """
    Procesa el contenido de los ficheros .node y .edge, ya leídos como texto.

    Desde el Sprint 4 las redes que sube un investigador se guardan en la base
    de datos y no como ficheros en disco, así que el procesamiento necesita
    trabajar sobre el contenido y no sobre una ruta. La comprobación de los
    datos [RF 14.1] se realiza aquí, y cualquier problema se comunica con un
    mensaje que explique qué falla [RNF 3].
    """

    # 2. Leer Nodos
    # Usamos sep='\s+' para que funcione tanto con Tabs como con Espacios
    # Las columnas son: X, Y, Z, Color, Tamaño, Etiqueta
    try:
        df_nodes = pd.read_csv(io.StringIO(texto_nodos), sep=r'\s+', header=None,
                               names=['x', 'y', 'z', 'color_id', 'size', 'label'])
    except Exception as e:
        raise ValueError(f"El fichero de nodos no se ha podido interpretar: {e}")

    # 3. Leer Aristas (Matriz de adyacencia)
    try:
        df_adj = pd.read_csv(io.StringIO(texto_aristas), sep=r'\s+', header=None)
    except Exception as e:
        raise ValueError(f"El fichero de conexiones no se ha podido interpretar: {e}")

    if df_nodes.empty or df_adj.empty:
        raise ValueError("Alguno de los ficheros está vacío.")

    # Las tres coordenadas son obligatorias [RI 1]
    if df_nodes[['x', 'y', 'z']].isnull().any().any():
        raise ValueError(
            "El fichero de nodos debe indicar las tres coordenadas (x, y, z) de cada nodo."
        )
    try:
        df_adj = df_adj.astype(float)
    except Exception:
        raise ValueError("La matriz de conexiones debe contener únicamente valores numéricos.")

    adj_matrix = df_adj.to_numpy()

    # 4. Validación de consistencia: la matriz debe ser cuadrada y su dimensión
    #    debe coincidir con el número de nodos declarados en el fichero .node
    filas, columnas = adj_matrix.shape
    if filas != columnas:
        raise ValueError(
            f"La matriz de adyacencia no es cuadrada ({filas}x{columnas})."
        )
    if filas != len(df_nodes):
        raise ValueError(
            f"Dimensiones incongruentes: el fichero de nodos declara {len(df_nodes)} "
            f"nodos y la matriz de adyacencia es de {filas}x{columnas}."
        )

    # 5. Crear el Grafo con NetworkX (Graph = no dirigido)
    G = nx.from_numpy_array(adj_matrix, create_using=nx.Graph)

    # Las aristas de peso nulo no representan conexión: se eliminan del grafo
    # para que el grado de cada nodo sea el real.
    sin_conexion = [(u, v) for u, v, w in G.edges(data='weight') if w is None or w <= MIN_WEIGHT]
    G.remove_edges_from(sin_conexion)

    # 6. Métricas de centralidad de cada nodo (RF 6.1)
    #    Se calculan sobre la topología, sin tener en cuenta los pesos: en estas
    #    redes el peso expresa cuán intensa es una conexión, no lo que cuesta
    #    recorrerla, así que usarlo como distancia daría un resultado engañoso.
    intermediacion = nx.betweenness_centrality(G)
    cercania = nx.closeness_centrality(G)

    # 7. Enriquecer el grafo con datos de posición, etiquetas y grado
    nodes_data = []
    for i in G.nodes():
        node_info = df_nodes.iloc[i]

        # Guardamos atributos en el nodo de NetworkX
        G.nodes[i]['x'] = float(node_info['x'])
        G.nodes[i]['y'] = float(node_info['y'])
        G.nodes[i]['z'] = float(node_info['z'])
        G.nodes[i]['label'] = str(node_info['label'])
        G.nodes[i]['group'] = int(node_info['color_id'])  # Útil para colorear por lóbulos

        nodes_data.append({
            "id": int(i),
            "label": str(node_info['label']),
            "x": float(node_info['x']),
            "y": float(node_info['y']),
            "z": float(node_info['z']),
            "group": int(node_info['color_id']),
            # Grado del nodo en la red completa (número de conexiones), RF 6
            "degree": int(G.degree(i)),
            # Centralidades del nodo (RF 6.1)
            "betweenness": float(intermediacion[i]),
            "closeness": float(cercania[i]),
        })

    # 8. Preparar enlaces (Edges), ordenados por peso descendente (RF 5)
    links_data = [
        {"source": int(u), "target": int(v), "value": float(w)}
        for u, v, w in G.edges(data='weight')
    ]
    links_data.sort(key=lambda link: link["value"], reverse=True)

    pesos = [link["value"] for link in links_data]

    # 9. Métricas globales de la red (RF 8)
    n_nodos = G.number_of_nodes()
    n_aristas = G.number_of_edges()
    metricas = {
        # Proporción de conexiones existentes sobre todas las posibles
        "density": float(nx.density(G)),
        # Número medio de conexiones por nodo
        "avg_degree": float(2 * n_aristas / n_nodos) if n_nodos else 0.0,
        # Tendencia de los vecinos de un nodo a estar conectados entre sí
        "avg_clustering": float(nx.average_clustering(G)),
        # Nº de grupos de nodos entre los que no hay ningún camino
        "components": int(nx.number_connected_components(G)),
    }

    # Estructura final para el Frontend
    graph_json = {
        "nodes": nodes_data,
        "links": links_data,
        "meta": {
            "total_nodes": len(nodes_data),
            "total_edges": len(links_data),
            # Rango de pesos, necesario para calibrar el control de umbral (RF 5)
            "min_weight": float(min(pesos)) if pesos else 0.0,
            "max_weight": float(max(pesos)) if pesos else 0.0,
            # Métricas globales de la red (RF 8)
            "metrics": metricas,
        }
    }

    return graph_json
