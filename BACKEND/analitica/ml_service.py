# analitica/ml_service.py
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
from django.utils import timezone
import joblib
import os
from django.conf import settings
import numpy as np # Asegúrate de que numpy esté instalado (pip install numpy)

# Importa tus modelos
from ventas.models import Venta, DetalleVenta
from usuario.models import Producto

MODEL_PATH = os.path.join(settings.BASE_DIR, 'ml_models', 'sales_model.joblib')

def prepare_data():
    """
    Extrae datos de la BD de Django y los convierte en un DataFrame de Pandas
    para entrenamiento.
    """
    print("[ML Service] Extrayendo datos de la base de datos...")
    
    # --- ¡CORRECCIÓN DE ERROR 500! ---
    # 'COMPLETADA' ya no existe. Usamos 'ENTREGADO' (cuyo código es 'OK')
    # para entrenar el modelo, ya que son ventas confirmadas.
    ventas_qs = Venta.objects.filter(estado=Venta.EstadoVenta.ENTREGADO).values(
        'fecha_venta', 
        'total'
    )
    # --- FIN DE CORRECCIÓN ---
    
    if not ventas_qs.exists():
        print("[ML Service] No hay datos de ventas 'Entregadas' para entrenar.")
        return None

    df = pd.DataFrame(list(ventas_qs))
    
    if df.empty:
        return None

    print(f"[ML Service] Datos cargados en DataFrame. {len(df)} registros encontrados.")
    
    # --- Ingeniería de Características (Feature Engineering) ---
    df['fecha_venta'] = pd.to_datetime(df['fecha_venta'])
    
    df['anio'] = df['fecha_venta'].dt.year
    df['mes'] = df['fecha_venta'].dt.month
    df['dia_del_mes'] = df['fecha_venta'].dt.day
    df['dia_de_la_semana'] = df['fecha_venta'].dt.dayofweek
    df['dia_del_anio'] = df['fecha_venta'].dt.dayofyear
    
    df['total'] = pd.to_numeric(df['total'])
    
    # Agrupar ventas por día (simplificación)
    df.set_index('fecha_venta', inplace=True)
    df_diario = df.resample('D').agg({
        'total': 'sum',
        'anio': 'first',
        'mes': 'first',
        'dia_del_mes': 'first',
        'dia_de_la_semana': 'first',
        'dia_del_anio': 'first'
    })
    
    df_diario['total'] = df_diario['total'].fillna(0)
    df_diario = df_diario.ffill() # Rellenar fechas
    df_diario.dropna(inplace=True) 

    print("[ML Service] Feature engineering completado.")
    return df_diario

def train_sales_model():
    """
    Carga datos, entrena un RandomForestRegressor y guarda el modelo en un archivo.
    """
    df = prepare_data()
    if df is None or df.empty or len(df) < 10: # Añadido un chequeo de longitud mínima
        print(f"[ML Service] Abortando entrenamiento: no hay suficientes datos (se encontraron {len(df) if df is not None else 0}).")
        return False

    features = ['anio', 'mes', 'dia_del_mes', 'dia_de_la_semana', 'dia_del_anio']
    target = 'total'

    X = df[features]
    y = df[target]
    
    if X.empty or y.empty:
        print("[ML Service] Abortando entrenamiento: X o y están vacíos después de procesar.")
        return False

    # Asegurarse de que haya suficientes datos para dividir
    if len(X) < 5: # Necesitas al menos 2 muestras para train_test_split
         print(f"[ML Service] No hay suficientes muestras ({len(X)}) para dividir en entrenamiento/prueba.")
         return False
         
    # Ajustar test_size si hay muy pocos datos
    test_size = 0.2 if len(X) >= 10 else 1 # Usar 1 muestra para test si hay menos de 10
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
    
    if X_test.empty or y_test.empty:
        print("[ML Service] Conjunto de prueba vacío, ajustando...")
        # Fallback: usar todo para entrenar si la división falla
        X_train, y_train = X, y
        X_test, y_test = X.iloc[:1], y.iloc[:1] # Usar una muestra para evaluación dummy

    print(f"[ML Service] Entrenando modelo RandomForestRegressor con {len(X_train)} muestras...")
    
    model = RandomForestRegressor(
        n_estimators=100, 
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    
    mse = mean_squared_error(y_test, predictions)
    rmse = np.sqrt(mse) 

    print(f"[ML Service] Entrenamiento completado. RMSE (Error): {rmse:.2f} Bs.")
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"[ML Service] Modelo guardado exitosamente en: {MODEL_PATH}")
    
    return True

def get_sales_prediction(dias_a_predecir=30):
    """
    Carga el modelo guardado y predice las ventas para los próximos 'dias_a_predecir' días.
    """
    print("[ML Service] Cargando modelo para predicción...")
    try:
        model = joblib.load(MODEL_PATH)
    except FileNotFoundError:
        print("[ML Service] Error: Archivo del modelo no encontrado. Entrena el modelo primero.")
        return None

    base_date = timezone.now()
    
    future_dates = pd.date_range(start=base_date, periods=dias_a_predecir, freq='D')
    
    X_future = pd.DataFrame({
        'anio': future_dates.year,
        'mes': future_dates.month,
        'dia_del_mes': future_dates.day,
        'dia_de_la_semana': future_dates.dayofweek,
        'dia_del_anio': future_dates.dayofyear
    })

    print(f"[ML Service] Realizando predicción para los próximos {dias_a_predecir} días...")
    future_predictions = model.predict(X_future)
    
    results = []
    for i, date in enumerate(future_dates):
        results.append({
            'fecha': date.strftime('%Y-%m-%d'),
            'prediccion_total_bs': round(float(future_predictions[i]), 2)
        })
        
    return results