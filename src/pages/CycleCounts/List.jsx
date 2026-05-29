import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCycleCounts } from '../../services/cycleCountService';
import { getWarehouses } from '../../services/warehouseService';
import { getUsers } from '../../services/userService';
import { Alert, Badge, Button, Card, DataTable, InfoTip, MetricCard, Select } from '../../components/common';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';
import CreateModal from './CreateModal';
import ScheduleModal from './ScheduleModal';
import {
    STATUS_OPTIONS,
    formatDate,
    getStatusVariant,
    getUserLabel,
    toList,
} from './constants';

const CycleCountsList = () => {
    const navigate = useNavigate();

    const [counts, setCounts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleCount, setScheduleCount] = useState(null);
    const [filters, setFilters] = useState({ warehouseId: '', status: '' });

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

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

    useEffect(() => {
        fetchCounts();
        fetchWarehouses();
        fetchUsers();
    }, []);

    const warehouseOptions = useMemo(
        () => toList(warehouses).map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
        [warehouses],
    );

    const userOptions = useMemo(
        () => toList(users).map((user) => ({ value: user.id || user.userId, label: getUserLabel(user) })),
        [users],
    );

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

    const openScheduleModal = (count) => {
        setScheduleCount(count);
        setShowScheduleModal(true);
    };

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
                <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                    <Button variant="ghost" size="sm" icon="visibility" onClick={() => navigate(`/cycle-counts/${row.id}`)}>Open</Button>
                    <Button variant="secondary" size="sm" icon="event" onClick={() => openScheduleModal(row)}>Schedule</Button>
                </div>
            ),
        },
    ];

    return (
        <CatalogPageFrame>
            <CatalogHero
                eyebrow="Advanced Inventory"
                title="Cycle count execution from assignment to approval."
                description="Launch counts, inspect frozen system quantities, capture physical results, and move discrepancies through review without leaving the control room."
                info="The backend already supports item-level entry and serial-aware approvals. This screen exposes that workflow directly."
                actions={<Button icon="add" onClick={() => setShowCreateModal(true)}>Create Cycle Count</Button>}
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
                action={<InfoTip text="Open a count to record quantities or serial lists, then finish and approve from the count workspace." />}
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
                <DataTable
                    columns={columns}
                    data={visibleCounts}
                    loading={loading}
                    emptyMessage="No cycle counts found for the selected filters."
                    onRowClick={(row) => navigate(`/cycle-counts/${row.id}`)}
                />
            </Card>

            <CreateModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                warehouseOptions={warehouseOptions}
                userOptions={userOptions}
                onCreated={() => {
                    showAlert('success', 'Cycle count created');
                    setShowCreateModal(false);
                    fetchCounts();
                }}
                onError={(message) => showAlert('error', message)}
            />

            <ScheduleModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                count={scheduleCount}
                userOptions={userOptions}
                onScheduled={() => {
                    showAlert('success', 'Cycle count scheduled successfully');
                    setShowScheduleModal(false);
                    fetchCounts();
                }}
                onError={(message) => showAlert('error', message)}
            />
        </CatalogPageFrame>
    );
};

export default CycleCountsList;
