import pandas as pd
import networkx as nx
import numpy as np
import os

def load_brain_graph(node_path, edge_path):
    """
    Lee archivos .node y .edge y devuelve un objeto JSON listo para el frontend.
    """
    
    # 1. Validación de existencia de archivos
    if not os.path.exists(node_path) or not os.path.exists(edge_path):
        raise FileNotFoundError("No se encuentran los archivos de datos AAL90.")

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

    # 4. Crear el Grafo con NetworkX
    # Convertimos la matriz de pandas a matriz numpy para NetworkX
    adj_matrix = df_adj.to_numpy()
    
    # Creamos grafo desde matriz de adyacencia (Graph = no dirigido)
    G = nx.from_numpy_array(adj_matrix, create_using=nx.Graph)

    # 5. Enriquecer el grafo con datos de posición y etiquetas
    nodes_data = []
    for i in G.nodes():
        # Obtenemos datos de la fila 'i' del archivo de nodos
        node_info = df_nodes.iloc[i]
        
        # Guardamos atributos en el nodo de NetworkX
        G.nodes[i]['x'] = float(node_info['x'])
        G.nodes[i]['y'] = float(node_info['y'])
        G.nodes[i]['z'] = float(node_info['z'])
        G.nodes[i]['label'] = str(node_info['label'])
        G.nodes[i]['group'] = int(node_info['color_id']) # Útil para colorear por lóbulos
        
        # Preparamos la lista para el JSON (NetworkX node_link_data a veces es muy verborrágico)
        nodes_data.append({
            "id": int(i),
            "label": node_info['label'],
            "x": float(node_info['x']),
            "y": float(node_info['y']),
            "z": float(node_info['z']),
            "group": int(node_info['color_id'])
        })

    # 6. Preparar enlaces (Edges)
    # Filtramos enlaces con peso 0 o muy bajo para no saturar la visualización 3D
    links_data = []
    threshold = 0.1 # Umbral: solo mostrar conexiones con fuerza > 0.1
    
    for u, v, data in G.edges(data=True):
        weight = data.get('weight', 0)
        if weight > threshold:
            links_data.append({
                "source": int(u),
                "target": int(v),
                "value": float(weight)
            })

    # Estructura final para el Frontend
    graph_json = {
        "nodes": nodes_data,
        "links": links_data,
        "meta": {
            "total_nodes": len(nodes_data),
            "total_edges": len(links_data)
        }
    }

    return graph_json