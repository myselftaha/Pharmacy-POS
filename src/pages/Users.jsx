import React, { useState } from 'react';
import { Search } from 'lucide-react';
import UserTable from '../components/users/UserTable';
import { users as initialUsers } from '../data/mockData';

const Users = () => {
    const [users] = useState(initialUsers);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">All Users</h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search users"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                    </div>
                    <button className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
                        Add New User
                    </button>
                </div>
            </div>

            <UserTable users={filteredUsers} />

            <div className="mt-4 text-sm text-gray-500">
                Showing {filteredUsers.length} of {users.length} results
            </div>
        </div>
    );
};

export default Users;
