import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, TrendingDown, Package, Plus, FileText } from 'lucide-react';
import { useSnackbar } from 'notistack';
import RecordPaymentModal from '../components/suppliers/RecordPaymentModal';
import InvoiceDetailsModal from '../components/invoices/InvoiceDetailsModal';
import PurchaseReturnModal from '../components/suppliers/PurchaseReturnModal';

const SupplierDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [supplier, setSupplier] = useState(null);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ totalPurchased: 0, totalPaid: 0, balance: 0 });
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [filter, setFilter] = useState('All');

    const fetchSupplierDetails = useCallback(async () => {
        try {
            const supplierRes = await fetch(`http://localhost:5000/api/suppliers/${id}`);
            if (!supplierRes.ok) throw new Error('Failed to fetch supplier');

            const responseData = await supplierRes.json();
            const supplierInfo = responseData.supplier || responseData;

            setSupplier(supplierInfo);
            setHistory(responseData.ledger || []);
            setStats(responseData.stats || {
                totalPurchased: 0,
                totalPaid: 0,
                balance: supplierInfo.totalPayable || 0
            });
            setLoading(false);

        } catch (err) {
            console.error(err);
            enqueueSnackbar('Failed to fetch supplier details', { variant: 'error' });
            setLoading(false);
        }
    }, [id, enqueueSnackbar]);

    useEffect(() => {
        fetchSupplierDetails();
    }, [id, fetchSupplierDetails]);

    const handleRecordPayment = async (paymentData) => {
        try {
            const response = await fetch(`http://localhost:5000/api/suppliers/${id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });

            if (response.ok) {
                enqueueSnackbar('Payment recorded successfully!', { variant: 'success' });
                setIsPaymentModalOpen(false);
                fetchSupplierDetails();
            } else {
                enqueueSnackbar('Failed to record payment', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error recording payment:', error);
            enqueueSnackbar('Error recording payment', { variant: 'error' });
        }
    };

    const handleVoidInvoice = async (invoice) => {
        if (!window.confirm(`Are you sure you want to void/delete invoice ${invoice.ref}? This will delete ${invoice.items.length} items.`)) {
            return;
        }

        try {
            for (const item of invoice.items) {
                await fetch(`http://localhost:5000/api/supplies/${item.id}`, { method: 'DELETE' });
            }

            enqueueSnackbar('Invoice voided successfully', { variant: 'success' });
            setIsInvoiceModalOpen(false);
            fetchSupplierDetails();
        } catch (error) {
            console.error('Error voiding invoice:', error);
            enqueueSnackbar('Failed to void invoice', { variant: 'error' });
        }
    };

    // Process Ledger for Invoices Tab (Grouping & FIFO)
    const { processedInvoices, processedPayments } = useMemo(() => {
        const invoicesMap = {};
        const paymentsList = [];

        // 1. Handle Opening Balance
        let initialLiquidity = 0;
        if (supplier && supplier.openingBalance) {
            if (supplier.openingBalance > 0) {
                invoicesMap['opening'] = {
                    id: 'opening',
                    date: supplier.createdAt,
                    ref: 'Opening Balance',
                    amount: supplier.openingBalance,
                    items: [],
                    type: 'Opening Balance',
                    isOpening: true
                };
            } else {
                initialLiquidity = Math.abs(supplier.openingBalance);
            }
        }

        history.forEach(item => {
            if (item.type === 'Payment') {
                paymentsList.push(item);
            } else if (item.type === 'Purchase' || item.type === 'Invoice') {
                const key = item.ref || 'Unknown';
                if (!invoicesMap[key]) {
                    invoicesMap[key] = {
                        id: item.id,
                        date: item.date,
                        ref: key,
                        amount: 0,
                        items: [],
                        type: 'Invoice'
                    };
                }
                invoicesMap[key].amount += (item.amount || 0);
                invoicesMap[key].items.push(item);
            }
        });

        const invoices = Object.values(invoicesMap).sort((a, b) => new Date(a.date) - new Date(b.date));

        let currentLiquidity = initialLiquidity + paymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);

        invoices.forEach(inv => {
            const paid = Math.min(inv.amount, currentLiquidity);
            inv.paid = paid;
            inv.due = inv.amount - paid;

            if (Math.abs(inv.due) < 0.01) inv.status = 'Settled';
            else if (inv.paid > 0) inv.status = 'Partially Paid';
            else inv.status = 'Posted';

            currentLiquidity = Math.max(0, currentLiquidity - paid);
        });

        invoices.sort((a, b) => new Date(b.date) - new Date(a.date));

        return { processedInvoices: invoices, processedPayments: paymentsList };
    }, [history, supplier]);

    const activeList = filter === 'Invoice' ? processedInvoices :
        filter === 'Payment' ? processedPayments :
            [...processedInvoices, ...processedPayments].sort((a, b) => new Date(b.date) - new Date(a.date));

    const handleRowClick = (item) => {
        if (item.type === 'Invoice' && item.items && item.items.length > 0) {
            setSelectedInvoice(item);
            setIsInvoiceModalOpen(true);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading details...</div>;
    if (!supplier) return <div className="p-8 text-center text-red-500">Supplier not found</div>;

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/suppliers')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{supplier.name}</h1>
                        <p className="text-gray-500 text-sm">
                            {supplier.contactPerson} • {supplier.phone}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsReturnModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition-colors"
                    >
                        <span>Return / Debit Note</span>
                    </button>
                    <button
                        onClick={() => navigate('/supplies', { state: { supplierId: supplier._id, supplierName: supplier.name } })}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={18} />
                        <span>Create Invoice</span>
                    </button>
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                    >
                        <Plus size={18} />
                        <span>Record Payment</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <Package size={24} />
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 bg-gray-50 text-gray-600 rounded-lg">Total Purchased</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-gray-900">
                            Rs. {stats.totalPurchased?.toLocaleString()}
                        </h3>
                        <p className="text-sm text-gray-500">Lifetime purchases</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <TrendingDown size={24} />
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 bg-gray-50 text-gray-600 rounded-lg">Total Paid</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-gray-900">
                            Rs. {stats.totalPaid?.toLocaleString()}
                        </h3>
                        <p className="text-sm text-gray-500">Lifetime payments</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm ring-1 ring-red-50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 rounded-xl text-red-600">
                            <Wallet size={24} />
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 bg-red-50 text-red-600 rounded-lg">Net Payable</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-gray-900">
                            Rs. {Math.abs(stats.balance || 0).toLocaleString()}
                        </h3>
                        <p className="text-sm text-red-500 font-medium">
                            {stats.balance > 0 ? 'You owe them' : stats.balance < 0 ? 'Advance Payment' : 'Settled'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">
                        {filter === 'Invoice' ? 'Invoices' : filter === 'Payment' ? 'Payments' : 'Transaction History'}
                    </h3>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {['All', 'Invoice', 'Payment'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1 text-sm font-medium rounded-md transition-all ${filter === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {f === 'All' ? 'All' : f + 's'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                {filter === 'All' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>

                                {filter === 'Invoice' ? (
                                    <>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit (Payable)</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit (Paid)</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {activeList.length > 0 ? (
                                activeList.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={`hover:bg-gray-50 transition-colors ${item.type === 'Invoice' ? 'cursor-pointer' : ''}`}
                                        onClick={() => handleRowClick(item)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(item.date).toLocaleDateString()}
                                        </td>

                                        {filter === 'All' && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.type === 'Invoice' || item.type === 'Opening Balance' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                    {item.type === 'Opening Balance' ? 'Opening' : item.type}
                                                </span>
                                            </td>
                                        )}

                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {item.type === 'Invoice' ? (
                                                <span className="text-blue-600 hover:underline">{item.ref}</span>
                                            ) : item.ref}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.type === 'Invoice' || item.type === 'Opening Balance' ? (
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.status === 'Settled' ? 'bg-gray-100 text-gray-600' :
                                                    item.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                                                    Posted
                                                </span>
                                            )}
                                        </td>

                                        {filter === 'Invoice' ? (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-bold">
                                                    Rs. {item.amount?.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                                                    Rs. {item.paid?.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                                                    Rs. {item.due?.toLocaleString()}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                                                    {(item.type === 'Invoice' || item.type === 'Opening Balance') ? `Rs. ${item.amount?.toLocaleString()}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                                                    {item.type === 'Payment' ? `Rs. ${item.amount?.toLocaleString()}` : '-'}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={filter === 'Invoice' ? 6 : 5} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                                                <FileText size={32} />
                                            </div>
                                            <p className="font-medium">No transactions found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <RecordPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onConfirm={handleRecordPayment}
                supplierBalance={stats.balance}
            />

            <PurchaseReturnModal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                supplierId={supplier?._id}
                supplierName={supplier?.name}
                onConfirm={async (data) => {
                    try {
                        const response = await fetch(`http://localhost:5000/api/suppliers/return`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });

                        if (response.ok) {
                            enqueueSnackbar('Purchase Return processed successfully!', { variant: 'success' });
                            setIsReturnModalOpen(false);
                            fetchSupplierDetails();
                        } else {
                            enqueueSnackbar('Failed to process return', { variant: 'error' });
                        }
                    } catch (error) {
                        console.error('Error processing return:', error);
                        enqueueSnackbar('Error processing return', { variant: 'error' });
                    }
                }}
            />

            <InvoiceDetailsModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                invoice={selectedInvoice}
                onVoid={handleVoidInvoice}
            />
        </div>
    );
};

export default SupplierDetails;
