import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, FileText, DollarSign, Filter, Search } from 'lucide-react';
import { useSnackbar } from 'notistack';

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    // Form State
    const [formData, setFormData] = useState({
        category: 'Rent',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash'
    });

    const categories = ['Rent', 'Electricity', 'Salary', 'Maintenance', 'Inventory', 'Other'];

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/expenses');
            const data = await response.json();
            setExpenses(data);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            enqueueSnackbar('Failed to fetch expenses', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                enqueueSnackbar('Expense added successfully', { variant: 'success' });
                setIsFormOpen(false);
                setFormData({
                    category: 'Rent',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    paymentMethod: 'Cash'
                });
                fetchExpenses();
            } else {
                enqueueSnackbar('Failed to add expense', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            enqueueSnackbar('Error adding expense', { variant: 'error' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;

        try {
            const response = await fetch(`http://localhost:5000/api/expenses/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                enqueueSnackbar('Expense deleted', { variant: 'success' });
                fetchExpenses();
            } else {
                enqueueSnackbar('Failed to delete expense', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };

    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const recentExpenses = expenses.slice(0, 50); // Show last 50

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Expense Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Track daily shop expenses</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    Add Expense
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Summary Card */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-gray-500 font-medium text-sm">Total Expenses (All Time)</p>
                        <h2 className="text-3xl font-bold text-gray-800 mt-2">Rs. {totalExpenses.toLocaleString()}</h2>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg w-fit">
                        <DollarSign size={16} />
                        <span>Tracked</span>
                    </div>
                </div>

                {/* Add Expense Form (Inline or Modal - Inline for simplicity if open) */}
                {isFormOpen && (
                    <div className="col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800">Add New Expense</h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600">Close</button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                >
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    required
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                <select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Card</option>
                                    <option value="Online">Online</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    placeholder="Optional details..."
                                />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
                                >
                                    Save Expense
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">Recent Expenses</h3>
                    <div className="flex gap-2">
                        {/* Placeholder filters can go here */}
                    </div>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Description</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentExpenses.length > 0 ? (
                                recentExpenses.map((expense) => (
                                    <tr key={expense._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium border border-gray-200">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {expense.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            Rs. {expense.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(expense._id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                        No expenses recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Expenses;
