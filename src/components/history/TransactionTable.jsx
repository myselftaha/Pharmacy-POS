import React from 'react';

const TransactionTable = ({ transactions }) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Recent Sales Transactions</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                            <th className="px-6 py-4">Sale ID</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Total Amount</th>
                            <th className="px-6 py-4">Payment Method</th>
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Processed By</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{tx.id}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{tx.date}</td>
                                <td className="px-6 py-4 font-bold text-gray-900">${tx.amount.toFixed(2)}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{tx.method}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{tx.customer}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{tx.processedBy}</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-green-500 hover:text-green-700 font-medium text-sm">
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransactionTable;
