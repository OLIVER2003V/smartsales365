import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
from django.utils import timezone
import joblib
import os
from django.conf import settings
import numpy as np 

from ventas.models import Venta

MODEL_PATH = os.path.join(settings.BASE_DIR, 'ml_models', 'sales_model.joblib')

# --- ¡NUEVO! ---
# Mapas para traducir los números a texto legible
DAY_MAP = { 0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 3: 'Jueves', 4: 'Viernes', 5: 'Sábado', 6: 'Domingo' }
MONTH_MAP = { 1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre' }
# --- FIN NUEVO ---

def prepare_data():
    """
    Extrae datos de la BD de Django y los convierte en un DataFrame de Pandas
    para entrenamiento.
    """
    print("[ML Service] Extrayendo datos de la base de datos...")
    
    ventas_qs = Venta.objects.filter(estado=Venta.EstadoVenta.ENTREGADO).values(
        'fecha_venta', 
        'total'
    )
    
    if not ventas_qs.exists():
        print("[ML Service] No hay datos de ventas 'Entregadas' para entrenar.")
        return None

    df = pd.DataFrame(list(ventas_qs))
    
    if df.empty:
        return None

    print(f"[ML Service] Datos cargados en DataFrame. {len(df)} registros encontrados.")
    
    df['fecha_venta'] = pd.to_datetime(df['fecha_venta'])
    df['total'] = pd.to_numeric(df['total'])
    
    df.set_index('fecha_venta', inplace=True)
    df_diario = df.resample('D').agg({
        'total': 'sum'
    })
    
    df_diario['total'] = df_diario['total'].fillna(0)
    
    df_diario['anio'] = df_diario.index.year
    df_diario['mes'] = df_diario.index.month
    df_diario['dia_del_mes'] = df_diario.index.day
    df_diario['dia_de_la_semana'] = df_diario.index.dayofweek
    df_diario['dia_del_anio'] = df_diario.index.dayofyear
    
    df_diario = df_diario.ffill() 
    df_diario.dropna(inplace=True) 

    print("[ML Service] Feature engineering completado.")
    # Devolvemos df_diario, que tiene todas las columnas
    return df_diario

def train_sales_model():
    """
    Carga datos, entrena un RandomForestRegressor y guarda el modelo,
    el error (RMSE) Y LOS INSIGHTS (tendencias).
    """
    df = prepare_data()
    if df is None or df.empty or len(df) < 10: 
        print(f"[ML Service] Abortando entrenamiento: no hay suficientes datos (se encontraron {len(df) if df is not None else 0}).")
        return False

    features = ['anio', 'mes', 'dia_del_mes', 'dia_de_la_semana', 'dia_del_anio']
    target = 'total'

    X = df[features]
    y = df[target]
    
    if X.empty or y.empty:
        print("[ML Service] Abortando entrenamiento: X o y están vacíos después de procesar.")
        return False

    test_size = 0.2 if len(X) >= 10 else 1
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
    
    if X_test.empty or y_test.empty:
        X_train, y_train = X, y
        X_test, y_test = X.iloc[:1], y.iloc[:1] 

    print(f"[ML Service] Entrenando modelo RandomForestRegressor con {len(X_train)} muestras...")
    
    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    rmse = np.sqrt(mse)

    print(f"[ML Service] Entrenamiento completado. RMSE (Error): {rmse:.2f} Bs.")
    
    # --- ¡NUEVO! EXTRACCIÓN DE INSIGHTS ---
    print("[ML Service] Extrayendo insights y tendencias...")
    
    # 1. Importancia de Características
    importances = model.feature_importances_
    # Creamos una lista de tuplas (nombre_feature, importancia) y la ordenamos
    feature_importances = sorted(
        zip(features, importances), 
        key=lambda x: x[1], 
        reverse=True
    )
    
    # 2. Tendencias de Datos (Usamos el DataFrame 'df' completo)
    
    # Tendencia Semanal
    weekly_trend_series = df.groupby('dia_de_la_semana')['total'].mean().sort_index()
    weekly_trend = [
        {'dia': DAY_MAP.get(day_num, day_num), 'promedio_bs': round(avg, 2)}
        for day_num, avg in weekly_trend_series.items()
    ]
    # Reordenar para que empiece en Lunes y termine en Domingo (opcional pero útil)
    weekly_trend = sorted(weekly_trend, key=lambda x: list(DAY_MAP.values()).index(x['dia']))

    # Tendencia Mensual
    monthly_trend_series = df.groupby('mes')['total'].mean().sort_index()
    monthly_trend = [
        {'mes': MONTH_MAP.get(month_num, month_num), 'promedio_bs': round(avg, 2)}
        for month_num, avg in monthly_trend_series.items()
    ]
    # Reordenar por mes
    monthly_trend = sorted(monthly_trend, key=lambda x: list(MONTH_MAP.values()).index(x['mes']))

    # --- FIN DE INSIGHTS ---

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    # --- CAMBIO IMPORTANTE ---
    # Guardamos todo en el archivo
    model_data = {
        'model': model,
        'rmse': rmse,
        'fecha_entrenamiento': timezone.now(),
        'insights': {
            'feature_importances': feature_importances,
            'weekly_trend': weekly_trend,
            'monthly_trend': monthly_trend
        }
    }
    joblib.dump(model_data, MODEL_PATH)
    # --- FIN DEL CAMBIO ---
    
    print(f"[ML Service] Modelo, RMSE e Insights guardados en: {MODEL_PATH}")
    
    return True

def get_sales_prediction(dias_a_predecir=30):
    """
    Carga el modelo guardado y predice.
    Devuelve: (lista_de_predicciones, dict_de_metadatos)
    """
    print("[ML Service] Cargando modelo para predicción...")
    try:
        model_data = joblib.load(MODEL_PATH)
        model = model_data['model']
        
        # --- CAMBIO IMPORTANTE ---
        # Empaquetamos TODOS los metadatos en un solo diccionario
        metadata = {
            'rmse': model_data.get('rmse'),
            'fecha_entrenamiento': model_data.get('fecha_entrenamiento'),
            'insights': model_data.get('insights') # Esto contendrá las tendencias
        }
        print(f"[ML Service] Modelo cargado. RMSE: {metadata.get('rmse'):.2f} Bs.")
        
    except FileNotFoundError:
        print("[ML Service] Error: Archivo del modelo no encontrado.")
        return None, None # (predictions, metadata)
    except KeyError:
        # Esto pasa si el modelo guardado es antiguo (no tiene 'rmse', 'insights', etc.)
        print("[ML Service] Error: El archivo del modelo es antiguo. Re-entrenando...")
        return None, None # (predictions, metadata)
    except Exception as e:
        print(f"[ML Service] Error desconocido al cargar modelo: {e}")
        return None, None

    # (El resto de la lógica de predicción no cambia)
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
            'prediccion_total_bs': max(0, round(float(future_predictions[i]), 2))
        })
        
    # --- CAMBIO IMPORTANTE ---
    # Devolvemos las predicciones y el paquete completo de metadatos
    return results, metadata