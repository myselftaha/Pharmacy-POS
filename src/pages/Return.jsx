import React, { useState, useEffect } from 'react';
import { Search, User, Trash2, RotateCcw, Save, FileText, ArrowLeft, Calendar, AlertCircle, Printer, Eye, X, Package } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import API_URL from '../config/api';


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
    const [supplies, setSupplies] = useState([]);

    const { showToast } = useToast();

    useEffect(() => {
        fetchMedicines();
        fetchCustomers();
    }, []);

    useEffect(() => {
        // Filter medicines to only show those that have supplies
        const medicinesWithSupplies = medicines.filter(med => {
            const medId = med.id?.toString() || med._id?.toString();
            return supplies.some(supply =>
                supply.medicineId?.toString() === medId
            );
        });

        if (searchQuery) {
            const filtered = medicinesWithSupplies.filter(med =>
                med.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredMedicines(filtered);
        } else {
            setFilteredMedicines(medicinesWithSupplies);
        }
    }, [searchQuery, medicines, supplies]);
    const [refundMethod, setRefundMethod] = useState('Cash');
    const [returnNotes, setReturnNotes] = useState('');
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [returnReceipt, setReturnReceipt] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const defaultRestockBehavior = true; // Configurable default: true = Restock, false = Do Not Restock

    // Refund method configuration - can be connected to store settings
    const [enabledRefundMethods, setEnabledRefundMethods] = useState({
        cash: true,
        card: false, // Set to false to hide by default, can be enabled via settings
        storeCredit: false // Set to false to hide by default, can be enabled via settings
    });

    // Return reason options
    const returnReasons = [
        'Wrong item',
        'Damaged',
        'Expired',
        'Customer changed mind'
    ];

    // Ensure refund method is valid based on enabled methods
    useEffect(() => {
        if (!enabledRefundMethods.cash && !enabledRefundMethods.card && !enabledRefundMethods.storeCredit) {
            // If somehow all are disabled, enable cash as fallback
            setEnabledRefundMethods(prev => ({ ...prev, cash: true }));
        }

        // If current refund method is disabled, switch to Cash (or first available)
        if (refundMethod === 'Card' && !enabledRefundMethods.card) {
            setRefundMethod('Cash');
        } else if (refundMethod === 'Store Credit' && !enabledRefundMethods.storeCredit) {
            setRefundMethod('Cash');
        } else if (refundMethod === 'Cash' && !enabledRefundMethods.cash) {
            // If cash is disabled, use first available method
            if (enabledRefundMethods.card) {
                setRefundMethod('Card');
            } else if (enabledRefundMethods.storeCredit) {
                setRefundMethod('Store Credit');
            }
        }
    }, [enabledRefundMethods, refundMethod]);

    useEffect(() => {
        fetchMedicines();
        fetchCustomers();
        fetchSupplies();
    }, []);

    const fetchSupplies = async () => {
        try {
            const response = await fetch(`${API_URL}/api/supplies`);
            const data = await response.json();
            setSupplies(data);
        } catch (error) {
            console.error('Error fetching supplies:', error);
        }
    };

    const fetchMedicines = async () => {
        try {
            const response = await fetch(`${API_URL}/api/medicines`);
            const data = await response.json();
            setMedicines(data.filter(med => med.inInventory));
        } catch (error) {
            console.error('Error fetching medicines:', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/customers`);
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
            let url = `${API_URL}/api/transactions?`;
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('type', 'Sale'); // Only fetch Sale transactions for returns
            params.append('limit', '1000'); // Get more transactions for returns

            const response = await fetch(url + params.toString());
            const result = await response.json();

            // Handle both array response and object with data property
            const transactionsData = Array.isArray(result) ? result : (result.data || []);

            // Filter only sales for returns (in case type filter didn't work)
            const sales = transactionsData.filter(tx => !tx.type || tx.type === 'Sale');
            setTransactions(sales);
            setFilteredTransactions(sales);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            showToast('Failed to fetch invoices', 'error');
        }
    };



    useEffect(() => {
        if (returnMode === 'invoice') {
            const lowerQuery = invoiceSearchQuery.toLowerCase();
            const filtered = transactions.filter(tx =>
                (tx.transactionId && tx.transactionId.toLowerCase().includes(lowerQuery)) ||
                (tx.billNumber && tx.billNumber.toString().includes(lowerQuery)) ||
                (tx.customer && tx.customer.name.toLowerCase().includes(lowerQuery)) ||
                (tx._id && tx._id.toLowerCase().includes(lowerQuery))
            );
            setFilteredTransactions(filtered);
        }
    }, [invoiceSearchQuery, transactions, returnMode]);

    // Keyboard shortcuts for return cart
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only handle shortcuts when not typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                // Allow Enter key in search to work
                if (e.key === 'Enter' && e.target.type === 'text' && returnMode === 'manual' && filteredMedicines.length > 0) {
                    return; // Let the search input handler deal with it
                }
                return;
            }

            // Enter key to confirm return (when button is enabled)
            if (e.key === 'Enter' && returnCart.length > 0) {
                const totalRefund = returnCart.reduce((total, item) => {
                    const qty = parseInt(item.quantity) || 0;
                    return total + (item.price * qty);
                }, 0);

                if (totalRefund > 0) {
                    e.preventDefault();
                    // Validate and show confirmation
                    const itemsWithoutReason = returnCart.filter(item => !item.returnReason || item.returnReason === '');
                    if (itemsWithoutReason.length === 0) {
                        setShowConfirmationModal(true);
                    } else {
                        showToast('Please select a return reason for all items', 'error');
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [returnCart, returnMode, filteredMedicines, showToast]);

    const addToReturnCart = (medicine) => {
        const itemId = medicine._id || medicine.id;
        const existingItem = returnCart.find(item => (item._id || item.id) === itemId);

        // Get available stock from supplies
        const availableStock = supplies
            .filter(s => s.medicineId?.toString() === (medicine.id?.toString() || medicine._id?.toString()))
            .reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);

        if (existingItem) {
            const newQty = (parseInt(existingItem.quantity) || 0) + 1;
            if (availableStock > 0 && newQty > availableStock) {
                showToast(`Cannot return more than ${availableStock} units (available stock)`, 'warning');
                return;
            }
            setReturnCart(returnCart.map(item =>
                (item._id || item.id) === itemId ? { ...item, quantity: newQty } : item
            ));
        } else {
            // Default quantity is 1, but check stock availability
            const initialQty = availableStock > 0 ? 1 : 0;
            if (availableStock === 0) {
                showToast('No stock available for this item', 'warning');
                return;
            }
            setReturnCart([...returnCart, {
                ...medicine,
                quantity: initialQty,
                availableStock: availableStock, // Store available stock for validation
                restock: defaultRestockBehavior,
                batchId: '',
                returnReason: '',
                originalInvoiceId: null,
                originalSaleDate: null,
                originalQuantity: null,
                originalPrice: null
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
                showToast(`Already returned full quantity of ${item.name}`, 'warning');
                return;
            }
            showToast(`Cannot return ${qtyToAdd} units. Only ${available} remaining.`, 'warning');
            return;
        }

        // Look up the actual medicine to get the numeric ID
        let medicineId = item.id;
        try {
            const response = await fetch(`${API_URL}/api/medicines`);
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
            restock: defaultRestockBehavior,
            batchId: '',
            returnReason: '',
            originalInvoiceId: invoice.transactionId,
            originalSaleDate: invoice.createdAt,
            originalQuantity: item.quantity,
            originalPrice: item.price
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

        const item = returnCart.find(item => (item._id || item.id) === id);
        if (!item) return;

        // Check if item has maxQuantity constraint (from invoice)
        if (item.maxQuantity && parsed > item.maxQuantity) {
            showToast(`Cannot return more than ${item.maxQuantity} units`, 'error');
            return;
        }

        // Check available stock for manual returns
        if (item.availableStock && parsed > item.availableStock) {
            showToast(`Cannot return more than ${item.availableStock} units (available stock)`, 'error');
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

    const validateReturnCart = () => {
        // Check if all items have return reasons
        const itemsWithoutReason = returnCart.filter(item => !item.returnReason || item.returnReason === '');
        if (itemsWithoutReason.length > 0) {
            showToast('Please select a return reason for all items', 'error');
            return false;
        }
        return true;
    };

    const handleShowConfirmation = () => {
        if (returnCart.length === 0) {
            showToast('Return cart is empty', 'warning');
            return;
        }

        if (!validateReturnCart()) {
            return;
        }

        setShowConfirmationModal(true);
    };

    const handleProcessReturn = async () => {
        if (returnCart.length === 0) {
            showToast('Return cart is empty', 'warning');
            return;
        }

        if (!validateReturnCart()) {
            return;
        }

        const totalRefund = calculateTotalRefund();
        const returnId = `RET-${Date.now()}`;

        try {
            const transactionData = {
                transactionId: returnId,
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
                        restock: item.restock !== false, // Default to true if not set
                        batchId: item.batchId,
                        returnReason: item.returnReason,
                        originalInvoiceId: item.originalInvoiceId,
                        originalSaleDate: item.originalSaleDate,
                        originalQuantity: item.originalQuantity,
                        originalPrice: item.originalPrice
                    };
                }).filter(item => item.quantity > 0),
                subtotal: totalRefund,
                total: totalRefund, // Backend will negate this
                paymentMethod: 'Cash', // Placeholder, we use refundMethod
                refundMethod: refundMethod,
                returnNotes: returnNotes,
                processedBy: 'Admin'
            };

            console.log('Transaction Data:', JSON.stringify(transactionData, null, 2));

            const response = await fetch(`${API_URL}/api/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData)
            });

            if (response.ok) {
                const responseData = await response.json();
                setReturnReceipt({
                    returnId: returnId,
                    date: new Date().toISOString(),
                    items: returnCart,
                    totalRefund: totalRefund,
                    refundMethod: refundMethod,
                    customer: selectedCustomer,
                    notes: returnNotes
                });
                setShowConfirmationModal(false);
                setShowReceiptModal(true);
                showToast('Return processed successfully! Stock updated.', 'success');
                setReturnCart([]);
                setSelectedCustomer(null);
                setCustomerSearch('');
                setReturnNotes('');
                // Refresh medicines to get latest stock if needed, though not strictly displayed here
                fetchMedicines();
            } else {
                showToast('Failed to process return', 'error');
            }
        } catch (error) {
            console.error('Error processing return:', error);
            showToast('Error processing return', 'error');
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
                        onClick={() => {
                            setReturnMode('invoice');
                            // Fetch transactions when switching to invoice mode
                            const { start, end } = getDateRange();
                            if (dateFilter !== 'Custom' || (start && end)) {
                                fetchTransactions(start, end);
                            }
                        }}
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
                                    placeholder="Search item by name... (Press Enter to add selected item)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        // Enter key to add first filtered item
                                        if (e.key === 'Enter' && filteredMedicines.length > 0) {
                                            e.preventDefault();
                                            addToReturnCart(filteredMedicines[0]);
                                        }
                                    }}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                />
                            </div>

                            <div className="flex-1 overflow-auto min-h-0">
                                <div className="space-y-2">
                                    {filteredMedicines.length > 0 ? (
                                        filteredMedicines.map((med, index) => {
                                            // Get available stock
                                            const availableStock = supplies
                                                .filter(s => s.medicineId?.toString() === (med.id?.toString() || med._id?.toString()))
                                                .reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);

                                            return (
                                                <div
                                                    key={med._id || med.id}
                                                    onClick={() => addToReturnCart(med)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            addToReturnCart(med);
                                                        }
                                                    }}
                                                    tabIndex={0}
                                                    className="flex items-center justify-between p-3 hover:bg-red-50 rounded-lg cursor-pointer border border-transparent hover:border-red-100 transition-all group focus:outline-none focus:ring-2 focus:ring-red-500"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-white">
                                                            {med.category?.charAt(0) || 'M'}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium text-gray-800">{med.name}</h3>
                                                            {availableStock > 0 && (
                                                                <p className="text-xs text-gray-500">Stock: {availableStock}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="p-2 text-gray-400 group-hover:text-red-500"
                                                        aria-label={`Add ${med.name} to return cart`}
                                                    >
                                                        <RotateCcw size={18} />
                                                    </button>
                                                </div>
                                            );
                                        })
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
                                            placeholder="Search by Bill # or Customer Name..."
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
                                                                <span className="font-bold text-gray-800 text-lg">
                                                                    {tx.billNumber ? `Bill #${tx.billNumber}` : 'N/A'}
                                                                </span>
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

                    {/* Customer Selection - Only show in Invoice Return mode */}
                    {returnMode === 'invoice' && (
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
                    )}

                    {/* Cart Items */}
                    <div className="flex-1 overflow-auto p-4 space-y-3">
                        {returnCart.length > 0 ? (
                            returnCart.map((item) => (
                                <div key={item._id || item.id} className="p-3 border border-gray-100 rounded-lg group hover:border-red-100 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-sm text-gray-800">{item.name}</h4>
                                            <div className="text-xs text-gray-500">Rs. {item.price} {item.maxQuantity && `• Max: ${item.maxQuantity}`}</div>
                                            {/* Original Sale Details (Invoice Return Only) */}
                                            {item.originalInvoiceId && (
                                                <div className="mt-1 p-2 bg-blue-50 border border-blue-100 rounded text-xs">
                                                    <div className="text-blue-700 font-medium">Original Sale:</div>
                                                    <div className="text-blue-600">Invoice: {item.originalInvoiceId}</div>
                                                    <div className="text-blue-600">Date: {new Date(item.originalSaleDate).toLocaleDateString()}</div>
                                                    <div className="text-blue-600">Sold: {item.originalQuantity} x Rs. {item.originalPrice}</div>
                                                </div>
                                            )}
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
                                        {/* Price and Line Total Display */}
                                        <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                                            <span>Price per unit: <span className="font-medium text-gray-800">Rs. {item.price}</span></span>
                                            <span>Line total: <span className="font-bold text-gray-800">Rs. {((parseInt(item.quantity) || 0) * item.price).toFixed(2)}</span></span>
                                        </div>

                                        {/* Return Quantity Selector */}
                                        <div className="flex justify-between items-center bg-gray-50 p-1 rounded-lg">
                                            <div className="flex items-center">
                                                <button
                                                    onClick={() => updateQuantity(item._id || item.id, (parseInt(item.quantity) || 0) - 1)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === '-' || e.key === '_') {
                                                            e.preventDefault();
                                                            updateQuantity(item._id || item.id, (parseInt(item.quantity) || 0) - 1);
                                                        }
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded text-gray-600 font-bold transition-colors"
                                                    aria-label="Decrease quantity (Press -)"
                                                    title="Decrease quantity (Press -)"
                                                > - </button>
                                                <input
                                                    type="text"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item._id || item.id, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        // Allow + key to increase quantity when input is focused
                                                        if (e.key === '+' || e.key === '=') {
                                                            e.preventDefault();
                                                            updateQuantity(item._id || item.id, (parseInt(item.quantity) || 0) + 1);
                                                        }
                                                    }}
                                                    className="w-10 h-8 text-center bg-transparent text-sm focus:outline-none font-medium"
                                                    aria-label="Quantity"
                                                />
                                                <button
                                                    onClick={() => updateQuantity(item._id || item.id, (parseInt(item.quantity) || 0) + 1)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === '+' || e.key === '=') {
                                                            e.preventDefault();
                                                            updateQuantity(item._id || item.id, (parseInt(item.quantity) || 0) + 1);
                                                        }
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded text-gray-600 font-bold transition-colors"
                                                    aria-label="Increase quantity (Press +)"
                                                    title="Increase quantity (Press +)"
                                                > + </button>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {item.availableStock && `Stock: ${item.availableStock}`}
                                                {item.maxQuantity && `Max: ${item.maxQuantity}`}
                                            </div>
                                        </div>

                                        {/* Return Reason (Required) */}
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                Return Reason <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={item.returnReason || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setReturnCart(returnCart.map(i =>
                                                        (i._id || i.id) === (item._id || item.id) ? { ...i, returnReason: val } : i
                                                    ));
                                                }}
                                                className={`w-full text-xs p-2 rounded border focus:outline-none ${!item.returnReason
                                                    ? 'border-red-300 bg-red-50'
                                                    : 'border-gray-200 bg-white'
                                                    }`}
                                                required
                                            >
                                                <option value="">Select reason...</option>
                                                {returnReasons.map(reason => (
                                                    <option key={reason} value={reason}>{reason}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Restock Toggle */}
                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                            <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                                <Package size={14} />
                                                Restock to Inventory
                                            </span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={item.restock !== false}
                                                    onChange={(e) => {
                                                        setReturnCart(returnCart.map(i =>
                                                            (i._id || i.id) === (item._id || item.id) ? { ...i, restock: e.target.checked } : i
                                                        ));
                                                    }}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                            </label>
                                        </div>

                                        {/* Batch Selection (only if restocking) */}
                                        {item.restock !== false && (
                                            <select
                                                value={item.batchId || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setReturnCart(returnCart.map(i =>
                                                        (i._id || i.id) === (item._id || item.id) ? { ...i, batchId: val } : i
                                                    ));
                                                }}
                                                className="w-full text-xs p-1.5 rounded border border-gray-200 bg-white focus:outline-none"
                                            >
                                                <option value="">Select Batch (Optional)...</option>
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
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                No items in return cart
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                        {/* Return Notes */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 block mb-1">Return Notes / Remarks</label>
                            <textarea
                                value={returnNotes}
                                onChange={(e) => setReturnNotes(e.target.value)}
                                placeholder="e.g., Packaging damaged, Customer complaint..."
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 block mb-1">Refund Method</label>
                            <div className={`grid gap-2 ${enabledRefundMethods.card && enabledRefundMethods.storeCredit ? 'grid-cols-3' : enabledRefundMethods.card || enabledRefundMethods.storeCredit ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {enabledRefundMethods.cash && (
                                    <button
                                        onClick={() => setRefundMethod('Cash')}
                                        className={`py-1.5 px-2 rounded text-xs font-medium border transition-all ${refundMethod === 'Cash'
                                            ? 'bg-gray-800 text-white border-gray-800'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        Cash
                                    </button>
                                )}
                                {enabledRefundMethods.card && (
                                    <button
                                        onClick={() => setRefundMethod('Card')}
                                        className={`py-1.5 px-2 rounded text-xs font-medium border transition-all ${refundMethod === 'Card'
                                            ? 'bg-gray-800 text-white border-gray-800'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        Card
                                    </button>
                                )}
                                {enabledRefundMethods.storeCredit && (
                                    <button
                                        onClick={() => setRefundMethod('Store Credit')}
                                        className={`py-1.5 px-2 rounded text-xs font-medium border transition-all ${refundMethod === 'Store Credit'
                                            ? 'bg-gray-800 text-white border-gray-800'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        Store Credit
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600 font-medium">Total Refund</span>
                            <span className="text-2xl font-bold text-red-600">Rs. {calculateTotalRefund().toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handleShowConfirmation}
                            disabled={returnCart.length === 0 || calculateTotalRefund() === 0}
                            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            title={returnCart.length === 0 ? 'Add items to return cart' : calculateTotalRefund() === 0 ? 'Total refund amount must be greater than 0' : 'Press Enter to confirm'}
                        >
                            <RotateCcw size={20} />
                            Confirm Return
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Summary Modal */}
            {showConfirmationModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-200 bg-red-50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-red-800 flex items-center gap-2">
                                    <AlertCircle size={24} />
                                    Confirm Return
                                </h2>
                                <button
                                    onClick={() => setShowConfirmationModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="space-y-4">
                                {/* Summary */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-bold text-gray-800 mb-3">Return Summary</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">Total Items:</span>
                                            <span className="font-bold text-gray-800 ml-2">{returnCart.length}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Total Quantity:</span>
                                            <span className="font-bold text-gray-800 ml-2">
                                                {returnCart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Refund Amount:</span>
                                            <span className="font-bold text-red-600 ml-2">Rs. {calculateTotalRefund().toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Refund Method:</span>
                                            <span className="font-bold text-gray-800 ml-2">{refundMethod}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">Items to Return:</h3>
                                    <div className="space-y-2 max-h-64 overflow-auto">
                                        {returnCart.map((item) => (
                                            <div key={item._id || item.id} className="p-3 bg-white border border-gray-200 rounded-lg text-sm">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-800">{item.name}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Qty: {item.quantity} × Rs. {item.price} = Rs. {((parseInt(item.quantity) || 0) * item.price).toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            Reason: <span className="font-medium">{item.returnReason}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            Restock: <span className="font-medium">{item.restock !== false ? 'Yes' : 'No'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                {returnNotes && (
                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-2">Notes:</h3>
                                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                            {returnNotes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setShowConfirmationModal(false)}
                                className="flex-1 py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleProcessReturn}
                                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={18} />
                                Process Return
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Receipt Modal */}
            {showReceiptModal && returnReceipt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-200 bg-green-50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-green-800 flex items-center gap-2">
                                    <FileText size={24} />
                                    Return Receipt
                                </h2>
                                <button
                                    onClick={() => setShowReceiptModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6" id="return-receipt">
                            <div className="space-y-4">
                                {/* Receipt Header */}
                                <div className="text-center border-b border-gray-200 pb-4">
                                    <h3 className="text-2xl font-bold text-gray-800">RETURN RECEIPT</h3>
                                    <div className="mt-2 text-sm text-gray-600">
                                        <div>Return ID: <span className="font-bold">{returnReceipt.returnId}</span></div>
                                        <div>Date: {new Date(returnReceipt.date).toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Customer Info */}
                                {returnReceipt.customer && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-bold text-gray-800 mb-2">Customer:</h4>
                                        <div className="text-sm text-gray-700">
                                            <div>{returnReceipt.customer.name}</div>
                                            {returnReceipt.customer.phone && <div>{returnReceipt.customer.phone}</div>}
                                        </div>
                                    </div>
                                )}

                                {/* Items */}
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-3">Returned Items:</h4>
                                    <div className="space-y-2">
                                        {returnReceipt.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg text-sm">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-800">{item.name}</div>
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        Quantity: {item.quantity} × Rs. {item.price} = Rs. {((parseInt(item.quantity) || 0) * item.price).toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                        Reason: {item.returnReason} | Restock: {item.restock !== false ? 'Yes' : 'No'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>Total Refund:</span>
                                        <span className="text-red-600">Rs. {returnReceipt.totalRefund.toFixed(2)}</span>
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600">
                                        Refund Method: <span className="font-medium">{returnReceipt.refundMethod}</span>
                                    </div>
                                </div>

                                {/* Notes */}
                                {returnReceipt.notes && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-bold text-gray-800 mb-2">Notes:</h4>
                                        <div className="text-sm text-gray-700">{returnReceipt.notes}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => {
                                    const printContent = document.getElementById('return-receipt').innerHTML;
                                    const originalContent = document.body.innerHTML;
                                    document.body.innerHTML = `
                                        <div style="padding: 40px; font-family: Arial, sans-serif;">
                                            <div style="text-align: center; margin-bottom: 30px;">
                                                <h1 style="font-size: 24px; font-weight: bold;">RETURN RECEIPT</h1>
                                                <div style="margin-top: 10px;">
                                                    <div>Return ID: <strong>${returnReceipt.returnId}</strong></div>
                                                    <div>Date: ${new Date(returnReceipt.date).toLocaleString()}</div>
                                                </div>
                                            </div>
                                            ${printContent}
                                        </div>
                                    `;
                                    window.print();
                                    document.body.innerHTML = originalContent;
                                    window.location.reload();
                                }}
                                className="flex-1 py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Printer size={18} />
                                Print Receipt
                            </button>
                            <button
                                onClick={() => setShowReceiptModal(false)}
                                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Return;
