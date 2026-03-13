import React, { useEffect, useState } from 'react';
import { getBatches, getExpiringBatches, getExpiredBatches, updateBatchExpiry } from '../../services/batchService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';

const STATUS_OPTIONS = [
    { value: 'ALL', label: 'All' },
    { value: 'EXPIRING', label: 'Expiring' },
    { value: 'EXPIRED', label: 'Expired' },
];

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
};

const Batches = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({
        productVariantId: '',
        status: 'ALL',
        days: 30,
    });
    const [showModal, setShowModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [expiryForm, setExpiryForm] = useState({
        manufacturingDate: '',
        expiryDate: '',
    });

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            let data;
            if (filters.status === 'EXPIRING') {
                data = await getExpiringBatches(filters.days || 30);
            } else if (filters.status === 'EXPIRED') {
                data = await getExpiredBatches();
            } else {
                data = await getBatches({ productVariantId: filters.productVariantId || undefined });
            }
            setBatches(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load batches');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const openExpiryModal = (batch) => {
        setSelectedBatch(batch);
        setExpiryForm({
            manufacturingDate: batch.manufacturingDate || '',
            expiryDate: batch.expiryDate || '',
        });
        setShowModal(true);
    };

    const handleUpdateExpiry = async (e) => {
        e.preventDefault();
        try {
            await updateBatchExpiry(selectedBatch.id, expiryForm);
            showAlert('success', 'Batch expiry updated');
            setShowModal(false);
            setSelectedBatch(null);
            fetchBatches();
        } catch (error) {
            showAlert('error', error.message || 'Failed to update expiry');
        }
    };

    const columns = [
        {
            key: 'batchNumber',
            header: 'Batch',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || row.id}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Variant: {row.productVariantId}</div>
                </div>
            ),
        },
        {
            key: 'manufacturingDate',
            header: 'MFG Date',
            render: (value) => formatDate(value),
        },
        {
            key: 'expiryDate',
            header: 'Expiry Date',
            render: (value) => formatDate(value),
        },
        {
            key: 'status',
            header: 'Status',
            render: (value, row) => {
                const today = new Date();
                const expiry = row.expiryDate ? new Date(row.expiryDate) : null;
                if (!expiry) return <Badge variant="default">Unknown</Badge>;
                if (expiry < today) return <Badge variant="danger">Expired</Badge>;
                const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                if (diffDays <= 30) return <Badge variant="warning">Expiring</Badge>;
                return <Badge variant="success">Valid</Badge>;
            },
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openExpiryModal(row)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Batches
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Track batch expiry and manufacturing dates
                        </p>
                    </div>
                    <Button variant="secondary" onClick={fetchBatches}>
                        Refresh
                    </Button>
                </div>

                {alert && (
                    <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
                )}

                <Card title="Filters">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input
                            label="Product Variant ID"
                            value={filters.productVariantId}
                            onChange={(e) => setFilters({ ...filters, productVariantId: e.target.value })}
                            placeholder="Variant ID"
                        />
                        <Select
                            label="Status"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            options={STATUS_OPTIONS}
                        />
                        <Input
                            label="Expiring in (days)"
                            type="number"
                            value={filters.days}
                            onChange={(e) => setFilters({ ...filters, days: e.target.value })}
                            disabled={filters.status !== 'EXPIRING'}
                        />
                        <div className="flex items-end gap-3">
                            <Button variant="secondary" onClick={() => setFilters({ productVariantId: '', status: 'ALL', days: 30 })}>
                                Reset
                            </Button>
                            <Button onClick={fetchBatches}>Apply</Button>
                        </div>
                    </div>
                </Card>

                <Card padding="none" className="overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={batches}
                        loading={loading}
                        emptyMessage="No batches found."
                    />
                </Card>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Update Batch Expiry"
            >
                <form className="space-y-4" onSubmit={handleUpdateExpiry}>
                    <Input
                        label="Manufacturing Date"
                        type="date"
                        value={expiryForm.manufacturingDate}
                        onChange={(e) => setExpiryForm({ ...expiryForm, manufacturingDate: e.target.value })}
                    />
                    <Input
                        label="Expiry Date"
                        type="date"
                        value={expiryForm.expiryDate}
                        onChange={(e) => setExpiryForm({ ...expiryForm, expiryDate: e.target.value })}
                    />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Batches;