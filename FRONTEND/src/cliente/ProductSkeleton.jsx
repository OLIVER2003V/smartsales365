// src/cliente/ProductSkeleton.jsx
import React from 'react';

const ProductSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col animate-pulse">
    {/* Imagen Falsa */}
    <div className="h-52 w-full bg-gray-300"></div>
    
    {/* Contenido Falso */}
    <div className="p-4 flex flex-col flex-grow">
      {/* Título falso */}
      <div className="h-5 bg-gray-300 rounded-md w-3/4 mb-2"></div>
      {/* Marca falsa */}
      <div className="h-4 bg-gray-200 rounded-md w-1/2 mb-2"></div>
      {/* Categoría falsa */}
      <div className="h-4 bg-gray-200 rounded-md w-1/3 mb-3"></div>
      
      {/* Footer falso */}
      <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-100">
        {/* Precio falso */}
        <div className="h-6 bg-gray-300 rounded-md w-1/4"></div>
        {/* Botón falso */}
        <div className="h-9 bg-gray-300 rounded-md w-1/3"></div>
      </div>
    </div>
  </div>
);

export default ProductSkeleton;