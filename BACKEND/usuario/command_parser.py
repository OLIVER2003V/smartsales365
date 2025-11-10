# usuario/command_parser.py
import re
from .models import Producto
from django.db.models import Q

# --- Definición de Palabras Clave ---

# Mapeo simple de números en texto a enteros
NUMEROS = {
    'un': 1, 'uno': 1, 'una': 1,
    'dos': 2, 'tres': 3, 'cuatro': 4,
    'cinco': 5, 'seis': 6, 'siete': 7,
    'ocho': 8, 'nueve': 9, 'diez': 10,
}

# Palabras clave que indican una acción
ACCIONES_AGREGAR = ['agregar', 'añadir', 'quiero', 'dame', 'pon', 'mete', 'compra', 'comprar']
ACCIONES_QUITAR = ['quitar', 'eliminar', 'remover', 'saca', 'borra']

# Palabras "ruido" que ignoraremos al buscar el producto
STOP_WORDS = [
    'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 
    'por', 'favor', 'al', 'del', 'carrito', 'mi', 'y' # 'y' también es ruido
]

def normalizar_texto(texto: str) -> str:
    """
    Convierte a minúsculas, quita puntuación y espacios extra.
    """
    texto = texto.lower()
    # Quita todo lo que no sea una letra, número o espacio
    texto = re.sub(r'[^\w\s]', '', texto)
    return texto.strip()

def parsear_comando_carrito(comando_texto: str) -> dict:
    """
    Procesa un comando de texto para extraer acción, cantidad y términos de búsqueda.
    """
    texto = normalizar_texto(comando_texto)
    palabras = texto.split()
    
    if not palabras:
        return {'error': 'No entendí qué producto deseas.'}

    accion = None
    cantidad = 1
    terminos_busqueda = []

    # --- LÓGICA MEJORADA DE ACCIÓN ---
    # Este bucle "come" todas las palabras de acción al inicio.
    # Ej: "quiero agregar dos cocinas"
    # 1. "quiero" es acción -> accion='agregar', palabras=['agregar', 'dos', 'cocinas']
    # 2. "agregar" es acción -> accion='agregar', palabras=['dos', 'cocinas']
    # 3. "dos" NO es acción -> break
    
    accion_encontrada = False
    while palabras:
        palabra_actual = palabras[0]
        if palabra_actual in ACCIONES_AGREGAR:
            accion = 'agregar'
            palabras = palabras[1:] # "Come" la palabra de acción
            accion_encontrada = True
        elif palabra_actual in ACCIONES_QUITAR:
            accion = 'quitar'
            palabras = palabras[1:] # "Come" la palabra de acción
            accion_encontrada = True
        else:
            # La palabra no es de acción, termina el bucle
            break 
    
    # Si no se dijo ninguna acción explícita (ej: "dos cocinas"), asumimos 'agregar'
    if not accion_encontrada:
        accion = 'agregar'
    # --- FIN DE LÓGICA MEJORADA ---

    # 2. Detectar Cantidad
    if not palabras:
        # Esto pasa si el usuario solo dijo "quita" o "agrega"
        return {'error': 'No entendí qué producto deseas.'}

    primera_palabra = palabras[0]
    
    if primera_palabra.isdigit():
        try:
            cantidad = int(primera_palabra)
            palabras = palabras[1:] # Quitar la cantidad de la lista
        except ValueError:
            pass # No era un número, lo tratamos como parte del nombre
            
    elif primera_palabra in NUMEROS:
        cantidad = NUMEROS[primera_palabra]
        palabras = palabras[1:] # Quitar la cantidad de la lista

    # 3. Limpiar Stop Words y obtener términos de búsqueda
    for p in palabras:
        if p not in STOP_WORDS:
            terminos_busqueda.append(p)
    
    if not terminos_busqueda:
         return {'error': 'No especificaste un producto para buscar.'}

    return {
        'accion': accion,
        'cantidad': cantidad,
        'terminos_busqueda': terminos_busqueda
    }

def buscar_producto_por_terminos(terminos: list):
    """
    Busca un producto en la BD usando los términos de búsqueda.
    Intenta encontrar el producto que coincida con TODOS los términos.
    """
    if not terminos:
        return None
    
    # Creamos una consulta 'Y' (AND) para todos los términos
    query = Q()
    for termino in terminos:
        query &= (
            Q(nombre__icontains=termino) |
            Q(marca__icontains=termino) |
            Q(modelo__icontains=termino)
        )
    
    productos_encontrados = Producto.objects.filter(query)
    
    if productos_encontrados.count() == 1:
        return productos_encontrados.first()
        
    elif productos_encontrados.count() > 1:
        print(f"Advertencia: Búsqueda AND ambigua para '{terminos}'. Devolviendo el primero.")
        return productos_encontrados.first() 
        
    else:
        # No se encontró nada con 'Y', intentamos con 'O' (OR)
        query_or = Q()
        for termino in terminos:
            query_or |= (
                Q(nombre__icontains=termino) |
                Q(marca__icontains=termino) |
                Q(modelo__icontains=termino)
            )
        productos_or = Producto.objects.filter(query_or)
        
        if productos_or.exists():
             print(f"Advertencia: No hubo coincidencia 'AND' para '{terminos}'. Devolviendo el primer resultado 'OR'.")
             return productos_or.first()
             
        return None