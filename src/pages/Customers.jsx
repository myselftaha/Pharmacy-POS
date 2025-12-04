import React, { useState, useEffect } from 'react';
import { Search, Plus, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import AddCustomerModal from '../components/customers/AddCustomerModal';
import ViewCustomerModal from '../components/customers/ViewCustomerModal';
import EditCustomerModal from '../components/customers/EditCustomerModal';

const Customers = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [customers, setCustomers] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/customers');
            const data = await response.json();
            setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const handleAddCustomer = () => {
        setIsAddModalOpen(true);
    };

    const handleSaveCustomer = async (customerData) => {
        try {
            console.log('Saving customer:', customerData);
            const response = await fetch('http://localhost:5000/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (response.ok) {
                console.log('Customer saved successfully!');
                await fetchCustomers(); // Refresh list
                setIsAddModalOpen(false);
            } else {
                const errorText = await response.text();
                console.error('Failed to save customer. Status:', response.status, 'Error:', errorText);
                alert('Failed to save customer: ' + errorText);
            }
        } catch (error) {
            console.error('Error adding customer:', error);
            alert('Error adding customer: ' + error.message);
        }
    };

    const handleViewCustomer = (customer) => {
        setSelectedCustomer(customer);
        setIsViewModalOpen(true);
    };

    const handleEditCustomer = (customer) => {
        setSelectedCustomer(customer);
        setIsEditModalOpen(true);
    };

    const handleUpdateCustomer = async (customerId, customerData) => {
        try {
            const response = await fetch(`http://localhost:5000/api/customers/${customerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });

            if (response.ok) {
                await fetchCustomers(); // Refresh list
                setIsEditModalOpen(false);
                setSelectedCustomer(null);
            } else {
                const errorText = await response.text();
                alert('Failed to update customer: ' + errorText);
            }
        } catch (error) {
            console.error('Error updating customer:', error);
            alert('Error updating customer: ' + error.message);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Customer Management</h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search customers"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                    </div>
                    <button
                        onClick={handleAddCustomer}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                    >
                        <Plus size={18} />
                        <span>Add Customer</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-sm mb-2">Total Customers</div>
                    <div className="text-3xl font-bold text-gray-800">{customers.length}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-sm mb-2">Active Customers</div>
                    <div className="text-3xl font-bold text-green-600">
                        {customers.filter(c => c.status === 'Active').length}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-sm mb-2">VIP Customers</div>
                    <div className="text-3xl font-bold text-purple-600">
                        {customers.filter(c => c.status === 'VIP').length}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-sm mb-2">Total Revenue</div>
                    <div className="text-3xl font-bold text-gray-800">
                        ${customers.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Customer</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Contact</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Address</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Join Date</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Purchases</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Total Spent</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map((customer, index) => (
                            <tr key={customer._id || customer.id} className={index !== filteredCustomers.length - 1 ? 'border-b border-gray-100' : ''}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                                            {customer.name.charAt(0)}
                                        </div>
                                        <div className="font-medium text-gray-800">{customer.name}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Mail size={14} />
                                            <span>{customer.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Phone size={14} />
                                            <span>{customer.phone}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <MapPin size={14} />
                                        <span>{customer.address}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar size={14} />
                                        <span>{customer.joinDate}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-gray-800 font-medium">{customer.totalPurchases}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-gray-800 font-bold">${customer.totalSpent.toFixed(2)}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${customer.status === 'VIP'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-green-100 text-green-700'
                                        }`}>
                                        {customer.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewCustomer(customer)}
                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleEditCustomer(customer)}
                                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-sm text-gray-500">
                Showing {filteredCustomers.length} of {customers.length} customers
            </div>

            <AddCustomerModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveCustomer}
            />

            <ViewCustomerModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                customer={selectedCustomer}
            />

            <EditCustomerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                customer={selectedCustomer}
                onSave={handleUpdateCustomer}
            />
        </div>
    );
};

export default Customers;
