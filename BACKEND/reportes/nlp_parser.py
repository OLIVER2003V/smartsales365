# ventas/nlp_parser.py
import spacy
from datetime import datetime
# Podrías necesitar importar modelos de Django para buscar productos/clientes por nombre
# from usuario.models import Producto, Cliente

# Cargar el modelo de español una sola vez al iniciar
try:
    nlp = spacy.load("es_core_news_sm")
    print("spaCy model 'es_core_news_sm' loaded successfully.")
except OSError:
    print("spaCy model 'es_core_news_sm' not found. Please run: python -m spacy download es_core_news_sm")
    nlp = None # Manejar el caso donde el modelo no está

def interpretar_prompt(texto_prompt):
    """
    Analiza el texto del prompt usando spaCy para extraer:
    - Tipo de reporte (ventas, productos, clientes)
    - Formato (pdf, excel)
    - Filtros de fecha (mes, rango)
    - Filtros de entidad (producto específico, cliente específico)
    - Agrupaciones
    Retorna un diccionario estructurado con la información extraída.
    """
    if not nlp:
        return {"error": "Modelo NLP no cargado."}

    doc = nlp(texto_prompt.lower()) # Procesar texto en minúsculas

    # --- Inicializar resultados ---
    resultado = {
        "tipo_reporte": None, # 'ventas', 'productos', 'clientes'
        "formato": "pantalla", # pdf, excel, pantalla (default)
        "filtros": {
            "fecha_inicio": None,
            "fecha_fin": None,
            "cliente_id": None,
            "producto_id": None,
            # ... otros filtros
        },
        "agrupacion": None, # 'producto', 'cliente', 'mes'
        "orden": None,
        "error": None
    }

    # --- Lógica de Extracción (Ejemplos Iniciales) ---

    # 1. Identificar Formato
    if "pdf" in texto_prompt:
        resultado["formato"] = "pdf"
    elif "excel" in texto_prompt:
        resultado["formato"] = "excel"

    # 2. Identificar Tipo de Reporte (palabras clave simples por ahora)
    if "venta" in texto_prompt or "ventas" in texto_prompt:
        resultado["tipo_reporte"] = "ventas"
    elif "producto" in texto_prompt or "productos" in texto_prompt or "inventario" in texto_prompt:
         # Cuidado: "producto" puede ser filtro o tipo. Necesitamos más contexto.
         # Por ahora, si no es ventas, asumimos productos si aparece la palabra.
         if not resultado["tipo_reporte"]: resultado["tipo_reporte"] = "productos"
    elif "cliente" in texto_prompt or "clientes" in texto_prompt:
         if not resultado["tipo_reporte"]: resultado["tipo_reporte"] = "clientes"

    # 3. Identificar Fechas (Usando NER de spaCy)
    fechas_encontradas = []
    for ent in doc.ents:
        if ent.label_ == "DATE" or ent.label_ == "TIME": # spaCy puede detectar fechas y tiempos
            print(f"[NLP] Date/Time Entity Found: '{ent.text}' (Label: {ent.label_})")
            # --- Lógica más avanzada necesaria aquí ---
            # Necesitas convertir 'ent.text' (ej. "septiembre", "ayer", "del 1 al 10 de octubre")
            # a objetos datetime (fecha_inicio, fecha_fin).
            # Esto puede requerir librerías adicionales como 'dateparser' o reglas manuales.
            # Ejemplo MUY BÁSICO (solo para ilustrar):
            if "septiembre" in ent.text:
                 # Asumir septiembre del año actual (necesita lógica real)
                 resultado["filtros"]["fecha_inicio"] = datetime(datetime.now().year, 9, 1)
                 resultado["filtros"]["fecha_fin"] = datetime(datetime.now().year, 9, 30, 23, 59, 59)
            # Añadir lógica para rangos "del X al Y", "mes pasado", etc.

    # 4. Identificar Agrupación (palabras clave)
    if "agrupado por producto" in texto_prompt:
        resultado["agrupacion"] = "producto"
    elif "agrupado por cliente" in texto_prompt:
        resultado["agrupacion"] = "cliente"

    # 5. Identificar Filtros de Entidad (Productos/Clientes - más complejo)
    # Necesitarías buscar nombres en el texto y compararlos con tu DB
    # Ejemplo conceptual:
    # for token in doc:
    #     if token.pos_ == "PROPN": # Buscar nombres propios
    #         # producto = Producto.objects.filter(nombre__iexact=token.text).first()
    #         # if producto: resultado["filtros"]["producto_id"] = producto.id
    #         # cliente = Cliente.objectsfilter(nombre__icontains=token.text).first() # Búsqueda más flexible
    #         # if cliente: resultado["filtros"]["cliente_id"] = cliente.id
    #         pass # Implementar búsqueda real en DB

    # Validación final
    if not resultado["tipo_reporte"]:
        resultado["error"] = "No se pudo determinar el tipo de reporte solicitado (ventas, productos, clientes)."

    print("[NLP] Interpretation Result:", resultado)
    return resultado