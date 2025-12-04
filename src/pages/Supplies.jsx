import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import MedicineTable from '../components/supplies/MedicineTable';
import CategoryFilter from '../components/pos/CategoryFilter';
import { medicines, categories } from '../data/mockData';

const Supplies = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMedicines = medicines.filter(med => {
        const matchesCategory = activeCategory === 'All' || med.category === activeCategory;
        const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">All Medicines</h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search medicines"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
                        <Plus size={18} />
                        <span>Add New Medicine</span>
                    </button>
                </div>
            </div>

            <CategoryFilter
                categories={categories}
                activeCategory={activeCategory}
                onSelect={setActiveCategory}
            />

            <MedicineTable medicines={filteredMedicines} />
        </div>
    );
};

export default Supplies;
