import React, { useEffect, useMemo, useState } from 'react';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../services/warehouseService';
import { getWarehouseCapacity, updateWarehouseCapacity } from '../../services/warehouseCapacityService';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, Modal, Select } from '../../components/common';

const WAREHOUSE_TYPES = [
    { value: 'PRIMARY', label: 'Primary' },
    { value: 'REGIONAL', label: 'Regional' },
    { value: 'DISTRIBUTION', label: 'Distribution' },
    { value: 'FULFILLMENT', label: 'Fulfillment' },
    { value: 'TEMPORARY', label: 'Temporary' },
];

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active only' },
    { value: 'inactive', label: 'Inactive only' },
];

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const formatNumber = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

const Warehouses = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [showCapacityModal, setShowCapacityModal] = useState(false);
    const [capacityLoading, setCapacityLoading] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [capacityForm, setCapacityForm] = useState({ capacity: '', usedCapacity: '' });
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ search: '', status: '' });
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        type: 'PRIMARY',
        contactNumber: '',
        isActive: true,
        capacity: '',
        usedCapacity: '',
    });

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const fetchWarehouses = async () => {
        try {
            setLoading(true);
            const data = await getWarehouses();
            setWarehouses(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            location: '',
            type: 'PRIMARY',
            contactNumber: '',
            isActive: true,
            capacity: '',
            usedCapacity: '',
        });
        setEditingWarehouse(null);
    };

    const filteredWarehouses = useMemo(() => {
        return warehouses.filter((warehouse) => {
            const matchesSearch = filters.search
                ? [warehouse.name, warehouse.location, warehouse.type, warehouse.contactNumber]
                    .filter(Boolean)
                    .some((value) => value.toLowerCase().includes(filters.search.toLowerCase()))
                : true;
            const matchesStatus = filters.status === 'active'
                ? warehouse.isActive !== false
                : filters.status === 'inactive'
                    ? warehouse.isActive === false
                    : true;
            return matchesSearch && matchesStatus;
        });
    }, [filters, warehouses]);

    const summary = useMemo(() => {
        const total = warehouses.length;
        const active = warehouses.filter((warehouse) => warehouse.isActive !== false).length;
        const tracked = warehouses.filter((warehouse) => warehouse.capacity !== null && warehouse.capacity !== undefined).length;
        const utilizationValues = warehouses
            .filter((warehouse) => Number(warehouse.capacity || 0) > 0)
            .map((warehouse) => (Number(warehouse.usedCapacity || 0) / Number(warehouse.capacity || 1)) * 100);
        const avgUtilization = utilizationValues.length
            ? utilizationValues.reduce((sum, value) => sum + value, 0) / utilizationValues.length
            : 0;
        return { total, active, tracked, avgUtilization };
    }, [warehouses]);

    const openCapacityModal = async (warehouse) => {
        setSelectedWarehouse(warehouse);
        setShowCapacityModal(true);
        setCapacityLoading(true);
        try {
            const data = await getWarehouseCapacity(warehouse.id);
            setCapacityForm({
                capacity: data?.capacity ?? '',
                usedCapacity: data?.usedCapacity ?? '',
            });
        } catch (error) {
            showAlert('error', error.message || 'Failed to load capacity');
        } finally {
            setCapacityLoading(false);
        }
    };

    const handleCapacitySave = async (event) => {
        event.preventDefault();
        const capacity = Number(capacityForm.capacity);
        const usedCapacity = Number(capacityForm.usedCapacity);

        if (Number.isNaN(capacity) || capacity < 0) {
            showAlert('error', 'Capacity must be zero or greater');
            return;
        }
        if (Number.isNaN(usedCapacity) || usedCapacity < 0) {
            showAlert('error', 'Used capacity must be zero or greater');
            return;
        }
        if (usedCapacity > capacity && capacity > 0) {
            showAlert('error', 'Used capacity cannot exceed total capacity');
            return;
        }

        try {
            await updateWarehouseCapacity(selectedWarehouse.id, { capacity, usedCapacity });
            showAlert('success', 'Warehouse capacity updated');
            setShowCapacityModal(false);
            fetchWarehouses();
        } catch (error) {
            showAlert('error', error.message || 'Failed to update capacity');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!formData.name.trim()) {
            showAlert('error', 'Warehouse name is required');
            return;
        }

        const capacity = formData.capacity === '' ? null : Number(formData.capacity);
        const usedCapacity = formData.usedCapacity === '' ? null : Number(formData.usedCapacity);

        if (capacity !== null && (Number.isNaN(capacity) || capacity < 0)) {
            showAlert('error', 'Capacity must be zero or greater');
            return;
        }
        if (usedCapacity !== null && (Number.isNaN(usedCapacity) || usedCapacity < 0)) {
            showAlert('error', 'Used capacity must be zero or greater');
            return;
        }
        if (capacity !== null && usedCapacity !== null && usedCapacity > capacity) {
            showAlert('error', 'Used capacity cannot exceed total capacity');
            return;
        }

        const payload = {
            ...formData,
            name: formData.name.trim(),
            location: formData.location.trim() || null,
            contactNumber: formData.contactNumber.trim() || null,
            capacity,
            usedCapacity,
        };

        try {
            if (editingWarehouse) {
                await updateWarehouse(editingWarehouse.id, payload);
                showAlert('success', 'Warehouse updated successfully');
            } else {
                await createWarehouse(payload);
                showAlert('success', 'Warehouse created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchWarehouses();
        } catch (error) {
            showAlert('error', error.message || 'Failed to save warehouse');
        }
    };

    const handleEdit = (warehouse) => {
        setEditingWarehouse(warehouse);
        setFormData({
            name: warehouse.name || '',
            location: warehouse.location || '',
            type: warehouse.type || 'PRIMARY',
            contactNumber: warehouse.contactNumber || '',
            isActive: warehouse.isActive !== false,
            capacity: warehouse.capacity ?? '',
            usedCapacity: warehouse.usedCapacity ?? '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this warehouse? This should only be done if it is no longer used operationally.')) return;
        try {
            await deleteWarehouse(id);
            showAlert('success', 'Warehouse deleted successfully');
            fetchWarehouses();
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete warehouse');
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Warehouse',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.location || 'No location set'}</div>
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            render: (value) => <Badge variant="info">{value || 'Unspecified'}</Badge>,
        },
        {
            key: 'isActive',
            header: 'Status',
            render: (value) => <Badge variant={value !== false ? 'success' : 'warning'}>{value !== false ? 'Active' : 'Inactive'}</Badge>,
        },
        {
            key: 'capacity',
            header: 'Capacity',
            render: (value, row) => {
                const capacity = Number(value || 0);
                const used = Number(row.usedCapacity || 0);
                const utilization = capacity > 0 ? Math.min((used / capacity) * 100, 100) : 0;
                return (
                    <div className="min-w-[180px] space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>{capacity > 0 ? `${formatNumber(used)} / ${formatNumber(capacity)}` : 'Not configured'}</span>
                            <span>{capacity > 0 ? `${formatNumber(utilization)}%` : '-'}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${capacity > 0 ? utilization : 0}%` }} />
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'contactNumber',
            header: 'Contact',
            render: (value) => <span className="text-sm text-slate-600 dark:text-slate-300">{value || 'No contact set'}</span>,
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex items-center justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openCapacityModal(row)}>Capacity</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => handleDelete(row.id)}>Delete</Button>
                </div>
            ),
            className: 'text-right',
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(19,91,236,0.16),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(16,185,129,0.14),_transparent_30%)]" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                                    Warehouse Operations
                                </span>
                                <InfoTip text="Use this page to manage storage sites, monitor capacity, and keep warehouse availability aligned with inventory planning." />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Warehouse network control tower.</h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Keep warehouse availability, contact ownership, and capacity posture visible before transfers, receiving, and replenishment decisions are made.
                            </p>
                        </div>
                        <Button icon="add" onClick={() => setShowModal(true)}>Add Warehouse</Button>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Total Warehouses" value={formatNumber(summary.total)} caption="All configured warehouse records" icon="warehouse" tone="blue" info="This includes both active and inactive sites." />
                    <MetricCard title="Active Sites" value={formatNumber(summary.active)} caption="Currently available for operations" icon="check_circle" tone="emerald" info="Inactive sites are excluded from day-to-day planning." />
                    <MetricCard title="Capacity Tracked" value={formatNumber(summary.tracked)} caption="Warehouses with capacity values configured" icon="speed" tone="amber" info="Capacity tracking helps surface utilization pressure before transfers are needed." />
                    <MetricCard title="Avg Utilization" value={`${formatNumber(summary.avgUtilization)}%`} caption="Average used capacity across tracked sites" icon="stacked_bar_chart" tone="violet" info="Average utilization only considers warehouses with non-zero capacity." />
                </div>

                <Card title="Operational Filters" subtitle="Narrow the network view to active or inactive sites" action={<InfoTip text="Use filters when cleaning up a warehouse estate or reviewing only active fulfillment locations." />}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Input label="Search" icon="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Name, location, type, or contact" />
                        <Select label="Status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={STATUS_OPTIONS} placeholder="All statuses" />
                        <div className="flex items-end gap-3">
                            <Button variant="secondary" onClick={() => setFilters({ search: '', status: '' })}>Reset</Button>
                            <Button icon="sync" onClick={fetchWarehouses}>Refresh</Button>
                        </div>
                    </div>
                </Card>

                <Card padding="none" className="overflow-hidden" title="Warehouse Register" subtitle="Capacity-aware view of every operational site" action={<InfoTip text="Capacity bars help planners spot constrained warehouses quickly, without opening each record." />}>
                    <DataTable columns={columns} data={filteredWarehouses} loading={loading} emptyMessage="No warehouses matched this view. Create a site or clear your filters." />
                </Card>
            </div>

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingWarehouse ? 'Edit Warehouse' : 'Create Warehouse'}>
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span>Core profile</span>
                        <InfoTip text="Warehouse profile data is used by transfers, stock movements, and inventory valuation reporting." />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input label="Warehouse name" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} placeholder="North distribution center" required />
                        <Select label="Warehouse type" value={formData.type} onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value }))} options={WAREHOUSE_TYPES} required />
                        <Input label="Location" value={formData.location} onChange={(event) => setFormData((current) => ({ ...current, location: event.target.value }))} placeholder="Dhaka, Zone A" />
                        <Input label="Contact number" value={formData.contactNumber} onChange={(event) => setFormData((current) => ({ ...current, contactNumber: event.target.value }))} placeholder="+8801..." />
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span>Capacity posture</span>
                        <InfoTip text="If you capture capacity here, planners can compare used versus total space directly from the warehouse register." />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input label="Capacity" type="number" min="0" value={formData.capacity} onChange={(event) => setFormData((current) => ({ ...current, capacity: event.target.value }))} placeholder="Optional total capacity" />
                        <Input label="Used capacity" type="number" min="0" value={formData.usedCapacity} onChange={(event) => setFormData((current) => ({ ...current, usedCapacity: event.target.value }))} placeholder="Optional used capacity" />
                    </div>

                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                        <input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData((current) => ({ ...current, isActive: event.target.checked }))} className="rounded border-slate-300 text-primary focus:ring-primary" />
                        <span>Warehouse is active for operational transactions</span>
                        <InfoTip text="Inactive warehouses stay visible historically but should not be used for new operational flows." />
                    </label>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit">{editingWarehouse ? 'Save Changes' : 'Create Warehouse'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showCapacityModal} onClose={() => setShowCapacityModal(false)} title={selectedWarehouse ? `Capacity - ${selectedWarehouse.name}` : 'Warehouse Capacity'}>
                {capacityLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
                    </div>
                ) : (
                    <form className="space-y-5" onSubmit={handleCapacitySave}>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <span>Capacity controls</span>
                            <InfoTip text="Keep used capacity current so planners can see which sites need balancing before new receipts or transfers." />
                        </div>
                        <Input label="Total capacity" type="number" min="0" value={capacityForm.capacity} onChange={(event) => setCapacityForm((current) => ({ ...current, capacity: event.target.value }))} required />
                        <Input label="Used capacity" type="number" min="0" value={capacityForm.usedCapacity} onChange={(event) => setCapacityForm((current) => ({ ...current, usedCapacity: event.target.value }))} required />
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" type="button" onClick={() => setShowCapacityModal(false)}>Cancel</Button>
                            <Button type="submit">Update Capacity</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Warehouses;