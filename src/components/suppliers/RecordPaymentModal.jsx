import React, { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react';

const RecordPaymentModal = ({ isOpen, onClose, onConfirm, supplierBalance = 0 }) => {
    const [allowAdvance, setAllowAdvance] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'Cash',
        note: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(''); // Clear error on change
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount);

        if (amount <= 0) {
            setError('Amount must be greater than 0');
            return;
        }

        if (!allowAdvance && amount > supplierBalance) {
            setError(`Amount exceeds payable balance (Rs. ${supplierBalance}). Enable "Allow Advance" to proceed.`);
            return;
        }

        onConfirm({
            ...formData,
            amount: amount
        });
        // Reset form
        setFormData({
            amount: '',
            date: new Date().toISOString().split('T')[0],
            method: 'Cash',
            note: ''
        });
        setAllowAdvance(false);
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Record Payment</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                        <div className="relative">
                            <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="number"
                                name="amount"
                                required
                                min="0"
                                step="0.01"
                                value={formData.amount}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

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

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all"
                        >
                            Confirm Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RecordPaymentModal;
