import React, { useState, useEffect } from 'react';
import { Search, Loader2, UserPlus } from 'lucide-react';
import UserTable from '../components/users/UserTable';
import AddUserModal from '../components/users/AddUserModal';
import EditUserModal from '../components/users/EditUserModal';
import ResetPasswordModal from '../components/users/ResetPasswordModal';
import { useSnackbar } from 'notistack';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const { enqueueSnackbar } = useSnackbar();

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            enqueueSnackbar('Failed to load users list', { variant: 'error' });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = async (userData) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            });
            const data = await response.json();

            if (response.ok) {
                enqueueSnackbar('User created successfully', { variant: 'success' });
                setIsAddModalOpen(false);
                fetchUsers();
            } else {
                enqueueSnackbar(data.message || 'Error creating user', { variant: 'error' });
            }
        } catch (err) {
            enqueueSnackbar('Network error: Could not connect to server', { variant: 'error' });
        }
    };

    const handleEditUser = async (id, updateData) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();
            if (response.ok) {
                enqueueSnackbar('User updated successfully', { variant: 'success' });
                setIsEditModalOpen(false);
                fetchUsers();
            } else {
                enqueueSnackbar(data.message || 'Error updating user', { variant: 'error' });
            }
        } catch (err) {
            enqueueSnackbar('Error updating user', { variant: 'error' });
        }
    };

    const handleResetPassword = async (newPassword) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/users/${selectedUser._id}/reset-password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });
            if (response.ok) {
                enqueueSnackbar('Password reset successfully', { variant: 'success' });
                setIsResetModalOpen(false);
            } else {
                const data = await response.json();
                enqueueSnackbar(data.message || 'Error resetting password', { variant: 'error' });
            }
        } catch (err) {
            enqueueSnackbar('Error resetting password', { variant: 'error' });
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            const token = localStorage.getItem('token');
            const newStatus = user.status === 'Active' ? 'Deactivated' : 'Active';
            const response = await fetch(`http://localhost:5000/api/users/${user._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                enqueueSnackbar(`User ${newStatus.toLowerCase()} successfully`, { variant: 'info' });
                fetchUsers();
            } else {
                const data = await response.json();
                enqueueSnackbar(data.message || 'Action restricted', { variant: 'warning' });
            }
        } catch (err) {
            enqueueSnackbar('Action failed', { variant: 'error' });
        }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Users Management</h2>
                    <p className="text-sm text-gray-500">Security-first access control for staff</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by username or role"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                        />
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2 active:scale-95"
                    >
                        <UserPlus size={20} />
                        <span>Add New User</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <Loader2 className="animate-spin text-green-600 mb-3" size={40} />
                    <p className="text-gray-500 font-medium">Fetching secure user list...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <UserTable
                        users={filteredUsers}
                        onRefresh={fetchUsers}
                        onEdit={(user) => { setSelectedUser(user); setIsEditModalOpen(true); }}
                        onResetPassword={(user) => { setSelectedUser(user); setIsResetModalOpen(true); }}
                        onToggleStatus={handleToggleStatus}
                    />
                    <div className="flex justify-between items-center px-2">
                        <p className="text-sm text-gray-500 font-medium">
                            Showing <span className="text-gray-900">{filteredUsers.length}</span> of <span className="text-gray-900">{users.length}</span> results
                        </p>
                        <button
                            onClick={fetchUsers}
                            className="text-xs font-bold text-green-600 hover:text-green-700 uppercase tracking-wider"
                        >
                            Refresh List
                        </button>
                    </div>
                </div>
            )}

            <AddUserModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={handleAddUser} />
            <EditUserModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleEditUser} user={selectedUser} />
            <ResetPasswordModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} onReset={handleResetPassword} username={selectedUser?.username} />
        </div>
    );
};

export default Users;
