import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, Edit, Clock, AlertTriangle, ChevronDown, Download, CheckSquare, Square, ArrowUpDown, Save, MoreHorizontal, Calendar, TrendingUp, Package, DollarSign, X, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import AddToInventoryModal from '../components/inventory/AddToInventoryModal';
import EditInventoryModal from '../components/inventory/EditInventoryModal';
import API_URL from '../config/api';

// ... (rest of imports)

const Inventory = () => {
    const [medicines, setMedicines] = useState([]);
    const [supplies, setSupplies] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Modal States for detailed views
    const [showExpiresModal, setShowExpiresModal] = useState(false);
    const [showLowStockModal, setShowLowStockModal] = useState(false);

    // ... (rest of state)

    // New Features State
    const [selectedItems, setSelectedItems] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [advancedFilters, setAdvancedFilters] = useState({ status: 'All', category: 'All' });
    const [editingPrice, setEditingPrice] = useState({ id: null, value: '' });
    const [enrichedLowStockItems, setEnrichedLowStockItems] = useState([]);
    const { showToast } = useToast();
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
        fetchEnrichedLowStock();
    }, []);

    const fetchMedicines = async () => {
        try {
            const response = await fetch(`${API_URL}/api/medicines`);
            const data = await response.json();
            setMedicines(data);
        } catch (error) {
            console.error('Error fetching medicines:', error);
            showToast('Failed to fetch inventory', 'error');
        }
    };

    const fetchSupplies = async () => {
        try {
            const response = await fetch(`${API_URL}/api/supplies`);
            const data = await response.json();
            setSupplies(data);
        } catch (error) {
            console.error('Error fetching supplies:', error);
        }
    };

    const fetchEnrichedLowStock = async () => {
        try {
            const response = await fetch(`${API_URL}/api/medicines/low-stock`);
            const data = await response.json();
            setEnrichedLowStockItems(data);
        } catch (error) {
            console.error('Error fetching low stock data:', error);
        }
    };

    const handleAddToInventory = async (medicineId, formData) => {
        try {
            const payload = {
                ...formData,
                inInventory: true
            };

            const response = await fetch(`${API_URL}/api/medicines/${medicineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await fetchMedicines();
                setIsAddModalOpen(false);
                showToast('Product added to inventory successfully!', 'success');
            } else {
                showToast('Failed to add to inventory', 'error');
            }
        } catch (error) {
            console.error('Error adding to inventory:', error);
            showToast('Error adding to inventory', 'error');
        }
    };

    const handleUpdateInventory = async (medicineId, formData) => {
        try {
            const response = await fetch(`${API_URL}/api/medicines/${medicineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                await fetchMedicines();
                setIsEditModalOpen(false);
                showToast('Inventory updated successfully!', 'success');
            } else {
                showToast('Failed to update inventory', 'error');
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            showToast('Error updating inventory', 'error');
        }
    };



    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === displayItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(displayItems.map(item => item._id));
        }
    };

    const toggleSelectItem = (id) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handlePriceEditSubmit = async (medicine) => {
        if (!editingPrice.value || isNaN(editingPrice.value)) return;

        try {
            await handleUpdateInventory(medicine._id || medicine.id, {
                price: parseFloat(editingPrice.value)
            });
            setEditingPrice({ id: null, value: '' });
        } catch (error) {
            console.error(error);
            showToast('Failed to update price', 'error');
        }
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        try {
            const promises = selectedItems.map(id => {
                // Find item to get current data or just send patch if API supports it.
                // Reusing handleUpdateInventory logic but customized for bulk.
                return fetch(`${API_URL}/api/medicines/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
            });

            await Promise.all(promises);
            await fetchMedicines();
            setSelectedItems([]);
            showToast(`Updated status for ${selectedItems.length} items`, 'success');
        } catch (error) {
            showToast('Bulk update failed', 'error');
        }
    };

    const handleExport = () => {
        // Determine what data to export based on active tab
        let dataToExport = [];
        let sheetName = 'All Inventory';

        switch (activeTab) {
            case 'expires':
                dataToExport = displayItems;
                sheetName = 'Expiring Items';
                break;
            case 'lowstock':
                dataToExport = displayItems;
                sheetName = 'Low Stock Items';
                break;
            default:
                dataToExport = displayItems;
                sheetName = 'All Inventory';
        }

        // Prepare data for Excel
        const excelData = dataToExport.map(item => ({
            'ID': item.id || item._id,
            'Name': item.name,
            'Product Name': item.name,
            'Formula Code': item.genericName || item.formulaCode || '-',
            'Category': item.category,
            'Box/Shelf': item.boxNumber || '-',
            'Stock (Packs)': (item.stock / (item.packSize || 1)).toFixed(2),
            'Unit': item.unit,
            'Items/Pack': item.packSize,
            'Cost Price (Pack)': item.costPrice,
            'MRP (Pack)': item.mrp || 0,
            'Selling Price (Pack)': item.price,
            'Discount %': item.discountPercentage || 0,
            'Margin %': ((item.price - (item.costPrice || 0)) / (item.price || 1) * 100).toFixed(2) + '%', // Ensure no division by zero
            'Total Stock Value': ((item.stock / (item.packSize || 1)) * (item.costPrice || 0)).toFixed(2),
            'CGST %': item.cgstPercentage || 0,
            'SGST %': item.sgstPercentage || 0,
            'IGST %': item.igstPercentage || 0,
            'Status': item.status,
            'Expiry Date': item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A',
            'Last Updated': item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '-'
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths for better readability
        const colWidths = [
            { wch: 25 }, // ID
            { wch: 30 }, // Name
            { wch: 15 }, // SKU
            { wch: 15 }, // Category
            { wch: 12 }, // Unit
            { wch: 10 }, // Stock
            { wch: 12 }, // Min Stock
            { wch: 12 }, // Cost Price
            { wch: 15 }, // Selling Price
            { wch: 15 }, // Stock Value
            { wch: 12 }, // Status
            { wch: 15 }, // Expiry Date
            { wch: 20 }  // Last Updated
        ];
        ws['!cols'] = colWidths;

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Generate filename with date and tab name
        const fileName = `${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Export
        XLSX.writeFile(wb, fileName);
        showToast('Exported to Excel', 'success');
    };

    // Base filter for search, barcode, and status
    const getFilteredMedicines = (items) => {
        return items.filter(med => {
            const term = searchQuery.toLowerCase();
            const matchesSearch = med.name.toLowerCase().includes(term) ||
                (med.sku && med.sku.toLowerCase().includes(term)) ||
                (med.genericName && med.genericName.toLowerCase().includes(term)) ||
                (med.formulaCode && med.formulaCode.toLowerCase().includes(term)) ||
                (med.boxNumber && med.boxNumber.toLowerCase().includes(term)) ||
                (med.barcodes && med.barcodes.some(b => b.code && b.code.toLowerCase().includes(term)));

            const matchesStatus = advancedFilters.status === 'All' || med.status === advancedFilters.status;
            const matchesCategory = advancedFilters.category === 'All' || med.category === advancedFilters.category;

            return matchesSearch && matchesStatus && matchesCategory;
        });
    };

    // Filter medicines that are IN inventory AND have corresponding Supply records
    const inventoryItems = medicines.filter(med => {
        const inInventory = med.inInventory === true;

        // Robust supply check
        const hasSupplyRecord = supplies.some(supply =>
            (supply.medicineId && med.id && supply.medicineId.toString() === med.id.toString()) ||
            (supply.medicineId && med._id && supply.medicineId.toString() === med._id.toString())
        );

        return inInventory && hasSupplyRecord;
    });

    // ... (expiring and lowstock filters remain similar but use new derived data if needed)
    // Filter expiring items (expires within next 3 months) - FROM INVENTORY ITEMS ONLY
    const allExpiringItems = inventoryItems.filter(med => {
        if (!med.expiryDate) return false;
        const today = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);
        const expiryDate = new Date(med.expiryDate);
        return expiryDate <= threeMonthsFromNow;
    });

    const allLowStockItems = inventoryItems.filter(med => {
        const packSize = med.packSize || 1;
        const stockInPacks = (med.stock || 0) / packSize;
        const minStockInPacks = med.minStock || 10;
        return stockInPacks <= minStockInPacks;
    });

    const inventoryItemsFiltered = getFilteredMedicines(inventoryItems);
    const expiringItems = getFilteredMedicines(allExpiringItems);
    const lowStockItems = getFilteredMedicines(allLowStockItems);

    // Dashboard Statistics Calculation
    const inventoryStats = useMemo(() => {
        let totalItems = 0;
        let totalValue = 0;
        let potentialProfit = 0;
        let lowStockCount = 0;
        const categoryStats = {};

        inventoryItems.forEach(item => {
            const packs = (item.stock || 0) / (item.packSize || 1);
            const price = item.price || 0;
            const cost = item.costPrice || 0;

            const retailVal = packs * price;
            const costVal = packs * cost;

            totalItems++;
            totalValue += retailVal;
            potentialProfit += (retailVal - costVal);

            if (packs <= (item.minStock || 10)) lowStockCount++;

            if (!categoryStats[item.category]) {
                categoryStats[item.category] = {
                    name: item.category,
                    units: 0,
                    value: 0,
                    count: 0
                };
            }
            categoryStats[item.category].units += packs;
            categoryStats[item.category].value += retailVal;
            categoryStats[item.category].count += 1;
        });

        const categoryList = Object.values(categoryStats)
            .sort((a, b) => b.value - a.value);

        const topValueItems = [...inventoryItems]
            .sort((a, b) => {
                const valA = ((a.stock || 0) / (a.packSize || 1)) * (a.price || 0);
                const valB = ((b.stock || 0) / (b.packSize || 1)) * (b.price || 0);
                return valB - valA;
            })
            .slice(0, 5);

        return {
            totalItems,
            totalValue,
            potentialProfit,
            lowStockCount,
            categoryList,
            topValueItems
        };
    }, [inventoryItems]);

    const getDisplayItems = () => {
        let items = [];
        switch (activeTab) {
            case 'expires': items = expiringItems; break;
            case 'lowstock': items = enrichedLowStockItems; break; // Use enriched data
            default: items = inventoryItemsFiltered;
        }

        // Sort items
        return [...items].sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA = a[key];
            let valB = b[key];

            // Handle special cases
            if (key === 'stockValue') {
                valA = ((a.stock || 0) / (a.packSize || 1)) * (a.costPrice || 0);
                valB = ((b.stock || 0) / (b.packSize || 1)) * (b.costPrice || 0);
            } else if (key === 'stock') {
                valA = (a.stock || 0) / (a.packSize || 1);
                valB = (b.stock || 0) / (b.packSize || 1);
            } else if (key === 'margin') {
                valA = ((a.price - (a.costPrice || 0)) / (a.price || 1));
                valB = ((b.price - (b.costPrice || 0)) / (b.price || 1));
            } else if (key === 'location') {
                valA = a.boxNumber || '';
                valB = b.boxNumber || '';
            } else if (key === 'lastUpdated') {
                valA = new Date(a.lastUpdated || 0).getTime();
                valB = new Date(b.lastUpdated || 0).getTime();
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB ? valB.toLowerCase() : '';
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const displayItems = getDisplayItems();

    const tabs = [
        { id: 'all', label: 'All Inventory', count: inventoryItemsFiltered.length },
        { id: 'expires', label: 'Expires', count: expiringItems.length },
        { id: 'lowstock', label: 'Low Stock', count: enrichedLowStockItems.length }
    ];

    return (
        <div className="p-8 bg-gray-50/50 min-h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory Overview</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage stock levels, value, and expirations</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <Download size={16} />
                        <span>Export Excel</span>
                    </button>
                </div>
            </div>

            {/* Main Content - No fixed height/overflow here, letting page scroll */}
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Items */}
                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-blue-600/90 font-semibold text-sm mb-1">Total Items</p>
                            <h3 className="text-2xl font-bold text-blue-700">{inventoryStats.totalItems.toLocaleString()}</h3>
                        </div>
                        <div className="mt-auto relative z-10">
                            <span className="text-xs font-medium text-blue-700/80 bg-blue-100/50 px-2 py-0.5 rounded inline-block">
                                {inventoryStats.totalItems} unique products
                            </span>
                        </div>
                        <div className="absolute right-3 top-3 bg-blue-100 rounded-lg p-1.5 text-blue-500 group-hover:scale-110 transition-transform">
                            <Package size={18} />
                        </div>
                    </div>

                    {/* Inventory Value */}
                    <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-emerald-600/90 font-semibold text-sm mb-1">Inventory Value</p>
                            <h3 className="text-2xl font-bold text-emerald-700">Rs {inventoryStats.totalValue.toLocaleString()}</h3>
                        </div>
                        <div className="mt-auto relative z-10">
                            <span className="text-xs font-medium text-emerald-700/80 bg-emerald-100/50 px-2 py-0.5 rounded inline-block flex items-center w-fit gap-1">
                                <TrendingUp size={12} />
                                Retail Value
                            </span>
                        </div>
                        <div className="absolute right-3 top-3 bg-emerald-100 rounded-lg p-1.5 text-emerald-500 group-hover:scale-110 transition-transform">
                            <DollarSign size={18} />
                        </div>
                    </div>

                    {/* Low Stock */}
                    <div className="bg-red-50 rounded-xl p-5 border border-red-100 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-red-600/90 font-semibold text-sm mb-1">Low Stock</p>
                            <h3 className="text-2xl font-bold text-red-700">{inventoryStats.lowStockCount}</h3>
                        </div>
                        <div className="mt-auto relative z-10">
                            <span className="text-xs font-medium text-red-700/80 bg-red-100/50 px-2 py-0.5 rounded inline-block">
                                {enrichedLowStockItems.filter(i => i.stock === 0).length} Out of Stock
                            </span>
                        </div>
                        <div className="absolute right-3 top-3 bg-red-100 rounded-lg p-1.5 text-red-500 group-hover:scale-110 transition-transform">
                            <AlertTriangle size={18} />
                        </div>
                    </div>

                    {/* Profit */}
                    <div className="bg-orange-50 rounded-xl p-5 border border-orange-100 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-orange-600/90 font-semibold text-sm mb-1">Potential Profit</p>
                            <h3 className="text-2xl font-bold text-orange-700">Rs {inventoryStats.potentialProfit.toLocaleString()}</h3>
                        </div>
                        <div className="mt-auto relative z-10">
                            <span className="text-xs font-medium text-orange-700/80 bg-orange-100/50 px-2 py-0.5 rounded inline-block">
                                Expected Margin
                            </span>
                        </div>
                        <div className="absolute right-3 top-3 bg-orange-100 rounded-lg p-1.5 text-orange-500 group-hover:scale-110 transition-transform">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                </div>

                {/* Secondary Metrics Row - Clean White Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Expiring Soon */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between h-24">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Expiring Soon (90 Days)</p>
                                <div className="flex items-end gap-2 mt-0.5">
                                    <h3 className="text-xl font-bold text-gray-900 leading-none">{expiringItems.filter(i => new Date(i.expiryDate) >= new Date()).length}</h3>
                                    <span className="text-xs font-medium text-gray-400 mb-0.5">Items</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowExpiresModal(true)}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors uppercase tracking-wide"
                        >
                            View List
                        </button>
                    </div>

                    {/* Expired Items */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between h-24">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Expired Items</p>
                                <div className="flex items-end gap-2 mt-0.5">
                                    <h3 className="text-xl font-bold text-gray-900 leading-none">{expiringItems.filter(i => new Date(i.expiryDate) < new Date()).length}</h3>
                                    <span className="text-xs font-medium text-gray-400 mb-0.5">Items</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowExpiresModal(true)}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors uppercase tracking-wide"
                        >
                            Process
                        </button>
                    </div>
                </div>

                {/* Charts & Lists Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Stock by Category */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm lg:col-span-1">
                        <h3 className="font-bold text-gray-900 text-sm mb-3">Stock by Category</h3>
                        <div className="space-y-3">
                            {inventoryStats.categoryList.slice(0, 5).map((cat, index) => (
                                <div key={index} className="group">
                                    <div className="flex justify-between text-[10px] mb-1">
                                        <span className="font-semibold text-gray-700">{cat.name}</span>
                                        <span className="text-gray-500 font-medium">{cat.units.toFixed(0)}</span>
                                    </div>
                                    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${index === 0 ? 'bg-blue-500' :
                                                index === 1 ? 'bg-indigo-500' :
                                                    index === 2 ? 'bg-cyan-500' :
                                                        index === 3 ? 'bg-teal-500' :
                                                            'bg-gray-400'
                                                }`}
                                            style={{ width: `${Math.min((cat.value / inventoryStats.totalValue) * 100 * 3, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Low Stock Alerts */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-gray-900 text-sm">Low Stock Alerts</h3>
                            <button
                                onClick={() => setShowLowStockModal(true)}
                                className="text-[9px] text-indigo-600 font-bold hover:text-indigo-700 uppercase tracking-wide"
                            >
                                View Detailed Analysis
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-[9px] uppercase text-gray-500 font-bold tracking-wider">
                                    <tr>
                                        <th className="px-3 py-1.5 rounded-l-lg">Product</th>
                                        <th className="px-3 py-1.5">Category</th>
                                        <th className="px-3 py-1.5">Stock</th>
                                        <th className="px-3 py-1.5 text-right rounded-r-lg">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {enrichedLowStockItems.slice(0, 5).map(item => (
                                        <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-3 py-1.5">
                                                <p className="font-bold text-gray-800 text-[11px] leading-tight">{item.name}</p>
                                                <p className="text-[9px] text-gray-400 font-medium mt-0">{item.supplier || 'N/A'}</p>
                                            </td>
                                            <td className="px-3 py-1.5 text-[10px] text-gray-600 font-medium">
                                                {item.category}
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${item.stock === 0 ? 'bg-red-500' : 'bg-yellow-500'}`}
                                                            style={{ width: `${Math.min(((item.stock / (item.packSize || 1)) / (item.minStock || 10)) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={`text-[10px] font-bold ${item.stock === 0 ? 'text-red-500' : 'text-yellow-600'}`}>
                                                        {(item.stock / (item.packSize || 1)).toFixed(0)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-right">
                                                <button className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100 uppercase tracking-wide transition-colors">
                                                    Order
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Highest Value Items (Grid Style) */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 text-lg">Top Value Assets</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        {inventoryStats.topValueItems.map((item, index) => (
                            <div key={item._id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 flex flex-col gap-3 hover:border-indigo-100 hover:shadow-sm transition-all h-28 justify-between">
                                <div className="flex justify-between items-start">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-white text-gray-500 border border-gray-200'
                                        }`}>
                                        #{index + 1}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rank</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm truncate leading-tight" title={item.name}>{item.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">Rs {(((item.stock || 0) / (item.packSize || 1)) * (item.price || 0)).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
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

            {/* Expiring Items Modal */}
            {showExpiresModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Expiring Items Report</h2>
                                <p className="text-sm text-gray-500 mt-1">Items expired or expiring within 3 months</p>
                            </div>
                            <button onClick={() => setShowExpiresModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider rounded-l-lg">Product</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider rounded-r-lg">Expiry Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {expiringItems.length > 0 ? (
                                        expiringItems.map((item) => {
                                            const daysToExpiry = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                                            const isExpired = daysToExpiry < 0;

                                            return (
                                                <tr key={item._id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="px-4 py-2.5">
                                                        <div className="font-bold text-gray-800 text-xs">{item.name}</div>
                                                        <div className="text-[10px] text-gray-400 group-hover:text-gray-500">{item.genericName}</div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="font-medium text-gray-700 text-xs">{(item.stock / (item.packSize || 1)).toFixed(1)} Packs</span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${isExpired ? 'bg-red-50 border-red-100 text-red-700' : 'bg-orange-50 border-orange-100 text-orange-700'
                                                            }`}>
                                                            <Clock size={12} />
                                                            <span className="font-bold text-[10px]">
                                                                {new Date(item.expiryDate).toLocaleDateString()}
                                                            </span>
                                                            <span className="text-[9px] uppercase font-bold opacity-75 border-l border-current pl-1.5 ml-1">
                                                                {isExpired ? 'Expired' : `${daysToExpiry} Days`}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-10 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                        <CheckSquare size={24} />
                                                    </div>
                                                    <p className="font-medium text-sm">No expiring items found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Low Stock Modal */}
            {showLowStockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Low Stock Alerts</h2>
                                <p className="text-sm text-gray-500 mt-1">Detailed reorder analysis and forecasts</p>
                            </div>
                            <button onClick={() => setShowLowStockModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider rounded-l-lg">Product</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sales Velocity</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reorder Suggestion</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider rounded-r-lg">Forecast (7/15/30d)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {enrichedLowStockItems.length > 0 ? (
                                        enrichedLowStockItems.map((item) => {
                                            const suggestion = item.reorderSuggestion || {};
                                            const urgency = suggestion.urgency || 'Warning';

                                            return (
                                                <tr key={item._id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="px-4 py-2.5">
                                                        <div className="font-bold text-gray-800 text-xs">{item.name}</div>
                                                        <div className="text-[10px] text-gray-400 mt-0.5">{item.category}</div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className={`font-bold text-xs ${item.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                                                {(item.stock / (item.packSize || 1)).toFixed(1)} {item.unit || 'Units'}
                                                            </div>
                                                            <div className="text-[9px] uppercase font-bold text-gray-400">
                                                                Min: {item.minStock || 10}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${item.salesVelocity === 'Fast' ? 'bg-green-50 text-green-700' :
                                                            item.salesVelocity === 'Slow' ? 'bg-gray-50 text-gray-600' :
                                                                'bg-blue-50 text-blue-700'
                                                            }`}>
                                                            {item.salesVelocity || 'Normal'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="bg-gray-100 px-2 py-1 rounded text-center min-w-[50px]">
                                                                <div className="text-[9px] text-gray-400 font-bold uppercase">Order</div>
                                                                <div className="font-bold text-gray-900 text-xs">{suggestion.suggestedQuantity || 0}</div>
                                                            </div>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${urgency === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                {urgency}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="text-xs font-medium text-gray-700">
                                                            {item.preferredSupplierId?.name || item.supplier || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {item.forecasts && (
                                                            <div className="flex items-center gap-1.5 text-[10px]">
                                                                <span className={`px-1 py-0.5 rounded ${item.forecasts.days7?.willStockOut ? 'bg-red-100 text-red-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>
                                                                    {item.forecasts.days7?.forecastedStock || 0}
                                                                </span>
                                                                <span className="text-gray-300">/</span>
                                                                <span className={`px-1 py-0.5 rounded ${item.forecasts.days15?.willStockOut ? 'bg-red-100 text-red-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>
                                                                    {item.forecasts.days15?.forecastedStock || 0}
                                                                </span>
                                                                <span className="text-gray-300">/</span>
                                                                <span className={`px-1 py-0.5 rounded ${item.forecasts.days30?.willStockOut ? 'bg-red-100 text-red-700 font-bold' : 'bg-gray-100 text-gray-500'}`}>
                                                                    {item.forecasts.days30?.forecastedStock || 0}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-10 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                        <CheckSquare size={24} />
                                                    </div>
                                                    <p className="font-medium text-sm">Stock levels healthy</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
