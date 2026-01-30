
import React, { memo } from 'react';
import { Plus, AlertCircle, AlertTriangle } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export const ProductCard = memo<ProductCardProps>(({ product, onAdd }) => {
  const isOutOfStock = product.stock <= 0;
  const lowStockThreshold = product.minStockLevel !== undefined ? product.minStockLevel : 5;
  const isLowStock = product.stock > 0 && product.stock <= lowStockThreshold;

  return (
    <div 
      onClick={() => !isOutOfStock && onAdd(product)}
      className={`bg-white rounded-xl shadow-sm border p-4 transition-all group flex flex-col h-full overflow-hidden ${
        isOutOfStock 
          ? 'opacity-80 cursor-not-allowed border-red-200 bg-red-50/30' 
          : isLowStock
            ? 'cursor-pointer border-orange-200 hover:shadow-md hover:border-orange-300 bg-orange-50/20'
            : 'cursor-pointer border-slate-100 hover:shadow-md hover:border-blue-200'
      }`}
    >
      <div className="relative mb-3 h-32 -mx-4 -mt-4 bg-slate-100 flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            loading="lazy"
            className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale' : ''}`}
          />
        ) : (
          <div className={`h-16 w-16 rounded-full flex items-center justify-center font-bold text-xl ${
            isOutOfStock 
                ? 'bg-slate-200 text-slate-400' 
                : 'bg-blue-50 text-blue-600'
          }`}>
            {product.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-slate-700 shadow-sm">
          ₹{product.price.toFixed(2)}
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
              <AlertCircle size={12} /> Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-1">
        <h3 className={`font-semibold transition-colors truncate flex-1 ${
            isOutOfStock ? 'text-slate-500' : 'text-slate-800 group-hover:text-blue-600'
        }`}>
            {product.name}
        </h3>
      </div>
      
      <div className="mb-2">
         {isOutOfStock ? (
             <span className="text-[10px] text-red-700 font-bold flex items-center gap-1 bg-red-100 px-2 py-1 rounded-md w-fit border border-red-200">
               <AlertCircle size={12} /> Stock Empty
             </span>
         ) : isLowStock ? (
             <span className="text-[10px] text-orange-700 font-bold flex items-center gap-1 bg-orange-100 px-2 py-1 rounded-md w-fit border border-orange-200">
               <AlertTriangle size={12} /> Low Stock: {product.stock}
             </span>
         ) : (
             <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                 {product.stock} available
             </span>
         )}
      </div>

      <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-grow">
        {product.description || 'No description available.'}
      </p>
      
      <button 
        disabled={isOutOfStock}
        className={`w-full mt-auto py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
            isOutOfStock 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
            : isLowStock 
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-600 hover:text-white'
                : 'bg-slate-50 text-slate-600 group-hover:bg-blue-600 group-hover:text-white'
        }`}
      >
        <Plus size={14} /> {isOutOfStock ? 'Unavailable' : 'Add to Bill'}
      </button>
    </div>
  );
});
