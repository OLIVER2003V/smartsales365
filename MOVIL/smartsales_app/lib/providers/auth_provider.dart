// lib/providers/auth_provider.dart
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smartsales_app/models/user_model.dart';     // 1. Importar User
import 'package:smartsales_app/services/auth_service.dart'; // 2. Importar AuthService

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService(); // 3. Instanciar servicio
  String? _token;
  User? _user; // 4. Añadir estado de usuario

  // --- Getters ---
  String? get token => _token;
  User? get user => _user; // 5. Getter público para el usuario
  bool get isAuthenticated => _token != null;

  /// (NUEVO) Inicia sesión, guarda token y obtiene perfil
  Future<void> login(String username, String password) async {
    try {
      // 1. Llama al servicio para obtener token
      final token = await _authService.login(username, password);

      // 2. Guarda el token en SharedPreferences (usando tu lógica)
      await _setToken(token);

      // 3. Obtiene los datos del usuario
      await refreshUser(); // refreshUser notificará a los listeners
    
    } catch (e) {
      // Si falla, limpia todo por si acaso
      await _clearLocalData();
      rethrow; // Propaga el error a la pantalla de login
    }
  }

  /// (MODIFICADO) Cierra sesión local y del servidor
  Future<void> logout() async {
    if (_token != null) {
      await _authService.serverLogout(_token!); // Llama a la API de logout
    }
    await _clearLocalData(); // Limpia datos locales
  }

  /// (MODIFICADO) Intenta auto-login al iniciar la app
  Future<bool> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey('token')) {
      return false;
    }

    _token = prefs.getString('token');
    if (_token == null) return false;

    try {
      await refreshUser(); // Carga los datos del usuario
      return true;
    } catch (e) {
      // Si el token es inválido, limpia
      await _clearLocalData();
      return false;
    }
  }

  /// (NUEVO) Refresca los datos del usuario desde el servidor
  Future<void> refreshUser() async {
    if (_token == null) throw Exception('No hay token');
    try {
      _user = await _authService.getProfile(_token!);
      notifyListeners();
    } catch (e) {
      // Si falla (ej. token expiró), hacemos logout
      await _clearLocalData();
      rethrow;
    }
  }

  /// (NUEVO) Actualiza el perfil en el servidor y refresca el estado local
  Future<void> updateProfile(Map<String, dynamic> data) async {
    if (_token == null) throw Exception('No autenticado');

    try {
      // 1. Llama a la API para actualizar
      final updatedUser = await _authService.updateProfile(_token!, data);
      
      // 2. Si tiene éxito, actualiza el usuario local
      _user = updatedUser;
      notifyListeners();
    
    } catch (e) {
      // Propaga el error (ej. "Email ya existe")
      rethrow;
    }
  }

  // --- Tus funciones de SharedPreferences (ahora privadas) ---
  
  Future<void> _setToken(String? token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove('token');
    } else {
      await prefs.setString('token', token);
    }
    // No notificamos aquí, login() y logout() lo harán
  }

  Future<void> _clearLocalData() async {
    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    notifyListeners();
  }
}