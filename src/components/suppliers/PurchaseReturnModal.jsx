
import React, { useState, useEffect } from 'react';
import { X, Search, Package, AlertCircle } from 'lucide-react';
import { useSnackbar } from 'notistack';

const PurchaseReturnModal = ({ isOpen, onClose, supplierId, supplierName, onConfirm }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [searchTerm, setSearchTerm] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [supplies, setSupplies] = useState([]);

    // Return Item State
    const [selectedSupply, setSelectedSupply] = useState(null);
    const [returnQty, setReturnQty] = useState('');
    const [returnRate, setReturnRate] = useState('');
    const [reason, setReason] = useState('');

    // Cart for multiple items? For now let's do single item or simple cart.
    // Spec says "select product+batch, return qty...". Single item flow is easier for MVP, 
    // but the backend accepts `items` array. Let's support a simple cart or just one item for now.
    // Let's do a simple List of items to return.
    const [returnItems, setReturnItems] = useState([]);

    useEffect(() => {
        if (isOpen && supplierName) {
            fetchSupplies();
        }
    }, [isOpen, supplierName]);

    const fetchSupplies = async () => {
        try {
            // Fetch all supplies for this supplier
            const response = await fetch('http://localhost:5000/api/supplies');
            const data = await response.json();
            // Filter client-side or use a refined API. 
            // We have a generic /api/supplies, let's filter by supplierName
            const supplierSupplies = data.filter(s =>
                s.supplierName && s.supplierName.toLowerCase() === supplierName.toLowerCase() && s.quantity > 0
            );
            setSupplies(supplierSupplies);
        } catch (error) {
            console.error('Error fetching supplies:', error);
        }
    };

    const handleAddItem = () => {
        if (!selectedSupply || !returnQty) return;

        const qty = parseInt(returnQty);
        if (qty <= 0) {
            enqueueSnackbar('Invalid quantity', { variant: 'error' });
            return;
        }
        if (qty > selectedSupply.quantity) {
            enqueueSnackbar(`Cannot return more than purchased/current stock (${selectedSupply.quantity})`, { variant: 'error' });
            return;
        }

        setReturnItems([
            ...returnItems,
            {
                supplyId: selectedSupply._id,
                medicineId: selectedSupply.medicineId, // Assuming supply has this
                name: selectedSupply.name,
                batchNumber: selectedSupply.batchNumber,
                quantity: qty,
                rate: returnRate || selectedSupply.purchaseCost,
                total: qty * (returnRate || selectedSupply.purchaseCost)
            }
        ]);

        // Reset inputs
        setSelectedSupply(null);
        setReturnQty('');
        setReturnRate('');
    };

    const handleRemoveItem = (index) => {
        const newItems = [...returnItems];
        newItems.splice(index, 1);
        setReturnItems(newItems);
    };

    const handleSubmit = () => {
        if (returnItems.length === 0) return;

        onConfirm({
            supplierId,
            items: returnItems,
            reason: reason,
            date: new Date()
        });

        setReturnItems([]);
        setReason('');
        onClose();
    };

    if (!isOpen) return null;

    const totalDebit = returnItems.reduce((sum, item) => sum + item.total, 0);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col`}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Create Purchase Return (Debit Note)</h2>
                        <p className="text-sm text-gray-500">Return items to {supplierName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    {/* Item Selection Area */}
                    <div className="grid grid-cols-12 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="col-span-4">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Select Item (Batch)</label>
                            <select
                                value={selectedSupply ? selectedSupply._id : ''}
                                onChange={(e) => {
                                    const supply = supplies.find(s => s._id === e.target.value);
                                    setSelectedSupply(supply);
                                    if (supply) setReturnRate(supply.purchaseCost);
                                }}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                            >
                                <option value="">Select Item...</option>
                                {supplies.map(s => (
                                    <option key={s._id} value={s._id}>
                                        {s.name} - {s.batchNumber} (Qty: {s.quantity})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-3">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Return Qty</label>
                            <input
                                type="number"
                                value={returnQty}
                                onChange={(e) => setReturnQty(e.target.value)}
                                placeholder="Qty"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Rate (Cost)</label>
                            <input
                                type="number"
                                value={returnRate}
                                onChange={(e) => setReturnRate(e.target.value)}
                                placeholder="Rate"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                            />
                        </div>
                        <div className="col-span-2 flex items-end">
                            <button
                                onClick={handleAddItem}
                                disabled={!selectedSupply || !returnQty}
                                className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-colors disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Return Items List */}
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-800 mb-2">Items to Return</h3>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-gray-500">Item</th>
                                        <th className="px-4 py-3 font-medium text-gray-500">Batch</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-500">Qty</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-500">Rate</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {returnItems.length > 0 ? (
                                        returnItems.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{item.batchNumber}</td>
                                                <td className="px-4 py-3 text-right">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right">Rs. {item.rate}</td>
                                                <td className="px-4 py-3 text-right font-bold text-red-600">Rs. {item.total}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => handleRemoveItem(idx)} className="text-gray-400 hover:text-red-500">
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                                No items added
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Reason / Note</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for return..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500 h-20 resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
                    <div>
                        <span className="text-gray-500 text-sm">Total Debit Note Amount</span>
                        <div className="text-2xl font-bold text-red-600">Rs. {totalDebit.toLocaleString()}</div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={returnItems.length === 0}
                            className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
                        >
                            Confirm Return
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseReturnModal;
