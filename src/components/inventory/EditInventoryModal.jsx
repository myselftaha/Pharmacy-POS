import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const EditInventoryModal = ({ isOpen, onClose, onConfirm, product }) => {
    const [formData, setFormData] = useState({
        price: '',
        costPrice: '',
        margin: '',
        stock: '',
        minStock: '',
        expiryDate: ''
    });

    useEffect(() => {
        if (isOpen && product) {
            const price = product.price || '';
            const cost = product.costPrice || '';
            setFormData({
                price: price,
                costPrice: cost,
                margin: calculateMargin(price, cost),
                stock: product.stock || '',
                minStock: product.minStock || 10,
                expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : ''
            });
        }
    }, [isOpen, product]);

    const calculateMargin = (price, cost) => {
        if (!price || !cost || parseFloat(price) === 0) return '';
        const margin = ((parseFloat(price) - parseFloat(cost)) / parseFloat(price)) * 100;
        return margin.toFixed(2);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(product._id, formData);
    };

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Edit Inventory Item</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Product Name (Read only) */}
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Product Name</label>
                            <input
                                type="text"
                                value={product.name}
                                readOnly
                                className="w-full bg-gray-100 border border-transparent rounded-lg px-4 py-3 text-gray-500"
                            />
                        </div>

                        {/* Category (Read only) */}
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                            <input
                                type="text"
                                value={product.category}
                                readOnly
                                className="w-full bg-gray-100 border border-transparent rounded-lg px-4 py-3 text-gray-500"
                            />
                        </div>

                        {/* Sale Price */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Sale Price</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={e => {
                                    const newPrice = e.target.value;
                                    const newMargin = calculateMargin(newPrice, formData.costPrice);
                                    setFormData({ ...formData, price: newPrice, margin: newMargin });
                                }}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                required
                            />
                        </div>

                        {/* Cost Price */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Cost Price</label>
                            <input
                                type="number"
                                value={formData.costPrice}
                                onChange={e => {
                                    const newCost = e.target.value;
                                    const newMargin = calculateMargin(formData.price, newCost);
                                    setFormData({ ...formData, costPrice: newCost, margin: newMargin });
                                }}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                required
                            />
                        </div>

                        {/* Margin (Editable) */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Margin (%)</label>
                            <input
                                type="number"
                                value={formData.margin}
                                onChange={e => {
                                    const newMargin = e.target.value;
                                    let newPrice = formData.price;
                                    if (formData.costPrice && newMargin !== '') {
                                        const marginVal = parseFloat(newMargin);
                                        const costVal = parseFloat(formData.costPrice);
                                        // Price = Cost / (1 - Margin%)
                                        if (marginVal < 100) {
                                            newPrice = (costVal / (1 - (marginVal / 100))).toFixed(2);
                                        }
                                    }
                                    setFormData({ ...formData, margin: newMargin, price: newPrice });
                                }}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 font-bold"
                            />
                        </div>

                        {/* Current Stock */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Current Stock</label>
                            <input
                                type="number"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                required
                            />
                        </div>

                        {/* Low Stock Threshold */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Low Stock Threshold</label>
                            <input
                                type="number"
                                value={formData.minStock}
                                onChange={e => setFormData({ ...formData, minStock: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>

                        {/* Expiry Date */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Expiry Date</label>
                            <input
                                type="date"
                                value={formData.expiryDate}
                                onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-[#1a4d44] text-white rounded-lg font-bold hover:bg-[#153e37] transition-colors shadow-lg shadow-green-900/20"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditInventoryModal;
