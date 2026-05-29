import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import {
    assignPicker,
    completePickingList,
    getPackingList,
    getPickingList,
    getPickingLists,
    updatePickingTask,
} from '../../services/pickingService';
import { getSalesOrders } from '../../services/salesOrderService';
import { getUsers } from '../../services/userService';
import { getWarehouses } from '../../services/warehouseService';
import {
    formatDateTime,
    getPickingStatusVariant,
    toList,
} from '../Sales/utils';
import {
    PICKING_STATUS_OPTIONS,
    showAlertHelper,
} from './constants';
import PickForm from './PickForm';
import PickingListDetailModal from './PickingListDetailModal';

const Picking = () => {
    const [pickingLists, setPickingLists] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [users, setUsers] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [filters, setFilters] = useState({ query: '', warehouseId: '', pickingStatus: '' });
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [alert, setAlert] = useState(null);
    const [showPickingForm, setShowPickingForm] = useState(false);
    const [selectedPicking, setSelectedPicking] = useState(null);
    const [pickingApiUnavailable, setPickingApiUnavailable] = useState(false);

    const showAlert = showAlertHelper(setAlert);

    const loadPage = async () => {
        setLoading(true);
        const results = await Promise.allSettled([
            getWarehouses(),
            getUsers(),
            getSalesOrders({ page: 0, size: 100 }),
            getPickingLists({ page: 0, size: 100 }),
        ]);
        const [warehouseResult, userResult, salesOrderResult, pickingResult] = results;

        if (warehouseResult.status === 'fulfilled') {
            setWarehouses(Array.isArray(warehouseResult.value) ? warehouseResult.value : []);
        }
        if (userResult.status === 'fulfilled') {
            setUsers(toList(userResult.value));
        }
        if (salesOrderResult.status === 'fulfilled') {
            setSalesOrders(toList(salesOrderResult.value));
        }
        if (pickingResult.status === 'fulfilled') {
            setPickingLists(toList(pickingResult.value));
            setPickingApiUnavailable(false);
        } else {
            setPickingLists([]);
            setPickingApiUnavailable(true);
            showAlert('warning', 'Picking register is unavailable from the current backend instance.');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadPage();
    }, []);

    const filteredPickingLists = useMemo(() => {
        const normalizedQuery = filters.query.trim().toLowerCase();
        return pickingLists.filter((pickingList) => {
            if (filters.warehouseId && pickingList.warehouseId !== filters.warehouseId) return false;
            if (filters.pickingStatus && pickingList.status !== filters.pickingStatus) return false;
            if (!normalizedQuery) return true;
            return [pickingList.pickingNumber, pickingList.warehouseName, pickingList.assignedToName]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [pickingLists, filters]);

    const eligibleForPicking = useMemo(
        () => salesOrders.filter((order) => ['CONFIRMED', 'BACKORDERED'].includes(order.status)),
        [salesOrders],
    );

    const runAction = async (action, successMessage) => {
        try {
            setWorking(true);
            const result = await action();
            showAlert('success', successMessage);
            await loadPage();
            return result;
        } catch (error) {
            showAlert('error', error.message || 'Fulfillment action failed');
            throw error;
        } finally {
            setWorking(false);
        }
    };

    const handleOpenPicking = async (row) => {
        if (pickingApiUnavailable) {
            showAlert('warning', 'Picking detail is unavailable from the current backend instance.');
            return;
        }
        try {
            const detail = await getPickingList(row.id);
            setSelectedPicking(detail);
        } catch (error) {
            showAlert('error', error.message || 'Failed to load picking list detail');
        }
    };

    const handleAssignPicker = async (pickingListId, userId) => {
        const updated = await runAction(() => assignPicker(pickingListId, userId), 'Picker assigned successfully');
        setSelectedPicking(updated);
    };

    const handleUpdateTask = async (taskId, draft) => {
        const updated = await runAction(
            () => updatePickingTask(taskId, { pickedQuantity: Number(draft.pickedQuantity || 0), notes: draft.notes || null }),
            'Picking task updated',
        );
        setSelectedPicking(updated);
    };

    const handleCompletePickingList = async (pickingListId) => {
        const updated = await runAction(() => completePickingList(pickingListId), 'Picking list completed');
        setSelectedPicking(updated);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Fulfillment Control"
                    title="Pick queue"
                    description="Wave and single-order picks currently active in the warehouse."
                    actions={(
                        <>
                            <Button variant="secondary" icon="sync" onClick={loadPage}>Refresh</Button>
                            <Button
                                variant="secondary"
                                icon="playlist_add"
                                onClick={() => setShowPickingForm(true)}
                                disabled={pickingApiUnavailable}
                            >
                                Generate Pick
                            </Button>
                        </>
                    )}
                    accent="from-orange-500/15 via-transparent to-cyan-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        placeholder="Search picking number, warehouse, or assignee"
                        value={filters.query}
                        onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                        className="min-w-[280px]"
                    />
                    <Select
                        value={filters.warehouseId}
                        onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))}
                        options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
                        placeholder="All warehouses"
                        className="min-w-[200px]"
                    />
                    <Select
                        value={filters.pickingStatus}
                        onChange={(event) => setFilters((current) => ({ ...current, pickingStatus: event.target.value }))}
                        options={PICKING_STATUS_OPTIONS}
                        placeholder="All statuses"
                        className="min-w-[180px]"
                    />
                </div>

                <Card padding="none" className="overflow-hidden" title="Picking Register" subtitle="Wave and single-order picks currently active in the warehouse">
                    <DataTable
                        loading={loading}
                        emptyMessage="No picking lists found."
                        onRowClick={handleOpenPicking}
                        columns={[
                            { key: 'pickingNumber', header: 'Picking List' },
                            { key: 'type', header: 'Type' },
                            { key: 'warehouseName', header: 'Warehouse' },
                            { key: 'assignedToName', header: 'Assigned To', render: (value) => value || 'Unassigned' },
                            { key: 'status', header: 'Status', render: (value) => <Badge variant={getPickingStatusVariant(value)}>{value}</Badge> },
                            { key: 'createdAt', header: 'Created', render: (value) => formatDateTime(value) },
                        ]}
                        data={filteredPickingLists}
                    />
                </Card>
            </div>

            <PickForm
                isOpen={showPickingForm}
                onClose={() => setShowPickingForm(false)}
                salesOrders={eligibleForPicking}
                users={users}
                pickingApiUnavailable={pickingApiUnavailable}
                onCreated={async (created) => {
                    setShowPickingForm(false);
                    showAlert('success', 'Picking list generated successfully');
                    await loadPage();
                    setSelectedPicking(created);
                }}
                onError={(message) => showAlert('error', message)}
                onWarning={(message) => showAlert('warning', message)}
            />

            <PickingListDetailModal
                pickingList={selectedPicking}
                isOpen={Boolean(selectedPicking)}
                onClose={() => setSelectedPicking(null)}
                users={users}
                onAssign={handleAssignPicker}
                onUpdateTask={handleUpdateTask}
                onComplete={handleCompletePickingList}
                onDownloadPackingList={getPackingList}
                loading={working}
            />
        </div>
    );
};

export default Picking;
