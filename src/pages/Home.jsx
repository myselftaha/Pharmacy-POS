 import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Search, Ticket, Plus, ScanBarcode, UserRound, Zap, X } from 'lucide-react';
import CategoryFilter from '../components/pos/CategoryFilter';

import Cart from '../components/pos/Cart';
import BillModal from '../components/pos/BillModal';
import AttachCustomerModal from '../components/pos/AttachCustomerModal';
import OrderSuccessModal from '../components/pos/OrderSuccessModal';
import VoucherSelectionModal from '../components/pos/VoucherSelectionModal';
import BarcodeMappingModal from '../components/pos/BarcodeMappingModal';
import { categories } from '../data/mockData';
import API_URL from '../config/api';
import Loader from '../components/common/Loader';
const Home = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');    const [cartItems, setCartItems] = useState(() => {
        const saved = localStorage.getItem('cartItems');
        return saved ? JSON.parse(saved) : [];
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [isAttachCustomerModalOpen, setIsAttachCustomerModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(() => {
        const saved = localStorage.getItem('selectedCustomer');
        return saved ? JSON.parse(saved) : null;
    });
    const [selectedVoucher, setSelectedVoucher] = useState(() => {
        const saved = localStorage.getItem('selectedVoucher');
        return saved ? JSON.parse(saved) : null;
    });
    const [medicines, setMedicines] = useState([]);
    const [supplies, setSupplies] = useState([]);

    const { enqueueSnackbar } = useSnackbar();

    const [paymentMethod, setPaymentMethod] = useState('Cash');

    // Barcode System State
    const [isBarcodeMode, setIsBarcodeMode] = useState(() => {
        const saved = localStorage.getItem('isBarcodeMode');
        return saved === 'true'; // simple boolean check
    });
    const [barcodeBuffer, setBarcodeBuffer] = useState('');
    const [lastScannedCode, setLastScannedCode] = useState('');
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
    const barcodeInputRef = React.useRef(null);


    // Fetch medicines from database
    const fetchMedicines = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/medicines`);
            const data = await response.json();
            setMedicines(data);
        } catch (error) {
            console.error('Error fetching medicines:', error);
            setMedicines([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSupplies = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/supplies`);
            const data = await response.json();
            setSupplies(data);
        } catch (error) {
            console.error('Error fetching supplies:', error);
        } finally {
            setLoading(false);
        }
    };    useEffect(() => {
        fetchMedicines();
        fetchSupplies();
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

    // Persist selected voucher to localStorage
    useEffect(() => {
        if (selectedVoucher) {
            localStorage.setItem('selectedVoucher', JSON.stringify(selectedVoucher));
        } else {
            localStorage.removeItem('selectedVoucher');
        }
    }, [selectedVoucher]);


    // Persist barcode mode
    useEffect(() => {
        localStorage.setItem('isBarcodeMode', isBarcodeMode);
    }, [isBarcodeMode]);

    const filteredMedicines = medicines.filter(med => {
        const matchesCategory = activeCategory === 'All' || med.category === activeCategory;
        const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase());
        const inInventory = med.inInventory === true;

        // Check if this medicine has a corresponding Supply record
        const hasSupplyRecord = supplies.some(supply =>
            (supply.medicineId && med.id && supply.medicineId.toString() === med.id.toString()) ||
            (supply.medicineId && med._id && supply.medicineId.toString() === med._id.toString())
        );

        return matchesCategory && matchesSearch && inInventory && hasSupplyRecord;
    });



    const addToCart = (product, quantityToAdd = 1) => {
        // Find existing quantity in cart
        const productId = product._id || product.id;
        const existingItem = cartItems.find(item => (item._id || item.id) === productId);
        const currentQty = existingItem ? existingItem.quantity : 0;

        // Check stock
        if (currentQty + quantityToAdd > product.stock) {
            enqueueSnackbar(`Out of stock! Only ${product.stock} available.`, { variant: 'error' });
            return;
        }

        setCartItems(prev => {
            if (existingItem) {
                return prev.map(item =>
                    (item._id || item.id) === productId ? { ...item, quantity: item.quantity + quantityToAdd } : item
                );
            }
            return [...prev, { ...product, id: productId, quantity: quantityToAdd }];
        });
    };


    const updateQuantity = (id, newQuantity) => {
        if (newQuantity < 1) return;

        const item = cartItems.find(i => i.id === id);
        if (item && newQuantity > item.stock) {
            enqueueSnackbar(`Cannot exceed available stock (${item.stock})`, { variant: 'warning' });
            return;
        }

        setCartItems(prev => prev.map(item =>
            item.id === id ? { ...item, quantity: newQuantity } : item
        ));
    };

    const removeFromCart = (id) => {
        setCartItems(prev => prev.filter(item => item.id !== id));
    };

    // --- BARCODE LOGIC START ---

    // Focus management for hidden input
    useEffect(() => {
        if (isBarcodeMode && !isBillModalOpen && !isAttachCustomerModalOpen && !isSuccessModalOpen && !isVoucherModalOpen && !isMappingModalOpen) {
            const focusInput = () => {
                // Don't steal focus if user is typing in another input
                const activeTag = document.activeElement?.tagName;
                const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

                if (barcodeInputRef.current && !isTyping) {
                    barcodeInputRef.current.focus();
                }
            };
            focusInput();
            const interval = setInterval(focusInput, 500); // Re-focus periodically to capture lost focus
            return () => clearInterval(interval);
        }
    }, [isBarcodeMode, isBillModalOpen, isAttachCustomerModalOpen, isSuccessModalOpen, isVoucherModalOpen, isMappingModalOpen]);

    const handleBarcodeSubmit = (e) => {
        e.preventDefault();
        const code = barcodeBuffer.trim();
        if (!code) return;

        console.log('Scanned:', code);
        setBarcodeBuffer(''); // Clear buffer immediately

        // 1. Direct Search in Medicines
        let matchedProduct = null;
        let matchedPackSize = 1;

        // Check flat structure or nested barcodes
        for (const med of medicines) {
            // Check main ID/Name logic if needed, but primarily check barcode array
            if (med.barcodes && med.barcodes.length > 0) {
                const map = med.barcodes.find(b => b.code === code);
                if (map) {
                    matchedProduct = med;
                    matchedPackSize = map.packSize || 1;
                    break;
                }
            }
            // Fallback: check exact ID match if it looks like ID
            if (String(med.id) === code) {
                matchedProduct = med;
                break;
            }
        }

        if (matchedProduct) {
            // Found! Add to cart
            enqueueSnackbar(`Scanned: ${matchedProduct.name}`, { variant: 'success', autoHideDuration: 1000 });
            addToCart(matchedProduct, matchedPackSize);
        } else {
            // Not found - Open Mapping Modal
            // Check if it's a valid looking barcode (length > 3) to avoid accidental triggers
            if (code.length > 2) {
                enqueueSnackbar('Unknown barcode. Map it to a product.', { variant: 'info' });
                setLastScannedCode(code);
                setIsMappingModalOpen(true);
            }
        }
    };

    const handleMapBarcode = async (mappingData) => {
        try {
            const response = await fetch(`${API_URL}/api/medicines/map-barcode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mappingData) // { medicineId, barcode, unit, packSize }
            });

            const data = await response.json();

            if (response.ok) {
                enqueueSnackbar('Barcode mapped successfully!', { variant: 'success' });
                setIsMappingModalOpen(false);
                fetchMedicines(); // Refresh data

                // Auto-add the mapped item to cart
                if (data.medicine) {
                    // Update the local medicine object immediately to reflect without reload
                    addToCart(data.medicine, mappingData.packSize);
                }
            } else {
                enqueueSnackbar(data.message || 'Failed to map barcode', { variant: 'error' });
            }
        } catch (error) {
            console.error('Map Error:', error);
            enqueueSnackbar('Error mapping barcode', { variant: 'error' });
        }
    };
    // --- BARCODE LOGIC END ---

    const [currentTransactionId, setCurrentTransactionId] = useState('');

    // ... existing useEffects ...

    const handlePrint = async () => {
        // Validate that all items have valid quantities
        const invalidItems = cartItems.filter(item => !item.quantity || item.quantity === '' || item.quantity < 1 || isNaN(item.quantity));
        if (invalidItems.length > 0) {
            enqueueSnackbar('Please enter valid quantities for all items', { variant: 'error' });
            console.error('Invalid quantities detected:', invalidItems);
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
                customer: selectedCustomer ? {
                    id: selectedCustomer._id,
                    name: selectedCustomer.name,
                    email: selectedCustomer.email,
                    phone: selectedCustomer.phone
                } : {
                    name: 'Walk-in'
                },
                items: cartItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: parseFloat(item.price),
                    quantity: parseInt(item.quantity) || 1,
                    subtotal: parseFloat(item.price) * (parseInt(item.quantity) || 1)
                })),
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
                    enqueueSnackbar('Transaction saved successfully!', { variant: 'success' });
                    // Refresh medicines to show updated stock
                    fetchMedicines();
                } else {
                    console.warn('❌ Failed to save transaction:', responseData);
                    enqueueSnackbar('Warning: Transaction may not have saved', { variant: 'warning' });
                }
            } catch (error) {
                // Backend is not available, continue with print anyway
                console.error('❌ Backend not available, printing without saving:', error);
                enqueueSnackbar('Offline mode: Transaction not saved', { variant: 'warning' });
            }

            // Always proceed with printing
            window.print();

            // Show success and clear state
            setIsBillModalOpen(false);
            setIsSuccessModalOpen(true);
            setCartItems([]);
            setSelectedCustomer(null);
            setCurrentTransactionId(''); // Clear ID
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

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
        <div className="flex gap-6 h-[calc(100vh-8rem)] overflow-hidden">
            {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50">
                    <Loader type="wave" message="Loading products..." size="lg" />
                </div>
            )}
            {/* Left Side - Product Table */}
            <div className="flex-1 flex flex-col overflow-hidden overflow-x-hidden">
                {/* Top Actions */}
                <div className="flex gap-3 mb-6">

                    <div className="relative">
                        <input
                            ref={barcodeInputRef}
                            type="text"
                            value={barcodeBuffer}
                            onChange={(e) => setBarcodeBuffer(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleBarcodeSubmit(e);
                            }}
                            className="opacity-0 absolute w-1 h-1 pointer-events-none"
                            autoComplete="off"
                        />
                        <button
                            onClick={() => setIsBarcodeMode(!isBarcodeMode)}
                            className={`flex items-center gap-2 px-6 py-3 bg-white border rounded-xl shadow-sm hover:shadow transition-all duration-200 ${isBarcodeMode
                                ? 'border-[#00c950] bg-green-50/20 text-[#00c950]'
                                : 'border-gray-200 text-gray-700 hover:border-[#00c950]/50'
                                }`}
                        >
                            <ScanBarcode size={22} className={isBarcodeMode ? 'animate-pulse' : ''} color={isBarcodeMode ? '#00c950' : '#00c950'} strokeWidth={2} />
                            <span className="text-base font-semibold">
                                {isBarcodeMode ? 'Barcode On' : 'Barcode Off'}
                            </span>
                        </button>
                    </div>
                    <button
                        onClick={() => setIsAttachCustomerModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow text-gray-700 hover:border-[#00c950]/50 hover:bg-green-50/10 transition-all duration-200"
                    >
                        <UserRound size={22} color="#00c950" strokeWidth={2} />
                        <span className="text-base font-semibold">{selectedCustomer ? selectedCustomer.name : 'Select Customer'}</span>
                    </button>
                    <button
                        onClick={() => setIsVoucherModalOpen(true)}
                        className={`flex items-center gap-2 px-6 py-3 bg-white border rounded-xl shadow-sm hover:shadow transition-all duration-200 ${selectedVoucher
                            ? 'border-[#00c950] bg-green-50/20 text-[#00c950]'
                            : 'border-gray-200 text-gray-700 hover:border-[#00c950]/50'
                            }`}
                    >
                        <Ticket size={22} color="#00c950" strokeWidth={2} />
                        <span className="text-base font-semibold">
                            {selectedVoucher ? selectedVoucher.code : 'Vouchers'}
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setActiveCategory('All');
                            setCartItems([]); // Clear Cart
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                        <span className="text-base font-medium">Clear All</span>
                    </button>
                </div>

                {/* Unified Search and Table Container */}
                <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Product Search Section */}
                    <div className="p-6 pb-2">
                        <h3 className="font-bold text-gray-800 mb-3">Product Search</h3>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Select products by name or ID ......"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-6 py-3 border-transparent rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-gray-100 placeholder-gray-500"
                            />
                        </div>
                    </div>

                    {/* Products Table Section */}
                    <div className="flex-1 overflow-auto scrollbar-hide">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ID</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Product</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Price</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stock</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredMedicines.map(product => {
                                    const isOutOfStock = product.stock <= 0;
                                    // Using Custom Green Theme Color
                                    const themeColor = 'bg-[#00c950]';

                                    return (
                                        <tr
                                            key={product._id || product.id}
                                            onClick={() => !isOutOfStock && addToCart(product)}
                                            className={`hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <td className="py-4 px-4 text-sm text-gray-900 font-bold">
                                                TXN{String(product.id || '000').padStart(3, '0')}
                                            </td>
                                            <td className="py-4 px-4 text-sm text-gray-700 font-medium">
                                                {product.name}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`${themeColor} text-white text-xs font-medium px-3 py-1.5 rounded-md`}>
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                                                {product.price}/-
                                            </td>
                                            <td className="py-4 px-4 text-sm text-gray-700 font-medium">
                                                {product.stock}
                                            </td>
                                            <td className="py-4 px-4">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        !isOutOfStock && addToCart(product);
                                                    }}
                                                    disabled={isOutOfStock}
                                                    className={`w-8 h-8 rounded-md flex items-center justify-center text-white transition-colors ${isOutOfStock
                                                        ? 'bg-gray-300 cursor-not-allowed'
                                                        : 'bg-[#00c950] hover:opacity-90'
                                                        }`}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredMedicines.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No products found
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Right Side - Cart */}
            {/* Right Side - Cart */}
            <div className="w-96">
                <Cart
                    items={cartItems}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                    onPrintBill={() => {
                        if (!selectedCustomer) {
                            enqueueSnackbar('Please select customer', { variant: 'error' });
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

            <BillModal
                isOpen={isBillModalOpen}
                onClose={() => setIsBillModalOpen(false)}
                items={cartItems}
                total={cartTotal}
                onPrint={handlePrint}
                customer={selectedCustomer}
                discount={discountAmount}
                transactionId={currentTransactionId}
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

            <VoucherSelectionModal
                isOpen={isVoucherModalOpen}
                onClose={() => setIsVoucherModalOpen(false)}
                onSelectVoucher={setSelectedVoucher}
                currentVoucher={selectedVoucher}
            />
            <BarcodeMappingModal
                isOpen={isMappingModalOpen}
                onClose={() => setIsMappingModalOpen(false)}
                scannedCode={lastScannedCode}
                medicines={medicines}
                onSaveMapping={handleMapBarcode}
            />
        </div >
    );
};

export default Home;
