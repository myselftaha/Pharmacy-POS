
import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

const SupplyTable = ({ supplies, onEdit, onDelete }) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full">
            <div
                className="overflow-auto flex-1 scrollbar-hide"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-white">
                        <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                            <th className="px-4 py-4">Date</th>
                            <th className="px-4 py-4">Invoice #</th>
                            <th className="px-4 py-4">Supplier</th>
                            <th className="px-4 py-4">Medicine</th>
                            <th className="px-4 py-4">Batch</th>
                            <th className="px-4 py-4">Cost Price</th>
                            <th className="px-4 py-4">Current Stock</th>
                            <th className="px-4 py-4">Expiry</th>
                            <th className="px-4 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {supplies.map((supply) => (
                            <tr key={supply._id || supply.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-4 text-sm text-gray-500">
                                    {new Date(supply.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-gray-800">
                                    {supply.purchaseInvoiceNumber}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600">
                                    {supply.supplierName}
                                </td>
                                <td className="px-4 py-4 font-medium text-gray-900">{supply.name}</td>
                                <td className="px-4 py-4 text-sm text-gray-500">{supply.batchNumber}</td>
                                <td className="px-4 py-4 text-sm font-medium text-gray-800">
                                    Rs. {supply.purchaseCost.toFixed(2)}
                                </td>
                                <td className={`px-4 py-4 text-sm font-bold ${supply.currentStock <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {supply.currentStock} <span className="text-[10px] text-gray-400 font-normal uppercase">Packs</span>
                                </td>
                                <td className={`px-4 py-4 text-sm font-medium ${supply.expiryDate && new Date(supply.expiryDate) <= new Date(new Date().setMonth(new Date().getMonth() + 3))
                                    ? 'text-red-500'
                                    : 'text-gray-900'
                                    }`}>
                                    {supply.expiryDate ? new Date(supply.expiryDate).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onEdit(supply)}
                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(supply._id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {supplies.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No purchase records found. Add a new supply entry to get started!
                </div>
            )}
        </div>
    );
};

export default SupplyTable;
