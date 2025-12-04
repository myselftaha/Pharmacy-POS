import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const MedicineTable = ({ medicines }) => {
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
                            <th className="px-6 py-4">Stock</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {medicines.map((med) => (
                            <tr key={med.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                                        <img src={med.image} alt={med.name} className="w-full h-full object-cover" />
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">{med.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={med.description}>
                                    {med.description}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{med.netContent}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{med.unit}</td>
                                <td className="px-6 py-4 font-bold text-gray-900">${med.price.toFixed(2)}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{med.stock}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <button className="text-blue-500 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                                            Edit
                                        </button>
                                        <button className="text-red-500 hover:text-red-700 font-medium text-sm flex items-center gap-1">
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MedicineTable;
