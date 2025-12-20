import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { Search, Plus, Filter, Package, Users, Phone, Edit2, Trash2, Truck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import SupplyTable from '../components/supplies/SupplyTable';
import AddMedicineModal from '../components/supplies/AddMedicineModal';
import EditSupplyModal from '../components/supplies/EditSupplyModal';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
import AddSupplierModal from '../components/suppliers/AddSupplierModal';
import API_URL from '../config/api';

const Supplies = () => {
    const { showToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    // Tab state
    const [activeTab, setActiveTab] = useState('supplies'); // 'supplies' or 'suppliers'

    // Supplies state
    const [supplies, setSupplies] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedSupply, setSelectedSupply] = useState(null);
    const [supplyToDelete, setSupplyToDelete] = useState(null);
    const [preSelectedSupplier, setPreSelectedSupplier] = useState(null);

    // Suppliers state
    const [suppliers, setSuppliers] = useState([]);
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
    const [isEditSupplierModalOpen, setIsEditSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [supplierToDelete, setSupplierToDelete] = useState(null);
    const [isDeleteSupplierModalOpen, setIsDeleteSupplierModalOpen] = useState(false);

    // Initial load
    useEffect(() => {
        fetchSupplies();
        fetchSuppliers();

        // Handle navigation from Dashboard (Payables card)
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
            window.history.replaceState({}, document.title);
        }

        // Handle pre-selected supplier from SupplierDetails
        if (location.state?.supplierId) {
            setPreSelectedSupplier({
                id: location.state.supplierId,
                name: location.state.supplierName
            });
            setActiveTab('supplies');
            setIsAddModalOpen(true);
            window.history.replaceState({}, document.title);
        }

        if (location.state?.openAddSupply) {
            setIsAddModalOpen(true);
            window.history.replaceState({}, document.title);
        }

        if (location.state?.openAddSupplier) {
            setActiveTab('suppliers');
            setIsAddSupplierModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // =======================
    // SUPPLIES FUNCTIONS
    // =======================
    const fetchSupplies = async () => {
        try {
            const response = await fetch(`${API_URL}/api/supplies`);
            if (response.ok) {
                const data = await response.json();
                setSupplies(data);
            } else {
                showToast('Failed to fetch supplies', 'error');
            }
        } catch (error) {
            console.error('Error fetching supplies:', error);
            showToast('Error fetching supplies', 'error');
        }
    };

    const handleSaveSupply = async (supplyData) => {
        try {
            const response = await fetch(`${API_URL}/api/supplies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supplyData)
            });

            if (response.ok) {
                await fetchSupplies();
                await fetchSuppliers(); // Refresh suppliers too
                setIsAddModalOpen(false);
                setPreSelectedSupplier(null);
                showToast('Supply added successfully!', 'success');
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to add supply', 'error');
            }
        } catch (error) {
            console.error('Error saving supply:', error);
            showToast('Error saving supply', 'error');
        }
    };

    const handleEditSupply = (supply) => {
        setSelectedSupply(supply);
        setIsEditModalOpen(true);
    };

    const handleUpdateSupply = async (updatedData) => {
        try {
            const response = await fetch(`${API_URL}/api/supplies/${selectedSupply._id || selectedSupply.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                await fetchSupplies();
                setIsEditModalOpen(false);
                setSelectedSupply(null);
                showToast('Supply updated successfully!', 'success');
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to update supply', 'error');
            }
        } catch (error) {
            console.error('Error updating supply:', error);
            showToast('Error updating supply', 'error');
        }
    };

    const handleDeleteClick = (supply) => {
        setSupplyToDelete(supply);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!supplyToDelete) return;

        try {
            const supplyId = supplyToDelete._id || supplyToDelete.id;
            const response = await fetch(`${API_URL}/api/supplies/${supplyId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchSupplies();
                await fetchSuppliers(); // Refresh suppliers too
                setIsDeleteModalOpen(false);
                setSupplyToDelete(null);
                showToast('Supply deleted successfully!', 'success');
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to delete supply', 'error');
            }
        } catch (error) {
            console.error('Error deleting supply:', error);
            showToast('Error deleting supply', 'error');
        }
    };

    const filteredSupplies = supplies.filter(supply => {
        const query = searchQuery.toLowerCase();
        return (
            supply.name?.toLowerCase().includes(query) ||
            supply.batchNumber?.toLowerCase().includes(query) ||
            supply.supplierName?.toLowerCase().includes(query) ||
            supply.purchaseInvoiceNumber?.toLowerCase().includes(query)
        );
    });

    // =======================
    // SUPPLIERS FUNCTIONS
    // =======================
    const fetchSuppliers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/suppliers`);
            const data = await response.json();
            setSuppliers(data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            showToast('Failed to fetch suppliers', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSupplier = async (formData) => {
        try {
            const response = await fetch(`${API_URL}/api/suppliers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('Supplier added successfully!', 'success');
                setIsAddSupplierModalOpen(false);
                fetchSuppliers();
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to add supplier', 'error');
            }
        } catch (error) {
            console.error('Error adding supplier:', error);
            showToast(error.message || 'Error adding supplier', 'error');
        }
    };

    const handleEditSupplier = async (formData) => {
        try {
            const response = await fetch(`${API_URL}/api/suppliers/${editingSupplier._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('Supplier updated successfully!', 'success');
                setIsEditSupplierModalOpen(false);
                setEditingSupplier(null);
                fetchSuppliers();
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to update supplier', 'error');
            }
        } catch (error) {
            console.error('Error updating supplier:', error);
            showToast('Error updating supplier', 'error');
        }
    };

    const handleDeleteSupplier = (supplier) => {
        setSupplierToDelete(supplier);
        setIsDeleteSupplierModalOpen(true);
    };

    const confirmDeleteSupplier = async () => {
        if (!supplierToDelete) return;

        try {
            const response = await fetch(`${API_URL}/api/suppliers/${supplierToDelete._id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('Supplier deleted successfully!', 'success');
                fetchSuppliers();
                setIsDeleteSupplierModalOpen(false);
                setSupplierToDelete(null);
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to delete supplier', 'error');
            }
        } catch (error) {
            console.error('Error deleting supplier:', error);
            showToast('Error deleting supplier', 'error');
        }
    };

    const openEditSupplierModal = (e, supplier) => {
        e.stopPropagation();
        setEditingSupplier(supplier);
        setIsEditSupplierModalOpen(true);
    };

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredSuppliers = suppliers.filter(supplier => {
        const query = supplierSearchQuery.toLowerCase();
        return (
            supplier.name?.toLowerCase().includes(query) ||
            supplier.contactPerson?.toLowerCase().includes(query) ||
            supplier.phone?.includes(query) ||
            supplier.email?.toLowerCase().includes(query)
        );
    });

    const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
        const { key, direction } = sortConfig;
        let valueA = a[key];
        let valueB = b[key];

        if (typeof valueA === 'string') valueA = valueA.toLowerCase();
        if (typeof valueB === 'string') valueB = valueB.toLowerCase();

        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header with Tabs */}
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Supplies & Suppliers</h2>
                    <p className="text-sm text-gray-500">
                        {activeTab === 'supplies' ? 'Manage medicine supplies and batches.' : 'Manage your distributors and payables'}
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={activeTab === 'supplies' ? "Search supplies..." : "Search suppliers..."}
                            value={activeTab === 'supplies' ? searchQuery : supplierSearchQuery}
                            onChange={(e) => activeTab === 'supplies' ? setSearchQuery(e.target.value) : setSupplierSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                    </div>
                    <button
                        onClick={() => activeTab === 'supplies' ? setIsAddModalOpen(true) : setIsAddSupplierModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                    >
                        <Plus size={18} />
                        <span>{activeTab === 'supplies' ? 'Add Supply' : 'Add Supplier'}</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('supplies')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${activeTab === 'supplies'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Package size={18} />
                    Supplies
                </button>
                <button
                    onClick={() => setActiveTab('suppliers')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${activeTab === 'suppliers'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Users size={18} />
                    Suppliers
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'supplies' ? (
                // SUPPLIES TAB
                <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <SupplyTable
                        supplies={filteredSupplies}
                        onEdit={handleEditSupply}
                        onDelete={(id) => {
                            const supply = supplies.find(s => (s._id === id) || (s.id === id));
                            if (supply) handleDeleteClick(supply);
                        }}
                    />
                </div>
            ) : (
                // SUPPLIERS TAB
                <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th
                                        className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('name')}
                                    >
                                        Supplier Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Details</th>

                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400">Loading suppliers...</td></tr>
                                ) : sortedSuppliers.length > 0 ? (
                                    sortedSuppliers.map((supplier) => (
                                        <tr
                                            key={supplier._id}
                                            className="hover:bg-green-50/30 transition-colors cursor-pointer group"
                                            onClick={() => navigate(`/suppliers/${supplier._id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                        {supplier.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{supplier.name}</div>
                                                        <div className="text-xs text-gray-400 font-normal">{supplier.address}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-700">{supplier.contactPerson || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 text-sm text-gray-500">
                                                    {supplier.phone && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone size={14} /> {supplier.phone}
                                                        </div>
                                                    )}
                                                    {supplier.email && (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="bg-gray-100 px-1 rounded text-gray-600">@</span> {supplier.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => openEditSupplierModal(e, supplier)}
                                                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                                        title="Edit Supplier"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteSupplier(supplier);
                                                        }}
                                                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                        title="Delete Supplier"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                                                    <Truck size={32} />
                                                </div>
                                                <p className="font-medium">No suppliers found</p>
                                                <p className="text-sm">Add a new supplier to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODALS - Supplies */}
            <AddMedicineModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setPreSelectedSupplier(null);
                }}
                onSave={handleSaveSupply}
                suppliers={suppliers}
                initialSupplier={preSelectedSupplier}
            />

            <EditSupplyModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdateSupply}
                supply={selectedSupply}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                itemName={supplyToDelete?.name}
            />

            {/* MODALS - Suppliers */}
            <AddSupplierModal
                isOpen={isAddSupplierModalOpen}
                onClose={() => setIsAddSupplierModalOpen(false)}
                onConfirm={handleAddSupplier}
            />

            <AddSupplierModal
                isOpen={isEditSupplierModalOpen}
                onClose={() => {
                    setIsEditSupplierModalOpen(false);
                    setEditingSupplier(null);
                }}
                onConfirm={handleEditSupplier}
                initialData={editingSupplier}
                isEditMode={true}

            />

            <DeleteConfirmationModal
                isOpen={isDeleteSupplierModalOpen}
                onClose={() => setIsDeleteSupplierModalOpen(false)}
                onConfirm={confirmDeleteSupplier}
                itemName={supplierToDelete?.name}
                title="Delete Supplier?"
                message="Are you sure you want to delete this supplier? This will also remove their transaction history."
            />
        </div>
    );
};

export default Supplies;
