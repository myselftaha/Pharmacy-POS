import React from 'react';

const TransactionTable = ({ transactions, onViewDetails }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Recent Sales Transactions</h2>
            </div>
            {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <p className="text-lg">No transactions found</p>
                    <p className="text-sm mt-2">Try adjusting your filters or search query</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                                <th className="px-6 py-4">Transaction ID</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Total Amount</th>
                                <th className="px-6 py-4">Payment Method</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Processed By</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.map((tx) => (
                                <tr key={tx._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{tx.transactionId}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(tx.createdAt)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block w-16 text-center py-0.5 rounded text-xs font-medium ${(tx.type === 'Return' || tx.total < 0)
                                                ? 'bg-red-100 text-red-600'
                                                : 'bg-green-100 text-green-600'
                                            }`}>
                                            {tx.type || 'Sale'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">Rs. {tx.total.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{tx.paymentMethod}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{tx.customer.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{tx.processedBy}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => onViewDetails(tx)}
                                            className="text-green-500 hover:text-green-700 font-medium text-sm"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {transactions.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-100 text-sm text-gray-500">
                    Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
};

export default TransactionTable;
