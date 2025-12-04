import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import WaitlistCard from '../components/waitlist/WaitlistCard';
import { waitlist as initialWaitlist } from '../data/mockData';

const Waitlist = () => {
    const [patients, setPatients] = useState(initialWaitlist);
    const [searchQuery, setSearchQuery] = useState('');

    const handleCall = (id) => {
        console.log('Calling patient', id);
        // Logic to update status or remove
    };

    const handleCancel = (id) => {
        setPatients(prev => prev.filter(p => p.id !== id));
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.queueNumber.toString().includes(searchQuery)
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-gray-800">Current Waiting Patients</h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search patient or queue number"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
                        <Plus size={18} />
                        <span>Add to Waitlist</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPatients.map(patient => (
                    <WaitlistCard
                        key={patient.id}
                        patient={patient}
                        onCall={handleCall}
                        onCancel={handleCancel}
                    />
                ))}
                {filteredPatients.length === 0 && (
                    <div className="col-span-full text-center text-gray-400 py-12">
                        No patients in waitlist
                    </div>
                )}
            </div>
        </div>
    );
};

export default Waitlist;
