import React, { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { Search, Calendar, DollarSign, ShoppingCart, TrendingUp, X } from 'lucide-react';
import TransactionTable from '../components/history/TransactionTable';
import TransactionDetailsModal from '../components/history/TransactionDetailsModal';

const History = () => {
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('All');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [stats, setStats] = useState({ totalSales: 0, totalTransactions: 0, averageTransaction: 0 });
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    // Fetch transactions from backend
    const fetchTransactions = async (startDate = null, endDate = null, search = '') => {
        try {
            setLoading(true);
            let url = 'http://localhost:5000/api/transactions?';
            const params = new URLSearchParams();

            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (search) params.append('searchQuery', search);

            const response = await fetch(url + params.toString());

            if (!response.ok) {
                throw new Error('Failed to fetch transactions');
            }

            const data = await response.json();
            setTransactions(data);
            setFilteredTransactions(data);

            // Fetch stats
            const statsUrl = `http://localhost:5000/api/transactions/stats/summary?${params.toString()}`;
            const statsResponse = await fetch(statsUrl);
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(statsData);
            }
        } catch (error) {
            // Silent fail - backend not available
            console.warn('Backend not available or error fetching transactions:', error);
            // Set empty data instead of showing error
            setTransactions([]);
            setFilteredTransactions([]);
            setStats({ totalSales: 0, totalTransactions: 0, averageTransaction: 0 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    // Calculate date ranges based on filter
    const getDateRange = (filter) => {
        const now = new Date();
        let startDate = null;
        let endDate = now.toISOString().split('T')[0];

        switch (filter) {
            case 'Week':
                startDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
                break;
            case 'Month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                break;
            case 'Year':
                startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                break;
            case 'Custom':
                return { startDate: customStartDate, endDate: customEndDate };
            default:
                return { startDate: null, endDate: null };
        }
        return { startDate, endDate };
    };

    // Handle filter change
    const handleDateFilterChange = (filter) => {
        setDateFilter(filter);
        if (filter !== 'Custom') {
            const { startDate, endDate } = getDateRange(filter);
            fetchTransactions(startDate, endDate, searchQuery);
        }
    };

    // Handle custom date apply
    const handleCustomDateApply = () => {
        if (!customStartDate || !customEndDate) {
            console.warn('Please select both start and end dates');
            return;
        }
        fetchTransactions(customStartDate, customEndDate, searchQuery);
    };

    // Handle search
    const handleSearch = (query) => {
        setSearchQuery(query);
        const { startDate, endDate } = getDateRange(dateFilter);
        fetchTransactions(startDate, endDate, query);
    };

    // Handle view details
    const handleViewDetails = (transaction) => {
        setSelectedTransaction(transaction);
        setIsDetailsModalOpen(true);
    };

    return (
        <div>
            {/* Header with Search and Filters */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Sales History</h2>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="text-green-600" size={24} />
                        </div>
                        <div className="text-gray-500 text-sm font-medium">Total Sales</div>
                    </div>
                    <div className="text-3xl font-bold text-gray-800">Rs. {stats.totalSales.toFixed(2)}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <ShoppingCart className="text-blue-600" size={24} />
                        </div>
                        <div className="text-gray-500 text-sm font-medium">Total Transactions</div>
                    </div>
                    <div className="text-3xl font-bold text-gray-800">{stats.totalTransactions}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="text-purple-600" size={24} />
                        </div>
                        <div className="text-gray-500 text-sm font-medium">Average Transaction</div>
                    </div>
                    <div className="text-3xl font-bold text-gray-800">Rs. {stats.averageTransaction.toFixed(2)}</div>
                </div>
            </div>

            {/* Date Filter Buttons */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={20} />
                        <span className="font-medium">Filter by:</span>
                    </div>
                    {['All', 'Week', 'Month', 'Year', 'Custom'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => handleDateFilterChange(filter)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateFilter === filter
                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Custom Date Range Picker */}
                {dateFilter === 'Custom' && (
                    <div className="mt-4 flex items-center gap-3 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-600">From:</label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-600">To:</label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                        <button
                            onClick={handleCustomDateApply}
                            className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                        >
                            Apply
                        </button>
                        <button
                            onClick={() => {
                                setCustomStartDate('');
                                setCustomEndDate('');
                                setDateFilter('All');
                                fetchTransactions();
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Transactions Table */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                </div>
            ) : (
                <TransactionTable
                    transactions={filteredTransactions}
                    onViewDetails={handleViewDetails}
                />
            )}

            {/* Transaction Details Modal */}
            <TransactionDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                transaction={selectedTransaction}
            />
        </div>
    );
};

export default History;
