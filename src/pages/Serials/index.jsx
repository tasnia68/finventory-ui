import React, { useEffect, useMemo, useState } from 'react';
import { getSerialHistory, getSerialNumbers, updateSerialWarranty } from '../../services/serialService';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, Modal, ProductVariantLookup, Select } from '../../components/common';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'SOLD', label: 'Sold' },
    { value: 'TRANSIT', label: 'In transit' },
    { value: 'ALLOCATED', label: 'Allocated' },
    { value: 'CONSUMED', label: 'Consumed' },
    { value: 'RETURNED', label: 'Returned' },
    { value: 'DAMAGED', label: 'Damaged' },
    { value: 'LOST', label: 'Lost' },
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

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

const getStatusVariant = (status) => {
    if (status === 'AVAILABLE') return 'success';
    if (status === 'ALLOCATED' || status === 'TRANSIT') return 'warning';
    if (status === 'DAMAGED' || status === 'LOST') return 'danger';
    return 'default';
};

const getWarrantyState = (serial) => {
    if (!serial.warrantyEndDate) return { label: 'No warranty', variant: 'default' };
    const today = new Date();
    const warrantyEnd = new Date(serial.warrantyEndDate);
    const diffDays = Math.ceil((warrantyEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expired', variant: 'danger' };
    if (diffDays <= 30) return { label: 'Expiring soon', variant: 'warning' };
    return { label: 'Active', variant: 'success' };
};

const Serials = () => {
    const [serials, setSerials] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [savingWarranty, setSavingWarranty] = useState(false);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ status: '' });
    const [historyModal, setHistoryModal] = useState(false);
    const [warrantyModal, setWarrantyModal] = useState(false);
    const [historyRows, setHistoryRows] = useState([]);
    const [selectedSerial, setSelectedSerial] = useState(null);
    const [warrantyForm, setWarrantyForm] = useState({
        warrantyStartDate: '',
        warrantyEndDate: '',
    });

    useEffect(() => {
        if (selectedVariant?.id) {
            fetchSerials();
        } else {
            setSerials([]);
        }
    }, [selectedVariant, filters.status]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const fetchSerials = async () => {
        if (!selectedVariant?.id) return;
        try {
            setLoading(true);
            const data = await getSerialNumbers({
                productVariantId: selectedVariant.id,
                status: filters.status || undefined,
            });
            setSerials(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load serial numbers');
        } finally {
            setLoading(false);
        }
    };

    const openHistory = async (serial) => {
        try {
            setSelectedSerial(serial);
            setHistoryModal(true);
            setHistoryLoading(true);
            const data = await getSerialHistory(serial.serialNumber);
            setHistoryRows(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load serial history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const openWarranty = (serial) => {
        setSelectedSerial(serial);
        setWarrantyForm({
            warrantyStartDate: serial.warrantyStartDate || '',
            warrantyEndDate: serial.warrantyEndDate || '',
        });
        setWarrantyModal(true);
    };

    const handleWarrantySave = async (event) => {
        event.preventDefault();
        if (!selectedSerial?.id) return;

        try {
            setSavingWarranty(true);
            await updateSerialWarranty(selectedSerial.id, warrantyForm);
            showAlert('success', 'Warranty dates updated successfully');
            setWarrantyModal(false);
            await fetchSerials();
        } catch (error) {
            showAlert('error', error.message || 'Failed to update warranty details');
        } finally {
            setSavingWarranty(false);
        }
    };

    const summary = useMemo(() => {
        const total = serials.length;
        const available = serials.filter((serial) => serial.status === 'AVAILABLE').length;
        const allocated = serials.filter((serial) => ['ALLOCATED', 'TRANSIT'].includes(serial.status)).length;
        const activeWarranty = serials.filter((serial) => getWarrantyState(serial).label === 'Active').length;
        return { total, available, allocated, activeWarranty };
    }, [serials]);

    const columns = [
        {
            key: 'serialNumber',
            header: 'Serial',
            render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{value}</span>,
        },
        {
            key: 'warehouseName',
            header: 'Position',
            render: (value, row) => (
                <div>
                    <div className="font-medium text-slate-900 dark:text-white">{value || '-'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.storageLocationName || row.batchNumber || 'No location or batch assigned'}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Lifecycle',
            render: (value) => <Badge variant={getStatusVariant(value)}>{value || 'Unknown'}</Badge>,
        },
        {
            key: 'warrantyEndDate',
            header: 'Warranty',
            render: (value, row) => {
                const warranty = getWarrantyState(row);
                return (
                    <div className="space-y-1">
                        <Badge variant={warranty.variant}>{warranty.label}</Badge>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Ends: {formatDate(value)}</div>
                    </div>
                );
            },
        },
        {
            key: 'updatedAt',
            header: 'Last Update',
            render: (value) => formatDateTime(value),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" icon="history" onClick={() => openHistory(row)}>History</Button>
                    <Button variant="secondary" size="sm" icon="verified_user" onClick={() => openWarranty(row)}>Warranty</Button>
                </div>
            ),
        },
    ];

    const historyColumns = [
        {
            key: 'type',
            header: 'Movement',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || 'Movement'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.referenceId || row.reason || 'No reference'}</div>
                </div>
            ),
        },
        { key: 'warehouseName', header: 'Warehouse', render: (value) => value || '-' },
        { key: 'createdBy', header: 'Recorded By', render: (value) => value || '-' },
        { key: 'createdAt', header: 'Timestamp', render: (value) => formatDateTime(value) },
    ];

    return (
        <CatalogPageFrame>
            <CatalogHero
                eyebrow="Advanced Inventory"
                title="Serial traceability with service coverage control."
                description="Find any tracked unit, review its movement chain, and maintain warranty dates without leaving the traceability workspace."
                info="The serial API is variant-scoped, so start by choosing the SKU you want to investigate."
                actions={<Button icon="sync" onClick={fetchSerials} disabled={!selectedVariant?.id}>Refresh</Button>}
            />

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Tracked Serials" value={summary.total} caption="Units in the selected SKU scope" icon="tag" tone="blue" />
                <MetricCard title="Available Units" value={summary.available} caption="Ready for issue or allocation" icon="inventory" tone="emerald" />
                <MetricCard title="In Motion" value={summary.allocated} caption="Allocated or in transit" icon="local_shipping" tone="amber" />
                <MetricCard title="Active Warranty" value={summary.activeWarranty} caption="Units still under warranty" icon="verified" tone="violet" />
            </div>

            <Card
                title="Serial Workspace"
                subtitle="Pick the tracked SKU first, then narrow by lifecycle state."
                action={<InfoTip text="Warranty dates are maintained at the serial level. Use history before correcting lifecycle or support records." />}
            >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <ProductVariantLookup label="Tracked SKU" selectedVariant={selectedVariant} onSelect={setSelectedVariant} className="lg:col-span-2" />
                    <Select
                        label="Lifecycle state"
                        value={filters.status}
                        onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                        options={STATUS_OPTIONS}
                    />
                </div>
            </Card>

            <Card
                padding="none"
                className="overflow-hidden"
                title="Serial Register"
                subtitle={selectedVariant ? `Showing serials for ${selectedVariant.sku || selectedVariant.id}` : 'Choose a tracked SKU to load serial records.'}
            >
                <DataTable
                    columns={columns}
                    data={serials}
                    loading={loading}
                    emptyMessage={selectedVariant ? 'No serials found for the selected filters.' : 'Select a product variant to load serial numbers.'}
                />
            </Card>

            <Card title="Business Use" subtitle="Typical operational use cases for this screen.">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Customer support</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Validate whether a serial is still covered and confirm where it was last transacted.</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Warehouse investigation</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Trace missing, damaged, or returned units with a clean history chain by serial number.</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Audit readiness</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Keep warranty dates current so service teams and auditors work from the same serialized record.</div>
                    </div>
                </div>
            </Card>

            <Modal
                isOpen={historyModal}
                onClose={() => setHistoryModal(false)}
                title={`Serial History${selectedSerial ? ` - ${selectedSerial.serialNumber}` : ''}`}
                size="xl"
            >
                <DataTable columns={historyColumns} data={historyRows} loading={historyLoading} emptyMessage="No movement history found for this serial number." />
            </Modal>

            <Modal
                isOpen={warrantyModal}
                onClose={() => setWarrantyModal(false)}
                title={`Warranty Coverage${selectedSerial ? ` - ${selectedSerial.serialNumber}` : ''}`}
            >
                <form className="space-y-4" onSubmit={handleWarrantySave}>
                    <Input
                        label="Warranty Start"
                        type="date"
                        value={warrantyForm.warrantyStartDate}
                        onChange={(event) => setWarrantyForm((current) => ({ ...current, warrantyStartDate: event.target.value }))}
                    />
                    <Input
                        label="Warranty End"
                        type="date"
                        value={warrantyForm.warrantyEndDate}
                        onChange={(event) => setWarrantyForm((current) => ({ ...current, warrantyEndDate: event.target.value }))}
                    />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setWarrantyModal(false)}>Cancel</Button>
                        <Button type="submit" loading={savingWarranty}>Save Coverage</Button>
                    </div>
                </form>
            </Modal>
        </CatalogPageFrame>
    );
};

export default Serials;