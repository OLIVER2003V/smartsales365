// src/cliente/ProductSkeleton.jsx
import React from 'react';

/**
 * Esqueleto de carga para ProductCard.
 * * Coincide 1:1 con la estructura y los estilos de ProductCard
 * para prevenir "Layout Shift" (saltos de contenido) al cargar.
 */
const ProductSkeleton = () => (
  <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden flex flex-col animate-pulse">
    
    {/* 1. Imagen Falsa (h-56) */}
    <div className="h-56 w-full bg-slate-200"></div>
    
    {/* 2. Contenido Falso (p-5) */}
    <div className="p-5 flex flex-col flex-grow">
      
      {/* 2a. Badge de Categoría (Píldora) */}
      <div className="h-5 bg-slate-200 rounded-full w-1/3 mb-2"></div>
      
      {/* 2b. Título Falso */}
      <div className="h-5 bg-slate-200 rounded w-3/4 mb-2"></div>
      
      {/* 2c. Marca Falsa */}
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
      
      {/* 2d. Estrellas Falsas */}
      <div className="h-5 bg-slate-200 rounded w-1/2 mb-3"></div>
      
      {/* 2e. Footer (mt-auto) */}
      <div className="mt-auto flex justify-between items-center pt-4 border-t border-slate-100">
        
        {/* Precio Falso (h-7, más alto) */}
        <div className="h-7 bg-slate-200 rounded w-1/3"></div>
        
        {/* Botón Falso (h-10, más alto y rounded-lg) */}
        <div className="h-10 bg-slate-200 rounded-lg w-1/3"></div>

      </div>
    </div>
  </div>
);

export default ProductSkeleton;