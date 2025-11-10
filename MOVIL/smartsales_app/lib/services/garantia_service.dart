// lib/services/garantia_service.dart
import 'package:dio/dio.dart';
import 'package:smartsales_app/models/garantia_model.dart';
import 'api_config.dart';

class GarantiaService {
  final Dio _dio = Dio();

  /// Consulta el estado de una garantía usando su código UUID.
  /// (GET /api/consultar-garantia/?codigo=...)
  Future<GarantiaResultado> consultarGarantia(String codigo) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/consultar-garantia/',
        queryParameters: {
          'codigo': codigo, // Envía el código como query param
        },
      );
      // La API devuelve directamente el objeto de resultado
      return GarantiaResultado.fromJson(response.data);
    } on DioException catch (e) {
      // Lanza el error específico del backend si existe
      final message = e.response?.data?['error'] ?? e.message ?? "Ocurrió un error";
      throw Exception(message);
    } catch (e) {
      throw Exception("Error inesperado al consultar la garantía.");
    }
  }
}