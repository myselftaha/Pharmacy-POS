import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react';

const RecordPaymentModal = ({ isOpen, onClose, onConfirm, supplierBalance = 0, selectedInvoice = null, supplierId }) => {
    const [allowAdvance, setAllowAdvance] = useState(false);
    const [error, setError] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [formData, setFormData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'Cash',
        note: ''
    });

    // Pre-select items if coming from invoice modal
    useEffect(() => {
        if (selectedInvoice?.selectedItems) {
            const preSelectedItems = selectedInvoice.selectedItems.map(item => ({
                supplyId: item.id,
                name: item.name,
                batchNumber: item.batchNumber,
                dueAmount: item.dueAmount || item.totalCost,
                amount: item.dueAmount || item.totalCost,
                selected: true,
                addedDate: item.addedDate
            }));
            setSelectedItems(preSelectedItems);
        }
    }, [selectedInvoice]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleItemToggle = (index) => {
        setSelectedItems(prev => prev.map((item, i) =>
            i === index ? { ...item, selected: !item.selected } : item
        ));
    };

    const handleItemAmountChange = (index, value) => {
        const numValue = parseFloat(value) || 0;
        setSelectedItems(prev => prev.map((item, i) =>
            i === index ? { ...item, amount: Math.min(numValue, item.dueAmount) } : item
        ));
    };

    const totalSelectedAmount = selectedItems
        .filter(item => item.selected)
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const itemsToPayFor = selectedItems.filter(item => item.selected);

        if (itemsToPayFor.length === 0) {
            setError('Please select at least one item to pay for');
            return;
        }

        if (totalSelectedAmount <= 0) {
            setError('Total payment amount must be greater than 0');
            return;
        }

        const creditAvailable = supplierBalance < 0 ? Math.abs(supplierBalance) : 0;

        // Prevent Cash payment if Credit is sufficient
        if (creditAvailable >= totalSelectedAmount && formData.method !== 'Credit Adjustment' && !allowAdvance) {
            setError(`You have Rs. ${creditAvailable.toLocaleString()} credit. Please use "Credit Adjustment" to pay from your existing balance.`);
            return;
        }

        // Logic for regular payments (prevent overpaying debt)
        if (!allowAdvance && formData.method !== 'Credit Adjustment' && supplierBalance > 0 && totalSelectedAmount > supplierBalance) {
            setError(`Amount exceeds payable balance (Rs. ${supplierBalance}). Enable "Allow Advance" to proceed.`);
            return;
        }

        try {
            const itemPayments = itemsToPayFor.map(item => ({
                supplyId: item.supplyId,
                amount: parseFloat(item.amount) || 0
            }));

            console.log('Supplier ID:', supplierId);
            console.log('Item Payments:', itemPayments);
            console.log('Request URL:', `http://localhost:5000/api/suppliers/${supplierId}/pay-items`);

            // Call the new pay-items endpoint
            const response = await fetch(`http://localhost:5000/api/suppliers/${supplierId}/pay-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: itemPayments,
                    paymentData: {
                        date: formData.date,
                        method: formData.method,
                        note: formData.note
                    }
                })
            });

            if (response.ok) {
                // Reset and close
                setFormData({
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    method: 'Cash',
                    note: ''
                });
                setSelectedItems([]);
                setAllowAdvance(false);
                setError('');

                // Call the original onConfirm to trigger refresh
                if (onConfirm) {
                    onConfirm({ amount: totalSelectedAmount });
                }

                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to record payment');
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError('Error recording payment');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Record Payment</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Items List */}
                        {selectedItems.length > 0 && (
                            <div className="border border-gray-200  rounded-lg p-4 mb-4">
                                <h3 className="font-bold text-gray-800 mb-3">Items to Pay</h3>
                                <div className="space-y-2 max-h-60 overflow-auto">
                                    {selectedItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <input
                                                type="checkbox"
                                                checked={item.selected}
                                                onChange={() => handleItemToggle(index)}
                                                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">{item.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    Batch: {item.batchNumber} • Added: {new Date(item.addedDate).toLocaleDateString()} • Due: Rs. {item.dueAmount?.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="w-32">
                                                <input
                                                    type="number"
                                                    value={item.amount}
                                                    onChange={(e) => handleItemAmountChange(index, e.target.value)}
                                                    disabled={!item.selected}
                                                    min="0"
                                                    max={item.dueAmount}
                                                    step="0.01"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none disabled:bg-gray-100"
                                                    placeholder="Amount"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                                    <span className="font-medium text-gray-700">Total Payment:</span>
                                    <span className="text-xl font-bold text-green-600">Rs. {totalSelectedAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                id="allowAdvance"
                                checked={allowAdvance}
                                onChange={(e) => setAllowAdvance(e.target.checked)}
                                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                            />
                            <label htmlFor="allowAdvance" className="text-sm text-gray-700 select-none">
                                Allow advance payment (Overpayment)
                            </label>
                        </div>

                        {supplierBalance < 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3 text-blue-800">
                                <DollarSign className="shrink-0 mt-0.5" size={20} />
                                <div>
                                    <div className="font-bold">Credit Available: Rs. {Math.abs(supplierBalance).toLocaleString()}</div>
                                    <div className="text-sm mt-1 text-blue-600">
                                        The supplier owes us money. You should use <b>Credit Adjustment</b> to settle this invoice instead of paying Cash.
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 mb-4">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    name="date"
                                    required
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                            <div className="relative">
                                <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    name="method"
                                    value={formData.method}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all appearance-none bg-white"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Check">Check</option>
                                    <option value="Credit Adjustment">Credit Adjustment (Use Return)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                            <div className="relative">
                                <FileText size={18} className="absolute left-3 top-3 text-gray-400" />
                                <textarea
                                    name="note"
                                    value={formData.note}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                    placeholder="Add reference number or details..."
                                ></textarea>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all"
                    >
                        Confirm Payment (Rs. {totalSelectedAmount.toLocaleString()})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecordPaymentModal;
