import React, { useState, useEffect } from 'react';
import { Search, User, Trash2, RotateCcw, Save } from 'lucide-react';
import { useSnackbar } from 'notistack';

const Return = () => {
    const [medicines, setMedicines] = useState([]);
    const [filteredMedicines, setFilteredMedicines] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [returnCart, setReturnCart] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        fetchMedicines();
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const filtered = medicines.filter(med =>
                med.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredMedicines(filtered);
        } else {
            setFilteredMedicines(medicines);
        }
    }, [searchQuery, medicines]);

    const fetchMedicines = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/medicines');
            const data = await response.json();
            setMedicines(data.filter(med => med.inInventory));
        } catch (error) {
            console.error('Error fetching medicines:', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/customers');
            const data = await response.json();
            setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const addToReturnCart = (medicine) => {
        const itemId = medicine._id || medicine.id;
        const existingItem = returnCart.find(item => (item._id || item.id) === itemId);

        if (existingItem) {
            setReturnCart(returnCart.map(item =>
                (item._id || item.id) === itemId ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setReturnCart([...returnCart, { ...medicine, quantity: 1 }]);
        }
        // setSearchQuery(''); // Keep search query active
    };

    const removeFromCart = (id) => {
        setReturnCart(returnCart.filter(item => (item._id || item.id) !== id));
    };

    const updateQuantity = (id, newQty) => {
        // Handle direct removal or valid number updates
        if (newQty === 0 || newQty === '0') {
            removeFromCart(id);
            return;
        }

        // Allow empty string for typing
        if (newQty === '') {
            setReturnCart(returnCart.map(item =>
                (item._id || item.id) === id ? { ...item, quantity: '' } : item
            ));
            return;
        }

        const parsed = parseInt(newQty);
        if (isNaN(parsed) || parsed < 0) return;

        setReturnCart(returnCart.map(item =>
            (item._id || item.id) === id ? { ...item, quantity: parsed } : item
        ));
    };

    const calculateTotalRefund = () => {
        return returnCart.reduce((total, item) => {
            const qty = parseInt(item.quantity) || 0;
            return total + (item.price * qty);
        }, 0);
    };

    const handleProcessReturn = async () => {
        if (returnCart.length === 0) {
            enqueueSnackbar('Return cart is empty', { variant: 'warning' });
            return;
        }

        const totalRefund = calculateTotalRefund();

        try {
            const transactionData = {
                transactionId: `RET-${Date.now()}`,
                type: 'Return',
                customer: selectedCustomer ? {
                    id: selectedCustomer._id,
                    name: selectedCustomer.name,
                    email: selectedCustomer.email,
                    phone: selectedCustomer.phone
                } : { name: 'Walk-in Customer', id: null },
                items: returnCart.map(item => ({
                    id: item.id,
                    _id: item._id, // Pass _id for backend lookup fallback
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.price * item.quantity
                })),
                subtotal: totalRefund,
                total: totalRefund, // Backend will negate this
                paymentMethod: 'Cash',
                processedBy: 'Admin'
            };

            const response = await fetch('http://localhost:5000/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData)
            });

            if (response.ok) {
                enqueueSnackbar('Return processed successfully! Stock updated.', { variant: 'success' });
                setReturnCart([]);
                setSelectedCustomer(null);
                setCustomerSearch('');
                // Refresh medicines to get latest stock if needed, though not strictly displayed here
                fetchMedicines();
            } else {
                enqueueSnackbar('Failed to process return', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error processing return:', error);
            enqueueSnackbar('Error processing return', { variant: 'error' });
        }
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-6">
            {/* Left Panel: Item Search */}
            <div className="flex-1 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Process Return</h1>
                    <p className="text-gray-500 text-sm mt-1">Search for items to return to inventory</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search item by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        />
                    </div>

                    <div className="flex-1 overflow-auto min-h-0">
                        <div className="space-y-2">
                            {filteredMedicines.length > 0 ? (
                                filteredMedicines.map((med) => (
                                    <div
                                        key={med._id || med.id}
                                        onClick={() => addToReturnCart(med)}
                                        className="flex items-center justify-between p-3 hover:bg-red-50 rounded-lg cursor-pointer border border-transparent hover:border-red-100 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-white">
                                                {med.category?.charAt(0) || 'M'}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-800">{med.name}</h3>
                                                <p className="text-xs text-gray-500">Rs. {med.price}</p>
                                            </div>
                                        </div>
                                        <button className="p-2 text-gray-400 group-hover:text-red-500">
                                            <RotateCcw size={18} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                                    <Search size={48} className="mb-4" />
                                    <p>No items found in inventory</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Return Cart */}
            <div className="w-96 flex flex-col gap-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden min-h-0">
                    <div className="p-4 border-b border-gray-100 bg-red-50">
                        <h2 className="font-bold text-red-800 flex items-center gap-2">
                            <RotateCcw size={20} />
                            Return Summary
                        </h2>
                    </div>

                    {/* Customer Selection */}
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <User size={16} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">Customer (Optional)</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search Customer..."
                                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        setSelectedCustomer(null);
                                        setShowCustomerDropdown(true);
                                    }}
                                    onFocus={() => setShowCustomerDropdown(true)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                                />
                                {showCustomerDropdown && customerSearch && !selectedCustomer && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-auto">
                                        {customers
                                            .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                                            .map(customer => (
                                                <div
                                                    key={customer._id}
                                                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                                    onClick={() => {
                                                        setSelectedCustomer(customer);
                                                        setCustomerSearch('');
                                                        setShowCustomerDropdown(false);
                                                    }}
                                                >
                                                    {customer.name}
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-auto p-4 space-y-3">
                        {returnCart.length > 0 ? (
                            returnCart.map((item) => (
                                <div key={item._id || item.id} className="flex justify-between items-center group">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-sm text-gray-800">{item.name}</h4>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <span>Rs. {item.price}</span>
                                            <div className="flex items-center">
                                                <button
                                                    onClick={() => {
                                                        const qty = parseInt(item.quantity) || 0;
                                                        updateQuantity(item._id || item.id, qty - 1);
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-l text-gray-600 font-bold transition-colors"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item._id || item.id, e.target.value)}
                                                    onBlur={(e) => {
                                                        // Ensure valid number on blur, default to 1 if empty/invalid
                                                        const val = parseInt(e.target.value);
                                                        if (!e.target.value || isNaN(val) || val < 0) {
                                                            // If empty or invalid, default to 1 to avoid stuck state, unless user meant 0?
                                                            // Logic: If user cleared it, maybe they meant to type. If they leave it empty, revert to 1.
                                                            updateQuantity(item._id || item.id, 1);
                                                        }
                                                    }}
                                                    className="w-12 h-8 text-center border-y border-gray-200 text-sm focus:outline-none focus:border-red-500"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const qty = parseInt(item.quantity) || 0;
                                                        updateQuantity(item._id || item.id, qty + 1);
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-r text-gray-600 font-bold transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-sm text-gray-800">Rs. {item.price * item.quantity}</div>
                                        <button
                                            onClick={() => removeFromCart(item._id || item.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                No items in return cart
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600 font-medium">Total Refund</span>
                            <span className="text-2xl font-bold text-red-600">Rs. {calculateTotalRefund()}</span>
                        </div>
                        <button
                            onClick={handleProcessReturn}
                            disabled={returnCart.length === 0}
                            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={20} />
                            Confrm Return
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Return;
