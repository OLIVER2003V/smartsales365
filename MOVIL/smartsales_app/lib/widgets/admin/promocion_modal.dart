// lib/widgets/admin/promocion_modal.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart';
// ❗️ 1. YA NO IMPORTAMOS 'dropdown_search'
import 'package:intl/intl.dart';

import 'package:smartsales_app/models/product_model.dart';
import 'package:smartsales_app/models/categoria_model.dart';
import 'package:smartsales_app/models/promocion_model.dart';
import 'package:smartsales_app/providers/auth_provider.dart';
import 'package:smartsales_app/services/product_service.dart';
import 'package:smartsales_app/services/category_service.dart';
import 'package:smartsales_app/services/promocion_service.dart';
import 'package:smartsales_app/theme/app_theme.dart';

class PromocionModal extends StatefulWidget {
  final Promocion? promocionToEdit;
  final VoidCallback onSuccess;

  const PromocionModal({
    super.key,
    this.promocionToEdit,
    required this.onSuccess,
  });

  @override
  State<PromocionModal> createState() => _PromocionModalState();
}

class _PromocionModalState extends State<PromocionModal> {
  final _formKey = GlobalKey<FormState>();
  final _service = PromocionService();
  final _productService = ProductService();
  final _categoryService = CategoryService();

  late String _nombre;
  String _tipoDescuento = 'PCT';
  late TextEditingController _valorController;
  DateTime _fechaInicio = DateTime.now();
  DateTime _fechaFin = DateTime.now().add(const Duration(days: 7));
  bool _activo = true;
  List<Product> _allProducts = [];
  List<Categoria> _allCategories = [];
  List<Product> _selectedProducts = [];
  List<Categoria> _selectedCategories = [];

  bool _isLoadingOptions = true;
  bool _isSaving = false;

  bool get _isEditing => widget.promocionToEdit != null;
  bool get _areCategoriesSelected => _selectedCategories.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _valorController = TextEditingController(); 
    _loadOptionsAndData();
  }

  Future<void> _loadOptionsAndData() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Token inválido. Inicia sesión.'), backgroundColor: Colors.orange),
      );
      return;
    }

    try {
      final productsFuture = _productService.getProducts(token);
      final categoriesFuture = _categoryService.getCategorias(token);

      final results = await Future.wait([productsFuture, categoriesFuture]);
      _allProducts = results[0] as List<Product>;
      _allCategories = results[1] as List<Categoria>;

      if (_isEditing) {
        final promo = widget.promocionToEdit!;
        _nombre = promo.nombre;
        _tipoDescuento = promo.tipoDescuento;
        _valorController.text = promo.valorDescuento.toString();
        _fechaInicio = promo.fechaInicio;
        _fechaFin = promo.fechaFin;
        _activo = promo.activo;
        _selectedProducts = _allProducts.where((p) => promo.productos.contains(p.id)).toList();
        _selectedCategories = _allCategories.where((c) => promo.categorias.contains(c.id)).toList();
      } else {
        _nombre = '';
        _valorController.text = '';
      }
    } catch (e) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al cargar opciones: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isLoadingOptions = false);
    }
  }

  @override
  void dispose() {
    _valorController.dispose();
    super.dispose();
  }

  Future<DateTime?> _pickDateTime(DateTime initialDate) async {
    final date = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (date == null) return null;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initialDate),
    );
    if (time == null) return null;

    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    _formKey.currentState!.save();
    setState(() => _isSaving = true);

    final token = context.read<AuthProvider>().token!;

    final data = {
      'nombre': _nombre,
      'tipo_descuento': _tipoDescuento,
      'valor_descuento': double.tryParse(_valorController.text) ?? 0.0,
      'fecha_inicio': _fechaInicio.toIso8601String(),
      'fecha_fin': _fechaFin.toIso8601String(),
      'activo': _activo,
      'productos': _selectedProducts.map((p) => p.id).toList(),
      'categorias': _selectedCategories.map((c) => c.id).toList(),
    };

    try {
      if (_isEditing) {
        await _service.updatePromocion(token, widget.promocionToEdit!.id, data);
      } else {
        await _service.createPromocion(token, data);
      }

      widget.onSuccess();
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Promoción ${_isEditing ? 'actualizada' : 'creada'}'), backgroundColor: Colors.green),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  // ❗️ 2. HELPER PARA ABRIR EL MODAL DE SELECCIÓN
  Future<void> _showSelectionDialog<T>({
    required String title,
    required List<T> allItems,
    required List<T> selectedItems,
    required String Function(T) itemAsString,
  }) async {
    
    final List<T>? result = await showDialog<List<T>>(
      context: context,
      builder: (ctx) => _MultiSelectDialog<T>(
        title: title,
        allItems: allItems,
        initialSelectedItems: selectedItems,
        itemAsString: itemAsString,
      ),
    );

    if (result != null) {
      setState(() {
        if (T == Categoria) {
          _selectedCategories = result as List<Categoria>;
          if (_selectedCategories.isNotEmpty) {
            _selectedProducts = []; 
          }
        } else if (T == Product) {
          _selectedProducts = result as List<Product>;
        }
      });
    }
  }


  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: _isLoadingOptions
          ? const SizedBox(height: 200, child: Center(child: CircularProgressIndicator()))
          : Form(
              key: _formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isEditing ? 'Editar Promoción' : 'Crear Promoción',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const Divider(height: 24),

                    TextFormField(
                      initialValue: _nombre,
                      decoration: const InputDecoration(labelText: 'Nombre *', border: OutlineInputBorder()),
                      validator: (val) => (val == null || val.isEmpty) ? 'Requerido' : null,
                      onSaved: (val) => _nombre = val!,
                    ),
                    const SizedBox(height: 16),
                    
                    // ❗️ 3. CORRECCIÓN DE OVERFLOW
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start, // Alinea por arriba
                      children: [
                        Expanded(
                          flex: 3, // Da más espacio al Dropdown
                          child: DropdownButtonFormField<String>(
                            value: _tipoDescuento,
                            decoration: const InputDecoration(
                              labelText: 'Tipo *',
                              border: OutlineInputBorder(),
                            ),
                            items: const [
                              DropdownMenuItem(value: 'PCT', child: Text('Porcentaje (%)')),
                              DropdownMenuItem(value: 'FIJ', child: Text('Monto Fijo (Bs)')),
                            ],
                            onChanged: (val) => setState(() => _tipoDescuento = val!),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2, // Da menos espacio al campo de valor
                          child: TextFormField(
                            controller: _valorController,
                            decoration: const InputDecoration(
                              labelText: 'Valor *',
                              border: OutlineInputBorder(),
                            ),
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            validator: (val) => (val == null || val.isEmpty) ? 'Requerido' : null,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    
                    Row(
                      children: [
                        Expanded(child: _DateTimePicker(
                          label: 'Fecha Inicio *',
                          selectedDate: _fechaInicio,
                          onPressed: () async {
                            final date = await _pickDateTime(_fechaInicio);
                            if (date != null) setState(() => _fechaInicio = date);
                          },
                        )),
                        const SizedBox(width: 12),
                        Expanded(child: _DateTimePicker(
                          label: 'Fecha Fin *',
                          selectedDate: _fechaFin,
                          onPressed: () async {
                            final date = await _pickDateTime(_fechaFin);
                            if (date != null) setState(() => _fechaFin = date);
                          },
                        )),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // ❗️ 4. WIDGET REEMPLAZADO (Categorías)
                    _MultiSelectField<Categoria>(
                      label: 'Aplicar a Categorías (Opcional)',
                      selectedItems: _selectedCategories,
                      itemAsString: (c) => c.nombre,
                      onTap: () => _showSelectionDialog<Categoria>(
                        title: 'Seleccionar Categorías',
                        allItems: _allCategories,
                        selectedItems: _selectedCategories,
                        itemAsString: (c) => c.nombre,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // ❗️ 5. WIDGET REEMPLAZADO (Productos)
                    _MultiSelectField<Product>(
                      label: 'Aplicar a Productos (Opcional)',
                      selectedItems: _selectedProducts,
                      itemAsString: (p) => p.nombre,
                      enabled: !_areCategoriesSelected,
                      hint: _areCategoriesSelected ? 'Ignorado (categorías seleccionadas)' : null,
                      onTap: () => _showSelectionDialog<Product>(
                        title: 'Seleccionar Productos',
                        allItems: _allProducts,
                        selectedItems: _selectedProducts,
                        itemAsString: (p) => '${p.nombre} (${p.marca})',
                      ),
                    ),
                    const SizedBox(height: 16),

                    SwitchListTile(
                      title: const Text('Activar promoción al guardar'),
                      value: _activo,
                      onChanged: (val) => setState(() => _activo = val),
                      tileColor: Colors.grey.shade100,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    const SizedBox(height: 24),
                    
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: _isSaving ? null : () => Navigator.of(context).pop(),
                          child: const Text('Cancelar'),
                        ),
                        const SizedBox(width: 8),
                        FilledButton.icon(
                          icon: _isSaving 
                              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Icon(LucideIcons.save, size: 18),
                          label: Text(_isSaving ? 'Guardando...' : 'Guardar'),
                          onPressed: _isSaving ? null : _handleSubmit,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }
}

// ❗️ 6. WIDGET NUEVO: El campo de selección (reemplaza a DropdownSearch)
// (Este es el widget que me pasaste)
class _MultiSelectField<T> extends StatelessWidget {
  final String label;
  final String? hint;
  final List<T> selectedItems;
  final String Function(T) itemAsString;
  final VoidCallback onTap;
  final bool enabled;

  const _MultiSelectField({
    required this.label,
    required this.selectedItems,
    required this.itemAsString,
    required this.onTap,
    this.enabled = true,
    this.hint,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(8),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          border: const OutlineInputBorder(),
          enabled: enabled,
          suffixIcon: const Icon(LucideIcons.chevronDown),
          // Ajusta el padding para que no se vea tan apretado
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10), 
        ),
        // Muestra un hint si está vacío
        isEmpty: selectedItems.isEmpty,
        child: selectedItems.isEmpty
            ? null // Deja que el InputDecorator muestre el hint/label
            : Wrap(
                spacing: 6.0,
                runSpacing: 0.0,
                children: selectedItems.map((item) {
                  return Chip(
                    label: Text(itemAsString(item)),
                    backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                    side: BorderSide(color: Theme.of(context).primaryColor.withOpacity(0.2)),
                    labelStyle: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.w500),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  );
                }).toList(),
              ),
      ),
    );
  }
}

// ❗️ 7. WIDGET NUEVO: El diálogo de selección (el modal)
class _MultiSelectDialog<T> extends StatefulWidget {
  final String title;
  final List<T> allItems;
  final List<T> initialSelectedItems;
  final String Function(T) itemAsString;

  const _MultiSelectDialog({
    super.key,
    required this.title,
    required this.allItems,
    required this.initialSelectedItems,
    required this.itemAsString,
  });

  @override
  State<_MultiSelectDialog<T>> createState() => _MultiSelectDialogState<T>();
}

class _MultiSelectDialogState<T> extends State<_MultiSelectDialog<T>> {
  late List<T> _tempSelectedItems;
  String _searchTerm = '';

  @override
  void initState() {
    super.initState();
    _tempSelectedItems = List.from(widget.initialSelectedItems);
  }

  @override
  Widget build(BuildContext context) {
    final filteredItems = widget.allItems.where((item) {
      return widget.itemAsString(item).toLowerCase().contains(_searchTerm.toLowerCase());
    }).toList();

    return AlertDialog(
      title: Text(widget.title),
      contentPadding: EdgeInsets.zero,
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: TextField(
                decoration: InputDecoration(
                  labelText: 'Buscar...',
                  prefixIcon: const Icon(LucideIcons.search),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onChanged: (value) => setState(() => _searchTerm = value),
              ),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: filteredItems.length,
                itemBuilder: (context, index) {
                  final item = filteredItems[index];
                  final isSelected = _tempSelectedItems.contains(item);
                  return CheckboxListTile(
                    title: Text(widget.itemAsString(item)),
                    value: isSelected,
                    onChanged: (bool? selected) {
                      setState(() {
                        if (selected == true) {
                          _tempSelectedItems.add(item);
                        } else {
                          _tempSelectedItems.remove(item);
                        }
                      });
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(), // Devuelve null (cancela)
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_tempSelectedItems), // Devuelve la lista
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}

// Helper para el botón de fecha/hora (sin cambios)
class _DateTimePicker extends StatelessWidget {
  final String label;
  final DateTime selectedDate;
  final VoidCallback onPressed;

  const _DateTimePicker({required this.label, required this.selectedDate, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final String formatted = DateFormat('dd/MM/yy HH:mm').format(selectedDate);
    return OutlinedButton.icon(
      icon: const Icon(LucideIcons.calendar, size: 18),
      label: Text('$label\n$formatted', style: const TextStyle(fontSize: 12)),
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.all(12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}