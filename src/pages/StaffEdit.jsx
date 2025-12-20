import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { ArrowLeft } from 'lucide-react';
import API_URL from '../config/api';


const roles = [
    'Pharmacist',
    'Assistant Pharmacist',
    'Salesman',
    'Cashier',
    'Store Keeper',
    'Delivery Rider',
    'Admin'
];

const salaryTypes = ['Monthly', 'Daily', 'Commission', 'Hybrid'];
const salaryCycles = ['Monthly', 'Weekly'];
const paymentMethods = ['Cash', 'Bank', 'EasyPaisa', 'JazzCash'];

const StaffEdit = ({ staff: staffProp, onBack, onSave: onSaveProp, onAddAdvance: onAddAdvanceProp }) => {
    const { id: paramId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Support both prop-based (component) and param-based (page) access
    const effectiveId = staffProp?._id || paramId;
    const isNew = effectiveId === 'new' || !effectiveId;

    const [activeTab, setActiveTab] = useState('basic');
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        phone: '',
        cnic: '',
        role: 'Salesman',
        status: 'Active',
        joiningDate: new Date().toISOString().slice(0, 10),
        salaryType: 'Monthly',
        baseSalary: '',
        salaryCycle: 'Monthly',
        paymentMethod: 'Cash',
        salesCommissionPercent: '',
        monthlyBonus: ''
    });

    const [advances, setAdvances] = useState([]);
    const [payments, setPayments] = useState([]);
    const [permissions, setPermissions] = useState({});

    // Helper to populate form from a staff object
    const populateForm = (s) => {
        setForm({
            name: s.name || '',
            phone: s.phone || '',
            cnic: s.cnic || '',
            role: s.role || 'Salesman',
            status: s.status || 'Active',
            joiningDate: s.joiningDate
                ? s.joiningDate.slice(0, 10)
                : new Date().toISOString().slice(0, 10),
            salaryType: s.salaryType || 'Monthly',
            baseSalary: s.baseSalary ?? '',
            salaryCycle: s.salaryCycle || 'Monthly',
            paymentMethod: s.paymentMethod || 'Cash',
            salesCommissionPercent: s.salesCommissionPercent ?? '',
            monthlyBonus: s.monthlyBonus ?? ''
        });
    };

    useEffect(() => {
        // If staffProp is provided, use it for base data immediately
        if (staffProp) {
            populateForm(staffProp);
        }

        const loadExtraData = async () => {
            if (isNew) return;
            try {
                setLoading(true);
                // Even if we have staffProp, we might want to refresh from API 
                // to get the latest permissions/history/advances
                const res = await fetch(`${API_URL}/api/staff/${effectiveId}`);
                const data = await res.json();
                const s = data.staff || data;

                if (!staffProp) {
                    populateForm(s);
                }

                setPermissions(data.permissions || {});

                const [advRes, payRes] = await Promise.all([
                    fetch(`${API_URL}/api/staff/${effectiveId}/advances`),
                    fetch(`${API_URL}/api/staff/${effectiveId}/payments`)
                ]);
                setAdvances(await advRes.json());
                setPayments(await payRes.json());
            } catch (err) {
                console.error('Failed to load staff profile', err);
                showToast('Failed to load staff details', 'error');
            } finally {
                setLoading(false);
            }
        };

        loadExtraData();
    }, [effectiveId, isNew, staffProp]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleanNumber = (val) => {
            if (val === '' || val === null || val === undefined) return 0;
            const n = parseFloat(val);
            return Number.isNaN(n) ? 0 : n;
        };

        const payload = {
            ...form,
            baseSalary: cleanNumber(form.baseSalary),
            salesCommissionPercent: cleanNumber(form.salesCommissionPercent),
            monthlyBonus: cleanNumber(form.monthlyBonus)
        };

        try {
            if (isNew) {
                const res = await fetch(`${API_URL}/api/staff`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast('New staff member added successfully', 'success');
                    if (onSaveProp) onSaveProp();
                    else navigate('/staff');
                } else {
                    const data = await res.json();
                    showToast(data.message || 'Failed to add staff', 'error');
                }
            } else {
                const [res, permRes] = await Promise.all([
                    fetch(`${API_URL}/api/staff/${effectiveId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }),
                    fetch(`${API_URL}/api/staff/${effectiveId}/permissions`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(permissions)
                    })
                ]);
                if (res.ok && permRes.ok) {
                    showToast('Staff profile and permissions updated successfully', 'success');
                    if (onSaveProp) onSaveProp();
                    else navigate('/staff');
                } else {
                    showToast('Failed to update staff profile or permissions', 'error');
                }
            }
        } catch (err) {
            console.error('Failed to save staff', err);
            showToast('An error occurred while saving staff details', 'error');
        }
    };

    const handleBack = () => {
        if (onBack) onBack();
        else navigate('/staff');
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                        title="Go Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {isNew ? 'Add Staff' : 'Staff Profile'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            Basic information, salary setup, advances and permissions
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-b border-gray-200 flex gap-4 text-sm">
                {['basic', 'salary', 'advances', 'history', 'permissions'].map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        className={`pb-2 border-b-2 capitalize ${activeTab === tab
                            ? 'border-green-500 text-green-600 font-semibold'
                            : 'border-transparent text-gray-500'
                            }`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'salary'
                            ? 'Salary Setup'
                            : tab === 'history'
                                ? 'Salary History'
                                : tab === 'permissions'
                                    ? 'Permissions'
                                    : tab}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Info */}
                {activeTab === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-gray-200 rounded-xl p-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                                CNIC (optional)
                            </label>
                            <input
                                type="text"
                                value={form.cnic}
                                onChange={(e) => handleChange('cnic', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                                Role
                            </label>
                            <select
                                value={form.role}
                                onChange={(e) => handleChange('role', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            >
                                {roles.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                                Status
                            </label>
                            <select
                                value={form.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            >
                                <option value="Active">Active</option>
                                <option value="Deactivated">Deactivated</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                                Joining Date
                            </label>
                            <input
                                type="date"
                                value={form.joiningDate}
                                onChange={(e) => handleChange('joiningDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            />
                        </div>
                    </div>
                )}

                {/* Salary Setup */}
                {activeTab === 'salary' && (
                    <div className="space-y-4 bg-white border border-gray-200 rounded-xl p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    Salary Type
                                </label>
                                <select
                                    value={form.salaryType}
                                    onChange={(e) => handleChange('salaryType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                >
                                    {salaryTypes.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    Base Salary
                                </label>
                                <input
                                    type="number"
                                    value={form.baseSalary}
                                    onChange={(e) => handleChange('baseSalary', e.target.value)}
                                    min={0}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    Salary Cycle
                                </label>
                                <select
                                    value={form.salaryCycle}
                                    onChange={(e) => handleChange('salaryCycle', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                >
                                    {salaryCycles.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    Payment Method
                                </label>
                                <select
                                    value={form.paymentMethod}
                                    onChange={(e) => handleChange('paymentMethod', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                >
                                    {paymentMethods.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    Sales Commission (%)
                                </label>
                                <input
                                    type="number"
                                    value={form.salesCommissionPercent}
                                    onChange={(e) =>
                                        handleChange('salesCommissionPercent', e.target.value)
                                    }
                                    min={0}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    Monthly Bonus / Incentive
                                </label>
                                <input
                                    type="number"
                                    value={form.monthlyBonus}
                                    onChange={(e) => handleChange('monthlyBonus', e.target.value)}
                                    min={0}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400">
                            Attendance (paid/unpaid days) for salary calculation is captured on the
                            separate Pay Salary screen only.
                        </p>
                    </div>
                )}

                {/* Advances tab (read-only history) */}
                {activeTab === 'advances' && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs">
                        <p className="text-xs font-semibold text-gray-600 mb-2">
                            Advance history
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {advances.length === 0 && (
                                <div className="text-gray-400 text-center py-4">
                                    No advances recorded yet.
                                </div>
                            )}
                            {advances.map((a) => (
                                <div
                                    key={a._id}
                                    className="flex justify-between text-[11px] text-gray-600 border-b border-gray-100 py-1 last:border-0"
                                >
                                    <span>
                                        {new Date(a.date).toLocaleDateString()} – Rs.{' '}
                                        {a.amount.toLocaleString()}
                                    </span>
                                    <span className="text-gray-400">
                                        {a.note || 'Advance'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Salary history tab (read-only) */}
                {activeTab === 'history' && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs">
                        <p className="text-xs font-semibold text-gray-600 mb-2">
                            Salary payments
                        </p>
                        <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                                        <th className="px-3 py-2">Period</th>
                                        <th className="px-3 py-2">Base</th>
                                        <th className="px-3 py-2">Deductions</th>
                                        <th className="px-3 py-2">Advances</th>
                                        <th className="px-3 py-2">Final</th>
                                        <th className="px-3 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payments.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-3 py-4 text-center text-gray-400"
                                            >
                                                No salary payments recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                    {payments.map((p) => (
                                        <tr key={p._id}>
                                            <td className="px-3 py-2">
                                                {new Date(p.periodStart).toLocaleDateString()} -{' '}
                                                {new Date(p.periodEnd).toLocaleDateString()}
                                            </td>
                                            <td className="px-3 py-2">
                                                Rs. {(p.baseSalary || 0).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2">
                                                Rs. {(p.unpaidDeduction || 0).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2">
                                                Rs. {(p.advancesDeducted || 0).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 font-semibold text-gray-800">
                                                Rs. {(p.finalPayable || 0).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="inline-flex px-2 py-1 rounded-full bg-green-50 text-green-700">
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Permissions tab */}
                {activeTab === 'permissions' && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs">
                        <p className="text-xs font-semibold text-gray-600 mb-3">
                            Discount & access control
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                    Max discount %
                                </label>
                                <input
                                    type="number"
                                    value={permissions.maxDiscountPercent ?? ''}
                                    onChange={(e) =>
                                        setPermissions((prev) => ({
                                            ...prev,
                                            maxDiscountPercent: e.target.value === '' ? '' : Number(e.target.value)
                                        }))
                                    }
                                    min={0}
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                    Admin approval above %
                                </label>
                                <input
                                    type="number"
                                    value={permissions.approvalRequiredAbove ?? ''}
                                    onChange={(e) =>
                                        setPermissions((prev) => ({
                                            ...prev,
                                            approvalRequiredAbove: e.target.value === '' ? '' : Number(e.target.value)
                                        }))
                                    }
                                    min={0}
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                            </div>
                            <div className="space-y-2">
                                {[
                                    ['canSellControlledMedicines', 'Controlled medicine sales'],
                                    ['canOverridePrescription', 'Prescription override'],
                                    ['canApproveReturns', 'Return approval'],
                                    ['canEditInventory', 'Inventory edit'],
                                    ['canViewReports', 'Reports access'],
                                    ['canManageStaff', 'Staff management']
                                ].map(([field, label]) => (
                                    <label
                                        key={field}
                                        className="flex items-center gap-2 text-[11px]"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={permissions[field] || false}
                                            onChange={(e) =>
                                                setPermissions((prev) => ({
                                                    ...prev,
                                                    [field]: e.target.checked
                                                }))
                                            }
                                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-2">
                            All permission changes are logged and cannot be edited later.
                        </p>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 shadow-lg shadow-green-600/20"
                    >
                        Save Staff
                    </button>
                </div>
            </form>
        </div>
    );
};

export default StaffEdit;


