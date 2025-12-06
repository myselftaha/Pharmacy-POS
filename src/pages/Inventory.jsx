import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Edit, Trash2 } from 'lucide-react';
import { useSnackbar } from 'notistack';
import AddToInventoryModal from '../components/inventory/AddToInventoryModal';

const Inventory = () => {
    const [medicines, setMedicines] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/medicines');
            const data = await response.json();
            setMedicines(data);
        } catch (error) {
            console.error('Error fetching medicines:', error);
            enqueueSnackbar('Failed to fetch inventory', { variant: 'error' });
        }
    };

    const handleAddToInventory = async (medicineId, formData) => {
        try {
            const payload = {
                ...formData,
                inInventory: true
            };

            const response = await fetch(`http://localhost:5000/api/medicines/${medicineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await fetchMedicines();
                setIsAddModalOpen(false);
                enqueueSnackbar('Product added to inventory successfully!', { variant: 'success' });
            } else {
                enqueueSnackbar('Failed to add to inventory', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error adding to inventory:', error);
            enqueueSnackbar('Error adding to inventory', { variant: 'error' });
        }
    };

    const calculateMargin = (price, cost) => {
        if (!price || !cost) return '0%';
        const margin = ((price - cost) / price) * 100;
        return `${Math.round(margin)}%`;
    };

    // Filter medicines that are IN inventory
    const inventoryItems = medicines.filter(med =>
        med.inInventory &&
        med.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your active stock and pricing</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search Product..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 shadow-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#1a4d44] text-white rounded-lg font-bold hover:bg-[#153e37] transition-all shadow-lg shadow-green-900/20 transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Plus size={18} />
                        <span>Add Product</span>
                    </button>
                </div>
            </div>

            {/* Inventory Table Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                        <Filter size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Product Inventory</h2>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cost</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Margin</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {inventoryItems.length > 0 ? (
                                inventoryItems.map((item) => (
                                    <tr key={item._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-600">#{item.id || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{item.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.stock <= (item.minStock || 10)
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-[#1a4d44] text-white'
                                                }`}>
                                                {item.stock}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{item.price}/-</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.costPrice ? `${item.costPrice}/-` : '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{calculateMargin(item.price, item.costPrice)}</td>
                                        <td className="px-6 py-4">
                                            {item.expiryDate && (
                                                <span className={`px-3 py-1 rounded-md text-xs font-bold ${new Date(item.expiryDate) < new Date()
                                                        ? 'bg-red-100 text-red-600'
                                                        : new Date(item.expiryDate) < new Date(new Date().setMonth(new Date().getMonth() + 3))
                                                            ? 'bg-orange-100 text-orange-600'
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {new Date(item.expiryDate).toISOString().split('T')[0]}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colspan="9" className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                                                <Filter size={32} />
                                            </div>
                                            <p className="font-medium">No items found in inventory</p>
                                            <p className="text-sm">Add items from the "Supplies" list to get started</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddToInventoryModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onConfirm={handleAddToInventory}
                supplies={medicines}
            />
        </div>
    );
};

export default Inventory;
