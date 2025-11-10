import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:smartsales_app/providers/product_provider.dart';
import 'package:lucide_flutter/lucide_flutter.dart'; // Asegúrate de tener este import

class ProductHeader extends StatelessWidget {
  const ProductHeader({super.key});

  @override
  Widget build(BuildContext context) {
    // ❗️ USA 'watch' PARA LEER VALORES QUE CAMBIAN
    final provider = context.watch<ProductProvider>();
    // ❗️ USA 'read' PARA LLAMAR ACCIONES
    final providerRead = context.read<ProductProvider>();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Título
          Text(
            'Catálogo de Productos',
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),

          // Barra de Búsqueda
          TextField(
            onChanged: (value) => providerRead.setSearchTerm(value),
            decoration: InputDecoration(
              hintText: 'Buscar por nombre, marca o modelo...',
              prefixIcon: const Icon(LucideIcons.search, size: 20),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              filled: true,
              fillColor: Colors.white,
            ),
          ),
          const SizedBox(height: 12),

          // Filtros (Dropdowns)
          Row(
            children: [
              // Dropdown de Categoría
              Expanded(
                child: _buildDropdown(
                  context,
                  icon: LucideIcons.tag,
                  
                  // ❗️ CORRECCIÓN 1: Leer el valor del provider
                  value: provider.category,
                  
                  items: provider.categories.map((cat) {
                    return DropdownMenuItem(
                      value: cat,
                      child: Text(
                        cat == 'all' ? 'Todas las Categorías' : cat,
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) providerRead.setCategory(val);
                  },
                ),
              ),
              const SizedBox(width: 12),

              // Dropdown de Orden
              Expanded(
                child: _buildDropdown(
                  context,
                  icon: LucideIcons.arrowUpDown,

                  // ❗️ CORRECCIÓN 2: Leer el valor del provider
                  value: provider.sortOrder,
                  
                  items: const [
                    DropdownMenuItem(
                      value: SortOrder.relevance,
                      child: Text('Relevancia'),
                    ),
                    DropdownMenuItem(
                      value: SortOrder.priceAsc,
                      child: Text('Precio: Ascendente'),
                    ),
                    DropdownMenuItem(
                      value: SortOrder.priceDesc,
                      child: Text('Precio: Descendente'),
                    ),
                    DropdownMenuItem(
                      value: SortOrder.nameAsc,
                      child: Text('Nombre: A-Z'),
                    ),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      providerRead.setSortOrder(val as SortOrder);
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Helper para construir Dropdowns facheros
  Widget _buildDropdown(
    BuildContext context, {
    required IconData icon,
    required dynamic value,
    required List<DropdownMenuItem<dynamic>> items,
    required ValueChanged<dynamic> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton(
          value: value,
          items: items,
          onChanged: onChanged,
          isExpanded: true,
          icon: const Icon(LucideIcons.chevronDown, size: 18),
          iconSize: 20,
          style: Theme.of(context).textTheme.bodyMedium,
          dropdownColor: Colors.white,
        ),
      ),
    );
  }
}