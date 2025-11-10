// lib/models/user_model.dart
import 'dart:convert';

// Modelo para el objeto anidado 'cliente_profile'
class ClienteProfile {
  final int id;
  final String nombre;
  final String apellido;
  final String telefono;
  final String nitCi;
  final String direccion;

  ClienteProfile({
    required this.id,
    required this.nombre,
    required this.apellido,
    required this.telefono,
    required this.nitCi,
    required this.direccion,
  });

  factory ClienteProfile.fromJson(Map<String, dynamic> json) {
    return ClienteProfile(
      id: json['id'] ?? 0,
      nombre: json['nombre'] ?? 'N/A',
      apellido: json['apellido'] ?? 'N/A',
      telefono: json['telefono'] ?? 'N/A',
      nitCi: json['nit_ci'] ?? 'N/A',
      direccion: json['direccion'] ?? 'N/A',
    );
  }
}

// Modelo principal del Usuario
class User {
  final int id;
  final String username;
  final String email;
  final String firstName;
  final String lastName;
  final String? rol; // 'ADM', 'VEN', 'CLI'
  final int? edad;
  final ClienteProfile? clienteProfile; // Puede ser nulo

  User({
    required this.id,
    required this.username,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.rol,
    this.edad,
    this.clienteProfile,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? 0,
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      firstName: json['first_name'] ?? '',
      lastName: json['last_name'] ?? '',
      rol: json['rol'],
      edad: json['edad'],
      clienteProfile: json['cliente_profile'] != null
          ? ClienteProfile.fromJson(json['cliente_profile'])
          : null,
    );
  }

  // Helper para obtener el rol legible
  String getRolDisplay() {
    switch (rol) {
      case 'ADM':
        return 'Administrador';
      case 'VEN':
        return 'Vendedor';
      case 'CLI':
        return 'Cliente';
      default:
        return 'Desconocido';
    }
  }
}