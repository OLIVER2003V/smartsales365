// lib/widgets/command_bar.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
import 'package:smartsales_app/providers/cart_provider.dart';
import 'package:smartsales_app/providers/favorites_provider.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

class CommandBar extends StatefulWidget {
  const CommandBar({super.key});

  @override
  State<CommandBar> createState() => _CommandBarState();
}

class _CommandBarState extends State<CommandBar> {
  final TextEditingController _textController = TextEditingController();
  late stt.SpeechToText _speech;
  bool _isListening = false;
  bool _isVoiceAvailable = false;
  String _interimTranscript = '';

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _initSpeech();
  }

  void _initSpeech() async {
    _isVoiceAvailable = await _speech.initialize(
      onError: (error) => _showErrorToast('Error de micrófono: $error'),
      onStatus: (status) {
        if (status == 'done' || status == 'notListening') {
          setState(() => _isListening = false);
        }
      },
    );
    setState(() {});
  }

  // ❗️ FUNCIÓN DE FEEDBACK (Como los toasts de React)
  void _showFeedback(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade600 : Colors.green.shade600,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showErrorToast(String message) {
    _showFeedback(message, isError: true);
  }

  // ❗️ LÓGICA DE COMANDO DE TEXTO (MEJORADA)
  Future<void> _handleTextCommandSubmit() async {
    final command = _textController.text.trim();
    if (command.isEmpty) return;

    FocusScope.of(context).unfocus(); // Ocultar teclado
    _textController.clear();
    
    try {
      // Llama al provider y espera la respuesta
      final String? successMessage = await context.read<CartProvider>().sendCartCommand(command);
      _showFeedback(successMessage ?? 'Comando procesado');
    } catch (e) {
      _showErrorToast(e.toString().replaceAll('Exception: ', ''));
    }
  }

  // ❗️ LÓGICA DE COMANDO DE VOZ (MEJORADA)
  void _handleToggleListen() {
    if (_isListening) {
      _speech.stop();
      setState(() => _isListening = false);
    } else {
      setState(() => _isListening = true);
      _interimTranscript = ''; // Limpia el texto anterior

      _speech.listen(
        onResult: (result) async { // Hacemos la función async
          setState(() {
            _interimTranscript = result.recognizedWords;
          });

          // Si el resultado es final, procesar
          if (result.finalResult) {
            final finalCommand = result.recognizedWords.trim();
            setState(() => _isListening = false); // Deja de escuchar

            if (finalCommand.isNotEmpty) {
              try {
                // Llama al provider y espera la respuesta
                final String? successMessage = await context.read<CartProvider>().sendCartCommand(finalCommand);
                _showFeedback(successMessage ?? 'Comando procesado');
              } catch (e) {
                _showErrorToast(e.toString().replaceAll('Exception: ', ''));
              }
            }
          }
        },
        localeId: 'es_ES', // Lenguaje Español
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Escuchar el loading de ambos providers
    final isCartLoading = context.watch<CartProvider>().loading;
    final isLoadingFavorites = context.watch<FavoritesProvider>().isLoadingFavorites;
    final bool isProcessing = isCartLoading || isLoadingFavorites;

    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Campo de Texto
          Expanded(
            child: TextField(
              controller: _textController,
              enabled: !isProcessing && !_isListening,
              decoration: InputDecoration(
                hintText: _isListening 
                  ? (_interimTranscript.isEmpty ? 'Escuchando...' : _interimTranscript)
                  : "Ej: 'Añadir 2 licuadoras'",
                prefixIcon: const Icon(LucideIcons.messageSquare, size: 20),
                border: InputBorder.none,
                filled: true,
                fillColor: Colors.grey.shade100,
                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
              ),
              onSubmitted: (_) => _handleTextCommandSubmit(),
            ),
          ),
          const SizedBox(width: 8),

          // Botón de Enviar Texto
          IconButton(
            icon: (isProcessing && !_isListening)
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(LucideIcons.send),
            onPressed: (isProcessing || _isListening) ? null : _handleTextCommandSubmit,
            style: IconButton.styleFrom(
              backgroundColor: Theme.of(context).primaryColor,
              foregroundColor: Colors.white,
            ),
          ),

          // Botón de Voz
          if (_isVoiceAvailable) ...[
            const SizedBox(width: 8),
            IconButton(
              icon: Icon(_isListening ? LucideIcons.square : LucideIcons.mic),
              onPressed: isProcessing ? null : _handleToggleListen,
              style: IconButton.styleFrom(
                backgroundColor: _isListening ? Colors.red.shade600 : Colors.green.shade600,
                foregroundColor: Colors.white,
                disabledBackgroundColor: Colors.grey.shade400,
              ),
            ),
          ]
        ],
      ),
    );
  }
}