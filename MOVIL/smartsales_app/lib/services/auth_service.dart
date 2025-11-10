// lib/services/auth_service.dart
import 'package:dio/dio.dart';
import 'package:smartsales_app/models/user_model.dart'; // 1. Importar el modelo User
import 'api_config.dart';

class AuthService {
  final Dio _dio = Dio();

  // --- Helper para la Configuración de Auth (estilo Dio) ---
  Options _getAuthConfig(String token) {
    return Options(
      headers: {
        'Authorization': 'Token $token',
        'Content-Type': 'application/json',
      },
    );
  }

  // --- TUS FUNCIONES EXISTENTES (Están perfectas) ---
  
  Future<String> login(String username, String password) async {
    try {
      final response = await _dio.post(
        '${ApiConfig.baseUrl}/auth/login/',
        data: { 'username': username, 'password': password },
      );
      if (response.data['token'] != null) {
        return response.data['token'];
      } else {
        throw Exception('Token no encontrado');
      }
    } on DioException catch (e) {
      print('Error en login: ${e.response?.data}');
      throw Exception('Error al iniciar sesión: Credenciales inválidas');
    }
  }

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
        '${ApiConfig.baseUrl}/api/auth/register/',
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

  Future<Map<String, dynamic>> requestPasswordReset(String email) async {
    try {
      final response = await _dio.post(
        '${ApiConfig.baseUrl}/api/auth/password/reset/',
        data: {'email': email},
      );
      return response.data;
    } on DioException catch (e) {
      print('Error en requestPasswordReset: ${e.response?.data}');
      throw Exception('Error al solicitar reseteo');
    }
  }

  Future<void> confirmPasswordReset({
    required String uid,
    required String token,
    required String newPassword,
  }) async {
    try {
      await _dio.post(
        '${ApiConfig.baseUrl}/api/auth/password/reset/confirm/',
        data: {
          'uid': uid,
          'token': token,
          'new_password1': newPassword,
          'new_password2': newPassword,
        },
      );
    } on DioException catch (e) {
      print('Error en confirmPasswordReset: ${e.response?.data}');
      final errorMsg = e.response?.data['detail'] ?? 'El enlace es inválido o ha expirado.';
      throw Exception(errorMsg);
    }
  }

  // --- ❗️ INICIO: NUEVAS FUNCIONES DE PERFIL ❗️ ---

  /// (GET /api/profile/) Obtiene los datos del perfil del usuario.
  Future<User> getProfile(String token) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.baseUrl}/api/profile/',
        options: _getAuthConfig(token),
      );
      return User.fromJson(response.data);
    } on DioException catch (e) {
      print('Error en getProfile: ${e.response?.data}');
      throw Exception('Error al cargar el perfil');
    }
  }

  /// (PATCH /api/profile/) Actualiza datos del perfil.
  Future<User> updateProfile(String token, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch(
        '${ApiConfig.baseUrl}/api/profile/',
        data: data,
        options: _getAuthConfig(token),
      );
      return User.fromJson(response.data);
    } on DioException catch (e) {
      print('Error en updateProfile: ${e.response?.data}');
      final errorMsg = e.response?.data['email']?[0] ?? 'Error al actualizar el perfil';
      throw Exception(errorMsg);
    }
  }

  /// (POST /api/auth/password/change/) Cambia la contraseña del usuario.
  Future<void> changePassword(String token, Map<String, String> passwordData) async {
    try {
      await _dio.post(
        '${ApiConfig.baseUrl}/api/auth/password/change/',
        data: passwordData,
        options: _getAuthConfig(token),
      );
    } on DioException catch (e) {
      print('Error en changePassword: ${e.response?.data}');
      final errorMsg = e.response?.data['old_password']?[0] ??
                       e.response?.data['new_password2']?[0] ??
                       'Error al cambiar la contraseña';
      throw Exception(errorMsg);
    }
  }

  /// (POST /api/auth/logout/) Cierra la sesión en el servidor.
  Future<void> serverLogout(String token) async {
    try {
      await _dio.post(
        '${ApiConfig.baseUrl}/api/auth/logout/',
        options: _getAuthConfig(token),
      );
    } on DioException {
      print('Error en server logout (ignorable)');
    }
  }
}