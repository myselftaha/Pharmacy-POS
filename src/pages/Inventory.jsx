import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Edit, Clock, AlertTriangle, ChevronDown, Download, CheckSquare, Square, ArrowUpDown, Save, MoreHorizontal, Calendar } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import AddToInventoryModal from '../components/inventory/AddToInventoryModal';
import EditInventoryModal from '../components/inventory/EditInventoryModal';
import API_URL from '../config/api';

// import { categories } from '../data/mockData'; // Removed unused import

const Inventory = () => {
    const [medicines, setMedicines] = useState([]);
    const [supplies, setSupplies] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    // activeCategory removed
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'expires', 'lowstock'
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

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
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your active stock and pricing</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                        <Download size={18} />
                        <span>Export</span>
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Scan Barcode or Search Product..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 shadow-sm transition-all"
                        />
                    </div>
                    {activeTab === 'all' && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                        >
                            <Plus size={18} />
                            <span>Add Product</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedItems.length > 0 && (
                <div className="mb-6 p-2 bg-green-50 border border-green-100 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3 px-2">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-sm font-bold">
                            {selectedItems.length} Selected
                        </span>
                        <div className="h-4 w-px bg-green-200 mx-2"></div>
                        <span className="text-sm text-green-800 font-medium">Bulk Actions:</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBulkStatusUpdate('Active')}
                            className="px-3 py-1.5 bg-white border border-green-200 text-green-700 text-sm font-medium rounded hover:bg-green-100 transition-colors"
                        >
                            Mark Active
                        </button>
                        <button
                            onClick={() => handleBulkStatusUpdate('Inactive')}
                            className="px-3 py-1.5 bg-white border border-green-200 text-green-700 text-sm font-medium rounded hover:bg-green-100 transition-colors"
                        >
                            Mark Inactive
                        </button>
                    </div>
                </div>
            )}

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

            {/* Advanced Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Category:</span>
                    <div className="relative">
                        <select
                            value={advancedFilters.category}
                            onChange={(e) => setAdvancedFilters(prev => ({ ...prev, category: e.target.value }))}
                            className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 cursor-pointer shadow-sm hover:border-gray-300 transition-colors"
                        >
                            <option value="All">All Categories</option>
                            {[...new Set(inventoryItems.map(m => m.category).filter(Boolean))].sort().map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                    </div>
                </div>

                {activeTab !== 'expires' && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <div className="relative">
                            <select
                                value={advancedFilters.status}
                                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 cursor-pointer shadow-sm hover:border-gray-300 transition-colors"
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                    </div>
                )}
            </div>

            {/* Table Content */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    {activeTab === 'all' && (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <button onClick={toggleSelectAll} className="flex items-center justify-center text-gray-400 hover:text-green-600">
                                            {selectedItems.length > 0 && selectedItems.length === displayItems.length ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1">Product {sortConfig.key === 'name' && <ArrowUpDown size={12} />}</div>
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => handleSort('location')}>
                                        <div className="flex items-center gap-1">Location {sortConfig.key === 'location' && <ArrowUpDown size={12} />}</div>
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => handleSort('stock')}>
                                        <div className="flex items-center gap-1">Stock {sortConfig.key === 'stock' && <ArrowUpDown size={12} />}</div>
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100" onClick={() => handleSort('margin')}>
                                        <div className="flex items-center gap-1">Margin {sortConfig.key === 'margin' && <ArrowUpDown size={12} />}</div>
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayItems.length > 0 ? (
                                    displayItems.map((item) => (
                                        <tr key={item._id} className={`hover:bg-green-50/30 transition-colors group ${selectedItems.includes(item._id) ? 'bg-green-50/50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleSelectItem(item._id)} className="flex items-center justify-center text-gray-400 hover:text-green-600">
                                                    {selectedItems.includes(item._id) ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-gray-800 text-xs leading-tight">{item.name}</div>
                                                <div className="text-[9px] font-black text-green-700 bg-green-50 px-1 py-0.5 rounded inline-block mt-0.5 uppercase">
                                                    {item.genericName || item.formulaCode || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-gray-700">{item.boxNumber || '-'}</span>
                                                    <span className="text-[10px] text-gray-400">{item.category}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${item.stock <= 0
                                                        ? 'bg-red-600 text-white'
                                                        : (item.stock / (item.packSize || 1)) <= (item.minStock || 10)
                                                            ? 'bg-orange-100 text-orange-800'
                                                            : 'bg-green-100 text-green-800'
                                                        }`}>
                                                        {item.stock <= 0 ? 'OUT' : `${(item.stock / (item.packSize || 1)).toFixed(1)} PKs`}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-bold mt-0.5">
                                                        Val: {(((item.stock || 0) / (item.packSize || 1)) * (item.costPrice || 0)).toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase">Sale:</span>
                                                        <span className="text-[11px] font-black text-green-700">{item.price}/-</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase">MRP:</span>
                                                        <span className="text-[10px] font-bold text-orange-600">{item.mrp || 0}/-</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col items-start">
                                                    <span className={`text-[11px] font-black ${((item.price - item.costPrice) / item.price * 100) < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {((item.price - item.costPrice) / item.price * 100).toFixed(1)}%
                                                    </span>
                                                    {item.discountPercentage > 0 && (
                                                        <span className="text-[9px] text-orange-500 font-bold">-{item.discountPercentage}% Disc</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border uppercase ${item.status === 'Inactive'
                                                    ? 'bg-gray-100 text-gray-500 border-gray-200'
                                                    : 'bg-green-50 text-green-600 border-green-200'
                                                    }`}>
                                                    {item.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                                                    <Filter size={32} />
                                                </div>
                                                <p className="font-medium">No items found</p>
                                                <p className="text-sm">Try adjusting your filters</p>
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
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-medium text-gray-700">{(item.stock / (item.packSize || 1)).toFixed(1)} Packs</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-800">
                                                        {new Date(item.expiryDate).toLocaleDateString()}
                                                    </div>
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
                                                <p className="text-sm">All stock is fresh and within expiry limits.</p>
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
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Velocity</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reorder Info</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Forecast</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayItems.length > 0 ? (
                                    displayItems.map((item) => {
                                        const suggestion = item.reorderSuggestion || {};
                                        const urgency = suggestion.urgency || 'Warning';
                                        const urgencyColor = urgency === 'Critical' ? 'red' : 'orange';

                                        return (
                                            <tr
                                                key={item._id}
                                                className={`hover:bg-${urgencyColor}-50/30 transition-colors border-l-4 ${urgency === 'Critical' ? 'border-red-500' : 'border-orange-400'
                                                    }`}
                                            >
                                                {/* Product Info */}
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800">{item.name}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{item.category}</div>
                                                </td>

                                                {/* Stock Status */}
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className={`font-bold text-lg ${item.stock <= 0 ? 'text-red-600' :
                                                            (item.stock / (item.packSize || 1)) <= (item.minStock || 10) ? 'text-red-500' :
                                                                'text-orange-600'
                                                            }`}>
                                                            {(item.stock / (item.packSize || 1)).toFixed(1)} {item.unit || 'Packs'}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                                            <span>Min: {item.minStock || 10}</span>
                                                            <span>•</span>
                                                            <span>Reorder: {item.reorderLevel || 20}</span>
                                                        </div>
                                                        {suggestion.estimatedDaysRemaining && (
                                                            <div className={`text-xs font-medium ${suggestion.estimatedDaysRemaining <= 3 ? 'text-red-600' :
                                                                suggestion.estimatedDaysRemaining <= 7 ? 'text-orange-600' :
                                                                    'text-gray-600'
                                                                }`}>
                                                                ⏱ {suggestion.estimatedDaysRemaining} days remaining
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Sales Velocity */}
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${item.salesVelocity === 'Fast' ? 'bg-green-100 text-green-700' :
                                                            item.salesVelocity === 'Slow' ? 'bg-gray-100 text-gray-600' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {item.salesVelocity || 'Normal'}
                                                        </span>
                                                        {item.averageDailySales > 0 && (
                                                            <div className="text-xs text-gray-600 mt-1">
                                                                {item.averageDailySales.toFixed(1)} units/day
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Reorder Info */}
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className={`text-sm font-bold ${urgency === 'Critical' ? 'text-red-600' : 'text-orange-600'
                                                            }`}>
                                                            Order: {suggestion.suggestedQuantity || 0} units
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            Price: {item.lastPurchasePrice ? `${item.lastPurchasePrice}/-` : 'N/A'}
                                                        </div>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${urgency === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                            }`}>
                                                            <AlertTriangle size={12} />
                                                            {urgency}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Supplier Info */}
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        {item.preferredSupplierId || item.supplier ? (
                                                            <>
                                                                <div className="font-medium text-sm text-gray-800">
                                                                    {item.preferredSupplierId?.name || item.supplier || 'N/A'}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    Lead: {item.leadTimeDays || 7} days
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">No supplier assigned</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Forecast */}
                                                <td className="px-6 py-4">
                                                    {item.forecasts && (
                                                        <div className="space-y-1 text-xs">
                                                            <div className={`${item.forecasts.days7?.willStockOut ? 'text-red-600 font-bold' : 'text-gray-600'
                                                                }`}>
                                                                7d: {item.forecasts.days7?.forecastedStock || 0} units
                                                            </div>
                                                            <div className={`${item.forecasts.days15?.willStockOut ? 'text-red-600 font-bold' : 'text-gray-600'
                                                                }`}>
                                                                15d: {item.forecasts.days15?.forecastedStock || 0} units
                                                            </div>
                                                            <div className={`${item.forecasts.days30?.willStockOut ? 'text-red-600 font-bold' : 'text-gray-600'
                                                                }`}>
                                                                30d: {item.forecasts.days30?.forecastedStock || 0} units
                                                            </div>
                                                            {(item.forecasts.days7?.willStockOut || item.forecasts.days15?.willStockOut) && (
                                                                <div className="text-red-600 font-bold mt-1">⚠ Stock-out risk</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                                                    <AlertTriangle size={32} />
                                                </div>
                                                <p className="font-medium">All stock levels are healthy. No low-stock items at the moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div >

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
        </div >
    );
};

export default Inventory;
