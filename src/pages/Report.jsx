import React, { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, TrendingDown, DollarSign, Filter, PieChart as PieChartIcon, ArrowRight } from 'lucide-react';
import { useSnackbar } from 'notistack';
import API_URL from '../config/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell
} from 'recharts';

const Report = () => {
    const [reportData, setReportData] = useState({
        totalSales: 0,
        totalReturns: 0,
        cogs: 0,
        grossProfit: 0,
        totalExpenses: 0,
        netProfit: 0,
        expensesByCategory: []
    });
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('thisMonth'); // today, yesterday, thisWeek, thisMonth, custom
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Helper to get dates
    const getDates = () => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        switch (dateRange) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(now.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'last7Days':
                start.setDate(now.getDate() - 7);
                break;
            case 'thisMonth':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'custom':
                if (customStart) start = new Date(customStart);
                if (customEnd) end = new Date(customEnd);
                end.setHours(23, 59, 59, 999);
                break;
        }
        return { start, end };
    };

    useEffect(() => {
        fetchReportData();
    }, [dateRange, customStart, customEnd]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const { start, end } = getDates();
            const startStr = start.toISOString();
            const endStr = end.toISOString();

            // 1. Fetch Transactions
            const txRes = await fetch(`${API_URL}/api/transactions?startDate=${startStr}&endDate=${endStr}`);
            const txJson = await txRes.json();
            // Backend returns { data, pagination } for transactions
            const transactions = Array.isArray(txJson) ? txJson : (txJson?.data || []);

            // 2. Fetch Expenses
            const expRes = await fetch(`${API_URL}/api/expenses?startDate=${startStr}&endDate=${endStr}`);
            const expJson = await expRes.json();
            const expenses = Array.isArray(expJson) ? expJson : (expJson?.data || []);

            // 3. Fetch Medicines (for Cost lookup)
            const medRes = await fetch(`${API_URL}/api/medicines`);
            const medicines = await medRes.json();

            const medMap = {};
            medicines.forEach(m => {
                if (m.id) medMap[m.id] = m.costPrice || 0;
                medMap[m._id] = m.costPrice || 0;
                medMap[m.name] = m.costPrice || 0;
            });

            // Calculations
            let totalSales = 0;
            let totalReturns = 0;
            let cogs = 0;

            transactions.forEach(tx => {
                if (tx.type === 'Return' || tx.total < 0) {
                    totalReturns += Math.abs(tx.total);
                    // Reduce COGS for returned items? Yes, technically we got stock back.
                    // But usually Returns logic is complex. Let's assume we put it back in stock, so we "recover" the COGS.
                    let txCost = 0;
                    tx.items.forEach(item => {
                        let cost = medMap[item.id] || medMap[item._id] || medMap[item.name] || 0;
                        txCost += (cost * item.quantity);
                    });
                    cogs -= txCost;
                } else {
                    totalSales += tx.total;
                    let txCost = 0;
                    tx.items.forEach(item => {
                        let cost = medMap[item.id] || medMap[item._id] || medMap[item.name] || 0;
                        txCost += (cost * item.quantity);
                    });
                    cogs += txCost;
                }
            });

            const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

            // Group expenses by category
            const expCatMap = {};
            expenses.forEach(e => {
                if (!expCatMap[e.category]) expCatMap[e.category] = 0;
                expCatMap[e.category] += e.amount;
            });
            const expensesByCategory = Object.keys(expCatMap).map(cat => ({ name: cat, value: expCatMap[cat] }));

            const grossProfit = (totalSales - totalReturns) - cogs;
            const netProfit = grossProfit - totalExpenses;

            setReportData({
                totalSales,
                totalReturns,
                cogs,
                grossProfit,
                totalExpenses,
                netProfit,
                expensesByCategory
            });

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Prepare chart data once so we can also check if there is anything to show
    const financialOverviewData = [
        { name: 'Revenue', value: reportData.totalSales - reportData.totalReturns },
        { name: 'COGS', value: reportData.cogs },
        { name: 'Expenses', value: reportData.totalExpenses },
        { name: 'Net Profit', value: reportData.netProfit }
    ];

    const hasChartData = financialOverviewData.some(item => item.value !== 0);

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Profit & Loss Report</h1>
                    <p className="text-gray-500 text-sm mt-1">Financial performance summary</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="last7Days">Last 7 Days</option>
                        <option value="thisMonth">This Month</option>
                        <option value="custom">Custom Range</option>
                    </select>
                    {dateRange === 'custom' && (
                        <>
                            <input type="date" className="border border-gray-200 rounded-lg p-2 text-sm" onChange={e => setCustomStart(e.target.value)} />
                            <input type="date" className="border border-gray-200 rounded-lg p-2 text-sm" onChange={e => setCustomEnd(e.target.value)} />
                        </>
                    )}
                </div>
            </div>

            {/* P&L Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Main Statement */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-700">Income Statement</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* Revenue Section */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Total Sales</span>
                                <span className="font-bold text-gray-800">Rs. {reportData.totalSales.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-red-500 text-sm">
                                <span>Less: Returns</span>
                                <span>- Rs. {reportData.totalReturns.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-gray-100 pt-2 flex justify-between items-center font-bold">
                                <span>Net Revenue</span>
                                <span>Rs. {(reportData.totalSales - reportData.totalReturns).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* COGS Section */}
                        <div className="pt-2">
                            <div className="flex justify-between items-center text-gray-600">
                                <span>Cost of Goods Sold (COGS)</span>
                                <span>- Rs. {reportData.cogs.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Gross Profit */}
                        <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center font-bold text-blue-800">
                            <span>Gross Profit</span>
                            <span>Rs. {reportData.grossProfit.toLocaleString()}</span>
                        </div>

                        {/* Expenses Section */}
                        <div className="pt-2">
                            <div className="flex justify-between items-center text-gray-600 mb-2">
                                <span>Total Expenses</span>
                                <span className="text-red-600">- Rs. {reportData.totalExpenses.toLocaleString()}</span>
                            </div>
                            <div className="pl-4 space-y-1 text-sm text-gray-500 border-l-2 border-gray-100">
                                {reportData.expensesByCategory.map((cat, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{cat.name}</span>
                                        <span>{cat.value.toLocaleString()}</span>
                                    </div>
                                ))}
                                {reportData.expensesByCategory.length === 0 && <div>No expenses captured</div>}
                            </div>
                        </div>

                        {/* Net Profit */}
                        <div className={`p-4 rounded-xl flex justify-between items-center font-bold text-xl text-white ${reportData.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                            <span>Net Profit / (Loss)</span>
                            <span>Rs. {reportData.netProfit.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h3 className="font-bold text-gray-700 mb-6">Financial Overview</h3>
                        <div className="h-64 w-full">
                            {hasChartData ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={financialOverviewData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis hide />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                                            {[
                                                { name: 'Revenue', color: '#3B82F6' },
                                                { name: 'COGS', color: '#9CA3AF' },
                                                { name: 'Expenses', color: '#EF4444' },
                                                { name: 'Net Profit', color: '#10B981' }
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-gray-400">
                                    No financial data available for the selected period.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Report;
