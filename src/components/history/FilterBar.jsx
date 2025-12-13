import React from 'react';
import { Calendar, Filter, X, Search } from 'lucide-react';

const FilterBar = ({ filters, onFilterChange, onReset, showFilters, setShowFilters }) => {

    const handleChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value });
    };

    return (
        <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center text-gray-500">
                    <Filter size={18} />
                    <span className="font-medium text-sm">Filters</span>
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-sm text-green-600 font-medium hover:underline"
                >
                    {showFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
                </button>
            </div>

            {showFilters && (
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                    {/* Payment Method */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
                        <select
                            value={filters.paymentMethod}
                            onChange={(e) => handleChange('paymentMethod', e.target.value)}
                            className="w-full text-sm border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
                        >
                            <option value="All">All Methods</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="Credit">Credit / On Account</option>
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                            className="w-full text-sm border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Posted">Posted</option>
                            <option value="Voided">Voided</option>
                        </select>
                    </div>

                    {/* Transaction Type */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                        <select
                            value={filters.type}
                            onChange={(e) => handleChange('type', e.target.value)}
                            className="w-full text-sm border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
                        >
                            <option value="All">All Types</option>
                            <option value="Sale">Sale</option>
                            <option value="Return">Return</option>
                        </select>
                    </div>

                    {/* Cashier / User (Mock data for now, should ideally be dynamic) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cashier</label>
                        <select
                            value={filters.cashier}
                            onChange={(e) => handleChange('cashier', e.target.value)}
                            className="w-full text-sm border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
                        >
                            <option value="All">All Users</option>
                            <option value="Admin">Admin</option>
                            {/* Add other users dynamically if available */}
                        </select>
                    </div>

                    {/* Amount Range */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Amount Range (Rs)</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                placeholder="Min"
                                className="w-full text-sm border-gray-200 rounded-lg"
                                value={filters.minAmount}
                                onChange={(e) => handleChange('minAmount', e.target.value)}
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                className="w-full text-sm border-gray-200 rounded-lg"
                                value={filters.maxAmount}
                                onChange={(e) => handleChange('maxAmount', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Reset Button */}
                    <div className="md:col-span-4 flex justify-end">
                        <button
                            onClick={onReset}
                            className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                            <X size={14} /> Reset Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterBar;
