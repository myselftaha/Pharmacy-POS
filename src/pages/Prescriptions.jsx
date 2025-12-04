import React, { useState } from 'react';
import { Search, Plus, FileText, Calendar, User, Pill, Download, Eye } from 'lucide-react';

const Prescriptions = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [prescriptions] = useState([
        {
            id: 1,
            prescriptionNumber: 'RX-2024-001',
            patientName: 'John Doe',
            doctorName: 'Dr. Sarah Johnson',
            date: 'Jun 15, 2024',
            medications: [
                { name: 'Amoxicillin 250mg', dosage: '1 tablet 3x daily', duration: '7 days' },
                { name: 'Ibuprofen 400mg', dosage: '1 tablet as needed', duration: '5 days' }
            ],
            status: 'Filled',
            notes: 'Take with food'
        },
        {
            id: 2,
            prescriptionNumber: 'RX-2024-002',
            patientName: 'Jane Smith',
            doctorName: 'Dr. Michael Brown',
            date: 'Jun 14, 2024',
            medications: [
                { name: 'Cefalaxin 500mg', dosage: '1 capsule 2x daily', duration: '10 days' }
            ],
            status: 'Pending',
            notes: 'Patient allergic to penicillin'
        },
        {
            id: 3,
            prescriptionNumber: 'RX-2024-003',
            patientName: 'Mike Johnson',
            doctorName: 'Dr. Emily Davis',
            date: 'Jun 13, 2024',
            medications: [
                { name: 'Allergy Relief Tabs', dosage: '1 tablet daily', duration: '30 days' },
                { name: 'Vitamin C 1000mg', dosage: '1 tablet daily', duration: '30 days' }
            ],
            status: 'Filled',
            notes: ''
        },
        {
            id: 4,
            prescriptionNumber: 'RX-2024-004',
            patientName: 'Sarah Williams',
            doctorName: 'Dr. James Wilson',
            date: 'Jun 12, 2024',
            medications: [
                { name: 'Cough Suppressant', dosage: '10ml 3x daily', duration: '5 days' }
            ],
            status: 'Cancelled',
            notes: 'Patient requested cancellation'
        }
    ]);

    const filteredPrescriptions = prescriptions.filter(prescription =>
        prescription.prescriptionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prescription.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prescription.doctorName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'Filled': return 'bg-green-100 text-green-700';
            case 'Pending': return 'bg-yellow-100 text-yellow-700';
            case 'Cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const stats = {
        total: prescriptions.length,
        filled: prescriptions.filter(p => p.status === 'Filled').length,
        pending: prescriptions.filter(p => p.status === 'Pending').length,
        cancelled: prescriptions.filter(p => p.status === 'Cancelled').length
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Prescription Management</h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search prescriptions"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
                        <Plus size={18} />
                        <span>New Prescription</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="text-blue-600" size={20} />
                        </div>
                        <div className="text-gray-500 text-sm">Total</div>
                    </div>
                    <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FileText className="text-green-600" size={20} />
                        </div>
                        <div className="text-gray-500 text-sm">Filled</div>
                    </div>
                    <div className="text-3xl font-bold text-green-600">{stats.filled}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <FileText className="text-yellow-600" size={20} />
                        </div>
                        <div className="text-gray-500 text-sm">Pending</div>
                    </div>
                    <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <FileText className="text-red-600" size={20} />
                        </div>
                        <div className="text-gray-500 text-sm">Cancelled</div>
                    </div>
                    <div className="text-3xl font-bold text-red-600">{stats.cancelled}</div>
                </div>
            </div>

            {/* Prescriptions List */}
            <div className="space-y-4">
                {filteredPrescriptions.map(prescription => (
                    <div key={prescription.id} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <FileText className="text-green-600" size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-lg text-gray-800">{prescription.prescriptionNumber}</div>
                                    <div className="flex items-center gap-4 mt-1">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <User size={14} />
                                            <span>{prescription.patientName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Calendar size={14} />
                                            <span>{prescription.date}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}>
                                {prescription.status}
                            </span>
                        </div>

                        <div className="border-t border-gray-100 pt-4 mb-4">
                            <div className="text-sm text-gray-500 mb-2">Prescribed by: <span className="text-gray-800 font-medium">{prescription.doctorName}</span></div>

                            <div className="space-y-2 mt-3">
                                <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Pill size={16} />
                                    Medications:
                                </div>
                                {prescription.medications.map((med, index) => (
                                    <div key={index} className="ml-6 p-3 bg-gray-50 rounded-lg">
                                        <div className="font-medium text-gray-800">{med.name}</div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            Dosage: {med.dosage} • Duration: {med.duration}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {prescription.notes && (
                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="text-sm font-medium text-yellow-800">Notes:</div>
                                    <div className="text-sm text-yellow-700 mt-1">{prescription.notes}</div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors">
                                <Eye size={16} />
                                View Details
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                                <Download size={16} />
                                Download
                            </button>
                            {prescription.status === 'Pending' && (
                                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
                                    Fill Prescription
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredPrescriptions.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                    No prescriptions found
                </div>
            )}

            <div className="mt-4 text-sm text-gray-500">
                Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions
            </div>
        </div>
    );
};

export default Prescriptions;
