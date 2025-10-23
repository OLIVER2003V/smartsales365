// lib/services/auth_service.dart
import 'package:dio/dio.dart';

class AuthService {
  // ❗️ Reemplaza esta IP con la IP local de TU computadora
  final String _baseUrl = 'http://192.168.100.148/api'; 
  final Dio _dio = Dio();

  // Función para Iniciar Sesión
  Future<String> login(String username, String password) async {
    try {
      final response = await _dio.post(
        '${_baseUrl.replaceAll("/api", "")}/auth/login/', // Ajuste para el endpoint de login de authtoken
        data: {
          'username': username,
          'password': password,
        },
      );
      // Django-rest-framework authtoken devuelve el token en la clave 'token'
      if (response.data['token'] != null) {
        return response.data['token'];
      } else {
        throw Exception('Token no encontrado en la respuesta');
      }
    } on DioException catch (e) {
      // Manejar errores de la petición
      print('Error en login: ${e.response?.data}');
      throw Exception('Error al iniciar sesión: Credenciales inválidas');
    }
  }

  // Función para Registrar un Usuario
  Future<void> register({
    required String username,
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String edad,
  }) async {
    try {
      await _dio.post(
        '$_baseUrl/auth/register/',
        data: {
          'username': username,
          'email': email,
          'password': password,
          'first_name': firstName,
          'last_name': lastName,
          'edad': int.tryParse(edad) ?? 0,
        },
      );
    } on DioException catch (e) {
      print('Error en registro: ${e.response?.data}');
      throw Exception('Error al registrar: ${e.response?.data.toString()}');
    }
  }

  // Función para Solicitar Reseteo de Contraseña
  Future<Map<String, dynamic>> requestPasswordReset(String email) async {
    try {
      final response = await _dio.post(
        '$_baseUrl/auth/password/reset/',
        data: {'email': email},
      );
      return response.data;
    } on DioException catch (e) {
      print('Error en requestPasswordReset: ${e.response?.data}');
      throw Exception('Error al solicitar reseteo');
    }
  }

  // Función para Confirmar la nueva contraseña
  Future<void> confirmPasswordReset({
    required String uid,
    required String token,
    required String newPassword,
  }) async {
    try {
      await _dio.post(
        '$_baseUrl/auth/password/reset/confirm/',
        data: {
          'uid': uid,
          'token': token,
          'new_password1': newPassword,
          'new_password2': newPassword,
        },
      );
    } on DioException catch (e) {
      print('Error en confirmPasswordReset: ${e.response?.data}');
      // Devuelve el mensaje específico del backend si es posible
      final errorMsg = e.response?.data['detail'] ?? 'El enlace es inválido o ha expirado.';
      throw Exception(errorMsg);
    }
  }
}