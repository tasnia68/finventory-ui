import React, { useEffect, useMemo, useState } from 'react';
import {
    approveCycleCount,
    createCycleCount,
    finishCycleCount,
    getCycleCount,
    getCycleCounts,
    getCycleCountItems,
    scheduleCycleCount,
    startCycleCount,
    submitCycleCountEntries,
} from '../../services/cycleCountService';
import { getWarehouses } from '../../services/warehouseService';
import { getUsers } from '../../services/userService';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, Modal, Select } from '../../components/common';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

const COUNT_TYPES = [
    { value: 'FULL', label: 'Full' },
    { value: 'PARTIAL', label: 'Partial' },
    { value: 'SPOT_CHECK', label: 'Spot check' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'REVIEW', label: 'Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'COMPLETED', label: 'Completed' },
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

const formatNumber = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

const getStatusVariant = (status) => {
    if (status === 'APPROVED' || status === 'COMPLETED') return 'success';
    if (status === 'IN_PROGRESS' || status === 'REVIEW') return 'warning';
    if (status === 'CANCELLED') return 'danger';
    return 'info';
};

const getUserLabel = (user) => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email || user.id;
};

const CycleCounts = () => {
    const [counts, setCounts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [savingEntries, setSavingEntries] = useState(false);
    const [alert, setAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [selectedCount, setSelectedCount] = useState(null);
    const [selectedCountItems, setSelectedCountItems] = useState([]);
    const [filters, setFilters] = useState({ warehouseId: '', status: '' });
    const [formData, setFormData] = useState({
        warehouseId: '',
        type: 'FULL',
        dueDate: '',
        description: '',
        assignedUserId: '',
    });
    const [scheduleForm, setScheduleForm] = useState({
        dueDate: '',
        description: '',
        assignedUserId: '',
    });
    const [entryDrafts, setEntryDrafts] = useState({});

    useEffect(() => {
        fetchCounts();
        fetchWarehouses();
        fetchUsers();
    }, []);

    const fetchCounts = async () => {
        try {
            setLoading(true);
            const data = await getCycleCounts();
            setCounts(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load cycle counts');
        } finally {
            setLoading(false);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const data = await getWarehouses();
            setWarehouses(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load users');
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createCycleCount(formData);
            showAlert('success', 'Cycle count created');
            setShowModal(false);
            setFormData({ warehouseId: '', type: 'FULL', dueDate: '', description: '', assignedUserId: '' });
            fetchCounts();
        } catch (error) {
            showAlert('error', error.message || 'Failed to create cycle count');
        }
    };

    const loadCountWorkspace = async (countId) => {
        try {
            setDetailsLoading(true);
            const [count, items] = await Promise.all([
                getCycleCount(countId),
                getCycleCountItems(countId),
            ]);
            const resolvedCount = count?.data || count;
            const resolvedItems = toList(items);
            setSelectedCount(resolvedCount);
            setSelectedCountItems(resolvedItems);
            setEntryDrafts(
                resolvedItems.reduce((accumulator, item) => {
                    accumulator[item.id] = {
                        productVariantId: item.productVariantId,
                        storageLocationId: item.storageLocationId || '',
                        batchId: item.batchId || '',
                        countedQuantity: item.countedQuantity ?? item.systemQuantity ?? '',
                        serialNumbers: (item.countedSerialNumbers || item.systemSerialNumbers || []).join(', '),
                        notes: item.notes || '',
                    };
                    return accumulator;
                }, {})
            );
        } catch (error) {
            showAlert('error', error.message || 'Failed to load cycle count details');
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleAction = async (action, count = selectedCount) => {
        if (!count?.id) return;
        try {
            if (action === 'schedule') {
                await scheduleCycleCount(count.id, {
                    dueDate: scheduleForm.dueDate || null,
                    description: scheduleForm.description || null,
                    assignedUserId: scheduleForm.assignedUserId || null,
                });
                setShowScheduleModal(false);
            }
            if (action === 'start') await startCycleCount(count.id);
            if (action === 'finish') await finishCycleCount(count.id);
            if (action === 'approve') await approveCycleCount(count.id);
            showAlert('success', `Cycle count ${action}d successfully`);
            await fetchCounts();
            await loadCountWorkspace(count.id);
        } catch (error) {
            showAlert('error', error.message || 'Cycle count action failed');
        }
    };

    const openScheduleModal = (count) => {
        setSelectedCount(count);
        setScheduleForm({
            dueDate: count.dueDate || '',
            description: count.description || '',
            assignedUserId: count.assignedUserId || '',
        });
        setShowScheduleModal(true);
    };

    const openEntryWorkspace = async () => {
        if (!selectedCount?.id) return;
        await loadCountWorkspace(selectedCount.id);
        setShowEntryModal(true);
    };

    const handleEntryChange = (itemId, field, value) => {
        setEntryDrafts((current) => ({
            ...current,
            [itemId]: {
                ...current[itemId],
                [field]: value,
            },
        }));
    };

    const handleSaveEntries = async (event) => {
        event.preventDefault();
        if (!selectedCount?.id) return;

        try {
            setSavingEntries(true);
            const payload = selectedCountItems.map((item) => {
                const draft = entryDrafts[item.id] || {};
                return {
                    productVariantId: item.productVariantId,
                    storageLocationId: draft.storageLocationId || null,
                    batchId: draft.batchId || null,
                    countedQuantity: Number(draft.countedQuantity || 0),
                    serialNumbers: draft.serialNumbers
                        ? draft.serialNumbers.split(',').map((serial) => serial.trim()).filter(Boolean)
                        : [],
                    notes: draft.notes || null,
                };
            });
            await submitCycleCountEntries(selectedCount.id, payload);
            showAlert('success', 'Count entries saved successfully');
            setShowEntryModal(false);
            await loadCountWorkspace(selectedCount.id);
        } catch (error) {
            showAlert('error', error.message || 'Failed to save count entries');
        } finally {
            setSavingEntries(false);
        }
    };

    const warehouseOptions = toList(warehouses).map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name,
    }));

    const userOptions = toList(users).map((user) => ({
        value: user.id || user.userId,
        label: getUserLabel(user),
    }));

    const visibleCounts = useMemo(() => {
        return counts.filter((count) => {
            const matchesWarehouse = !filters.warehouseId || count.warehouseId === filters.warehouseId;
            const matchesStatus = !filters.status || count.status === filters.status;
            return matchesWarehouse && matchesStatus;
        });
    }, [counts, filters.status, filters.warehouseId]);

    const summary = useMemo(() => {
        const inProgress = visibleCounts.filter((count) => count.status === 'IN_PROGRESS').length;
        const reviewQueue = visibleCounts.filter((count) => count.status === 'REVIEW').length;
        const approved = visibleCounts.filter((count) => count.status === 'APPROVED').length;
        const overdue = visibleCounts.filter((count) => {
            if (!count.dueDate || ['APPROVED', 'COMPLETED', 'CANCELLED'].includes(count.status)) return false;
            return new Date(count.dueDate).getTime() < Date.now();
        }).length;
        return { inProgress, reviewQueue, approved, overdue };
    }, [visibleCounts]);

    const itemSummary = useMemo(() => {
        const lineCount = selectedCountItems.length;
        const countedLines = selectedCountItems.filter((item) => item.countedQuantity !== null && item.countedQuantity !== undefined).length;
        const varianceLines = selectedCountItems.filter((item) => Number(item.variance || 0) !== 0).length;
        const serialLines = selectedCountItems.filter((item) => (item.systemSerialNumbers || []).length > 0).length;
        return { lineCount, countedLines, varianceLines, serialLines };
    }, [selectedCountItems]);

    const columns = [
        {
            key: 'id',
            header: 'Cycle Count',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{row.reference || row.id}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.warehouseName || row.warehouseId}</div>
                </div>
            ),
        },
        { key: 'type', header: 'Type' },
        { key: 'status', header: 'Status', render: (value) => <Badge variant={getStatusVariant(value)}>{value || 'DRAFT'}</Badge> },
        { key: 'dueDate', header: 'Due', render: (value) => formatDate(value) },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" icon="visibility" onClick={() => loadCountWorkspace(row.id)}>Open</Button>
                    <Button variant="secondary" size="sm" icon="event" onClick={() => openScheduleModal(row)}>Schedule</Button>
                </div>
            ),
        },
    ];

    const itemColumns = [
        {
            key: 'productVariantSku',
            header: 'Item',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || row.productVariantName || row.productVariantId}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.storageLocationName || row.batchNumber || 'Warehouse level'}</div>
                </div>
            ),
        },
        { key: 'systemQuantity', header: 'System', render: (value) => formatNumber(value) },
        { key: 'countedQuantity', header: 'Counted', render: (value) => value === null || value === undefined ? '-' : formatNumber(value) },
        {
            key: 'variance',
            header: 'Variance',
            render: (value) => {
                const amount = Number(value || 0);
                const tone = amount === 0 ? 'default' : amount > 0 ? 'warning' : 'danger';
                return <Badge variant={tone}>{formatNumber(amount)}</Badge>;
            },
        },
        {
            key: 'systemSerialNumbers',
            header: 'Serial Control',
            render: (value, row) => ((row.systemSerialNumbers || []).length > 0 ? `${row.systemSerialNumbers.length} serial(s)` : 'Quantity only'),
        },
    ];

    return (
        <CatalogPageFrame>
            <CatalogHero
                eyebrow="Advanced Inventory"
                title="Cycle count execution from assignment to approval."
                description="Launch counts, inspect frozen system quantities, capture physical results, and move discrepancies through review without leaving the control room."
                info="The backend already supports item-level entry and serial-aware approvals. This screen exposes that workflow directly."
                actions={<Button icon="add" onClick={() => setShowModal(true)}>Create Cycle Count</Button>}
            />

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="In Progress" value={summary.inProgress} caption="Counts actively being executed" icon="play_circle" tone="amber" />
                <MetricCard title="Review Queue" value={summary.reviewQueue} caption="Counts waiting for approval" icon="fact_check" tone="blue" />
                <MetricCard title="Approved" value={summary.approved} caption="Counts already validated" icon="verified" tone="emerald" />
                <MetricCard title="Overdue" value={summary.overdue} caption="Open counts past due date" icon="event_busy" tone="rose" />
            </div>

            <Card
                title="Count Register"
                subtitle="Filter by warehouse or lifecycle, then open a count to work its lines."
                action={<InfoTip text="Use the line workspace to record quantities or serial lists, then finish and approve from the selected count panel." />}
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
                    <div className="flex items-end gap-3">
                        <Button variant="secondary" onClick={() => setFilters({ warehouseId: '', status: '' })}>Reset</Button>
                        <Button onClick={fetchCounts}>Refresh</Button>
                    </div>
                </div>
            </Card>

            <Card padding="none" className="overflow-hidden" title="Cycle Count List" subtitle="Open a count to inspect frozen quantities and submit entries.">
                <DataTable columns={columns} data={visibleCounts} loading={loading} emptyMessage="No cycle counts found for the selected filters." onRowClick={(row) => loadCountWorkspace(row.id)} />
            </Card>

            <Card
                title={selectedCount ? `Count Workspace - ${selectedCount.reference || selectedCount.id}` : 'Count Workspace'}
                subtitle={selectedCount ? `${selectedCount.warehouseName || selectedCount.warehouseId} • ${selectedCount.type}` : 'Select a cycle count to inspect its lines and actions.'}
                action={selectedCount ? <Badge variant={getStatusVariant(selectedCount.status)}>{selectedCount.status}</Badge> : null}
            >
                {selectedCount ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                            <MetricCard title="Lines" value={itemSummary.lineCount} caption="Frozen inventory positions in scope" icon="format_list_bulleted" tone="blue" className="h-full" />
                            <MetricCard title="Counted" value={itemSummary.countedLines} caption="Lines with recorded count data" icon="done_all" tone="emerald" className="h-full" />
                            <MetricCard title="Variance Lines" value={itemSummary.varianceLines} caption="Lines currently showing discrepancies" icon="difference" tone="rose" className="h-full" />
                            <MetricCard title="Serial-Controlled" value={itemSummary.serialLines} caption="Lines requiring serial verification" icon="qr_code_2" tone="violet" className="h-full" />
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">Due Date</div>
                                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(selectedCount.dueDate)}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">Assigned To</div>
                                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedCount.assignedUserName || selectedCount.assignedUserId || 'Unassigned'}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">Description</div>
                                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedCount.description || 'No description provided'}</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button variant="secondary" icon="event" onClick={() => openScheduleModal(selectedCount)}>Schedule</Button>
                            <Button variant="secondary" icon="play_circle" onClick={() => handleAction('start')}>Start</Button>
                            <Button variant="secondary" icon="edit_note" onClick={openEntryWorkspace}>Enter Counts</Button>
                            <Button variant="secondary" icon="check_circle" onClick={() => handleAction('finish')}>Finish</Button>
                            <Button icon="verified" onClick={() => handleAction('approve')}>Approve</Button>
                        </div>

                        <Card padding="none" className="overflow-hidden" title="Count Lines" subtitle="System snapshot versus recorded count results">
                            <DataTable columns={itemColumns} data={selectedCountItems} loading={detailsLoading} emptyMessage="No count items available for this cycle count." />
                        </Card>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Select a cycle count from the register to inspect its item list, update scheduling, and enter counted quantities.
                    </div>
                )}
            </Card>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Cycle Count">
                <form className="space-y-4" onSubmit={handleCreate}>
                    <Select
                        label="Warehouse"
                        value={formData.warehouseId}
                        onChange={(event) => setFormData((current) => ({ ...current, warehouseId: event.target.value }))}
                        options={warehouseOptions}
                        required
                    />
                    <Select
                        label="Type"
                        value={formData.type}
                        onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value }))}
                        options={COUNT_TYPES}
                        required
                    />
                    <Input
                        label="Due Date"
                        type="date"
                        value={formData.dueDate}
                        onChange={(event) => setFormData((current) => ({ ...current, dueDate: event.target.value }))}
                    />
                    <Select
                        label="Assigned User"
                        value={formData.assignedUserId}
                        onChange={(event) => setFormData((current) => ({ ...current, assignedUserId: event.target.value }))}
                        options={userOptions}
                        placeholder="Unassigned"
                    />
                    <Input
                        label="Description"
                        value={formData.description}
                        onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                    />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit">Create</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Schedule Cycle Count">
                <form className="space-y-4" onSubmit={(event) => {
                    event.preventDefault();
                    handleAction('schedule', selectedCount);
                }}>
                    <Input
                        label="Due Date"
                        type="date"
                        value={scheduleForm.dueDate}
                        onChange={(event) => setScheduleForm((current) => ({ ...current, dueDate: event.target.value }))}
                    />
                    <Select
                        label="Assigned User"
                        value={scheduleForm.assignedUserId}
                        onChange={(event) => setScheduleForm((current) => ({ ...current, assignedUserId: event.target.value }))}
                        options={userOptions}
                        placeholder="Unassigned"
                    />
                    <Input
                        label="Description"
                        value={scheduleForm.description}
                        onChange={(event) => setScheduleForm((current) => ({ ...current, description: event.target.value }))}
                    />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
                        <Button type="submit">Save Schedule</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} title={`Count Entries${selectedCount ? ` - ${selectedCount.reference || selectedCount.id}` : ''}`} size="xl">
                <form className="space-y-4" onSubmit={handleSaveEntries}>
                    <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
                        {selectedCountItems.map((item) => {
                            const draft = entryDrafts[item.id] || {};
                            return (
                                <div key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="mb-4 flex flex-col gap-1">
                                        <div className="font-semibold text-slate-900 dark:text-white">{item.productVariantSku || item.productVariantName || item.productVariantId}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{item.storageLocationName || item.batchNumber || 'Warehouse level'} • System qty: {formatNumber(item.systemQuantity)}</div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <Input
                                            label="Counted Quantity"
                                            type="number"
                                            value={draft.countedQuantity}
                                            onChange={(event) => handleEntryChange(item.id, 'countedQuantity', event.target.value)}
                                        />
                                        <Input
                                            label="Serial Numbers"
                                            value={draft.serialNumbers}
                                            onChange={(event) => handleEntryChange(item.id, 'serialNumbers', event.target.value)}
                                            placeholder="Comma-separated serial numbers"
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                                        <textarea
                                            value={draft.notes}
                                            onChange={(event) => handleEntryChange(item.id, 'notes', event.target.value)}
                                            rows={3}
                                            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowEntryModal(false)}>Cancel</Button>
                        <Button type="submit" loading={savingEntries}>Save Entries</Button>
                    </div>
                </form>
            </Modal>
        </CatalogPageFrame>
    );
};

export default CycleCounts;