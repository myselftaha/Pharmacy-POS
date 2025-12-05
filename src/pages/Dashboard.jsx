import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    Users,
    AlertTriangle,
    Clock,
    ArrowUpRight,
    Search
} from 'lucide-react';
import { useSnackbar } from 'notistack';

const Dashboard = () => {
    const [stats, setStats] = useState({
        todaySales: 0,
        todayTransactions: 0,
        lowStockCount: 0,
        expiringCount: 0
    });
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [expiringItems, setExpiringItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch medicines for stock and expiry
                const medResponse = await fetch('http://localhost:5000/api/medicines');
                const medicines = await medResponse.json();

                // Calculate stock and expiry stats
                const lowStock = medicines.filter(m => parseInt(m.stock) <= 10); // Low stock threshold
                setLowStockItems(lowStock);

                const today = new Date();
                const threeMonthsFromNow = new Date();
                threeMonthsFromNow.setMonth(today.getMonth() + 3);

                const expiring = medicines.filter(m => {
                    if (!m.expiryDate) return false;
                    const exp = new Date(m.expiryDate);
                    return exp > today && exp <= threeMonthsFromNow;
                });
                setExpiringItems(expiring);

                // Fetch transactions for sales stats
                const txResponse = await fetch('http://localhost:5000/api/transactions');
                const transactions = await txResponse.json();

                // Filter for today's transactions
                const todayStr = today.toISOString().split('T')[0];
                const todayTx = transactions.filter(t =>
                    new Date(t.createdAt).toISOString().split('T')[0] === todayStr
                );

                const todaySales = todayTx.reduce((sum, t) => sum + (t.total || 0), 0);

                setStats({
                    todaySales,
                    todayTransactions: todayTx.length,
                    lowStockCount: lowStock.length,
                    expiringCount: expiring.length
                });

                // Get recent transactions (last 5)
                const sortedTx = [...transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setRecentTransactions(sortedTx.slice(0, 5));

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const MetricCard = ({ title, value, subtext, icon: Icon, colorClass, iconBgClass }) => (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-700">{title}</h3>
                <div className={`p-2 rounded-lg ${iconBgClass}`}>
                    <Icon className={colorClass} size={20} />
                </div>
            </div>
            <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
                <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    {subtext}
                </div>
            </div>
        </div>
    );

    return (
        <div className="pb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    title="Today's Sales"
                    value={`Rs. ${stats.todaySales.toLocaleString()}`}
                    subtext="+12% from yesterday"
                    icon={TrendingUp}
                    colorClass="text-green-600"
                    iconBgClass="bg-green-50"
                />
                <MetricCard
                    title="Transactions"
                    value={stats.todayTransactions}
                    subtext="+8% from yesterday"
                    icon={Users}
                    colorClass="text-blue-600"
                    iconBgClass="bg-blue-50"
                />
                <MetricCard
                    title="Low Stock Items"
                    value={stats.lowStockCount}
                    subtext="Requires attention"
                    icon={AlertTriangle}
                    colorClass="text-red-600"
                    iconBgClass="bg-red-50"
                />
                <MetricCard
                    title="Expiring Soon"
                    value={stats.expiringCount}
                    subtext="Within 3 months"
                    icon={Clock}
                    colorClass="text-orange-600"
                    iconBgClass="bg-orange-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Transactions */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-full">
                    <h3 className="font-bold text-gray-800 text-lg mb-6">Recent Transactions</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                                    <th className="pb-3 font-semibold">ID</th>
                                    <th className="pb-3 font-semibold">Time</th>
                                    <th className="pb-3 font-semibold">Customer</th>
                                    <th className="pb-3 font-semibold">Amount</th>
                                    <th className="pb-3 font-semibold">Items</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.map((tx, index) => (
                                    <tr key={index} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 text-sm font-medium text-gray-800">
                                            {tx.transactionId || `#TX${tx._id?.substr(-6)}`}
                                        </td>
                                        <td className="py-4 text-sm text-gray-500">
                                            {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-4 text-sm text-gray-800 font-medium">
                                            {tx.customer?.name || 'Walk-in Customer'}
                                        </td>
                                        <td className="py-4 text-sm font-bold text-gray-800">
                                            {tx.total?.toFixed(2)}/-
                                        </td>
                                        <td className="py-4 text-sm text-gray-500">
                                            {tx.items?.length || 0}
                                        </td>
                                    </tr>
                                ))}
                                {recentTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-8 text-center text-gray-400 text-sm">
                                            No recent transactions found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Alerts */}
                <div className="flex flex-col gap-6">
                    {/* Low Stock Alert */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex-1">
                        <div className="flex items-center gap-2 mb-6">
                            <AlertTriangle className="text-red-500" size={20} />
                            <h3 className="font-bold text-gray-800 text-lg">Low Stock Alert</h3>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {lowStockItems.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-4 rounded-lg border border-gray-100 hover:border-red-200 transition-colors group">
                                    <div>
                                        <div className="font-bold text-gray-800 group-hover:text-red-600 transition-colors">{item.name}</div>
                                        <div className="text-xs text-gray-500">{item.category}</div>
                                    </div>
                                    <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm font-bold border border-red-100">
                                        {item.stock} / 200
                                    </div>
                                </div>
                            ))}
                            {lowStockItems.length === 0 && (
                                <div className="py-8 text-center text-gray-400 text-sm">
                                    No low stock items. Good job!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expiry Alert */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex-1">
                        <div className="flex items-center gap-2 mb-6">
                            <Clock className="text-orange-500" size={20} />
                            <h3 className="font-bold text-gray-800 text-lg">Expiry Alert</h3>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {expiringItems.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-4 rounded-lg border border-gray-100 hover:border-orange-200 transition-colors group">
                                    <div>
                                        <div className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors">{item.name}</div>
                                        <div className="text-xs text-gray-500">Expires: {new Date(item.expiryDate).toLocaleDateString()}</div>
                                    </div>
                                    <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-sm font-bold border border-orange-100">
                                        Expiring
                                    </div>
                                </div>
                            ))}
                            {expiringItems.length === 0 && (
                                <div className="py-8 text-center text-gray-400 text-sm">
                                    No items expiring soon.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
