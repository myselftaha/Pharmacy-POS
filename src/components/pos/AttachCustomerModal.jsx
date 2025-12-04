import React, { useState, useEffect } from 'react';
import { X, Search, User, Mail, Phone } from 'lucide-react';

const AttachCustomerModal = ({ isOpen, onClose, onSelectCustomer }) => {
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
        }
    }, [isOpen]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/customers');
            const data = await response.json();
            setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
    );

    const handleSelectCustomer = (customer) => {
        onSelectCustomer(customer);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Select Customer</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search customers by name, email, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading customers...</div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchQuery ? 'No customers found matching your search' : 'No customers available'}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredCustomers.map((customer) => (
                                <div
                                    key={customer._id || customer.id}
                                    onClick={() => handleSelectCustomer(customer)}
                                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all"
                                >
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold flex-shrink-0">
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800">{customer.name}</h4>
                                        <div className="flex flex-col gap-1 mt-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Mail size={14} />
                                                <span>{customer.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone size={14} />
                                                <span>{customer.phone}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors">
                                        Select
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                    <div className="text-sm text-gray-500">
                        Showing {filteredCustomers.length} of {customers.length} customers
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttachCustomerModal;
