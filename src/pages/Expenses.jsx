import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, FileText, DollarSign, Filter, Search, Edit, Download, Upload, X, CheckCircle, AlertCircle, ChevronDown, TrendingUp, TrendingDown, Eye, Printer } from 'lucide-react';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';
import API_URL from '../config/api';


const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('This Month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const { enqueueSnackbar } = useSnackbar();

    // Role-based access (can be connected to auth system)
    const [userRole] = useState('Admin'); // 'Admin' or 'Staff'

    // Categories with sub-categories
    const categories = {
        'Utilities': ['Electricity', 'Gas', 'Water', 'Internet'],
        'Staff': ['Salary', 'Overtime', 'Benefits'],
        'Maintenance': ['Equipment Repair', 'Cleaning', 'General Maintenance'],
        'Rent': [],
        'Inventory': [],
        'Other': []
    };

    // Payment methods
    const paymentMethods = ['Cash', 'Card', 'Bank Transfer', 'EasyPaisa', 'JazzCash', 'Credit', 'Online'];

    // Form State
    const [formData, setFormData] = useState({
        category: 'Rent',
        subCategory: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        vendor: '',
        isRecurring: false,
        recurrenceType: 'Monthly', // Monthly, Weekly
        attachment: null,
        verified: false
    });

    useEffect(() => {
        fetchExpenses();
        fetchSalesData();
    }, [dateFilter, customStartDate, customEndDate]);

    useEffect(() => {
        applyFilters();
    }, [expenses, selectedCategory, searchQuery]);

    const [salesData, setSalesData] = useState({ total: 0 });

    const fetchSalesData = async () => {
        try {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const response = await fetch(`${API_URL}/api/transactions?startDate=${startOfMonth.toISOString().split('T')[0]}&type=Sale`);
            const data = await response.json();
            const transactions = Array.isArray(data) ? data : (data.data || []);
            const total = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
            setSalesData({ total });
        } catch (error) {
            console.error('Error fetching sales data:', error);
        }
    };

    const getDateRange = () => {
        const today = new Date();
        const start = new Date(today);
        const end = new Date(today);

        switch (dateFilter) {
            case 'Today':
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            case 'This Week':
                const dayOfWeek = start.getDay();
                start.setDate(start.getDate() - dayOfWeek);
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            case 'This Month':
                start.setDate(1);
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            case 'Last Month':
                start.setMonth(start.getMonth() - 1);
                start.setDate(1);
                end.setDate(0); // Last day of previous month
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            case 'Custom':
                return { start: customStartDate, end: customEndDate };
            default:
                return { start: '', end: '' };
        }
    };

    const fetchExpenses = async () => {
        try {
            const { start, end } = getDateRange();
            let url = `${API_URL}/api/expenses?`;
            const params = new URLSearchParams();
            if (start) params.append('startDate', start);
            if (end) params.append('endDate', end);

            const response = await fetch(url + params.toString());
            const data = await response.json();
            setExpenses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            enqueueSnackbar('Failed to fetch expenses', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...expenses];

        // Category filter
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(exp => {
                const mainCat = Object.keys(categories).find(cat => 
                    categories[cat].includes(exp.subCategory) || (cat === exp.category && !exp.subCategory)
                );
                return mainCat === selectedCategory || exp.category === selectedCategory;
            });
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(exp =>
                exp.description?.toLowerCase().includes(query) ||
                exp.category?.toLowerCase().includes(query) ||
                exp.subCategory?.toLowerCase().includes(query) ||
                exp.vendor?.toLowerCase().includes(query) ||
                exp.amount?.toString().includes(query)
            );
        }

        setFilteredExpenses(filtered);
    };

    const calculateSummary = () => {
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

        const todayExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= startOfToday;
        }).reduce((sum, exp) => sum + (exp.amount || 0), 0);

        const thisMonthExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= startOfMonth;
        }).reduce((sum, exp) => sum + (exp.amount || 0), 0);

        const lastMonthExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= startOfLastMonth && expDate <= endOfLastMonth;
        }).reduce((sum, exp) => sum + (exp.amount || 0), 0);

        const percentageChange = lastMonthExpenses > 0 
            ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1)
            : 0;

        return { todayExpenses, thisMonthExpenses, lastMonthExpenses, percentageChange };
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
            ...(name === 'category' ? { subCategory: '' } : {})
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                enqueueSnackbar('File size must be less than 5MB', { variant: 'error' });
                return;
            }
            setFormData(prev => ({ ...prev, attachment: file }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const submitData = { ...formData };
            delete submitData.attachment; // Will handle separately if needed

            const url = editingExpense 
                ? `${API_URL}/api/expenses/${editingExpense._id}`
                : `${API_URL}/api/expenses`;
            const method = editingExpense ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData)
            });

            if (response.ok) {
                enqueueSnackbar(`Expense ${editingExpense ? 'updated' : 'added'} successfully`, { variant: 'success' });
                setIsFormOpen(false);
                setEditingExpense(null);
                resetForm();
                fetchExpenses();
            } else {
                enqueueSnackbar(`Failed to ${editingExpense ? 'update' : 'add'} expense`, { variant: 'error' });
            }
        } catch (error) {
            console.error('Error saving expense:', error);
            enqueueSnackbar('Error saving expense', { variant: 'error' });
        }
    };

    const resetForm = () => {
        setFormData({
            category: 'Rent',
            subCategory: '',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            paymentMethod: 'Cash',
            vendor: '',
            isRecurring: false,
            recurrenceType: 'Monthly',
            attachment: null,
            verified: false
        });
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setFormData({
            category: expense.category || 'Rent',
            subCategory: expense.subCategory || '',
            amount: expense.amount || '',
            description: expense.description || '',
            date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            paymentMethod: expense.paymentMethod || 'Cash',
            vendor: expense.vendor || '',
            isRecurring: expense.isRecurring || false,
            recurrenceType: expense.recurrenceType || 'Monthly',
            attachment: null,
            verified: expense.verified || false
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (userRole !== 'Admin') {
            enqueueSnackbar('Only admins can delete expenses', { variant: 'error' });
            return;
        }

        if (!window.confirm('Are you sure you want to delete this expense?')) return;

        try {
            const response = await fetch(`${API_URL}/api/expenses/${id}`, {
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

    const handleExportExcel = () => {
        const { start, end } = getDateRange();
        const dataToExport = filteredExpenses.map(exp => ({
            'Date': new Date(exp.date).toLocaleDateString(),
            'Category': exp.category,
            'Sub-Category': exp.subCategory || '-',
            'Description': exp.description || '-',
            'Amount': exp.amount,
            'Payment Method': exp.paymentMethod,
            'Vendor': exp.vendor || '-',
            'Recurring': exp.isRecurring ? exp.recurrenceType : 'No',
            'Verified': exp.verified ? 'Yes' : 'No'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
        const fileName = `Expenses_${dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        enqueueSnackbar('Exported to Excel', { variant: 'success' });
    };

    const handleExportPDF = () => {
        const printContent = document.getElementById('expenses-table').innerHTML;
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = `
            <div style="padding: 40px; font-family: Arial, sans-serif;">
                <h1 style="text-align: center; margin-bottom: 30px;">Expense Report - ${dateFilter}</h1>
                ${printContent}
            </div>
        `;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
    };

    const summary = calculateSummary();
    const expenseVsSales = salesData.total > 0 
        ? ((summary.thisMonthExpenses / salesData.total) * 100).toFixed(1)
        : 0;

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Expense Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Track daily shop expenses</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download size={18} />
                        Export Excel
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Printer size={18} />
                        Export PDF
                    </button>
                    <button
                        onClick={() => { setIsFormOpen(true); setEditingExpense(null); resetForm(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <Calendar size={18} className="text-gray-400" />
                <span className="font-bold text-sm text-gray-700">Filter by:</span>
                <div className="flex gap-1">
                    {['Today', 'This Week', 'This Month', 'Last Month', 'Custom'].map((option) => (
                        <button
                            key={option}
                            onClick={() => setDateFilter(option)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                dateFilter === option
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                {dateFilter === 'Custom' && (
                    <div className="flex gap-2 ml-4">
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                        <span className="self-center text-gray-500">to</span>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 font-medium text-sm">Today's Expenses</p>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Rs. {summary.todayExpenses.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 font-medium text-sm">This Month's Expenses</p>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Rs. {summary.thisMonthExpenses.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 font-medium text-sm">Last Month's Expenses</p>
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">Rs. {summary.lastMonthExpenses.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 font-medium text-sm">Change vs Last Month</p>
                    <div className="flex items-center gap-2 mt-2">
                        {parseFloat(summary.percentageChange) >= 0 ? (
                            <TrendingUp className="text-red-600" size={24} />
                        ) : (
                            <TrendingDown className="text-green-600" size={24} />
                        )}
                        <h2 className={`text-2xl font-bold ${parseFloat(summary.percentageChange) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {Math.abs(parseFloat(summary.percentageChange))}%
                        </h2>
                    </div>
                </div>
            </div>

            {/* Expense vs Sales Insight */}
            {salesData.total > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-800 font-medium">
                        💡 Expense Insight: Expenses are <strong>{expenseVsSales}%</strong> of total sales (This Month)
                    </p>
                </div>
            )}

            {/* Add/Edit Expense Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
                        <div className="p-6 border-b border-gray-200 bg-red-50">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 text-xl">
                                    {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                                </h3>
                                <button
                                    onClick={() => { setIsFormOpen(false); setEditingExpense(null); resetForm(); }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    required
                                >
                                    {Object.keys(categories).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            {categories[formData.category] && categories[formData.category].length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
                                    <select
                                        name="subCategory"
                                        value={formData.subCategory}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    >
                                        <option value="">Select sub-category...</option>
                                        {categories[formData.category].map(subCat => (
                                            <option key={subCat} value={subCat}>{subCat}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                                <select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    required
                                >
                                    {paymentMethods.map(method => (
                                        <option key={method} value={method}>{method}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor / Supplier</label>
                                <input
                                    type="text"
                                    name="vendor"
                                    value={formData.vendor}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    placeholder="e.g., Electricity Company, Internet Provider"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    rows="2"
                                    placeholder="Optional details..."
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Attachment</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={handleFileChange}
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    />
                                    {formData.attachment && (
                                        <span className="text-sm text-gray-600">{formData.attachment.name}</span>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-2 flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="isRecurring"
                                        checked={formData.isRecurring}
                                        onChange={handleInputChange}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Mark as Recurring</span>
                                </label>
                                {formData.isRecurring && (
                                    <select
                                        name="recurrenceType"
                                        value={formData.recurrenceType}
                                        onChange={handleInputChange}
                                        className="px-3 py-1 border border-gray-200 rounded-lg text-sm"
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="Weekly">Weekly</option>
                                    </select>
                                )}
                                {userRole === 'Admin' && (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="verified"
                                            checked={formData.verified}
                                            onChange={handleInputChange}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Verified</span>
                                    </label>
                                )}
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => { setIsFormOpen(false); setEditingExpense(null); resetForm(); }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
                                >
                                    {editingExpense ? 'Update Expense' : 'Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Search and Category Filter */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search expenses by category, description, vendor, amount..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                    <option value="All">All Categories</option>
                    {Object.keys(categories).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">Expenses</h3>
                    <span className="text-sm text-gray-500">{filteredExpenses.length} expenses</span>
                </div>
                <div className="flex-1 overflow-auto" id="expenses-table">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Description</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Vendor</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Payment</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium border border-gray-200">
                                                    {expense.category}
                                                </span>
                                                {expense.subCategory && (
                                                    <div className="text-xs text-gray-500 mt-1">{expense.subCategory}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {expense.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {expense.vendor || '-'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            Rs. {expense.amount?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {expense.paymentMethod}
                                        </td>
                                        <td className="px-6 py-4">
                                            {expense.verified ? (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                    <CheckCircle size={12} />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                                    <AlertCircle size={12} />
                                                    Unverified
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {(userRole === 'Admin' || !expense.verified) && (
                                                    <button
                                                        onClick={() => handleEdit(expense)}
                                                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {userRole === 'Admin' && (
                                                    <button
                                                        onClick={() => handleDelete(expense._id)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                                        No expenses found.
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
