import React, { useEffect, useState } from 'react';
import { createStockReservation, releaseStockReservation, getStockReservations, getATP } from '../../services/stockReservationService';
import { getWarehouses } from '../../services/warehouseService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';

const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
];

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const Reservations = () => {
    const [reservations, setReservations] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({ warehouseId: '', productVariantId: '' });
    const [formData, setFormData] = useState({
        productVariantId: '',
        warehouseId: '',
        storageLocationId: '',
        batchId: '',
        quantity: '',
        expiresAt: '',
        priority: 'MEDIUM',
        referenceId: '',
        notes: '',
    });
    const [atpValue, setAtpValue] = useState(null);

    useEffect(() => {
        fetchReservations();
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const data = await getWarehouses();
            setWarehouses(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        }
    };

    const fetchReservations = async () => {
        try {
            setLoading(true);
            const data = await getStockReservations({
                warehouseId: filters.warehouseId || undefined,
                productVariantId: filters.productVariantId || undefined,
            });
            setReservations(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load reservations');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                quantity: Number(formData.quantity),
                expiresAt: formData.expiresAt || null,
                storageLocationId: formData.storageLocationId || null,
                batchId: formData.batchId || null,
                referenceId: formData.referenceId || null,
                notes: formData.notes || null,
            };
            await createStockReservation(payload);
            showAlert('success', 'Reservation created successfully');
            setShowModal(false);
            resetForm();
            fetchReservations();
        } catch (error) {
            showAlert('error', error.message || 'Failed to create reservation');
        }
    };

    const resetForm = () => {
        setFormData({
            productVariantId: '',
            warehouseId: '',
            storageLocationId: '',
            batchId: '',
            quantity: '',
            expiresAt: '',
            priority: 'MEDIUM',
            referenceId: '',
            notes: '',
        });
        setAtpValue(null);
    };

    const handleRelease = async (id) => {
        if (!window.confirm('Release this reservation?')) return;
        try {
            await releaseStockReservation(id);
            showAlert('success', 'Reservation released');
            fetchReservations();
        } catch (error) {
            showAlert('error', error.message || 'Failed to release reservation');
        }
    };

    const handleCheckATP = async () => {
        try {
            const value = await getATP({
                productVariantId: formData.productVariantId,
                warehouseId: formData.warehouseId,
            });
            setAtpValue(value);
        } catch (error) {
            showAlert('error', error.message || 'Failed to get ATP');
        }
    };

    const warehouseOptions = toList(warehouses).map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name,
    }));

    const columns = [
        {
            key: 'productVariantId',
            header: 'Variant',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{row.productVariantName || row.productVariantId}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">SKU: {row.sku || '—'}</div>
                </div>
            ),
        },
        { key: 'warehouseName', header: 'Warehouse', render: (value, row) => value || row.warehouseId || '—' },
        { key: 'quantity', header: 'Qty' },
        {
            key: 'status',
            header: 'Status',
            render: (value) => (
                <Badge variant={value === 'RELEASED' ? 'default' : 'warning'}>{value || 'ACTIVE'}</Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <button
                    onClick={() => handleRelease(row.id)}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">cancel</span>
                </button>
            ),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Stock Reservations
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Reserve stock and check availability
                        </p>
                    </div>
                    <Button icon="add" onClick={() => setShowModal(true)}>
                        Create Reservation
                    </Button>
                </div>

                {alert && (
                    <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
                )}

                <Card title="Filters">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Warehouse"
                            value={filters.warehouseId}
                            onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                            options={warehouseOptions}
                            placeholder="All warehouses"
                        />
                        <Input
                            label="Product Variant ID"
                            value={filters.productVariantId}
                            onChange={(e) => setFilters({ ...filters, productVariantId: e.target.value })}
                            placeholder="Variant ID"
                        />
                        <div className="flex items-end gap-3">
                            <Button variant="secondary" onClick={() => setFilters({ warehouseId: '', productVariantId: '' })}>
                                Reset
                            </Button>
                            <Button onClick={fetchReservations}>Apply</Button>
                        </div>
                    </div>
                </Card>

                <Card padding="none" className="overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={reservations}
                        loading={loading}
                        emptyMessage="No reservations found."
                    />
                </Card>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Create Reservation"
                size="lg"
            >
                <form className="space-y-4" onSubmit={handleCreate}>
                    <Input
                        label="Product Variant ID"
                        value={formData.productVariantId}
                        onChange={(e) => setFormData({ ...formData, productVariantId: e.target.value })}
                        required
                    />
                    <Select
                        label="Warehouse"
                        value={formData.warehouseId}
                        onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                        options={warehouseOptions}
                        required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Quantity"
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            required
                        />
                        <Select
                            label="Priority"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            options={PRIORITY_OPTIONS}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Batch ID"
                            value={formData.batchId}
                            onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                        />
                        <Input
                            label="Storage Location ID"
                            value={formData.storageLocationId}
                            onChange={(e) => setFormData({ ...formData, storageLocationId: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Expires At"
                            type="datetime-local"
                            value={formData.expiresAt}
                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                        />
                        <Input
                            label="Reference ID"
                            value={formData.referenceId}
                            onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                        />
                    </div>
                    <Input
                        label="Notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" type="button" onClick={handleCheckATP}>
                            Check ATP
                        </Button>
                        {atpValue !== null && (
                            <span className="text-sm text-slate-600 dark:text-slate-300">ATP: {atpValue}</span>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Create</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Reservations;