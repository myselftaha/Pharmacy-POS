import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { useSnackbar } from 'notistack';
import MedicineTable from '../components/supplies/MedicineTable';
import CategoryFilter from '../components/pos/CategoryFilter';
import AddMedicineModal from '../components/supplies/AddMedicineModal';
import EditMedicineModal from '../components/supplies/EditMedicineModal';
import { categories } from '../data/mockData';

const Supplies = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedMedicine, setSelectedMedicine] = useState(null);
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/medicines');
            const data = await response.json();
            setMedicines(data);
        } catch (error) {
            console.error('Error fetching medicines:', error);
            setMedicines([]);
        }
    };

    const handleAddMedicine = async (medicineData) => {
        try {
            const response = await fetch('http://localhost:5000/api/medicines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(medicineData)
            });

            if (response.ok) {
                await fetchMedicines(); // Refresh list
                setIsAddModalOpen(false);
                enqueueSnackbar('Medicine added successfully!', { variant: 'success' });
            } else {
                enqueueSnackbar('Failed to add medicine', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error adding medicine:', error);
            enqueueSnackbar('Error adding medicine', { variant: 'error' });
        }
    };

    const handleEditMedicine = (medicine) => {
        setSelectedMedicine(medicine);
        setIsEditModalOpen(true);
    };

    const handleUpdateMedicine = async (medicineId, medicineData) => {
        try {
            const response = await fetch(`http://localhost:5000/api/medicines/${medicineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(medicineData)
            });

            if (response.ok) {
                await fetchMedicines(); // Refresh list
                setIsEditModalOpen(false);
                setSelectedMedicine(null);
                enqueueSnackbar('Medicine updated successfully!', { variant: 'success' });
            } else {
                enqueueSnackbar('Failed to update medicine', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error updating medicine:', error);
            enqueueSnackbar('Error updating medicine', { variant: 'error' });
        }
    };

    const handleDeleteMedicine = async (medicine) => {
        if (!window.confirm(`Are you sure you want to delete "${medicine.name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/medicines/${medicine._id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchMedicines(); // Refresh list
                enqueueSnackbar('Medicine deleted successfully!', { variant: 'success' });
            } else {
                enqueueSnackbar('Failed to delete medicine', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error deleting medicine:', error);
            enqueueSnackbar('Error deleting medicine', { variant: 'error' });
        }
    };

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
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                    >
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

            <MedicineTable
                medicines={filteredMedicines}
                onEdit={handleEditMedicine}
                onDelete={handleDeleteMedicine}
            />

            <AddMedicineModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddMedicine}
            />

            <EditMedicineModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                medicine={selectedMedicine}
                onSave={handleUpdateMedicine}
            />
        </div>
    );
};

export default Supplies;
