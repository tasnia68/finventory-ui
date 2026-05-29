import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    approveCycleCount,
    finishCycleCount,
    getCycleCount,
    getCycleCountItems,
    startCycleCount,
    submitCycleCountEntries,
} from '../../services/cycleCountService';
import { getUsers } from '../../services/userService';
import { Alert, Badge, Button, Card, DataTable, Input, MetricCard } from '../../components/common';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';
import ScheduleModal from './ScheduleModal';
import {
    formatDate,
    formatNumber,
    getStatusVariant,
    getUserLabel,
    toList,
} from './constants';

const CountEntry = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [count, setCount] = useState(null);
    const [items, setItems] = useState([]);
    const [entryDrafts, setEntryDrafts] = useState({});
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingEntries, setSavingEntries] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [alert, setAlert] = useState(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const loadCountWorkspace = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const [countData, itemsData] = await Promise.all([
                getCycleCount(id),
                getCycleCountItems(id),
            ]);
            const resolvedCount = countData?.data || countData;
            const resolvedItems = toList(itemsData);
            setCount(resolvedCount);
            setItems(resolvedItems);
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
                }, {}),
            );
        } catch (error) {
            showAlert('error', error.message || 'Failed to load cycle count details');
        } finally {
            setLoading(false);
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
        loadCountWorkspace();
        fetchUsers();
    }, [id]);

    const userOptions = useMemo(
        () => toList(users).map((user) => ({ value: user.id || user.userId, label: getUserLabel(user) })),
        [users],
    );

    const itemSummary = useMemo(() => {
        const lineCount = items.length;
        const countedLines = items.filter((item) => item.countedQuantity !== null && item.countedQuantity !== undefined).length;
        const varianceLines = items.filter((item) => Number(item.variance || 0) !== 0).length;
        const serialLines = items.filter((item) => (item.systemSerialNumbers || []).length > 0).length;
        return { lineCount, countedLines, varianceLines, serialLines };
    }, [items]);

    const handleEntryChange = (itemId, field, value) => {
        setEntryDrafts((current) => ({
            ...current,
            [itemId]: {
                ...current[itemId],
                [field]: value,
            },
        }));
    };

    const handleAction = async (action) => {
        if (!count?.id) return;
        try {
            setActionLoading(action);
            if (action === 'start') await startCycleCount(count.id);
            if (action === 'finish') await finishCycleCount(count.id);
            if (action === 'approve') await approveCycleCount(count.id);
            showAlert('success', `Cycle count ${action}d successfully`);
            await loadCountWorkspace();
        } catch (error) {
            showAlert('error', error.message || 'Cycle count action failed');
        } finally {
            setActionLoading('');
        }
    };

    const handleSaveEntries = async (event) => {
        event.preventDefault();
        if (!count?.id) return;

        try {
            setSavingEntries(true);
            const payload = items.map((item) => {
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
            await submitCycleCountEntries(count.id, payload);
            showAlert('success', 'Count entries saved successfully');
            await loadCountWorkspace();
        } catch (error) {
            showAlert('error', error.message || 'Failed to save count entries');
        } finally {
            setSavingEntries(false);
        }
    };

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

    const heroTitle = count
        ? `Count ${count.reference || count.id}`
        : 'Cycle count workspace';
    const heroDescription = count
        ? `${count.warehouseName || count.warehouseId} • ${count.type}`
        : 'Record physical counts against the frozen system snapshot.';

    return (
        <CatalogPageFrame>
            <CatalogHero
                eyebrow="Advanced Inventory"
                title={heroTitle}
                description={heroDescription}
                info="Update counted quantities and serials line-by-line, then finish and approve."
                actions={(
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" icon="arrow_back" onClick={() => navigate('/cycle-counts')}>Back</Button>
                        {count ? <Badge variant={getStatusVariant(count.status)}>{count.status}</Badge> : null}
                    </div>
                )}
            />

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            {count ? (
                <>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                        <MetricCard title="Lines" value={itemSummary.lineCount} caption="Frozen inventory positions in scope" icon="format_list_bulleted" tone="blue" className="h-full" />
                        <MetricCard title="Counted" value={itemSummary.countedLines} caption="Lines with recorded count data" icon="done_all" tone="emerald" className="h-full" />
                        <MetricCard title="Variance Lines" value={itemSummary.varianceLines} caption="Lines currently showing discrepancies" icon="difference" tone="rose" className="h-full" />
                        <MetricCard title="Serial-Controlled" value={itemSummary.serialLines} caption="Lines requiring serial verification" icon="qr_code_2" tone="violet" className="h-full" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">Due Date</div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(count.dueDate)}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">Assigned To</div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{count.assignedUserName || count.assignedUserId || 'Unassigned'}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">Description</div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{count.description || 'No description provided'}</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button variant="secondary" icon="event" onClick={() => setShowScheduleModal(true)}>Schedule</Button>
                        <Button variant="secondary" icon="play_circle" loading={actionLoading === 'start'} onClick={() => handleAction('start')}>Start</Button>
                        <Button variant="secondary" icon="check_circle" loading={actionLoading === 'finish'} onClick={() => handleAction('finish')}>Finish</Button>
                        <Button icon="verified" loading={actionLoading === 'approve'} onClick={() => handleAction('approve')}>Approve</Button>
                    </div>

                    <Card padding="none" className="overflow-hidden" title="Count Snapshot" subtitle="System snapshot versus recorded count results">
                        <DataTable columns={itemColumns} data={items} loading={loading} emptyMessage="No count items available for this cycle count." />
                    </Card>

                    <Card title="Count Entries" subtitle="Enter counted quantities, serials, and notes per line.">
                        <form className="space-y-4" onSubmit={handleSaveEntries}>
                            <div className="space-y-4">
                                {items.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                        No count items available for this cycle count.
                                    </div>
                                ) : items.map((item) => {
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
                                <Button type="submit" loading={savingEntries} disabled={items.length === 0}>Save Entries</Button>
                            </div>
                        </form>
                    </Card>
                </>
            ) : (
                <Card>
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {loading ? 'Loading cycle count...' : 'Cycle count not found.'}
                    </div>
                </Card>
            )}

            <ScheduleModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                count={count}
                userOptions={userOptions}
                onScheduled={() => {
                    showAlert('success', 'Cycle count scheduled successfully');
                    setShowScheduleModal(false);
                    loadCountWorkspace();
                }}
                onError={(message) => showAlert('error', message)}
            />
        </CatalogPageFrame>
    );
};

export default CountEntry;
