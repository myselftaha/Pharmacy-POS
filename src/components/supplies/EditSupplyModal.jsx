import React, { useState, useEffect } from 'react';
import { X, Save, ChevronDown } from 'lucide-react';

const EditSupplyModal = ({ isOpen, onClose, onSave, supply, suppliers = [] }) => {
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Antibiotics',
        description: '',
        price: '', // Selling Price (synced with sellPrice)
        stock: '', // No. of Strips/Qty
        unit: 'Piece',
        netContent: '10', // Units / Strip
        batchNumber: '',
        supplierName: '',
        purchaseCost: '',
        purchaseInvoiceNumber: '',
        invoiceDate: '',
        invoiceDueDate: '',
        manufacturingDate: '',
        expiryDate: '',
        notes: '',
        mrp: '',
        freeQuantity: '0',
        sellPrice: '',
        discountPercentage: '0',
        boxNumber: '',
        itemAmount: '0.00',
        discountAmount: '0.00',
        taxableAmount: '0.00',
        cgstPercentage: '0',
        cgstAmount: '0.00',
        sgstPercentage: '0',
        sgstAmount: '0.00',
        igstPercentage: '0',
        igstAmount: '0.00',
        totalGst: '0.00',
        payableAmount: '0.00'
    });

    useEffect(() => {
        if (isOpen && supply) {
            const data = {
                name: supply.name || '',
                category: supply.category || 'Antibiotics',
                description: supply.description || '',
                price: supply.sellingPrice || supply.price || '',
                stock: supply.quantity || supply.currentStock || '',
                unit: supply.unit || 'Piece',
                netContent: supply.netContent || '10',
                batchNumber: supply.batchNumber || '',
                supplierName: supply.supplierName || '',
                purchaseCost: supply.purchaseCost || '',
                purchaseInvoiceNumber: supply.purchaseInvoiceNumber || '',
                invoiceDate: supply.addedDate ? new Date(supply.addedDate).toISOString().split('T')[0] : '',
                invoiceDueDate: supply.invoiceDueDate ? new Date(supply.invoiceDueDate).toISOString().split('T')[0] : '',
                manufacturingDate: supply.manufacturingDate ? new Date(supply.manufacturingDate).toISOString().split('T')[0] : '',
                expiryDate: supply.expiryDate ? new Date(supply.expiryDate).toISOString().split('T')[0] : '',
                notes: supply.notes || '',
                mrp: supply.mrp || '',
                freeQuantity: supply.freeQuantity || '0',
                sellPrice: supply.sellingPrice || supply.price || '',
                discountPercentage: supply.discountPercentage || '0',
                boxNumber: supply.boxNumber || '',
                cgstPercentage: supply.cgstPercentage || '0',
                sgstPercentage: supply.sgstPercentage || '0',
                igstPercentage: supply.igstPercentage || '0'
            };
            setFormData(calculateTotals(data));
        }
    }, [isOpen, supply]);

    if (!isOpen || !supply) return null;

    const calculateTotals = (data) => {
        const qty = parseFloat(data.stock) || 0;
        const cost = parseFloat(data.purchaseCost) || 0;
        const discPerc = parseFloat(data.discountPercentage) || 0;
        const cgstPerc = parseFloat(data.cgstPercentage) || 0;
        const sgstPerc = parseFloat(data.sgstPercentage) || 0;
        const igstPerc = parseFloat(data.igstPercentage) || 0;

        const itemAmount = qty * cost;
        const discountAmount = itemAmount * (discPerc / 100);
        const taxableAmount = itemAmount - discountAmount;

        const cgstAmount = taxableAmount * (cgstPerc / 100);
        const sgstAmount = taxableAmount * (sgstPerc / 100);
        const igstAmount = taxableAmount * (igstPerc / 100);
        const totalGst = cgstAmount + sgstAmount + igstAmount;
        const payableAmount = taxableAmount + totalGst;

        return {
            ...data,
            itemAmount: itemAmount.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            taxableAmount: taxableAmount.toFixed(2),
            cgstAmount: cgstAmount.toFixed(2),
            sgstAmount: sgstAmount.toFixed(2),
            igstAmount: igstAmount.toFixed(2),
            totalGst: totalGst.toFixed(2),
            payableAmount: payableAmount.toFixed(2)
        };
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            const calculationFields = ['stock', 'purchaseCost', 'discountPercentage', 'cgstPercentage', 'sgstPercentage', 'igstPercentage'];
            if (calculationFields.includes(name)) {
                return calculateTotals(newData);
            }
            return newData;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            quantity: parseInt(formData.stock),
            price: parseFloat(formData.sellPrice || formData.price),
            sellingPrice: parseFloat(formData.sellPrice || formData.price),
            purchaseCost: parseFloat(formData.purchaseCost)
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
                <div className="bg-green-600 p-5 flex justify-between items-center text-white sticky top-0 z-10">
                    <h2 className="font-black text-xl">Edit Supply Record</h2>
                    <button onClick={onClose} className="hover:bg-green-700 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Supplier and Invoice Info */}
                    <div className="grid grid-cols-4 gap-6 mb-8 pb-6 border-b border-gray-100">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Supplier Name <span className="text-red-500">*</span></label>
                            <input
                                list="suppliers-list-edit"
                                name="supplierName"
                                required
                                value={formData.supplierName}
                                onChange={handleChange}
                                placeholder="Select or Type Supplier"
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                            <datalist id="suppliers-list-edit">
                                {suppliers.map((s, idx) => (
                                    <option key={idx} value={s.name} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Invoice Number</label>
                            <input
                                type="text"
                                name="purchaseInvoiceNumber"
                                value={formData.purchaseInvoiceNumber}
                                onChange={handleChange}
                                placeholder="INV-001"
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Invoice Date</label>
                            <input
                                type="date"
                                name="invoiceDate"
                                value={formData.invoiceDate}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Due Date</label>
                            <input
                                type="date"
                                name="invoiceDueDate"
                                value={formData.invoiceDueDate}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-5 mb-6">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Product Name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Batch Number <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="batchNumber"
                                required
                                value={formData.batchNumber}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiry Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                name="expiryDate"
                                required
                                value={formData.expiryDate}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">No.of Strips/Qty <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                name="stock"
                                required
                                value={formData.stock}
                                onChange={handleChange}
                                className="w-full px-2 py-1.5 text-[15px] border-b-2 border-blue-200 focus:border-blue-500 outline-none font-bold text-blue-600 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Free Strips / Qty</label>
                            <input
                                type="number"
                                name="freeQuantity"
                                value={formData.freeQuantity}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">MRP <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                name="mrp"
                                required
                                value={formData.mrp}
                                onChange={handleChange}
                                className="w-full px-2 py-1.5 text-[15px] border-b-2 border-green-200 focus:border-green-500 outline-none font-bold text-green-600 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-5 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cost Price <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                name="purchaseCost"
                                required
                                value={formData.purchaseCost}
                                onChange={handleChange}
                                className="w-full px-2 py-1.5 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none font-bold transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Sell Price <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                name="sellPrice"
                                required
                                value={formData.sellPrice || formData.price}
                                onChange={handleChange}
                                className="w-full px-2 py-1.5 text-[15px] border-b-2 border-green-200 focus:border-green-500 outline-none font-bold text-green-600 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Discount %</label>
                            <input
                                type="number"
                                name="discountPercentage"
                                value={formData.discountPercentage}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Box Number</label>
                            <input
                                type="text"
                                name="boxNumber"
                                value={formData.boxNumber}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Units / Strip <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                name="netContent"
                                required
                                value={formData.netContent}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Item Amount</label>
                            <input
                                type="text"
                                readOnly
                                value={formData.itemAmount}
                                className="w-full px-2 py-1.5 text-[13px] border-b-2 border-gray-100 bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Discount Amt</label>
                            <input
                                type="text"
                                readOnly
                                value={formData.discountAmount}
                                className="w-full px-2 py-1.5 text-[13px] border-b-2 border-gray-100 bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-8 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Taxable Amt</label>
                            <input
                                type="text"
                                readOnly
                                value={formData.taxableAmount}
                                className="w-full px-2 py-1.5 text-[13px] border-b-2 border-gray-100 bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">CGST % <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                name="cgstPercentage"
                                value={formData.cgstPercentage}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">CGST Amt</label>
                            <input
                                type="text"
                                readOnly
                                value={formData.cgstAmount}
                                className="w-full px-2 py-1.5 text-[13px] border-b-2 border-gray-100 bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">SGST % <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                name="sgstPercentage"
                                value={formData.sgstPercentage}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">SGST Amt</label>
                            <input
                                type="text"
                                readOnly
                                value={formData.sgstAmount}
                                className="w-full px-2 py-1.5 text-[13px] border-b-2 border-gray-100 bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">IGST % <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                name="igstPercentage"
                                value={formData.igstPercentage}
                                onChange={handleChange}
                                className="w-full px-2 py-1 text-[13px] border-b-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">IGST Amt</label>
                            <input
                                type="text"
                                readOnly
                                value={formData.igstAmount}
                                className="w-full px-2 py-1.5 text-[13px] border-b-2 border-gray-100 bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Total GST</label>
                            <input
                                type="text"
                                readOnly
                                value={formData.totalGst}
                                className="w-full px-2 py-1.5 text-[13px] border-b-2 border-gray-100 bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-end mt-6 pt-4 border-t">
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-500 uppercase">Total Payable Amount</label>
                            <span className="text-3xl font-black text-green-600">Rs. {formData.payableAmount}/-</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 border-2 border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-black text-base hover:bg-green-700 transition-all flex items-center gap-2 shadow-xl shadow-green-600/30"
                            >
                                <Save size={20} />
                                Update Supply Record
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSupplyModal;
