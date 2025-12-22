import React, { useState, useEffect } from 'react';
import { X, Save, ChevronDown, Plus, Package } from 'lucide-react';

const AddMedicineModal = ({ isOpen, onClose, onSave, suppliers, initialSupplier }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: 'Antibiotics',
        description: '',
        price: '', // Selling Price
        stock: '', // No. of Strips/Qty
        unit: 'Strip',
        netContent: '10', // Units / Strip
        formulaCode: '',
        batchNumber: '',
        supplierName: '',
        purchaseCost: '', // Cost Price (per strip)
        mrp: '',
        expiryDate: '',
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
        payableAmount: '0.00',
        invoiceDate: '',
        invoiceDueDate: '',
        status: 'Posted',
        purchaseInvoiceNumber: ''
    });

    // Get current date in YYYY-MM-DD format
    const getCurrentDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({ ...prev, invoiceDate: getCurrentDate() }));
            if (initialSupplier) {
                const name = typeof initialSupplier === 'object' ? initialSupplier.name : initialSupplier;
                setFormData(prev => ({ ...prev, supplierName: name || '' }));
            }
        }
    }, [isOpen, initialSupplier]);

    if (!isOpen) return null;

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

        onClose();
    };

    const InputField = ({ label, value, name, type = "text", icon: Icon, placeholder, readOnly = false, required = false }) => (
        <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className={`relative group transition-all ${readOnly ? 'opacity-70' : ''}`}>
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={handleChange}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    required={required}
                    className={`w-full bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all placeholder:text-gray-300 ${readOnly ? 'cursor-not-allowed bg-gray-100/50 border-transparent' : 'hover:border-green-100 focus:border-green-500 focus:bg-white focus:shadow-xl focus:shadow-green-500/5'}`}
                />
                {Icon && <Icon className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors ${readOnly ? '' : 'group-focus-within:text-green-500'}`} size={18} />}
            </div>
        </div>
    );

    const margin = formData.sellPrice && formData.purchaseCost ? (((parseFloat(formData.sellPrice) - parseFloat(formData.purchaseCost)) / parseFloat(formData.sellPrice)) * 100).toFixed(2) : '0.00';

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
            <div className="bg-white rounded-[32px] w-full max-w-6xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-600 p-8 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                            <Plus size={32} className="text-white" />
                        </div>
                        <div>
                            <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-sm w-fit mb-1">Stock Entry</div>
                            <h2 className="text-3xl font-black tracking-tight">Add New Supply Record</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all active:scale-90 border border-white/10">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">

                    {/* TOP SECTION: Invoice Metadata */}
                    <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm mb-8 grid grid-cols-4 gap-6">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Supplier Name <span className="text-red-500">*</span></label>
                            <div className="relative group transition-all">
                                <input
                                    list="suppliers-list"
                                    name="supplierName"
                                    required
                                    value={formData.supplierName}
                                    onChange={handleChange}
                                    placeholder="Select or Type Supplier"
                                    className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all hover:border-green-100 focus:border-green-500 focus:bg-white focus:shadow-xl focus:shadow-green-500/5 tracking-wider"
                                />
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={18} />
                                <datalist id="suppliers-list">
                                    {suppliers.map((s, idx) => (
                                        <option key={idx} value={s.name || s} />
                                    ))}
                                </datalist>
                            </div>
                        </div>
                        <InputField label="Invoice Number" value={formData.purchaseInvoiceNumber} name="purchaseInvoiceNumber" placeholder="e.g. INV-2024-001" />
                        <InputField label="Invoice Date" value={formData.invoiceDate} name="invoiceDate" type="date" />
                        <InputField label="Credit Due Date" value={formData.invoiceDueDate} name="invoiceDueDate" type="date" />
                    </div>

                    <div className="grid grid-cols-12 gap-8">

                        {/* LEFT COLUMN: Product & Stock */}
                        <div className="col-span-12 lg:col-span-7 space-y-8">

                            {/* Card: Product Essence */}
                            <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-5">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-50 text-green-600">
                                    <Package size={18} />
                                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide underline decoration-3 decoration-green-500/30 underline-offset-4">Product Details</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Medicine Name" value={formData.name} name="name" required placeholder="e.g. Augmentin 625mg" />
                                    <InputField label="Formula Name" value={formData.formulaCode} name="formulaCode" placeholder="e.g. Co-Amoxiclav" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                                        <div className="relative">
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className="w-full appearance-none bg-gray-50/50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all hover:border-green-100 focus:border-green-500 focus:bg-white tracking-wider cursor-pointer font-bold"
                                            >
                                                <option value="Antibiotics">Antibiotics</option>
                                                <option value="General">General</option>
                                                <option value="Vitamins">Vitamins</option>
                                                <option value="Injectables">Injectables</option>
                                                <option value="Surgical">Surgical</option>
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={18} />
                                        </div>
                                    </div>
                                    <InputField label="Shelf / Box" value={formData.boxNumber} name="boxNumber" placeholder="e.g. B-12 / Cabinet" />
                                </div>
                                <InputField label="Description / Notes" value={formData.description} name="description" placeholder="Any additional notes about this supply batch..." />
                            </div>

                            {/* Card: Batch & Qty Control */}
                            <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-5">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-50 text-blue-600">
                                    <Save size={18} />
                                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide underline decoration-3 decoration-blue-500/30 underline-offset-4">Inventory Control</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <InputField label="Batch Number" value={formData.batchNumber} name="batchNumber" required placeholder="BN-123" />
                                    <InputField label="Qty (Packs/Strips)" value={formData.stock} name="stock" type="number" required />
                                    <InputField label="Bonus (Free Qty)" value={formData.freeQuantity} name="freeQuantity" type="number" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Expiry Date" value={formData.expiryDate} name="expiryDate" type="date" required />
                                    <InputField label="Units / Pack" value={formData.netContent} name="netContent" type="number" required />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Pricing & Tax */}
                        <div className="col-span-12 lg:col-span-5 space-y-8">

                            {/* Card: Financial Strategy */}
                            <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-5">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-50 text-orange-600">
                                    <Save size={18} className="rotate-90" />
                                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide underline decoration-3 decoration-orange-500/30 underline-offset-4">Financials (Per Pack)</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Purchase Cost" value={formData.purchaseCost} name="purchaseCost" type="number" required />
                                    <InputField label="MRP / List Price" value={formData.mrp} name="mrp" type="number" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Sell Price" value={formData.sellPrice || formData.price} name="sellPrice" type="number" required />
                                    <InputField label="Discount %" value={formData.discountPercentage} name="discountPercentage" type="number" />
                                </div>

                                <div className="bg-green-50 p-5 rounded-2xl flex flex-col gap-2 border border-green-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-green-700 uppercase tracking-tighter">Profit Margin Visualization</span>
                                        <span className={`text-xl font-black ${parseFloat(margin) < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {margin}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-green-100/50 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${parseFloat(margin) < 10 ? 'bg-orange-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(100, Math.max(0, parseFloat(margin) * 2))}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <div className="flex justify-between text-xs font-bold text-gray-400 font-mono">
                                        <span>Item Subtotal:</span>
                                        <span>Rs. {formData.itemAmount}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-orange-500 font-mono">
                                        <span>Discount (-):</span>
                                        <span>Rs. {formData.discountAmount}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-gray-400 font-mono border-t border-dashed pt-2">
                                        <span>Taxable Amt:</span>
                                        <span>Rs. {formData.taxableAmount}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Taxation (GST) */}
                            <div className="bg-green-600/5 p-6 rounded-[24px] border border-green-600/10 space-y-5">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-600/10 text-green-700">
                                    <Save size={18} />
                                    <h3 className="text-sm font-black uppercase tracking-wide underline decoration-3 decoration-green-500/30 underline-offset-4">Batch Taxation (GST)</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <InputField label="CGST %" value={formData.cgstPercentage} name="cgstPercentage" type="number" />
                                    <InputField label="SGST %" value={formData.sgstPercentage} name="sgstPercentage" type="number" />
                                    <InputField label="IGST %" value={formData.igstPercentage} name="igstPercentage" type="number" />
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calculated Total GST</span>
                                    <span className="text-sm font-black text-green-700">Rs. {formData.totalGst}/-</span>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-12 bg-white p-8 rounded-[32px] border border-gray-100 shadow-2xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Final Payable To Supplier</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-gray-800">Rs. {formData.payableAmount}</span>
                                <span className="text-lg font-bold text-green-600">/-</span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-8 py-3.5 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all active:scale-95 text-sm"
                            >
                                Discard Record
                            </button>
                            <button
                                type="submit"
                                className="px-12 py-3.5 bg-gradient-to-r from-green-600 to-green-600 text-white rounded-2xl font-black text-sm hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-green-600/40 transition-all active:scale-95 flex items-center gap-3"
                            >
                                <Save size={20} />
                                Update Inventory & Save
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMedicineModal;
