import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const MedicineTable = ({ medicines, onEdit, onDelete }) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                            <th className="px-6 py-4">Image</th>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Net Content</th>
                            <th className="px-6 py-4">Unit</th>
                            <th className="px-6 py-4">Price</th>
                            <th className="px-6 py-4">Expiry Date</th>
                            <th className="px-6 py-4">Stock</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {medicines.map((med) => (
                            <tr key={med._id || med.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                        {med.category?.charAt(0) || 'M'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">{med.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={med.description}>
                                    {med.description}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{med.netContent}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{med.unit}</td>
                                <td className="px-6 py-4 font-bold text-gray-900">Rs. {med.price.toFixed(2)}</td>
                                <td className={`px-6 py-4 text-sm font-medium ${med.expiryDate && new Date(med.expiryDate) <= new Date(new Date().setMonth(new Date().getMonth() + 3))
                                        ? 'text-red-500'
                                        : 'text-gray-900'
                                    }`}>
                                    {med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">{med.stock}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            onClick={() => onEdit && onEdit(med)}
                                            className="text-blue-500 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete && onDelete(med)}
                                            className="text-red-500 hover:text-red-700 font-medium text-sm flex items-center gap-1"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {medicines.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No medicines found. Add your first medicine to get started!
                </div>
            )}
        </div>
    );
};

export default MedicineTable;
