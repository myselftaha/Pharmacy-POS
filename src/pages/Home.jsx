import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
import { Search, Ticket, ScanLine, X } from 'lucide-react';
import ProductCard from '../components/pos/ProductCard';
import CategoryFilter from '../components/pos/CategoryFilter';
import Cart from '../components/pos/Cart';
import BillModal from '../components/pos/BillModal';
import AttachCustomerModal from '../components/pos/AttachCustomerModal';
import OrderSuccessModal from '../components/pos/OrderSuccessModal';
import VoucherSelectionModal from '../components/pos/VoucherSelectionModal';
import { medicines, categories } from '../data/mockData';

const Home = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [cartItems, setCartItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [isAttachCustomerModalOpen, setIsAttachCustomerModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const { enqueueSnackbar } = useSnackbar();

    const filteredMedicines = medicines.filter(med => {
        const matchesCategory = activeCategory === 'All' || med.category === activeCategory;
        const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const addToCart = (product) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
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

    const handlePrint = () => {
        window.print();
        // After print dialog closes (or immediately if non-blocking), show success and clear state
        setIsBillModalOpen(false);
        setIsSuccessModalOpen(true);
        setCartItems([]);
        setSelectedCustomer(null);
        // Keep voucher selected for next transaction
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
        <div className="flex gap-6 h-[calc(100vh-8rem)]">
            {/* Left Side - Product Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Actions */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search medicine"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
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
                        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-200">
                            <ScanLine size={18} />
                            <span>Scan Prescription</span>
                        </button>
                    </div>
                </div>

                {/* Banner */}
                <div className="bg-green-600 rounded-xl p-6 text-white mb-8 flex justify-between items-center shadow-lg shadow-green-600/20">
                    <div>
                        <h3 className="font-bold text-lg mb-1">Professional Management Systems Join Us</h3>
                        <p className="text-green-100 text-sm">Professionel Pharmacy Management System Powered By MyCodeSpace</p>
                    </div>
                    <button className="bg-white text-green-700 px-6 py-2 rounded-lg font-bold hover:bg-green-50 transition-colors">
                        Subscribe
                    </button>
                </div>

                {/* Waitlist Preview (Mini) */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-gray-800">Waiting List</h3>
                    </div>
                    <button className="text-green-600 text-sm font-medium hover:underline">See all</button>
                </div>

                {/* Categories & Grid */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-lg">Medicines</h3>
                    <button className="text-green-600 text-sm font-medium hover:underline">See all</button>
                </div>

                <CategoryFilter
                    categories={categories}
                    activeCategory={activeCategory}
                    onSelect={setActiveCategory}
                />

                <div className="grid grid-cols-3 gap-4 overflow-y-auto pb-4 pr-2">
                    {filteredMedicines.map(product => (
                        <ProductCard key={product.id} product={product} onAdd={addToCart} />
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
