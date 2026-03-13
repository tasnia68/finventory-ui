import React, { useEffect, useState } from 'react';
import { getSerialNumbers, getSerialHistory } from '../../services/serialService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'RESERVED', label: 'Reserved' },
    { value: 'SOLD', label: 'Sold' },
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
    return date.toLocaleString();
};

const Serials = () => {
    const [serials, setSerials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({
        productVariantId: '',
        status: '',
    });
    const [historyModal, setHistoryModal] = useState(false);
    const [historyRows, setHistoryRows] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedSerial, setSelectedSerial] = useState(null);

    useEffect(() => {
        fetchSerials();
    }, []);

    const fetchSerials = async () => {
        try {
            setLoading(true);
            const data = await getSerialNumbers({
                productVariantId: filters.productVariantId || undefined,
                status: filters.status || undefined,
            });
            setSerials(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load serial numbers');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const openHistory = async (serialNumber) => {
        try {
            setSelectedSerial(serialNumber);
            setHistoryModal(true);
            setHistoryLoading(true);
            const data = await getSerialHistory(serialNumber);
            setHistoryRows(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load serial history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const columns = [
        {
            key: 'serialNumber',
            header: 'Serial',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">SKU: {row.productVariantSku || '—'}</div>
                </div>
            ),
        },
        {
            key: 'warehouseName',
            header: 'Warehouse',
            render: (value, row) => (
                <span className="text-sm text-slate-600 dark:text-slate-300">{value || row.warehouseId || '—'}</span>
            ),
        },
        {
            key: 'batchNumber',
            header: 'Batch',
            render: (value) => value || '—',
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => (
                <Badge variant={value === 'AVAILABLE' ? 'success' : value === 'RESERVED' ? 'warning' : 'default'}>
                    {value || '—'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <button
                    onClick={() => openHistory(row.serialNumber)}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">history</span>
                </button>
            ),
        },
    ];

    const historyColumns = [
        { key: 'type', header: 'Type' },
        { key: 'quantity', header: 'Qty' },
        { key: 'warehouseName', header: 'Warehouse' },
        {
            key: 'createdAt',
            header: 'Time',
            render: (value) => formatDate(value),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Serial Numbers
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Trace serial number movements
                        </p>
                    </div>
                    <Button variant="secondary" onClick={fetchSerials}>Refresh</Button>
                </div>

                {alert && (
                    <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
                )}

                <Card title="Filters">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <div className="flex items-end gap-3">
                            <Button variant="secondary" onClick={() => setFilters({ productVariantId: '', status: '' })}>
                                Reset
                            </Button>
                            <Button onClick={fetchSerials}>Apply</Button>
                        </div>
                    </div>
                </Card>

                <Card padding="none" className="overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={serials}
                        loading={loading}
                        emptyMessage="No serial numbers found."
                    />
                </Card>
            </div>

            <Modal
                isOpen={historyModal}
                onClose={() => setHistoryModal(false)}
                title={`Serial History ${selectedSerial ? `- ${selectedSerial}` : ''}`}
                size="lg"
            >
                <DataTable
                    columns={historyColumns}
                    data={historyRows}
                    loading={historyLoading}
                    emptyMessage="No history found."
                />
            </Modal>
        </div>
    );
};

export default Serials;