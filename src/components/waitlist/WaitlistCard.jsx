import React from 'react';

const WaitlistCard = ({ patient, onCall, onCancel }) => {
    return (
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 w-full max-w-sm relative">
            <span className="absolute top-4 right-4 text-blue-300 font-bold">#{patient.queueNumber}</span>

            <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-800 mb-1">{patient.queueNumber}</h1>
                <h3 className="font-bold text-gray-800 text-lg">{patient.name}</h3>
            </div>

            <div className="space-y-1 mb-4">
                <p className="text-sm text-gray-500 italic">{patient.itemsCount} items in prescription</p>
                <p className="text-xs text-gray-400">Notes: {patient.notes}</p>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                <span className="bg-gray-200 px-2 py-1 rounded text-gray-600 font-medium">Status: {patient.status}</span>
                <span>Added: {patient.addedTime}</span>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => onCall(patient.id)}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold hover:bg-green-600 transition-colors"
                >
                    Call Next
                </button>
                <button
                    onClick={() => onCancel(patient.id)}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default WaitlistCard;
