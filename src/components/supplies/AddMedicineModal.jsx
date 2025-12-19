import React, { useState, useEffect } from 'react';
import { X, Save, ChevronDown } from 'lucide-react';

const AddMedicineModal = ({ isOpen, onClose, onSave, suppliers, initialSupplier }) => {
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Antibiotics',
        description: '',
        price: '', // Selling Price
        stock: '', // Quantity
        unit: 'Piece',
        netContent: '',
        // New Fields
        batchNumber: '',
        supplierName: '',
        purchaseCost: '',
        purchaseInvoiceNumber: '',
        invoiceDueDate: '', // Added
        manufacturingDate: '',
        expiryDate: '',
        notes: '',
        status: 'Posted' // Default to Posted
    });

    useEffect(() => {
        if (isOpen && initialSupplier) {
            setFormData(prev => ({ ...prev, supplierName: initialSupplier }));
        }
    }, [isOpen, initialSupplier]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            quantity: parseInt(formData.stock), // Map stock to quantity for API
            price: parseFloat(formData.price),
            purchaseCost: parseFloat(formData.purchaseCost)
        });
        // Reset form
        setFormData({
            name: '',
            category: 'Antibiotics',
            description: '',
            price: '',
            stock: '',
            unit: 'Piece',
            netContent: '',
            batchNumber: '',
            supplierName: '',
            purchaseCost: '',
            purchaseInvoiceNumber: '',
            invoiceDueDate: '',
            manufacturingDate: '',
            expiryDate: '',
            notes: '',
            status: 'Posted'
        });
    };

    const categories = ['Antibiotics', 'Antihistamines', 'First Aid', 'Pain Relief', 'Skincare', 'Vitamins'];
    const units = [
        'Ampoule / Ampul',
        'Box',
        'Capsule / Tablet (pc)',
        'Carton',
        'Dropper / Bottle (ml)',
        'Jar / Canister',
        'Pack',
        'Piece',
        'Sachet',
        'Strip',
        'Tube',
        'Vial'
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="bg-green-600 p-4 flex justify-between items-center text-white sticky top-0 z-10">
                    <h2 className="font-bold text-lg">Add New Supply (Purchase Record)</h2>
                    <button onClick={onClose} className="hover:bg-green-700 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Section 1: Product Basics */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Product Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Medicine Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="e.g. Amoxicillin"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="category"
                                    required
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                >
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white cursor-pointer flex justify-between items-center"
                                        onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                                    >
                                        <span className={`truncate ${!formData.unit ? 'text-gray-400' : 'text-gray-900'}`}>{formData.unit || 'Select Unit'}</span>
                                        <ChevronDown size={16} className="text-gray-500" />
                                    </div>

                                    {showUnitDropdown && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setShowUnitDropdown(false)}
                                            ></div>
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                                                {units.map(unit => (
                                                    <div
                                                        key={unit}
                                                        className="px-4 py-2 hover:bg-green-50 hover:text-green-700 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-none transition-colors"
                                                        onClick={() => {
                                                            handleChange({ target: { name: 'unit', value: unit } });
                                                            setShowUnitDropdown(false);
                                                        }}
                                                    >
                                                        {unit}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="1"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Brief description..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Purchase & Stock Details */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Purchase & Stock</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="stock"
                                    required
                                    min="1"
                                    value={formData.stock}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Qty Purchased"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cost Price (Per Unit) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="purchaseCost"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.purchaseCost}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Selling Price <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Net Content</label>
                                <input
                                    type="text"
                                    name="netContent"
                                    value={formData.netContent}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="e.g. 10 tabs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Batch & Supplier Info */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Batch & Supplier</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Batch Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="batchNumber"
                                    required
                                    value={formData.batchNumber}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Batch #123"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supplier Name <span className="text-red-500">*</span>
                                </label>
                                {suppliers && suppliers.length > 0 ? (
                                    <div className="relative">
                                        <select
                                            name="supplierName"
                                            required
                                            value={formData.supplierName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none appearance-none bg-white"
                                        >
                                            <option value="">Select Supplier</option>
                                            {suppliers.map(s => (
                                                <option key={s._id} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        name="supplierName"
                                        required
                                        value={formData.supplierName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="Distributor Name"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Invoice Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="purchaseInvoiceNumber"
                                    required
                                    value={formData.purchaseInvoiceNumber}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="INV-001"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Invoice Due Date
                                </label>
                                <input
                                    type="date"
                                    name="invoiceDueDate"
                                    value={formData.invoiceDueDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mfg Date
                                </label>
                                <input
                                    type="date"
                                    name="manufacturingDate"
                                    value={formData.manufacturingDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    name="expiryDate"
                                    value={formData.expiryDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <input
                                    type="text"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Any additional notes..."
                                />
                            </div>
                        </div>
                    </div>


                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-green-600/20"
                        >
                            <Save size={18} />
                            Save Supply Entry
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default AddMedicineModal;
