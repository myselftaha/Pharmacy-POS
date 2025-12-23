import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Search, Plus, UserRound, X, Calendar } from 'lucide-react';
import CategoryFilter from '../components/pos/CategoryFilter';

import Cart from '../components/pos/Cart';
import BillModal from '../components/pos/BillModal';
import AttachCustomerModal from '../components/pos/AttachCustomerModal';
import OrderSuccessModal from '../components/pos/OrderSuccessModal';
import { categories } from '../data/mockData';
import API_URL from '../config/api';
import Loader from '../components/common/Loader';
const Home = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All'); const [cartItems, setCartItems] = useState(() => {
        const saved = localStorage.getItem('cartItems');
        return saved ? JSON.parse(saved) : [];
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [formulaSearch, setFormulaSearch] = useState('');
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [isAttachCustomerModalOpen, setIsAttachCustomerModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [currentTransactionId, setCurrentTransactionId] = useState('');
    const [currentBillNumber, setCurrentBillNumber] = useState(null);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [medicines, setMedicines] = useState([]);

    const { showToast } = useToast();

    const [paymentMethod, setPaymentMethod] = useState('Cash');

    const [selectedCustomer, setSelectedCustomer] = useState(() => {
        const saved = localStorage.getItem('selectedCustomer');
        return saved ? JSON.parse(saved) : null;
    });
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: '',
        email: '',
        doctorName: '',
        billDate: new Date().toISOString().split('T')[0]
    });


    // Server-side search function
    const searchMedicines = async (query, formula, category) => {
        // If no search criteria, clear results. Exception: searching just by category is allowed if desired, 
        // but user asked "should no show here we should only search". So we force a query or formula.
        // If category is 'All', definitively clear. If a category is selected, maybe show items?
        // User said: "All items are showing... we should only search". Use Strict mode: Must type something.

        // However, usually selecting a specific Category acts as a filter. 
        // Let's assume: If Category is 'All' AND valid query is empty -> Clear.
        // If Category is NOT 'All', we can show list (user action).
        // But user said "no show item... only search".
        // Let's strictly enforce: If (query is empty AND formula is empty) => Clear list.

        if (!query && !formula) {
            setMedicines([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();

            let effectiveQuery = query || '';
            if (formula) effectiveQuery = formula;

            if (effectiveQuery) params.append('q', effectiveQuery);
            if (category && category !== 'All') params.append('category', category);

            params.append('limit', '50');

            const response = await fetch(`${API_URL}/api/medicines/search?${params.toString()}`);
            const data = await response.json();

            if (data && data.medicines) {
                setMedicines(data.medicines);
            } else {
                setMedicines([]);
            }
        } catch (error) {
            console.error('Error searching medicines:', error);
            setMedicines([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounced Search Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            searchMedicines(searchQuery, formulaSearch, activeCategory);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, formulaSearch, activeCategory]);

    // Initial Load - Fetch Active Voucher
    useEffect(() => {
        fetchActiveVoucher();
    }, []);

    // Persist cart items to localStorage
    useEffect(() => {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }, [cartItems]);

    // Persist selected customer to localStorage
    useEffect(() => {
        if (selectedCustomer) {
            localStorage.setItem('selectedCustomer', JSON.stringify(selectedCustomer));
        } else {
            localStorage.removeItem('selectedCustomer');
        }
    }, [selectedCustomer]);

    // Fetch active voucher automatically
    const fetchActiveVoucher = async () => {
        try {
            const response = await fetch(`${API_URL}/api/vouchers/active`);
            const data = await response.json();
            if (data && data.status === 'Active') {
                setSelectedVoucher(data);
            } else {
                setSelectedVoucher(null);
            }
        } catch (error) {
            console.error('Error fetching active voucher:', error);
        }
    };

    const filteredMedicines = medicines;



    const addToCart = (product, quantityToAdd = 1) => {
        // Find existing quantity in cart
        const productId = product._id || product.id;
        const existingItem = cartItems.find(item => (item._id || item.id) === productId);
        const currentQty = existingItem ? existingItem.quantity : 0;

        // Check stock (default to Single for now)
        const packSize = product.packSize || 1;
        const totalStockNeeded = currentQty + quantityToAdd; // addToCart items are Single by default

        if (totalStockNeeded > (product.stock || 0)) {
            showToast(`Out of stock! Only ${product.stock} units available.`, 'error');
            return;
        }

        setCartItems(prev => {
            if (existingItem) {
                return prev.map(item =>
                    (item._id || item.id) === productId ? { ...item, quantity: item.quantity + quantityToAdd } : item
                );
            }
            // Initialize new cart item with enhanced fields
            return [...prev, {
                ...product,
                id: productId,
                quantity: quantityToAdd,
                packSize: product.packSize || 1,
                saleType: 'Single',
                discount: 0,
                isUnit: false,
                customPrice: null
            }];
        });
    };


    const updateQuantity = (id, newQuantity) => {
        setCartItems(prev => prev.map(item => {
            if ((item._id || item.id) === id) {
                const packSize = item.packSize || 1;
                const isPack = item.saleType === 'Pack';
                const totalUnitsNeeded = newQuantity * (isPack ? packSize : 1);

                if (totalUnitsNeeded > (item.stock || 0)) {
                    showToast(`Out of stock! Only ${item.stock} units available.`, 'error');
                    return item;
                }
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCartItems(prev => prev.filter(item => (item._id || item.id) !== id));
    };

    const updateSaleType = (id, saleType) => {
        setCartItems(prev => prev.map(item => {
            if ((item._id || item.id) === id) {
                const packSize = item.packSize || 1;
                const isPack = saleType === 'Pack';
                const totalUnitsNeeded = item.quantity * (isPack ? packSize : 1);

                if (totalUnitsNeeded > (item.stock || 0)) {
                    showToast(`Out of stock! Converting to ${saleType} requires ${totalUnitsNeeded} units, but only ${item.stock} available.`, 'error');
                    return item;
                }
                return { ...item, saleType };
            }
            return item;
        }));
    };

    const updateDiscount = (id, discount) => {
        setCartItems(prev => prev.map(item =>
            (item._id || item.id) === id ? { ...item, discount } : item
        ));
    };

    const updateIsUnit = (id, isUnit) => {
        setCartItems(prev => prev.map(item =>
            (item._id || item.id) === id ? { ...item, isUnit } : item
        ));
    };

    const updateCustomPrice = (id, customPrice) => {
        setCartItems(prev => prev.map(item =>
            (item._id || item.id) === id ? { ...item, customPrice } : item
        ));
    };

    useEffect(() => {
        fetchActiveVoucher();
    }, []);

    const [selectedProductIndex, setSelectedProductIndex] = useState(0);
    const searchInputRef = React.useRef(null);
    const formulaSearchRef = React.useRef(null);

    // Reset selection when search results change
    useEffect(() => {
        setSelectedProductIndex(0);
    }, [searchQuery, formulaSearch, activeCategory, filteredMedicines]);

    // Scroll active item into view
    useEffect(() => {
        if (filteredMedicines.length > 0) {
            const element = document.getElementById(`product-row-${selectedProductIndex}`);
            if (element) {
                element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedProductIndex, filteredMedicines]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // F2 - Focus Product Search
            if (e.key === 'F2') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // F4 - Open Customer Modal
            if (e.key === 'F4') {
                e.preventDefault();
                setIsAttachCustomerModalOpen(true);
            }
            // F6 - Focus Cart (First Quantity Input)
            if (e.key === 'F6') {
                e.preventDefault();
                const firstCartInput = document.querySelector('.cart-quantity-input');
                if (firstCartInput) {
                    firstCartInput.focus();
                    firstCartInput.select();
                } else {
                    showToast('Cart is empty', 'error');
                }
            }
            // F9 - Checkout / Pay (Matches Cart Pay Button)
            if (e.key === 'F9') {
                e.preventDefault();
                // Validations
                if (cartItems.length === 0) {
                    showToast('Cart is empty', 'error');
                    return;
                }
                if (!selectedCustomer && (!customerInfo.name || !customerInfo.phone)) {
                    showToast('Please select a customer or enter name and mobile', 'error');
                    return;
                }
                const newTxId = `#TX${Date.now()}`;
                setCurrentTransactionId(newTxId);
                setIsBillModalOpen(true);
            }
            // F8 - Focus Formula Search
            if (e.key === 'F8') {
                e.preventDefault();
                formulaSearchRef.current?.focus();
            }
            // Escape - Clear Search
            if (e.key === 'Escape') {
                // If modals are open, do nothing (let them handle close)
                if (isBillModalOpen || isAttachCustomerModalOpen || isSuccessModalOpen) return;

                e.preventDefault();
                setSearchQuery('');
                setFormulaSearch('');
                setSelectedProductIndex(0);
                searchInputRef.current?.focus();
            }

            // Arrow Navigation for Product List (Only if not in Cart or Modals)
            const isCartFocus = document.activeElement?.classList.contains('cart-quantity-input') ||
                document.activeElement?.closest('.cart-container');

            if (!isCartFocus && !isBillModalOpen && !isAttachCustomerModalOpen && !isSuccessModalOpen) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedProductIndex(prev => Math.min(prev + 1, filteredMedicines.length - 1));
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedProductIndex(prev => Math.max(prev - 1, 0));
                }
                if (e.key === 'Enter') {
                    // Start checkout if list is empty? No, traditionally Enter in search means select or search.
                    // If focusing input, Enter adds selected item
                    // Only intercept if we have a selection and we aren't submitting a form (though here we have no form)
                    if (filteredMedicines.length > 0 && selectedProductIndex >= 0 && selectedProductIndex < filteredMedicines.length) {
                        e.preventDefault();
                        const product = filteredMedicines[selectedProductIndex];
                        if (product.stock > 0) {
                            addToCart(product);
                            setSearchQuery('');
                            setFormulaSearch('');
                            setSelectedProductIndex(0);
                            searchInputRef.current?.focus();
                        } else {
                            showToast('Product out of stock', 'error');
                        }
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cartItems, selectedCustomer, customerInfo, isBillModalOpen, isAttachCustomerModalOpen, isSuccessModalOpen, showToast, filteredMedicines, selectedProductIndex]);

    // ... existing useEffects ...

    const handlePrint = async () => {
        // Validate that all items have valid quantities
        const invalidItems = cartItems.filter(item => !item.quantity || item.quantity === '' || item.quantity < 1 || isNaN(item.quantity));
        if (invalidItems.length > 0) {
            showToast('Please enter valid quantities for all items', 'error');
            console.error('Invalid quantities detected:', invalidItems);
            return;
        }

        // Validate required customer fields
        if (!selectedCustomer && (!customerInfo.name || !customerInfo.phone)) {
            showToast('Customer Name and Mobile Number are required', 'error');
            return;
        }

        // Always print the bill, regardless of backend save status
        try {
            // Use existing ID or generate new if missing (fallback)
            const transactionId = currentTransactionId || `#TX${Date.now()}`;

            // Prepare transaction data with clean item objects
            const transactionData = {
                transactionId,
                type: 'Sale', // Explicitly mark as Sale
                customer: {
                    id: selectedCustomer?._id || null,
                    name: customerInfo.name || selectedCustomer?.name || 'Walk-in',
                    email: customerInfo.email || selectedCustomer?.email || '',
                    phone: customerInfo.phone || selectedCustomer?.phone || '',
                    doctorName: customerInfo.doctorName,
                    billDate: customerInfo.billDate
                },
                items: cartItems.map(item => {
                    const effectivePrice = item.customPrice || parseFloat(item.price);
                    const itemSubtotal = effectivePrice * (parseInt(item.quantity) || 1);
                    const itemTotal = itemSubtotal - (parseFloat(item.discount) || 0);
                    return {
                        id: item.id,
                        name: item.name,
                        price: effectivePrice,
                        quantity: parseInt(item.quantity) || 1,
                        saleType: item.saleType || 'Single',
                        discount: parseFloat(item.discount) || 0,
                        isUnit: item.isUnit || false,
                        subtotal: itemTotal
                    };
                }),
                subtotal,
                platformFee,
                discount: discountAmount,
                total: cartTotal,
                voucher: selectedVoucher ? {
                    id: selectedVoucher._id,
                    code: selectedVoucher.code,
                    discountType: selectedVoucher.discountType,
                    discountValue: selectedVoucher.discountValue
                } : null,
                paymentMethod: paymentMethod,
                processedBy: 'Admin'
            };

            // Try to save transaction to backend (but don't block on failure)
            try {
                // Create completely clean object without prototype chain
                const cleanTransactionData = JSON.parse(JSON.stringify(transactionData));

                console.log('Attempting to save transaction...', cleanTransactionData);
                const response = await fetch(`${API_URL}/api/transactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cleanTransactionData)
                });

                console.log('Response status:', response.status);
                const responseData = await response.json();
                console.log('Response data:', responseData);

                if (response.ok) {
                    console.log('✅ Transaction saved successfully to database!');
                    showToast('Transaction saved successfully!', 'success');

                    // Capture bill number from response
                    if (responseData && responseData.billNumber) {
                        setCurrentBillNumber(responseData.billNumber);
                        // Brief delay to allow state to update the DOM for printing
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                    // Refresh medicines to show updated stock
                    fetchMedicines();
                } else {
                    console.warn('❌ Failed to save transaction:', responseData);
                    showToast('Warning: Transaction may not have saved', 'warning');
                }
            } catch (error) {
                // Backend is not available, continue with print anyway
                console.error('❌ Backend not available, printing without saving:', error);
                showToast('Offline mode: Transaction not saved', 'warning');
            }

            // Always proceed with printing
            window.print();

            // Show success and clear state
            setIsBillModalOpen(false);
            setIsSuccessModalOpen(true);
            setCartItems([]);
            setSelectedCustomer(null);
            setCustomerInfo({
                name: '',
                phone: '',
                email: '',
                doctorName: '',
                billDate: new Date().toISOString().split('T')[0]
            });
            setCurrentTransactionId(''); // Clear ID
            setCurrentBillNumber(null); // Clear Bill #
            // Keep voucher selected for next transaction

        } catch (error) {
            console.error('Error during print process:', error);
            // Still try to print even if there's an error
            window.print();
            setIsBillModalOpen(false);
            setCartItems([]);
            setSelectedCustomer(null);
            setCurrentTransactionId('');
        }
    };

    // Calculate subtotal with custom prices and item-level discounts
    const subtotal = cartItems.reduce((sum, item) => {
        const effectivePrice = item.customPrice || item.price;
        const itemSubtotal = effectivePrice * item.quantity;
        const itemTotal = itemSubtotal - (item.discount || 0);
        return sum + itemTotal;
    }, 0);

    const platformFee = 0.10;

    let discountAmount = 0;
    if (selectedVoucher) {
        if (selectedVoucher.discountType === 'Percentage') {
            discountAmount = (subtotal * selectedVoucher.discountValue) / 100;
        } else {
            discountAmount = selectedVoucher.discountValue;
        }
        // Ensure discount doesn't exceed subtotal
        discountAmount = Math.min(discountAmount, subtotal);
    }

    const cartTotal = subtotal + platformFee - discountAmount;

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
            {/* Removed Global Loader */}

            {/* Customer Details Section - Full Width */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <UserRound size={18} className="text-[#00c950]" />
                        <h3 className="font-bold text-gray-800">Customer Details</h3>
                    </div>
                    <button
                        onClick={() => setIsAttachCustomerModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow text-gray-700 hover:border-[#00c950]/50 hover:bg-green-50/10 transition-all duration-200 text-xs font-semibold"
                    >
                        <UserRound size={14} color="#00c950" strokeWidth={2} />
                        <span>{selectedCustomer ? selectedCustomer.name : 'Select Existing (F4)'}</span>
                    </button>
                </div>
                <div className="grid grid-cols-5 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Customer Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="Enter Name"
                            value={customerInfo.name}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00c950]/20 focus:border-[#00c950] transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Mobile Number <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="Enter Mobile"
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00c950]/20 focus:border-[#00c950] transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Email ID</label>
                        <input
                            type="email"
                            placeholder="Enter Email"
                            value={customerInfo.email}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00c950]/20 focus:border-[#00c950] transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Doctor Name</label>
                        <input
                            type="text"
                            placeholder="Enter Doctor Name"
                            value={customerInfo.doctorName}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, doctorName: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00c950]/20 focus:border-[#00c950] transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Select Bill Date <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input
                                type="date"
                                value={customerInfo.billDate}
                                onChange={(e) => setCustomerInfo(prev => ({ ...prev, billDate: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00c950]/20 focus:border-[#00c950] transition-all appearance-none"
                            />
                            <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
                {/* Left Side - Product Table */}
                <div className="flex-1 flex flex-col overflow-hidden overflow-x-hidden">

                    <div className="mb-2" />

                    {/* Unified Search and Table Container */}
                    <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Product Search Section */}
                        <div className="p-6 pb-2">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between">
                                <span>Product Search</span>
                                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded">F2 to Search</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="Enter Name"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-12 pr-6 py-3 border-transparent rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-gray-100 placeholder-gray-500"
                                    />
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        ref={formulaSearchRef}
                                        type="text"
                                        placeholder="Enter Formula/Code (F8)"
                                        value={formulaSearch}
                                        onChange={(e) => setFormulaSearch(e.target.value)}
                                        className="pl-12 pr-6 py-3 border-transparent rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-gray-100 placeholder-gray-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Products Table Section */}
                        <div className="flex-1 overflow-auto scrollbar-hide">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Location</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">MRP</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sale Price</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stock</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="py-12">
                                                <div className="flex justify-center items-center">
                                                    <Loader type="wave" size="md" message="Searching..." />
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMedicines.map((product, index) => {
                                            const isOutOfStock = product.stock <= 0;
                                            // Using Custom Green Theme Color
                                            const themeColor = 'bg-[#00c950]';
                                            const isSelected = index === selectedProductIndex;

                                            return (
                                                <tr
                                                    key={product._id || product.id}
                                                    id={`product-row-${index}`}
                                                    onClick={() => !isOutOfStock && addToCart(product)}
                                                    className={`transition-all border-b border-gray-50 last:border-0 
                                                        ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                        ${isSelected ? 'bg-[#00c950]/10 border-[#00c950]/30' : 'hover:bg-gray-50'}
                                                    `}
                                                >
                                                    <td className="py-4 px-4 text-sm text-gray-700 font-medium relative">
                                                        {isSelected && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00c950] rounded-r"></div>
                                                        )}
                                                        {product.name}
                                                    </td>
                                                    <td className="py-4 px-4 text-sm text-gray-600">
                                                        {product.shelfLocation || 'N/A'}
                                                    </td>
                                                    <td className="py-4 px-4 text-sm text-gray-500 line-through">
                                                        {product.mrp || '0.00'}
                                                    </td>
                                                    <td className="py-4 px-4 text-sm text-gray-900 font-bold">
                                                        {product.sellingPrice || product.price}
                                                    </td>
                                                    <td className="py-4 px-4 text-sm font-medium">
                                                        <span className={isOutOfStock ? 'text-red-600' : 'text-gray-700'}>
                                                            {isOutOfStock ? '0' : (product.stock / (product.packSize || 1)).toFixed(1)} <span className="text-[10px] text-gray-400 font-normal uppercase">Packs</span>
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                            {!loading && filteredMedicines.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    No products found
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Right Side - Cart */}
                <div className="w-[600px]">
                    <Cart
                        items={cartItems}
                        onUpdateQuantity={updateQuantity}
                        onUpdateSaleType={updateSaleType}
                        onUpdateDiscount={updateDiscount}
                        onUpdateIsUnit={updateIsUnit}
                        onUpdateCustomPrice={updateCustomPrice}
                        onRemove={removeFromCart}
                        onClearAll={() => {
                            setCartItems([]);
                            setSearchQuery('');
                            setActiveCategory('All');
                        }}
                        onPrintBill={() => {
                            if (!selectedCustomer && (!customerInfo.name || !customerInfo.phone)) {
                                showToast('Please select a customer or enter name and mobile', 'error');
                                return;
                            }
                            const newTxId = `#TX${Date.now()}`;
                            setCurrentTransactionId(newTxId);
                            setIsBillModalOpen(true);
                        }}
                        onAttachCustomer={() => setIsAttachCustomerModalOpen(true)}
                        customer={selectedCustomer}
                        discount={discountAmount}
                        voucher={selectedVoucher}
                        paymentMethod={paymentMethod}
                        onPaymentMethodChange={setPaymentMethod}
                    />
                </div>
            </div>

            <BillModal
                isOpen={isBillModalOpen}
                onClose={() => setIsBillModalOpen(false)}
                items={cartItems}
                total={cartTotal}
                onPrint={handlePrint}
                customer={selectedCustomer || {
                    name: customerInfo.name,
                    phone: customerInfo.phone,
                    email: customerInfo.email
                }}
                discount={discountAmount}
                transactionId={currentTransactionId}
                billNumber={currentBillNumber}
                paymentMethod={paymentMethod}
                voucher={selectedVoucher}
            />

            <AttachCustomerModal
                isOpen={isAttachCustomerModalOpen}
                onClose={() => setIsAttachCustomerModalOpen(false)}
                onSelectCustomer={setSelectedCustomer}
            />

            <OrderSuccessModal
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
            />

        </div>
    );
};

export default Home;
