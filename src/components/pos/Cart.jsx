import React from 'react';
import { Trash2 } from 'lucide-react';

const Cart = ({ items, onUpdateQuantity, onRemove, onPrintBill }) => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const platformFee = 0.10; // Mock fee
    const total = subtotal + platformFee;

    return (
        <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-gray-800">Current Sale</h2>
                <button className="text-sm text-blue-500 hover:underline">Attach Customer</button>
            </div>

            <div className="p-4 text-sm text-gray-500">
                {items.length} items in cart
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                            <p className="text-xs text-gray-500">Price: ${item.price.toFixed(2)}/{item.unit}</p>
                            <div className="flex items-center justify-between mt-1">
                                <span className="font-bold text-green-600 text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            -
                                        </button>
                                        <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => onRemove(item.id)}
                                        className="text-red-400 hover:text-red-600"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                        Cart is empty
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <h3 className="font-bold text-gray-800 mb-4">Summary</h3>
                <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Platform fee</span>
                        <span className="font-medium">${platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-900 font-bold text-lg pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                </div>
                <button
                    onClick={onPrintBill}
                    disabled={items.length === 0}
                    className="w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Print Bill
                </button>
            </div>
        </div>
    );
};

export default Cart;
