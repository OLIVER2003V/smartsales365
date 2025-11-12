// lib/services/api_config.dart
class ApiConfig {
  // PC en la red local
  static const String baseUrl = 'http://192.168.100.148:8000';
//static const String baseUrl = 'https://smartsales365-6vm6.onrender.com';
  static Map<String, String> getAuthHeaders(String? token,
      {bool isFormData = false}) {
    final headers = <String, String>{
      'Accept': 'application/json',
      if (isFormData)
        'Content-Type': 'multipart/form-data'
      else
        'Content-Type': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Token $token';
    }
    return headers;
  }
}
