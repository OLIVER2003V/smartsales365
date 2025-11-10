// src/components/StarRating.jsx
import React from 'react';
import { Star, StarHalf, StarOff } from 'lucide-react';

/**
 * Muestra una calificación con estrellas.
 * @param {number} rating - La calificación (0-5).
 * @param {number} totalResenas - (Opcional) El número total de reseñas.
 * @param {boolean} showCount - (Opcional) Si es true, muestra el (totalResenas).
 */
const StarRating = ({ rating = 0, totalResenas = 0, showCount = false }) => {
  const numRating = Number(rating);

  // --- 1. LÓGICA CORREGIDA: Estado "Sin Calificación" ---
  // Se basa en el RATING, no en el total de reseñas.
  if (numRating === 0 || !numRating) {
    return (
      <div className="flex items-center gap-1">
        <StarOff size={16} className="text-gray-400" />
        <span className="text-xs text-gray-500">Sin reseñas</span>
      </div>
    );
  }

  // --- 2. Construir las estrellas (Tu lógica estaba perfecta) ---
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= numRating) {
      // Estrella llena
      stars.push(<Star key={i} className="h-5 w-5 text-yellow-400" fill="currentColor" />);
    } else if (i === Math.ceil(numRating) && !Number.isInteger(numRating)) {
      // Media estrella (para futuros usos, ej: 4.5)
      stars.push(<StarHalf key={i} className="h-5 w-5 text-yellow-400" fill="currentColor" />);
    } else {
      // Estrella vacía
      stars.push(<Star key={i} className="h-5 w-5 text-gray-300" fill="currentColor" />);
    }
  }

  // --- 3. Renderizado final ---
  return (
    <div className="flex items-center gap-1">
      <div className="flex">{stars}</div>
      
      {/* ✨ MEJORA: Solo muestra el contador si 'showCount' es true */}
      {showCount && totalResenas > 0 && (
        <span className="text-sm text-gray-600 ml-1">
          ({totalResenas})
        </span>
      )}
    </div>
  );
};

export default StarRating;