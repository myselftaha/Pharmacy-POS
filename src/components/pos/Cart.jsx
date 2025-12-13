import React, { useState, useEffect } from 'react';
import { Trash2, CreditCard, Banknote } from 'lucide-react';

const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
    // Initialize with prop value converted to string, empty if 1
    const [localQuantity, setLocalQuantity] = useState(item.quantity > 1 ? item.quantity.toString() : '');

    // Sync local state when prop updates (e.g. from product list add button)
    useEffect(() => {
        setLocalQuantity(item.quantity > 1 ? item.quantity.toString() : '');
    }, [item.quantity]);

    const handleChange = (e) => {
        const val = e.target.value;
        // Allow empty string (while typing) or valid positive integers
        if (val === '' || /^\d+$/.test(val)) {
            setLocalQuantity(val);
        }
    };

    const handleBlur = () => {
        // When leaving the field, we commit the transaction.
        // If empty or invalid, reset to 1 (which displays as empty)
        const numVal = parseInt(localQuantity);
        if (!localQuantity || !numVal || numVal < 1) {
            setLocalQuantity(''); // Reset display to empty (meaning 1)
            onUpdateQuantity(item.id, 1);
        } else {
            // Commit the valid number
            onUpdateQuantity(item.id, numVal);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur(); // Trigger commit
        }
    };

    return (
        <div className="flex gap-3">
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
                            value={localQuantity}
                            onFocus={(e) => e.target.select()}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
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
    );
};

const Cart = ({ items, onUpdateQuantity, onRemove, onPrintBill, onAttachCustomer, customer, discount = 0, paymentMethod, onPaymentMethodChange, voucher: selectedVoucher }) => {

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const platformFee = 0.10; // Mock fee
    const total = Math.max(0, subtotal + platformFee - discount);

    return (
        <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-gray-800">Current Sale</h2>
            </div>

            <div className="p-4 text-sm text-gray-500">
                {items.length} items in cart
            </div>

            <div
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {items.map((item) => (
                    <CartItem
                        key={item.id}
                        item={item}
                        onUpdateQuantity={onUpdateQuantity}
                        onRemove={onRemove}
                    />
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
                            <span>
                                Discount
                                {selectedVoucher && ` (${selectedVoucher.code})`}
                            </span>
                            <span className="font-medium">-Rs. {discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-900 font-bold text-lg pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span>Rs. {total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Payment Method Selector */}
                <div className="flex gap-3 mb-4">
                    <button
                        onClick={() => onPaymentMethodChange('Cash')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all ${paymentMethod === 'Cash'
                            ? 'bg-[#00c950] border-[#00c950] text-white shadow-md'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Banknote size={18} />
                        <span className="font-semibold text-sm">Cash</span>
                    </button>
                    <button
                        onClick={() => onPaymentMethodChange('Card')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all ${paymentMethod === 'Card'
                            ? 'bg-[#00c950] border-[#00c950] text-white shadow-md'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <CreditCard size={18} />
                        <span className="font-semibold text-sm">Card</span>
                    </button>
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
