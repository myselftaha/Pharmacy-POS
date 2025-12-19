import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { ArrowLeft } from 'lucide-react';

const StaffPaySalary = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [staff, setStaff] = useState(null);
    const [attendance, setAttendance] = useState({
        paidDays: '',
        unpaidDays: '',
        halfDays: '',
        paidLeave: '',
        unpaidLeave: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/staff/${id}`);
                const data = await res.json();
                setStaff(data.staff || data);
            } catch (err) {
                console.error('Failed to load staff for salary', err);
                enqueueSnackbar('Failed to load staff details', { variant: 'error' });
            }
        };
        load();
    }, [id, enqueueSnackbar]);

    if (!staff) {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/staff')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Pay Salary</h2>
                        <p className="text-sm text-gray-500">Loading staff details...</p>
                    </div>
                </div>
            </div>
        );
    }

    const daysInCycle = staff.salaryCycle === 'Weekly' ? 7 : 30;
    const perDay = (staff.baseSalary || 0) / daysInCycle;
    const unpaidTotal = Number(attendance.unpaidDays || 0) + Number(attendance.unpaidLeave || 0);
    const unpaidDeduction = perDay * unpaidTotal;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const cleanAttendance = {};
            Object.keys(attendance).forEach(key => {
                cleanAttendance[key] = Number(attendance[key] || 0);
            });
            const payload = {
                periodStart: startOfMonth.toISOString(),
                periodEnd: today.toISOString(),
                ...cleanAttendance
            };
            const res = await fetch(`http://localhost:5000/api/staff/${id}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                enqueueSnackbar('Salary paid successfully', { variant: 'success' });
                navigate('/staff');
            } else {
                const data = await res.json();
                enqueueSnackbar(data.message || 'Failed to pay salary', { variant: 'error' });
            }
        } catch (err) {
            console.error('Failed to pay salary', err);
            enqueueSnackbar('Failed to confirm salary payment', { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 max-w-3xl">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/staff')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    title="Go Back"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Pay Salary</h2>
                    <p className="text-sm text-gray-500">
                        {staff.name} &mdash; {staff.role} ({staff.salaryType} / {staff.salaryCycle})
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="bg-white border border-gray-200 rounded-xl p-4 space-y-4"
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {['paidDays', 'unpaidDays', 'halfDays', 'paidLeave', 'unpaidLeave'].map(
                        (field) => (
                            <div key={field}>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-1 capitalize">
                                    {field.replace(/([A-Z])/g, ' $1')}
                                </label>
                                <input
                                    type="number"
                                    value={attendance[field]}
                                    onChange={(e) =>
                                        setAttendance((prev) => ({
                                            ...prev,
                                            [field]: e.target.value
                                        }))
                                    }
                                    min={0}
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                            </div>
                        )
                    )}
                </div>

                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 text-xs space-y-1">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Salary breakdown</p>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Base salary</span>
                        <span className="font-semibold text-gray-800">
                            Rs. {(staff.baseSalary || 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">
                            Unpaid deduction ({unpaidTotal} day(s) @ Rs. {perDay.toFixed(0)})
                        </span>
                        <span className="font-semibold text-red-600">
                            - Rs. {unpaidDeduction.toFixed(0)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Advances</span>
                        <span className="font-semibold text-red-600">
                            Auto-deducted from unsettled advances
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Commission / incentives</span>
                        <span className="font-semibold text-gray-800">
                            Calculated from sales and bonus settings
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                        Exact final payable amount (including commission, incentives and advance
                        deductions) will be calculated by the server when you confirm payment.
                    </p>
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
                        disabled={submitting}
                        className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 disabled:opacity-60"
                    >
                        {submitting ? 'Paying...' : 'Confirm & Pay Salary'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default StaffPaySalary;


