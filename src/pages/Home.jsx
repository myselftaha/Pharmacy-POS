import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Search, Ticket, X } from 'lucide-react';
import ProductCard from '../components/pos/ProductCard';
import CategoryFilter from '../components/pos/CategoryFilter';
import Cart from '../components/pos/Cart';
import BillModal from '../components/pos/BillModal';
import AttachCustomerModal from '../components/pos/AttachCustomerModal';
import OrderSuccessModal from '../components/pos/OrderSuccessModal';
import VoucherSelectionModal from '../components/pos/VoucherSelectionModal';
import { categories } from '../data/mockData';

const Home = () => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('All');
    const [cartItems, setCartItems] = useState(() => {
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
    const { enqueueSnackbar } = useSnackbar();

    // Fetch medicines from database
    useEffect(() => {
        const fetchMedicines = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/medicines');
                const data = await response.json();
                setMedicines(data);
            } catch (error) {
                console.error('Error fetching medicines:', error);
                setMedicines([]);
            }
        };
        fetchMedicines();
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

    const filteredMedicines = medicines.filter(med => {
        const matchesCategory = activeCategory === 'All' || med.category === activeCategory;
        const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase());
        const inInventory = med.inInventory === true;
        return matchesCategory && matchesSearch && inInventory;
    });



    const addToCart = (product) => {
        setCartItems(prev => {
            const productId = product._id || product.id;
            const existing = prev.find(item => (item._id || item.id) === productId);
            if (existing) {
                return prev.map(item =>
                    (item._id || item.id) === productId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, id: productId, quantity: 1 }];
        });
    };


    const updateQuantity = (id, newQuantity) => {
        if (newQuantity < 1) return;
        setCartItems(prev => prev.map(item =>
            item.id === id ? { ...item, quantity: newQuantity } : item
        ));
    };

    const removeFromCart = (id) => {
        setCartItems(prev => prev.filter(item => item.id !== id));
    };

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
            // Generate transaction ID
            const transactionId = `#TX${Date.now()}`;

            // Prepare transaction data with clean item objects
            const transactionData = {
                transactionId,
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
                paymentMethod: 'Cash',
                processedBy: 'Admin'
            };

            // Try to save transaction to backend (but don't block on failure)
            try {
                // Create completely clean object without prototype chain
                const cleanTransactionData = JSON.parse(JSON.stringify(transactionData));

                console.log('Attempting to save transaction...', cleanTransactionData);
                const response = await fetch('http://localhost:5000/api/transactions', {
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
            // Keep voucher selected for next transaction

        } catch (error) {
            console.error('Error during print process:', error);
            // Still try to print even if there's an error
            window.print();
            setIsBillModalOpen(false);
            setCartItems([]);
            setSelectedCustomer(null);
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
            {/* Left Side - Product Grid */}
            <div className="flex-1 flex flex-col overflow-hidden overflow-x-hidden">
                {/* Top Actions */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex-1 max-w-2xl">
                        <div className="relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={26} />
                            <input
                                type="text"
                                placeholder="Search medicine"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-16 pr-6 py-5 border-2 border-gray-200 rounded-2xl w-full text-lg font-medium focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 shadow-md hover:shadow-lg transition-shadow"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 ml-4">
                        <button
                            onClick={() => setIsVoucherModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                        >
                            <Ticket size={18} />
                            <span>{selectedVoucher ? `Voucher: ${selectedVoucher.code}` : 'Use Voucher'}</span>
                        </button>
                    </div>
                </div>





                {/* Categories & Grid */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-lg">Medicines</h3>
                    <button
                        onClick={() => navigate('/inventory')}
                        className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors border border-green-200 shadow-sm"
                    >
                        See all
                    </button>
                </div>

                <CategoryFilter
                    categories={categories}
                    activeCategory={activeCategory}
                    onSelect={setActiveCategory}
                />

                <div className="grid grid-cols-3 gap-4 overflow-y-auto pb-4 pr-2 scrollbar-hide">
                    {filteredMedicines.map(product => (
                        <ProductCard key={product._id || product.id} product={product} onAdd={addToCart} />
                    ))}
                </div>
            </div>

            {/* Right Side - Cart */}
            <div className="w-96">
                <Cart
                    items={cartItems}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                    onPrintBill={() => {
                        if (!selectedCustomer) {
                            enqueueSnackbar('Please attach a customer before printing the bill', { variant: 'error' });
                            return;
                        }
                        setIsBillModalOpen(true);
                    }}
                    onAttachCustomer={() => setIsAttachCustomerModalOpen(true)}
                    customer={selectedCustomer}
                    discount={discountAmount}
                    voucher={selectedVoucher}
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
        </div>
    );
};

export default Home;
