import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

const Cart = ({ items, onUpdateQuantity, onRemove, onPrintBill, onAttachCustomer, customer, discount = 0 }) => {
    const [quantities, setQuantities] = useState({});

    // Initialize quantities from items when they change
    useEffect(() => {
        setQuantities(prev => {
            const newQuantities = { ...prev };
            // Only add new items, don't override existing ones being edited
            items.forEach(item => {
                if (!(item.id in newQuantities)) {
                    // Start with blank string for new items
                    newQuantities[item.id] = '';
                }
            });
            // Remove quantities for items no longer in cart
            Object.keys(newQuantities).forEach(id => {
                if (!items.find(item => item.id.toString() === id)) {
                    delete newQuantities[id];
                }
            });
            return newQuantities;
        });
    }, [items.map(i => i.id).join(',')]);

    const handleQuantityChange = (itemId, value) => {
        // Allow empty or numeric values only
        if (value === '' || /^\d+$/.test(value)) {
            setQuantities(prev => ({ ...prev, [itemId]: value }));
        }
    };

    const handleQuantityBlur = (itemId) => {
        const value = quantities[itemId];
        const numValue = parseInt(value);

        // Validate: if empty or less than 1, reset to 1
        if (!value || !numValue || numValue < 1) {
            setQuantities(prev => ({ ...prev, [itemId]: '1' }));
            onUpdateQuantity(itemId, 1);
        } else {
            onUpdateQuantity(itemId, numValue);
        }
    };

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const platformFee = 0.10; // Mock fee
    const total = Math.max(0, subtotal + platformFee - discount);

    return (
        <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-gray-800">Current Sale</h2>
                <button
                    onClick={onAttachCustomer}
                    className="text-sm text-blue-500 hover:underline font-medium"
                >
                    {customer ? customer.name : 'Attach Customer'}
                </button>
            </div>

            <div className="p-4 text-sm text-gray-500">
                {items.length} items in cart
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 font-bold">
                            {item.category?.charAt(0) || 'M'}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                            <p className="text-xs text-gray-500">Price: Rs. {item.price.toFixed(2)}/{item.unit}</p>
                            <div className="flex items-center justify-between mt-1">
                                <span className="font-bold text-green-600 text-sm">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="Qty"
                                        value={quantities[item.id] !== undefined ? quantities[item.id] : ''}
                                        onFocus={(e) => {
                                            // Select all text when clicking the input
                                            e.target.select();
                                        }}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                        onBlur={() => handleQuantityBlur(item.id)}
                                        onKeyPress={(e) => {
                                            // Only allow numbers
                                            if (!/[0-9]/.test(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            // Submit on Enter
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                            }
                                        }}
                                        className="w-14 h-8 text-center border-2 border-blue-300 rounded-lg px-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all select-all placeholder:text-gray-400"
                                    />
                                    <button
                                        onClick={() => onRemove(item.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
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
                        <span className="font-medium">Rs. {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Platform fee</span>
                        <span className="font-medium">Rs. {platformFee.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span className="font-medium">-Rs. {discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-900 font-bold text-lg pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span>Rs. {total.toFixed(2)}</span>
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
