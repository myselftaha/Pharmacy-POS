import React, { useState, useEffect } from 'react';
import { Search, User, Trash2, RotateCcw, Save, FileText, ArrowLeft, Calendar } from 'lucide-react';
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
    const [returnMode, setReturnMode] = useState('manual'); // 'manual' or 'invoice'
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);

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

    const [supplies, setSupplies] = useState([]);
    const [refundMethod, setRefundMethod] = useState('Cash');

    useEffect(() => {
        fetchMedicines();
        fetchCustomers();
        fetchSupplies();
    }, []);

    const fetchSupplies = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/supplies');
            const data = await response.json();
            setSupplies(data);
        } catch (error) {
            console.error('Error fetching supplies:', error);
        }
    };

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

    const [dateFilter, setDateFilter] = useState('Today');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    useEffect(() => {
        applyDateFilter();
    }, [dateFilter, customStartDate, customEndDate, returnMode]);

    const getDateRange = () => {
        const today = new Date();
        const start = new Date(today);
        const end = new Date(today);

        switch (dateFilter) {
            case 'Today':
                // Handled effectively by sending same date for start/end or just start
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            case 'Yesterday':
                start.setDate(today.getDate() - 1);
                return { start: start.toISOString().split('T')[0], end: start.toISOString().split('T')[0] }; // Start and end are yesterday
            case 'This Month':
                start.setDate(1);
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            case 'Custom':
                return { start: customStartDate, end: customEndDate };
            default:
                return { start: '', end: '' };
        }
    };

    const applyDateFilter = () => {
        if (returnMode !== 'invoice') return; // Only relevant for invoice mode

        const { start, end } = getDateRange();
        if (dateFilter === 'Custom' && (!start || !end)) return; // Wait for both inputs

        fetchTransactions(start, end);
    };

    const fetchTransactions = async (startDate = '', endDate = '') => {
        try {
            let url = 'http://localhost:5000/api/transactions?';
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(url + params.toString());
            const data = await response.json();
            // Filter only sales for returns
            const sales = data.filter(tx => !tx.type || tx.type === 'Sale');
            setTransactions(sales);
            setFilteredTransactions(sales);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };



    useEffect(() => {
        if (returnMode === 'invoice') {
            const lowerQuery = invoiceSearchQuery.toLowerCase();
            const filtered = transactions.filter(tx =>
                (tx.transactionId && tx.transactionId.toLowerCase().includes(lowerQuery)) ||
                (tx.customer && tx.customer.name.toLowerCase().includes(lowerQuery)) ||
                (tx._id && tx._id.toLowerCase().includes(lowerQuery))
            );
            setFilteredTransactions(filtered);
        }
    }, [invoiceSearchQuery, transactions, returnMode]);

    const addToReturnCart = (medicine) => {
        const itemId = medicine._id || medicine.id;
        const existingItem = returnCart.find(item => (item._id || item.id) === itemId);

        if (existingItem) {
            setReturnCart(returnCart.map(item =>
                (item._id || item.id) === itemId ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setReturnCart([...returnCart, {
                ...medicine,
                quantity: 1,
                condition: 'Restock',
                batchId: '',
                returnReason: ''
            }]);
        }
        // setSearchQuery(''); // Keep search query active
    };

    const addItemFromInvoice = async (item, invoice, qtyToAdd = 1) => {
        const itemId = item.id || item._id;
        const existingInCart = returnCart.find(cartItem => (cartItem._id || cartItem.id) === itemId);

        // Check if adding would exceed purchased quantity
        const currentQty = existingInCart ? parseInt(existingInCart.quantity) || 0 : 0;
        const maxQty = item.quantity;
        const newQty = currentQty + qtyToAdd;

        if (newQty > maxQty) {
            const available = maxQty - currentQty;
            if (available <= 0) {
                enqueueSnackbar(`Already returned full quantity of ${item.name}`, { variant: 'warning' });
                return;
            }
            enqueueSnackbar(`Cannot return ${qtyToAdd} units. Only ${available} remaining.`, { variant: 'warning' });
            return;
        }

        // Look up the actual medicine to get the numeric ID
        let medicineId = item.id;
        try {
            const response = await fetch('http://localhost:5000/api/medicines');
            const medicines = await response.json();
            const medicine = medicines.find(m => m._id === itemId || m.id === item.id);
            if (medicine) {
                medicineId = medicine.id; // Use the numeric ID
            }
        } catch (error) {
            console.error('Error fetching medicine:', error);
        }

        // Use the price from the invoice and store max returnable quantity
        const itemToAdd = {
            ...item,
            id: medicineId, // Numeric ID for backend
            _id: itemId, // MongoDB ID for frontend reference
            price: item.price,
            maxQuantity: maxQty,
            quantity: qtyToAdd,
            condition: 'Restock',
            batchId: '',
            returnReason: ''
        };

        if (existingInCart) {
            // Update quantity
            setReturnCart(returnCart.map(cartItem =>
                (cartItem._id || cartItem.id) === itemId
                    ? { ...cartItem, quantity: newQty }
                    : cartItem
            ));
        } else {
            setReturnCart([...returnCart, itemToAdd]);
        }

        // Auto-select customer if not already selected
        if (!selectedCustomer && invoice.customer && invoice.customer.id) {
            const matchingCustomer = customers.find(c => c._id === invoice.customer.id);
            if (matchingCustomer) {
                setSelectedCustomer(matchingCustomer);
            }
        }
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

        // Check if item has maxQuantity constraint (from invoice)
        const item = returnCart.find(item => (item._id || item.id) === id);
        if (item && item.maxQuantity && parsed > item.maxQuantity) {
            enqueueSnackbar(`Cannot return more than ${item.maxQuantity} units`, { variant: 'error' });
            return;
        }

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
                items: returnCart.map(item => {
                    const qty = parseInt(item.quantity) || 0;
                    const price = parseFloat(item.price);
                    return {
                        id: item.id,
                        _id: item._id,
                        name: item.name,
                        price: price,
                        quantity: qty,
                        subtotal: price * qty,
                        condition: item.condition,
                        batchId: item.batchId,
                        returnReason: item.returnReason
                    };
                }).filter(item => item.quantity > 0),
                subtotal: totalRefund,
                total: totalRefund, // Backend will negate this
                paymentMethod: 'Cash', // Placeholder, we use refundMethod
                refundMethod: refundMethod,
                processedBy: 'Admin'
            };

            console.log('Transaction Data:', JSON.stringify(transactionData, null, 2));

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

                {/* Mode Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => { setReturnMode('manual'); setSelectedInvoice(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${returnMode === 'manual' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Manual Return
                    </button>
                    <button
                        onClick={() => setReturnMode('invoice')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${returnMode === 'invoice' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Return by Invoice
                    </button>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">

                    {returnMode === 'manual' ? (
                        <>
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
                        </>
                    ) : (
                        // INVOICE RETURN MODE
                        <>
                            {!selectedInvoice ? (
                                <>
                                    <div className="mb-6">
                                        <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 w-fit">
                                            <div className="flex items-center gap-2 text-gray-500 px-3 border-r border-gray-200">
                                                <Calendar size={18} />
                                                <span className="font-bold text-sm text-gray-700">Filter by:</span>
                                            </div>
                                            <div className="flex gap-1">
                                                {['Today', 'Yesterday', 'This Month', 'Custom'].map((option) => (
                                                    <button
                                                        key={option}
                                                        onClick={() => setDateFilter(option)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === option
                                                            ? 'bg-red-600 text-white shadow-sm'
                                                            : 'text-gray-600 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {dateFilter === 'Custom' && (
                                            <div className="flex gap-4 mt-4 items-end animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="w-48">
                                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">Start Date</label>
                                                    <input
                                                        type="date"
                                                        value={customStartDate}
                                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 text-sm"
                                                    />
                                                </div>
                                                <div className="w-48">
                                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">End Date</label>
                                                    <input
                                                        type="date"
                                                        value={customEndDate}
                                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative mb-4">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Search by Invoice # (e.g. TX123...) or Customer Name..."
                                            value={invoiceSearchQuery}
                                            onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
                                        />
                                    </div>

                                    <div className="flex-1 overflow-auto min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="divide-y divide-gray-100">
                                            {filteredTransactions.length > 0 ? (
                                                filteredTransactions.map((tx) => (
                                                    <div
                                                        key={tx._id}
                                                        onClick={() => setSelectedInvoice(tx)}
                                                        className="flex items-center justify-between p-4 hover:bg-blue-50 rounded-lg cursor-pointer border border-gray-100 hover:border-blue-200 transition-all group"
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-gray-800">{tx.transactionId || 'ID N/A'}</span>
                                                                <span className="text-xs text-gray-500">• {new Date(tx.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="text-sm text-gray-600 flex items-center gap-1">
                                                                <User size={14} />
                                                                {tx.customer?.name || 'Walk-in'}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-gray-800">Rs. {tx.total?.toFixed(2)}</div>
                                                            <div className="text-xs text-gray-500">{tx.items?.length || 0} items</div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                                                    <FileText size={48} className="mb-4" />
                                                    <p>No invoices found</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // SELECTED INVOICE VIEW
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                                        <button
                                            onClick={() => setSelectedInvoice(null)}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                        >
                                            <ArrowLeft size={20} className="text-gray-600" />
                                        </button>
                                        <div>
                                            <h3 className="font-bold text-gray-800">Invoice {selectedInvoice.transactionId}</h3>
                                            <p className="text-xs text-gray-500">{new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-auto space-y-2">
                                        {selectedInvoice.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                                                <div>
                                                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                                                    <p className="text-xs text-gray-500">
                                                        Sold: {item.quantity} x Rs. {item.price} = Rs. {item.subtotal}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => addItemFromInvoice(item, selectedInvoice, 1)}
                                                        className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1"
                                                    >
                                                        <RotateCcw size={14} />
                                                        Return
                                                    </button>
                                                    <button
                                                        onClick={() => addItemFromInvoice(item, selectedInvoice, item.quantity)}
                                                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                                    >
                                                        All
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
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
                                <div key={item._id || item.id} className="p-3 border border-gray-100 rounded-lg group hover:border-red-100 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-sm text-gray-800">{item.name}</h4>
                                            <div className="text-xs text-gray-500">Rs. {item.price} • Max: {item.maxQuantity || 'N/A'}</div>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item._id || item.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Item Controls */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center bg-gray-50 p-1 rounded-lg">
                                            <div className="flex items-center">
                                                <button
                                                    onClick={() => updateQuantity(item._id || item.id, (parseInt(item.quantity) || 0) - 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded text-gray-600 font-bold"
                                                > - </button>
                                                <input
                                                    type="text"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item._id || item.id, e.target.value)}
                                                    className="w-10 h-8 text-center bg-transparent text-sm focus:outline-none"
                                                />
                                                <button
                                                    onClick={() => updateQuantity(item._id || item.id, (parseInt(item.quantity) || 0) + 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded text-gray-600 font-bold"
                                                > + </button>
                                            </div>
                                            <div className="font-bold text-sm text-gray-800">
                                                Rs. {((parseInt(item.quantity) || 0) * item.price).toFixed(2)}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <select
                                                value={item.condition || 'Restock'}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setReturnCart(returnCart.map(i =>
                                                        (i._id || i.id) === (item._id || item.id) ? { ...i, condition: val } : i
                                                    ));
                                                }}
                                                className={`flex-1 text-xs p-1.5 rounded border ${item.condition === 'Damaged' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'} focus:outline-none`}
                                            >
                                                <option value="Restock">Restock</option>
                                                <option value="Damaged">Ref (Damaged)</option>
                                            </select>

                                            {item.condition !== 'Damaged' && (
                                                <select
                                                    value={item.batchId || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setReturnCart(returnCart.map(i =>
                                                            (i._id || i.id) === (item._id || item.id) ? { ...i, batchId: val } : i
                                                        ));
                                                    }}
                                                    className="flex-1 text-xs p-1.5 rounded border border-gray-200 bg-white focus:outline-none"
                                                >
                                                    <option value="">Select Batch...</option>
                                                    {supplies
                                                        .filter(s => s.medicineId === (item.id?.toString() || item._id?.toString()))
                                                        .map(s => (
                                                            <option key={s._id} value={s._id}>
                                                                {s.batchNumber} (Qty: {s.quantity})
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            )}
                                        </div>
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
                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 block mb-1">Refund Method</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Cash', 'Card', 'Store Credit'].map(method => (
                                    <button
                                        key={method}
                                        onClick={() => setRefundMethod(method)}
                                        className={`py-1.5 px-2 rounded text-xs font-medium border transition-all ${refundMethod === method
                                            ? 'bg-gray-800 text-white border-gray-800'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>
                        </div>

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
                            Confirm Return
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Return;
