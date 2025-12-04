import React from 'react';
import { Plus } from 'lucide-react';

const ProductCard = ({ product, onAdd }) => {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{product.description}</p>

                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <span>Netto: {product.netContent}</span>
                    <span>|</span>
                    <span>Stock: {product.stock} Available</span>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                <span className="font-bold text-green-600">Rs. {product.price.toFixed(2)}/{product.unit}</span>
                <button
                    onClick={() => onAdd(product)}
                    className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white hover:bg-green-600 transition-colors"
                >
                    <Plus size={18} />
                </button>
            </div>
        </div>
    );
};

export default ProductCard;
