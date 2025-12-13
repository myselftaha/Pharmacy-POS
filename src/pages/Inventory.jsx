import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Edit, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { useLocation } from 'react-router-dom';
import AddToInventoryModal from '../components/inventory/AddToInventoryModal';
import EditInventoryModal from '../components/inventory/EditInventoryModal';
import CategoryFilter from '../components/pos/CategoryFilter';
import { categories } from '../data/mockData';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';

const Inventory = () => {
    const [medicines, setMedicines] = useState([]);
    const [supplies, setSupplies] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'expires', 'lowstock'
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const { enqueueSnackbar } = useSnackbar();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
            // Optional: clear state so it doesn't persist on refresh/back if unwanted,
            // but for now keeping it simple.
        }
        if (location.state?.openAddModal) {
            setIsAddModalOpen(true);
        }
        // Clear state to prevent reopening on refresh
        if (location.state) {
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        fetchMedicines();
        fetchSupplies();
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

    const fetchSupplies = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/supplies');
            const data = await response.json();
            setSupplies(data);
        } catch (error) {
            console.error('Error fetching supplies:', error);
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

    const handleUpdateInventory = async (medicineId, formData) => {
        try {
            const response = await fetch(`http://localhost:5000/api/medicines/${medicineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                await fetchMedicines();
                setIsEditModalOpen(false);
                enqueueSnackbar('Inventory updated successfully!', { variant: 'success' });
            } else {
                enqueueSnackbar('Failed to update inventory', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            enqueueSnackbar('Error updating inventory', { variant: 'error' });
        }
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            const response = await fetch(`http://localhost:5000/api/medicines/${itemToDelete._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inInventory: false })
            });

            if (response.ok) {
                await fetchMedicines();
                enqueueSnackbar('Item removed from inventory', { variant: 'success' });
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
            } else {
                enqueueSnackbar('Failed to remove from inventory', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error removing from inventory:', error);
            enqueueSnackbar('Error removing from inventory', { variant: 'error' });
        }
    };

    const calculateMargin = (price, cost) => {
        if (!price || !cost) return '0%';
        const margin = ((price - cost) / price) * 100;
        return `${Math.round(margin)}%`;
    };

    // Base filter for category and search (used by all tabs)
    const getFilteredMedicines = (items) => {
        return items.filter(med => {
            const matchesCategory = activeCategory === 'All' || med.category === activeCategory;
            const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    };

    // Filter medicines that are IN inventory AND have corresponding Supply records
    const inventoryItems = medicines.filter(med => {
        const inInventory = med.inInventory === true;

        // Check if this medicine has a corresponding Supply record
        // This ensures we only show items that strictly 'exist' via the Supplies page
        const hasSupplyRecord = supplies.some(supply =>
            (supply.medicineId && med.id && supply.medicineId.toString() === med.id.toString()) ||
            (supply.medicineId && med._id && supply.medicineId.toString() === med._id.toString())
        );

        return inInventory && hasSupplyRecord;
    });

    // Filter expiring items (expires within next 3 months) - FROM INVENTORY ITEMS ONLY
    const allExpiringItems = inventoryItems.filter(med => {
        if (!med.expiryDate) return false;

        const today = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);
        const expiryDate = new Date(med.expiryDate);

        return expiryDate <= threeMonthsFromNow;
    });

    // Filter low stock items (stock <= minStock) - FROM INVENTORY ITEMS ONLY
    const allLowStockItems = inventoryItems.filter(med => {
        const stock = parseInt(med.stock || 0);
        const minStock = parseInt(med.minStock || 10);
        return stock <= minStock;
    });

    // Apply category and search filters based on active tab
    const inventoryItemsFiltered = getFilteredMedicines(inventoryItems);
    const expiringItems = getFilteredMedicines(allExpiringItems);
    const lowStockItems = getFilteredMedicines(allLowStockItems);

    // Determine which items to display based on active tab
    const getDisplayItems = () => {
        switch (activeTab) {
            case 'expires':
                return expiringItems;
            case 'lowstock':
                return lowStockItems;
            default:
                return inventoryItemsFiltered;
        }
    };

    // Sort items by latest supply date (or creation date if no supply) to match Supplies page order
    const getSortedItems = (items) => {
        // Create a map of medicineId -> latest supply createdAt
        const latestSupplyMap = {};
        supplies.forEach(s => {
            const medId = s.medicineId;
            const date = new Date(s.createdAt || 0).getTime();
            if (!latestSupplyMap[medId] || date > latestSupplyMap[medId]) {
                latestSupplyMap[medId] = date;
            }
        });

        return [...items].sort((a, b) => {
            // Get latest supply time for both
            // Try matching by id (number) stringified, or _id
            const getLatestDate = (item) => {
                let date = 0;
                if (item.id && latestSupplyMap[item.id.toString()]) {
                    date = Math.max(date, latestSupplyMap[item.id.toString()]);
                }
                if (item._id && latestSupplyMap[item._id.toString()]) {
                    date = Math.max(date, latestSupplyMap[item._id.toString()]);
                }
                return date;
            };

            const dateA = getLatestDate(a);
            const dateB = getLatestDate(b);

            // If both have supplies, sort by supply date
            if (dateA !== dateB) {
                return dateB - dateA;
            }

            // Fallback: Sort by ID (newest created first)
            if (a.id && b.id) return b.id - a.id;
            const idA = a._id?.toString() || '';
            const idB = b._id?.toString() || '';
            return idB.localeCompare(idA);
        });
    };

    const displayItems = getSortedItems(getDisplayItems());

    const tabs = [
        { id: 'all', label: 'All Inventory', count: inventoryItemsFiltered.length },
        { id: 'expires', label: 'Expires', count: expiringItems.length },
        { id: 'lowstock', label: 'Low Stock', count: lowStockItems.length }
    ];

    return (
        <div className="flex flex-col h-full">
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
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 shadow-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                    >
                        <Plus size={18} />
                        <span>Add Product</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 font-semibold text-sm transition-all relative ${activeTab === tab.id
                            ? 'text-green-600 border-b-2 border-green-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Category Filter */}
            <div className="mb-6">
                <CategoryFilter
                    categories={categories}
                    activeCategory={activeCategory}
                    onSelect={setActiveCategory}
                />
            </div>

            {/* Table Content */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    {activeTab === 'all' && (
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
                                {displayItems.length > 0 ? (
                                    displayItems.map((item) => (
                                        <tr key={item._id} className="hover:bg-green-50/30 transition-colors group">
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-600">
                                                {item.id ? `#${item.id}` : `#${item._id?.toString().substr(-6).toUpperCase()}`}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">{item.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.stock <= 0
                                                    ? 'bg-red-600 text-white'
                                                    : item.stock <= (item.minStock || 10)
                                                        ? 'bg-orange-100 text-orange-800'
                                                        : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {item.stock <= 0 ? 'Out of Stock' : item.stock}
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
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(item)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-gray-400">
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
                    )}

                    {activeTab === 'expires' && (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayItems.length > 0 ? (
                                    displayItems.map((item) => {
                                        const daysToExpiry = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                                        const isExpired = daysToExpiry < 0;

                                        return (
                                            <tr key={item._id} className="hover:bg-orange-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800">{item.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        ID: {item.id ? `#${item.id}` : `#${item._id?.toString().substr(-6).toUpperCase()}`}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-medium text-gray-700">{item.stock} units</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-800">
                                                        {new Date(item.expiryDate).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isExpired
                                                        ? 'bg-red-100 text-red-600'
                                                        : 'bg-orange-100 text-orange-600'
                                                        }`}>
                                                        {isExpired ? (
                                                            <>
                                                                <AlertTriangle size={14} />
                                                                Expired {Math.abs(daysToExpiry)} days ago
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock size={14} />
                                                                Expires in {daysToExpiry} days
                                                            </>
                                                        )}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                                                    <Clock size={32} />
                                                </div>
                                                <p className="font-medium">No expiring items found</p>
                                                <p className="text-sm">Great! Nothing is expiring in the next 30 days.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'lowstock' && (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayItems.length > 0 ? (
                                    displayItems.map((item) => (
                                        <tr key={item._id} className="hover:bg-red-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">{item.name}</div>
                                                <div className="text-xs text-gray-500">ID: #{item.id || item._id.substr(-6)}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-bold ${item.stock <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                                    {item.stock} units
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-700">
                                                {item.price}/-
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${item.stock <= 0
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-orange-100 text-orange-600'
                                                    }`}>
                                                    <AlertTriangle size={14} />
                                                    {item.stock <= 0 ? 'Out of Stock' : 'Low Stock'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                                                    <AlertTriangle size={32} />
                                                </div>
                                                <p className="font-medium">No low stock items found</p>
                                                <p className="text-sm">All stock levels are healthy!</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <AddToInventoryModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onConfirm={handleAddToInventory}
                supplies={medicines}
            />

            <EditInventoryModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onConfirm={handleUpdateInventory}
                product={selectedItem}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                itemName={itemToDelete?.name}
                title="Remove from Inventory?"
                message="Are you sure you want to remove this item from the active inventory? It will remain in your Supplies records."
            />
        </div>
    );
};

export default Inventory;
