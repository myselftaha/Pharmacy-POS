import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { ArrowLeft } from 'lucide-react';
import API_URL from '../config/api';


const StaffAddAdvance = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [staffName, setStaffName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/api/staff/${id}`);
                const data = await res.json();
                setStaffName(data.staff?.name || data.name || '');
            } catch (err) {
                console.error('Failed to load staff', err);
                enqueueSnackbar('Failed to load staff details', { variant: 'error' });
            }
        };
        load();
    }, [id, enqueueSnackbar]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (!value || value <= 0) return;
        try {
            const res = await fetch(`${API_URL}/api/staff/${id}/advances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: value,
                    date,
                    note
                })
            });
            if (res.ok) {
                enqueueSnackbar('Salary advance added successfully', { variant: 'success' });
                navigate('/staff');
            } else {
                const data = await res.json();
                enqueueSnackbar(data.message || 'Failed to add advance', { variant: 'error' });
            }
        } catch (err) {
            console.error('Failed to save advance', err);
            enqueueSnackbar('Failed to add salary advance', { variant: 'error' });
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/staff')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    title="Go Back"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Add Advance</h2>
                    <p className="text-sm text-gray-500">
                        Staff: <span className="font-semibold text-gray-800">{staffName}</span>
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="bg-white border border-gray-200 rounded-xl p-4 max-w-lg space-y-4"
            >
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Advance Amount
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={0}
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Advance Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Note (optional)
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        placeholder="Reason or remarks"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => navigate('/staff')}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 shadow-lg shadow-green-600/20"
                    >
                        Save Advance
                    </button>
                </div>
            </form>
        </div>
    );
};

export default StaffAddAdvance;


