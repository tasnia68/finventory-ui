import React, { useEffect, useMemo, useState } from 'react';
import { createStockReservation, getATP, getStockReservations, releaseReservationsByReference, releaseStockReservation } from '../../services/stockReservationService';
import { getWarehouses } from '../../services/warehouseService';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, Modal, ProductVariantLookup, Select } from '../../components/common';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'RELEASED', label: 'Released' },
    { value: 'FULFILLED', label: 'Fulfilled' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

const formatNumber = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

const getStatusVariant = (status) => {
    if (status === 'ACTIVE') return 'warning';
    if (status === 'PENDING') return 'info';
    if (status === 'FULFILLED') return 'success';
    if (status === 'EXPIRED' || status === 'CANCELLED') return 'danger';
    return 'default';
};

const Reservations = () => {
    const [reservations, setReservations] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedFilterVariant, setSelectedFilterVariant] = useState(null);
    const [selectedFormVariant, setSelectedFormVariant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [filters, setFilters] = useState({ warehouseId: '', status: '' });
    const [formData, setFormData] = useState({
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
                productVariantId: selectedFilterVariant?.id || undefined,
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
        if (!selectedFormVariant?.id) {
            showAlert('error', 'Select a product variant before creating a reservation');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                ...formData,
                productVariantId: selectedFormVariant.id,
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
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            warehouseId: '',
            storageLocationId: '',
            batchId: '',
            quantity: '',
            expiresAt: '',
            priority: 'MEDIUM',
            referenceId: '',
            notes: '',
        });
        setSelectedFormVariant(null);
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

    const handleReleaseReference = async (referenceId) => {
        if (!referenceId) return;
        if (!window.confirm(`Release all reservations for reference ${referenceId}?`)) return;
        try {
            await releaseReservationsByReference(referenceId);
            showAlert('success', `Released reservations for ${referenceId}`);
            fetchReservations();
        } catch (error) {
            showAlert('error', error.message || 'Failed to release reservations by reference');
        }
    };

    const handleCheckATP = async () => {
        if (!selectedFormVariant?.id || !formData.warehouseId) {
            showAlert('warning', 'Select both product variant and warehouse before checking ATP');
            return;
        }
        try {
            const value = await getATP({
                productVariantId: selectedFormVariant.id,
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

    const visibleReservations = useMemo(() => {
        if (!filters.status) return reservations;
        return reservations.filter((reservation) => reservation.status === filters.status);
    }, [filters.status, reservations]);

    const summary = useMemo(() => {
        const activeRows = visibleReservations.filter((reservation) => ['PENDING', 'ACTIVE'].includes(reservation.status));
        const activeQuantity = activeRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        const expiringSoon = activeRows.filter((row) => {
            if (!row.expiresAt) return false;
            const expiry = new Date(row.expiresAt);
            return expiry.getTime() - Date.now() <= 24 * 60 * 60 * 1000;
        }).length;
        const references = new Set(activeRows.map((row) => row.referenceId).filter(Boolean)).size;
        const warehousesCovered = new Set(activeRows.map((row) => row.warehouseId).filter(Boolean)).size;
        return { activeQuantity, expiringSoon, references, warehousesCovered };
    }, [visibleReservations]);

    const columns = [
        {
            key: 'productVariantId',
            header: 'Variant',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{row.productVariantSku || row.productVariantId}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Reference: {row.referenceId || 'Unassigned'}</div>
                </div>
            ),
        },
        {
            key: 'warehouseName',
            header: 'Scope',
            render: (value, row) => (
                <div>
                    <div className="font-medium text-slate-900 dark:text-white">{value || row.warehouseId || '—'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.storageLocationName || row.batchNumber || 'Warehouse-level reservation'}</div>
                </div>
            ),
        },
        {
            key: 'quantity',
            header: 'Quantity',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Priority: {row.priority || 'MEDIUM'}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => (
                <Badge variant={getStatusVariant(value)}>{value || 'ACTIVE'}</Badge>
            ),
        },
        {
            key: 'expiresAt',
            header: 'Expiry',
            render: (value) => formatDateTime(value),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="cancel"
                        onClick={() => handleRelease(row.id)}
                        disabled={!['PENDING', 'ACTIVE'].includes(row.status)}
                    >
                        Release
                    </Button>
                    {row.referenceId ? (
                        <Button variant="ghost" size="sm" icon="layers_clear" onClick={() => handleReleaseReference(row.referenceId)}>
                            Reference
                        </Button>
                    ) : null}
                </div>
            ),
        },
    ];

    return (
        <CatalogPageFrame>
            <CatalogHero
                eyebrow="Advanced Inventory"
                title="Reservation control with ATP awareness."
                description="Protect demand, inspect scope at warehouse or lot level, and release stale holds before they distort available stock."
                info="ATP lookup is warehouse-scoped. Batch and storage location constraints are still validated when you create the reservation."
                actions={<Button icon="add" onClick={() => setShowModal(true)}>Create Reservation</Button>}
            />

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Reserved Quantity" value={formatNumber(summary.activeQuantity)} caption="Pending and active demand in scope" icon="lock" tone="amber" />
                <MetricCard title="Expiring Soon" value={summary.expiringSoon} caption="Reservations expiring within 24 hours" icon="timer" tone="rose" />
                <MetricCard title="Demand References" value={summary.references} caption="Orders or documents holding stock" icon="description" tone="blue" />
                <MetricCard title="Warehouses Covered" value={summary.warehousesCovered} caption="Facilities with open reservations" icon="warehouse" tone="violet" />
            </div>

            <Card
                title="Reservation Workspace"
                subtitle="Filter open reservations by warehouse, status, or SKU."
                action={<InfoTip text="Use reference-level release when an order is cancelled or superseded and multiple reservation lines need to be cleared together." />}
            >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <Select
                        label="Warehouse"
                        value={filters.warehouseId}
                        onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))}
                        options={warehouseOptions}
                        placeholder="All warehouses"
                    />
                    <Select
                        label="Status"
                        value={filters.status}
                        onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                        options={STATUS_OPTIONS}
                    />
                    <ProductVariantLookup label="Demand SKU" selectedVariant={selectedFilterVariant} onSelect={setSelectedFilterVariant} className="lg:col-span-2" />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="secondary" onClick={() => {
                        setFilters({ warehouseId: '', status: '' });
                        setSelectedFilterVariant(null);
                    }}>
                        Reset
                    </Button>
                    <Button onClick={fetchReservations}>Apply Filters</Button>
                </div>
            </Card>

            <Card padding="none" className="overflow-hidden" title="Reservation Register" subtitle="Operational reservation lines in the selected scope">
                <DataTable columns={columns} data={visibleReservations} loading={loading} emptyMessage="No reservations found for the current filters." />
            </Card>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Reservation" size="lg">
                <form className="space-y-4" onSubmit={handleCreate}>
                    <ProductVariantLookup label="Product variant" selectedVariant={selectedFormVariant} onSelect={setSelectedFormVariant} required />
                    <Select
                        label="Warehouse"
                        value={formData.warehouseId}
                        onChange={(event) => setFormData((current) => ({ ...current, warehouseId: event.target.value }))}
                        options={warehouseOptions}
                        required
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                            label="Quantity"
                            type="number"
                            value={formData.quantity}
                            onChange={(event) => setFormData((current) => ({ ...current, quantity: event.target.value }))}
                            required
                        />
                        <Select
                            label="Priority"
                            value={formData.priority}
                            onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value }))}
                            options={PRIORITY_OPTIONS}
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                            label="Batch ID"
                            value={formData.batchId}
                            onChange={(event) => setFormData((current) => ({ ...current, batchId: event.target.value }))}
                            placeholder="Optional lot scope"
                        />
                        <Input
                            label="Storage Location ID"
                            value={formData.storageLocationId}
                            onChange={(event) => setFormData((current) => ({ ...current, storageLocationId: event.target.value }))}
                            placeholder="Optional bin or zone"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                            label="Expires At"
                            type="datetime-local"
                            value={formData.expiresAt}
                            onChange={(event) => setFormData((current) => ({ ...current, expiresAt: event.target.value }))}
                        />
                        <Input
                            label="Reference ID"
                            value={formData.referenceId}
                            onChange={(event) => setFormData((current) => ({ ...current, referenceId: event.target.value }))}
                            placeholder="Sales order, wave, or document number"
                        />
                    </div>
                    <Input
                        label="Notes"
                        value={formData.notes}
                        onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Reason for hold or allocation context"
                    />
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button variant="secondary" type="button" onClick={handleCheckATP}>Check ATP</Button>
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                                {atpValue !== null ? `Warehouse ATP: ${formatNumber(atpValue)}` : 'Check ATP before confirming if the reservation may consume a constrained SKU.'}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit" loading={submitting}>Create Reservation</Button>
                    </div>
                </form>
            </Modal>
        </CatalogPageFrame>
    );
};

export default Reservations;