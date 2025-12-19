import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { useSnackbar } from 'notistack';
import StaffList from '../components/staff/StaffList';
import StaffEdit from './StaffEdit';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';

const Staff = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [staff, setStaff] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('All');
    const navigate = useNavigate();

    // Controls for Add/Edit View
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);

    // Controls for Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState(null);

    const loadStaff = async () => {
        try {
            setLoading(true);
            const res = await fetch('http://localhost:5000/api/staff');
            const data = await res.json();
            setStaff(data);
        } catch (err) {
            console.error('Failed to load staff', err);
            enqueueSnackbar('Failed to load staff members', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStaff();
    }, []);

    const filteredStaff = staff.filter((s) => {
        const q = search.toLowerCase();
        const matchesSearch =
            s.name?.toLowerCase().includes(q) ||
            s.role?.toLowerCase().includes(q) ||
            s.phone?.toLowerCase().includes(q);

        if (filter === 'All') return matchesSearch;
        return matchesSearch && s.status === filter;
    });

    const handleAdd = () => {
        setEditingStaff(null);
        setIsEditOpen(true);
    };

    const handleViewEdit = (row) => {
        setEditingStaff(row);
        setIsEditOpen(true);
    };

    const handleSave = async () => {
        await loadStaff();
        setIsEditOpen(false);
        enqueueSnackbar('Staff details saved successfully', { variant: 'success' });
    };

    const handleToggleStatus = async (row) => {
        const nextStatus = row.status === 'Active' ? 'Deactivated' : 'Active';
        try {
            await fetch(`http://localhost:5000/api/staff/${row._id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            enqueueSnackbar(`Staff ${nextStatus === 'Active' ? 'activated' : 'deactivated'} successfully`, { variant: 'success' });
            await loadStaff();
        } catch (err) {
            console.error('Failed to update status', err);
            enqueueSnackbar('Failed to update staff status', { variant: 'error' });
        }
    };

    const handleAddAdvance = async (payload) => {
        if (!editingStaff?._id) return;
        try {
            await fetch(`http://localhost:5000/api/staff/${editingStaff._id}/advances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            enqueueSnackbar('Salary advance added successfully', { variant: 'success' });
            await loadStaff();
        } catch (err) {
            console.error('Failed to add advance', err);
            enqueueSnackbar('Failed to add salary advance', { variant: 'error' });
        }
    };

    const handleDeleteStaff = (row) => {
        setStaffToDelete(row);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!staffToDelete) return;
        try {
            const res = await fetch(`http://localhost:5000/api/staff/${staffToDelete._id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                enqueueSnackbar('Staff member and all history deleted successfully', { variant: 'success' });
                await loadStaff();
                setIsDeleteModalOpen(false);
                setStaffToDelete(null);
            } else {
                const data = await res.json();
                enqueueSnackbar(data.message || 'Failed to delete staff', { variant: 'error' });
            }
        } catch (err) {
            console.error('Failed to delete staff', err);
            enqueueSnackbar('Failed to delete staff member', { variant: 'error' });
        }
    };

    if (isEditOpen) {
        return (
            <StaffEdit
                staff={editingStaff}
                onBack={() => setIsEditOpen(false)}
                onSave={handleSave}
                onAddAdvance={handleAddAdvance}
            />
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Staff Management</h2>
                    <p className="text-sm text-gray-500">
                        Manage staff, salary, advances and permissions
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search staff"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Staff
                    </button>
                </div>
            </div>

            <div>
                <StaffList
                    staff={filteredStaff}
                    onViewEdit={handleViewEdit}
                    onPaySalary={(row) => navigate(`/staff/${row._id}/pay-salary`)}
                    onAddAdvance={(row) => navigate(`/staff/${row._id}/add-advance`)}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDeleteStaff}
                />
                <div className="mt-3 text-xs text-gray-500">
                    {loading ? 'Loading staff...' : `Showing ${filteredStaff.length} of ${staff.length} staff members`}
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                itemName={staffToDelete?.name}
                title="Delete Staff Member?"
                message="This will permanently remove the staff member and all their salary history, advances, and permissions. This action cannot be undone."
            />
        </div>
    );
};

export default Staff;


