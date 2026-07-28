import pandas as pd
import networkx as nx
import os

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

    # 2. Leer Nodos
    # Usamos sep='\s+' para que funcione tanto con Tabs como con Espacios
    # Las columnas son: X, Y, Z, Color, Tamaño, Etiqueta
    try:
        df_nodes = pd.read_csv(node_path, sep=r'\s+', header=None, names=['x', 'y', 'z', 'color_id', 'size', 'label'])
    except Exception as e:
        print(f"Error leyendo nodos: {e}")
        return None

    # 3. Leer Aristas (Matriz de adyacencia)
    try:
        df_adj = pd.read_csv(edge_path, sep=r'\s+', header=None)
    except Exception as e:
        print(f"Error leyendo aristas: {e}")
        return None

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

    # 6. Enriquecer el grafo con datos de posición, etiquetas y grado
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
        })

    # 7. Preparar enlaces (Edges), ordenados por peso descendente (RF 5)
    links_data = [
        {"source": int(u), "target": int(v), "value": float(w)}
        for u, v, w in G.edges(data='weight')
    ]
    links_data.sort(key=lambda link: link["value"], reverse=True)

    pesos = [link["value"] for link in links_data]

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
        }
    }

    return graph_json
