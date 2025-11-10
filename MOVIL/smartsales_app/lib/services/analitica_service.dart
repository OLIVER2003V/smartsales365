import 'package:dio/dio.dart';
import 'package:smartsales_app/models/kpi_model.dart';
import 'package:smartsales_app/models/prediccion_model.dart';
import 'package:smartsales_app/models/historial_model.dart';
import 'package:smartsales_app/models/baja_rotacion_model.dart';
import 'api_config.dart';

class AnaliticaService {
  final Dio _dio = Dio();

  Options _getAuthConfig(String token) {
    return Options(headers: {'Authorization': 'Token $token'});
  }

  Future<KpiModel> getDashboardKPIs(String token) async {
    try {
      // ❗️ CORRECCIÓN: La ruta era /api/kpis/, no /api/analitica/kpis/
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/kpis/',
        options: _getAuthConfig(token),
      );
      return KpiModel.fromJson(response.data);
    } on DioException catch (e) {
      print('Error en getDashboardKPIs: ${e.response?.data}');
      throw Exception('Error al cargar KPIs: ${e.message}');
    }
  }

  Future<List<PrediccionVenta>> getPrediccionesVentas(String token, int dias) async {
    try {
      // ❗️ CORRECCIÓN: La ruta es /api/predicciones/ventas/
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/predicciones/ventas/',
        queryParameters: {'dias': dias},
        options: _getAuthConfig(token),
      );
      List<dynamic> data = response.data;
      return data.map((json) => PrediccionVenta.fromJson(json)).toList();
    } on DioException catch (e) {
      print('Error en getPrediccionesVentas: ${e.response?.data}');
      throw Exception(e.response?.data['error'] ?? 'Error al cargar predicciones');
    }
  }

  Future<Map<String, dynamic>> triggerModelTraining(String token) async {
    try {
      // ❗️ CORRECCIÓN: La ruta es /api/predicciones/entrenar/
      final response = await _dio.post(
        '${ApiConfig.baseUrl}/api/predicciones/entrenar/',
        options: _getAuthConfig(token),
      );
      return response.data;
    } on DioException catch (e) {
      print('Error en triggerModelTraining: ${e.response?.data}');
      throw Exception(e.response?.data['error'] ?? 'Error al re-entrenar');
    }
  }

  Future<List<HistorialResumen>> getHistorialResumen(String token, Map<String, dynamic> filters) async {
    try {
      // ❗️ CORRECCIÓN: La ruta es /api/historial/resumen/
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/historial/resumen/',
        queryParameters: filters,
        options: _getAuthConfig(token),
      );
      List<dynamic> data = response.data;
      return data.map((json) => HistorialResumen.fromJson(json)).toList();
    } on DioException catch (e) {
      print('Error en getHistorialResumen: ${e.response?.data}');
      throw Exception('Error al cargar historial');
    }
  }
  
  Future<List<BajaRotacionProducto>> getProductosBajaRotacion(String token) async {
    try {
      // ❗️ CORRECCIÓN: La ruta es /api/reportes/baja-rotacion/
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/reportes/baja-rotacion/',
        queryParameters: {'periodo': '90', 'limite': 5}, // Coincide con React
        options: _getAuthConfig(token),
      );
      List<dynamic> data = response.data;
      return data.map((json) => BajaRotacionProducto.fromJson(json)).toList();
    } on DioException catch (e) {
      print('Error en getProductosBajaRotacion: ${e.response?.data}');
      throw Exception('Error al cargar baja rotación');
    }
  }
}