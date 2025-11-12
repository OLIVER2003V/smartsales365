import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:dio/dio.dart';
import 'package:smartsales_app/services/api_config.dart'; // Tu archivo de config de API

// Esta función DEBE estar fuera de una clase (es el entry-point)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Inicializa Firebase si es necesario
  await Firebase.initializeApp();
  print("Handling a background message: ${message.messageId}");
}

class NotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  
  // Usamos un GlobalKey para la navegación (Paso 2.5)
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  // --- 1. Inicialización ---
  Future<void> init(BuildContext context) async {
    // 1.1. Pide permiso al usuario (iOS y Android 13+)
    await _fcm.requestPermission();

    // 1.2. Configura notificaciones locales (para cuando la app está abierta)
    const AndroidInitializationSettings androidSettings = 
        AndroidInitializationSettings('@mipmap/ic_launcher'); // Icono de tu app
    const InitializationSettings settings = InitializationSettings(android: androidSettings);
    
    await _localNotifications.initialize(
      settings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        // Manejar el toque en la notificación local
        _handleMessageTap(response.payload);
      },
    );
    
    // 1.3. Configura los listeners
    _initListeners();
    
    // 1.4. Configura el handler de fondo
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  }

  // --- 2. Obtener Token y enviarlo al Backend ---
  Future<void> registerDeviceToken(String? authToken) async {
    if (authToken == null) {
      print("No hay auth token, no se puede registrar el dispositivo FCM.");
      return;
    }
    
    // Obtener el Token FCM del dispositivo
    final fcmToken = await _fcm.getToken();
    if (fcmToken == null) {
      print("No se pudo obtener el token FCM.");
      return;
    }
    
    print("===== MI TOKEN FCM =====");
    print(fcmToken);
    print("========================");

    // Enviar el token a tu backend de Django
    try {
      final dio = Dio();
      // ❗️ Esta es la URL de la vista que creaste en usuario/urls.py
      // LÍNEA NUEVA (PROBABLEMENTE CORRECTA)
      final url = '${ApiConfig.baseUrl}/api/register-fcm-device/';
      
      await dio.post(
        url,
        data: {'registration_id': fcmToken},
        options: Options(headers: {'Authorization': 'Token $authToken'}),
      );
      print("Token FCM enviado al backend exitosamente.");
    } catch (e) {
      print("Error al enviar el token FCM al backend: $e");
    }
  }

  // --- 3. Escuchar Mensajes ---
  void _initListeners() {
    // A) App en PRIMER PLANO (abierta)
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print("¡Mensaje recibido en primer plano!");
      RemoteNotification? notification = message.notification;
      AndroidNotification? android = message.notification?.android;

      if (notification != null && android != null) {
        // Muestra la notificación local "heads-up"
        _localNotifications.show(
          notification.hashCode,
          notification.title,
          notification.body,
          const NotificationDetails(
            android: AndroidNotificationDetails(
              'high_importance_channel', // ID del canal
              'Notificaciones de Alta Importancia',
              channelDescription: 'Canal para notificaciones importantes.',
              importance: Importance.max,
              priority: Priority.high,
              icon: '@mipmap/ic_launcher',
            ),
          ),
          payload: jsonEncode(message.data), // Pasa los datos (ej. {"screen": "/mis-compras"})
        );
      }
    });

    // B) App en SEGUNDO PLANO (minimizada, el usuario toca la notificación)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print("App abierta desde segundo plano por notificación:");
      _handleMessageTap(message.data);
    });

    // C) App TERMINADA (cerrada, el usuario toca la notificación)
    _fcm.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        print("App abierta desde terminada por notificación:");
        _handleMessageTap(message.data);
      }
    });
  }

  // --- 4. Manejar el Toque (Navegación) ---
  void _handleMessageTap(dynamic data) {
    print("Manejando toque, data: $data");
    
    Map<String, dynamic> messageData;
    
    if (data is String) {
      messageData = jsonDecode(data);
    } else if (data is Map<String, dynamic>) {
      messageData = data;
    } else {
      return;
    }

    // Busca una clave 'screen' en los datos de la notificación
    final String? screen = messageData['screen'];
    
    if (screen != null && navigatorKey.currentState != null) {
      print("Navegando a la pantalla: $screen");
      navigatorKey.currentState!.pushNamed(screen);
    }
  }
}