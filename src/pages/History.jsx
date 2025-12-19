import React, { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import TransactionTable from '../components/history/TransactionTable';
import TransactionDetailsModal from '../components/history/TransactionDetailsModal';
import SummaryBar from '../components/history/SummaryBar';
import FilterBar from '../components/history/FilterBar';
import ZReport from '../components/history/ZReport';
import { useNavigate } from 'react-router-dom';

const History = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    // Data State
    const [transactions, setTransactions] = useState([]);
    const [summaryStats, setSummaryStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('Today');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [filters, setFilters] = useState({
        paymentMethod: 'All',
        status: 'All',
        cashier: 'All',
        type: 'All',
        minAmount: '',
        maxAmount: ''
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Modal State
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Fetch Transactions
    const fetchTransactions = async (page = 1) => {
        try {
            setLoading(true);
            const { startDate, endDate } = getDateRange(dateFilter);

            const params = new URLSearchParams({
                page,
                limit: pagination.limit,
                searchQuery
            });

            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            // Append Advanced Filters
            if (filters.paymentMethod !== 'All') params.append('paymentMethod', filters.paymentMethod);
            if (filters.status !== 'All') params.append('status', filters.status);
            if (filters.cashier !== 'All') params.append('cashier', filters.cashier);
            if (filters.type !== 'All') params.append('type', filters.type);
            if (filters.minAmount) params.append('minAmount', filters.minAmount);
            if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);

            // Fetch List
            const response = await fetch(`http://localhost:5000/api/transactions?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch transactions');
            const data = await response.json();

            setTransactions(data.data || []);
            setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 1 });

            // Fetch Summary Stats (using same filters)
            const statsResponse = await fetch(`http://localhost:5000/api/transactions/stats/summary?${params.toString()}`);
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setSummaryStats(statsData);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            enqueueSnackbar('Failed to load history data', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Calculate Date Range
    const getDateRange = (filter) => {
        const now = new Date();
        let startDate = null;
        let endDate = now.toISOString().split('T')[0];

        if (filter === 'Custom') return { startDate: customDates.start, endDate: customDates.end };

        if (filter === 'Today') {
            startDate = now.toISOString().split('T')[0];
        } else if (filter === 'Yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            startDate = yesterday.toISOString().split('T')[0];
            endDate = yesterday.toISOString().split('T')[0];
        } else if (filter === 'Week') {
            const lastWeek = new Date(now);
            lastWeek.setDate(now.getDate() - 7);
            startDate = lastWeek.toISOString().split('T')[0];
        } else if (filter === 'Month') {
            const lastMonth = new Date(now);
            lastMonth.setMonth(now.getMonth() - 1); // Or start of month? "Month" usually means "Last 30 days" or "This Month".
            // Let's do Start of Current Month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        }

        return { startDate, endDate };
    };

    // Effects
    useEffect(() => {
        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchTransactions(1);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, dateFilter, filters]);

    // Handlers
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= (pagination?.pages || 1)) {
            fetchTransactions(newPage);
        }
    };


    const handleCustomDateApply = () => {
        if (customDates.start && customDates.end) {
            fetchTransactions(1);
        } else {
            enqueueSnackbar('Please select both start and end dates', { variant: 'warning' });
        }
    };

    const handleExportExcel = async () => {
        try {
            setLoading(true);
            const { startDate, endDate } = getDateRange(dateFilter);
            const params = new URLSearchParams({
                searchQuery,
                limit: 10000, // Fetch 'all' (reasonable limit) for export
                page: 1
            });

            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            if (filters.paymentMethod !== 'All') params.append('paymentMethod', filters.paymentMethod);
            if (filters.status !== 'All') params.append('status', filters.status);
            if (filters.cashier !== 'All') params.append('cashier', filters.cashier);
            if (filters.type !== 'All') params.append('type', filters.type);

            const response = await fetch(`http://localhost:5000/api/transactions?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch data for export');
            const data = await response.json();

            // Prepare data for Excel
            const excelData = data.data.map(tx => ({
                'Transaction ID': tx.transactionId,
                'Date': new Date(tx.createdAt).toLocaleDateString(),
                'Time': new Date(tx.createdAt).toLocaleTimeString(),
                'Type': tx.type,
                'Customer': tx.customer?.name || 'Walk-in',
                'Items': tx.items?.length || 0,
                'Subtotal': tx.subtotal || 0,
                'Discount': tx.discount || 0,
                'Total': tx.total,
                'Status': tx.status || 'Completed',
                'Payment Method': tx.paymentMethod,
                'Processed By': tx.processedBy || 'N/A'
            }));

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Set column widths
            const colWidths = [
                { wch: 20 },
                { wch: 15 },
                { wch: 12 },
                { wch: 10 },
                { wch: 20 },
                { wch: 8 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 18 },
                { wch: 15 }
            ];
            ws['!cols'] = colWidths;

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

            // Generate filename
            const fileName = `Transactions_${dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;

            // Export
            XLSX.writeFile(wb, fileName);
            // Show generic success message without transaction count
            enqueueSnackbar('Exported transactions to Excel', { variant: 'success' });

        } catch (error) {
            enqueueSnackbar('Export failed', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleZReport = () => {
        // For now, just print the current summary view
        window.print();
        // Ideally, navigate to a dedicated clean print route or open a modal with structured Z-report data
    };

    const handleVoid = async (transaction) => {
        // Simple prompt for now - ideally a nicer modal
        const reason = prompt("Enter reason for voiding this transaction:");
        if (!reason) return;

        try {
            const response = await fetch(`http://localhost:5000/api/transactions/${transaction._id}/void`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, voidedBy: 'Admin' }) // Replace with actual user
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to void');
            }

            enqueueSnackbar('Transaction voided successfully', { variant: 'success' });
            fetchTransactions(pagination.page); // Refresh
        } catch (error) {
            enqueueSnackbar(error.message, { variant: 'error' });
        }
    };

    const handleReturn = (transaction) => {

        alert(`Initiating return for ${transaction.transactionId}. (Feature: Navigate to POS Return Mode)`);
        // navigate('/pos', { state: { returnTransaction: transaction } }); // If POS supports this
    };

    const handleDuplicate = (transaction) => {
        // Add items to cart?
        alert(`Duplicating order with ${transaction.items.length} items. (Feature: Add to Cart)`);
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Sales History</h2>
                    <p className="text-gray-500 text-sm">Manage transactions, returns, and daily reports</p>
                </div>

                {/* Search & Main Filter */}
                <div className="flex gap-3 w-full md:w-auto items-center">
                    <div className="relative flex-1 md:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by ID or Customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                    </div>
                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2"
                    >
                        Export Excel
                    </button>
                    <button
                        onClick={handleZReport}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        Z-Report
                    </button>
                </div>
            </div>

            {/* Enhanced Summary Bar */}
            <SummaryBar stats={summaryStats} loading={loading} />

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
                <div className="flex flex-col gap-4">
                    {/* Date Filter Tabs */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                        <div className="flex items-center gap-2 text-gray-600 min-w-max">
                            <Calendar size={20} />
                            <span className="font-medium">Date Range:</span>
                        </div>
                        {['Today', 'Yesterday', 'Week', 'Month', 'Custom'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setDateFilter(filter)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${dateFilter === filter
                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Inputs */}
                    {dateFilter === 'Custom' && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                            <input
                                type="date"
                                value={customDates.start}
                                onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="date"
                                value={customDates.end}
                                onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <button
                                onClick={handleCustomDateApply}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                            >
                                Apply
                            </button>
                        </div>
                    )}
                </div>

                <div className="my-4 border-t border-gray-100"></div>

                {/* Advanced Filter Bar */}
                <FilterBar
                    filters={filters}
                    onFilterChange={setFilters}
                    onReset={() => setFilters({
                        paymentMethod: 'All', status: 'All', cashier: 'All', type: 'All', minAmount: '', maxAmount: ''
                    })}
                    showFilters={showAdvancedFilters}
                    setShowFilters={setShowAdvancedFilters}
                />
            </div>

            {/* Transactions Table */}
            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 z-20 flex justify-center pt-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                )}

                <TransactionTable
                    transactions={transactions}
                    onViewDetails={(tx) => { setSelectedTransaction(tx); setIsDetailsModalOpen(true); }}
                    onVoid={handleVoid}
                    onReturn={handleReturn}
                    onDuplicate={handleDuplicate}
                />

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4 px-4">
                    <div className="text-sm text-gray-500">
                        Showing page {pagination?.page || 1} of {pagination?.pages || 1} ({pagination?.total || 0} total)
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.pages}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <TransactionDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                transaction={selectedTransaction}
            />

            {/* Hidden Print Component */}
            <ZReport
                stats={summaryStats}
                dateFilter={dateFilter}
                customDates={customDates}
            />
        </div>
    );
};

export default History;
