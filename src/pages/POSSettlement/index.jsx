import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    approvePosShiftSettlement,
    cancelSuspendedPosSale,
    fetchCurrentPosShift,
    fetchPosSales,
    getDailyPosSettlement,
    getPosBootstrap,
    getPosShiftSettlement,
    getSuspendedPosSales,
    recordPosCashMovement,
} from '../../services/posService';

const todayValue = () => new Date().toISOString().slice(0, 10);

const approvalVariant = (status) => {
    switch (status) {
        case 'APPROVED':
            return 'success';
        case 'PENDING_APPROVAL':
            return 'warning';
        case 'REJECTED':
            return 'danger';
        default:
            return 'default';
    }
};

const shiftStatusVariant = (status) => {
    switch (status) {
        case 'OPEN':
            return 'success';
        case 'CLOSED':
            return 'default';
        default:
            return 'warning';
    }
};

const cashMovementTypeOptions = [
    { value: 'PAY_IN', label: 'Pay In' },
    { value: 'PAY_OUT', label: 'Pay Out' },
    { value: 'PETTY_CASH', label: 'Petty Cash' },
    { value: 'FLOAT_ADJUSTMENT', label: 'Float Adjustment' },
];

const PosSettlement = () => {
    const { t, formatCurrency, formatDateTime } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [alert, setAlert] = useState(null);
    const [terminals, setTerminals] = useState([]);
    const [selectedTerminalId, setSelectedTerminalId] = useState('');
    const [businessDate, setBusinessDate] = useState(todayValue());
    const [activeShift, setActiveShift] = useState(null);
    const [dailySettlement, setDailySettlement] = useState(null);
    const [settlementRegister, setSettlementRegister] = useState([]);
    const [selectedShiftId, setSelectedShiftId] = useState('');
    const [selectedSettlement, setSelectedSettlement] = useState(null);
    const [suspendedSales, setSuspendedSales] = useState([]);
    const [cashMovementForm, setCashMovementForm] = useState({
        type: 'PAY_IN',
        amount: '',
        reason: '',
        referenceNumber: '',
        notes: '',
    });

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadWorkspace = async ({ terminalId, businessDateValue, preferredShiftId } = {}) => {
        const nextTerminalId = terminalId ?? selectedTerminalId;
        const nextDate = businessDateValue ?? businessDate;
        if (!nextTerminalId) {
            setLoading(false);
            return;
        }

        try {
            setRefreshing(true);
            const [currentShift, recentSales, dailyData, suspendedData] = await Promise.all([
                fetchCurrentPosShift(nextTerminalId),
                fetchPosSales({ terminalId: nextTerminalId, size: 60 }),
                getDailyPosSettlement({ businessDate: nextDate, terminalId: nextTerminalId }),
                getSuspendedPosSales(nextTerminalId),
            ]);

            const shiftIds = Array.from(new Set([
                currentShift?.id,
                ...recentSales.map((sale) => sale.shiftId),
            ].filter(Boolean)));

            const settlements = (await Promise.all(
                shiftIds.slice(0, 8).map(async (shiftId) => {
                    try {
                        return await getPosShiftSettlement(shiftId);
                    } catch {
                        return null;
                    }
                }),
            )).filter(Boolean).sort((left, right) => new Date(right.openedAt || right.closedAt || 0) - new Date(left.openedAt || left.closedAt || 0));

            const resolvedShiftId = preferredShiftId && settlements.some((item) => item.shiftId === preferredShiftId)
                ? preferredShiftId
                : currentShift?.id || settlements[0]?.shiftId || '';

            setActiveShift(currentShift);
            setDailySettlement(dailyData);
            setSettlementRegister(settlements);
            setSuspendedSales(suspendedData);
            setSelectedShiftId(resolvedShiftId);
            setSelectedSettlement(settlements.find((item) => item.shiftId === resolvedShiftId) || null);
        } catch (error) {
            showAlert('error', error.message || t('posSettlement.messages.loadFailed'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const bootstrap = async () => {
            try {
                setLoading(true);
                const payload = await getPosBootstrap();
                setTerminals(payload.terminals || []);
                const defaultTerminalId = payload.activeShift?.terminalId || payload.terminals?.[0]?.id || '';
                setSelectedTerminalId(defaultTerminalId);
                if (defaultTerminalId) {
                    await loadWorkspace({ terminalId: defaultTerminalId, businessDateValue: todayValue(), preferredShiftId: payload.activeShift?.id || '' });
                }
            } catch (error) {
                showAlert('error', error.message || t('posSettlement.messages.bootstrapFailed'));
                setLoading(false);
            }
        };

        bootstrap();
    }, []);

    useEffect(() => {
        if (selectedShiftId) {
            setSelectedSettlement(settlementRegister.find((item) => item.shiftId === selectedShiftId) || null);
        }
    }, [selectedShiftId, settlementRegister]);

    const selectedTerminal = useMemo(() => terminals.find((terminal) => terminal.id === selectedTerminalId) || null, [terminals, selectedTerminalId]);

    const metrics = useMemo(() => ({
        totalSales: Number(dailySettlement?.totalSales || selectedSettlement?.totalSales || 0),
        expectedCash: Number(selectedSettlement?.expectedCashAmount || dailySettlement?.expectedCash || 0),
        overShort: Number(selectedSettlement?.overShortAmount || dailySettlement?.overShortAmount || 0),
        suspendedCount: suspendedSales.length,
    }), [dailySettlement, selectedSettlement, suspendedSales.length]);

    const shiftColumns = [
        {
            key: 'shiftId',
            header: t('posSettlement.columns.shift'),
            render: (_value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{row.terminalName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.cashierName}</div>
                </div>
            ),
        },
        {
            key: 'shiftStatus',
            header: t('posSettlement.columns.status'),
            render: (value, row) => (
                <div className="flex flex-col gap-2">
                    <Badge variant={shiftStatusVariant(value)}>{value}</Badge>
                    <Badge variant={approvalVariant(row.settlementApprovalStatus)}>{row.settlementApprovalStatus}</Badge>
                </div>
            ),
        },
        {
            key: 'totalSales',
            header: t('posSettlement.columns.totalSales'),
            render: (value) => formatCurrency(value || 0),
        },
        {
            key: 'expectedCashAmount',
            header: t('posSettlement.columns.expectedCash'),
            render: (value) => formatCurrency(value || 0),
        },
        {
            key: 'overShortAmount',
            header: t('posSettlement.columns.overShort'),
            render: (value) => (
                <span className={Number(value || 0) === 0 ? 'text-slate-500 dark:text-slate-400' : Number(value || 0) > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}>
                    {formatCurrency(value || 0)}
                </span>
            ),
        },
    ];

    const suspendedColumns = [
        { key: 'suspendedNumber', header: t('posSettlement.columns.holdNumber') },
        { key: 'customerName', header: t('posSettlement.columns.customer') },
        { key: 'suspendedAt', header: t('posSettlement.columns.suspendedAt'), render: (value) => formatDateTime(value) },
        { key: 'totalAmount', header: t('posSettlement.columns.total'), render: (value, row) => formatCurrency(value || 0, row.currency || 'USD') },
        {
            key: 'actions',
            header: t('posSettlement.columns.actions'),
            render: (_value, row) => (
                <div className="flex gap-2">
                    <Link to="/pos" className="inline-flex"><Button size="sm" variant="secondary">{t('posSettlement.actions.openSellScreen')}</Button></Link>
                    <Button size="sm" variant="ghost" loading={actionLoading === `cancel-${row.id}`} onClick={async (event) => {
                        event.stopPropagation();
                        try {
                            setActionLoading(`cancel-${row.id}`);
                            await cancelSuspendedPosSale(row.id);
                            await loadWorkspace({ preferredShiftId: selectedShiftId });
                            showAlert('success', t('posSettlement.messages.suspendedCancelled'));
                        } catch (error) {
                            showAlert('error', error.message || t('posSettlement.messages.suspendedCancelFailed'));
                        } finally {
                            setActionLoading('');
                        }
                    }}>{t('posSettlement.actions.cancel')}</Button>
                </div>
            ),
        },
    ];

    if (loading) {
        return <div className="flex-1 bg-background-light dark:bg-background-dark" />;
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-8">
                <SalesHero
                    eyebrow={t('posSettlement.eyebrow')}
                    title={t('posSettlement.title')}
                    description={t('posSettlement.description')}
                    actions={(
                        <>
                            <Select
                                value={selectedTerminalId}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setSelectedTerminalId(value);
                                    loadWorkspace({ terminalId: value, businessDateValue: businessDate, preferredShiftId: '' });
                                }}
                                options={terminals.map((terminal) => ({ value: terminal.id, label: `${terminal.name} • ${terminal.warehouseName}` }))}
                                placeholder={t('posSettlement.filters.terminal')}
                                className="min-w-[280px]"
                            />
                            <Input
                                type="date"
                                value={businessDate}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setBusinessDate(value);
                                    loadWorkspace({ terminalId: selectedTerminalId, businessDateValue: value, preferredShiftId: selectedShiftId });
                                }}
                                label={t('posSettlement.filters.businessDate')}
                            />
                            <Button variant="secondary" icon="sync" onClick={() => loadWorkspace({ preferredShiftId: selectedShiftId })} loading={refreshing}>{t('posSettlement.actions.refresh')}</Button>
                            <Link to="/pos/register" className="inline-flex"><Button variant="secondary" icon="point_of_sale">{t('posSettlement.actions.manageRegister')}</Button></Link>
                            <Link to="/pos" className="inline-flex"><Button variant="secondary" icon="shopping_cart">{t('posSettlement.actions.openSellScreen')}</Button></Link>
                        </>
                    )}
                    accent="from-amber-500/15 via-transparent to-emerald-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title={t('posSettlement.metrics.totalSales')} value={formatCurrency(metrics.totalSales)} caption={t('posSettlement.metricCaption.totalSales')} info={t('posSettlement.metricInfo.totalSales')} icon="payments" tone="blue" />
                    <MetricCard title={t('posSettlement.metrics.expectedCash')} value={formatCurrency(metrics.expectedCash)} caption={t('posSettlement.metricCaption.expectedCash')} info={t('posSettlement.metricInfo.expectedCash')} icon="account_balance_wallet" tone="emerald" />
                    <MetricCard title={t('posSettlement.metrics.overShort')} value={formatCurrency(metrics.overShort)} caption={t('posSettlement.metricCaption.overShort')} info={t('posSettlement.metricInfo.overShort')} icon="rule" tone="amber" />
                    <MetricCard title={t('posSettlement.metrics.suspendedSales')} value={metrics.suspendedCount} caption={t('posSettlement.metricCaption.suspendedSales')} info={t('posSettlement.metricInfo.suspendedSales')} icon="pause_circle" tone="violet" />
                </div>

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="flex flex-col gap-8">
                        <Card padding="none" className="overflow-hidden rounded-[30px]" title={t('posSettlement.register.title')} subtitle={t('posSettlement.register.subtitle')} action={<InfoTip text={t('posSettlement.register.info')} />}>
                            <DataTable columns={shiftColumns} data={settlementRegister} emptyMessage={t('posSettlement.register.empty')} onRowClick={(row) => setSelectedShiftId(row.shiftId)} />
                        </Card>

                        <Card padding="none" className="overflow-hidden rounded-[30px]" title={t('posSettlement.suspended.title')} subtitle={t('posSettlement.suspended.subtitle')} action={<InfoTip text={t('posSettlement.suspended.info')} />}>
                            <DataTable columns={suspendedColumns} data={suspendedSales} emptyMessage={t('posSettlement.suspended.empty')} />
                        </Card>
                    </div>

                    <div className="flex flex-col gap-8">
                        <Card className="rounded-[30px]" title={t('posSettlement.detail.title')} subtitle={selectedSettlement ? selectedSettlement.terminalName : t('posSettlement.detail.emptySubtitle')} action={<InfoTip text={t('posSettlement.detail.info')} />}>
                            {selectedSettlement ? (
                                <div className="space-y-6">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant={shiftStatusVariant(selectedSettlement.shiftStatus)}>{selectedSettlement.shiftStatus}</Badge>
                                                <Badge variant={approvalVariant(selectedSettlement.settlementApprovalStatus)}>{selectedSettlement.settlementApprovalStatus}</Badge>
                                            </div>
                                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{selectedSettlement.cashierName} • {formatDateTime(selectedSettlement.openedAt)}</p>
                                        </div>
                                        {selectedSettlement.settlementApprovalStatus === 'PENDING_APPROVAL' ? (
                                            <div className="flex gap-2">
                                                <Button size="sm" loading={actionLoading === 'approve'} onClick={async () => {
                                                    try {
                                                        setActionLoading('approve');
                                                        const updated = await approvePosShiftSettlement(selectedSettlement.shiftId, { approved: true, notes: 'Approved from POS settlement workspace' });
                                                        setSelectedSettlement(updated);
                                                        await loadWorkspace({ preferredShiftId: updated.shiftId });
                                                        showAlert('success', t('posSettlement.messages.approved'));
                                                    } catch (error) {
                                                        showAlert('error', error.message || t('posSettlement.messages.approvalFailed'));
                                                    } finally {
                                                        setActionLoading('');
                                                    }
                                                }}>{t('posSettlement.actions.approve')}</Button>
                                                <Button size="sm" variant="secondary" loading={actionLoading === 'reject'} onClick={async () => {
                                                    try {
                                                        setActionLoading('reject');
                                                        const updated = await approvePosShiftSettlement(selectedSettlement.shiftId, { approved: false, notes: 'Rejected from POS settlement workspace' });
                                                        setSelectedSettlement(updated);
                                                        await loadWorkspace({ preferredShiftId: updated.shiftId });
                                                        showAlert('success', t('posSettlement.messages.rejected'));
                                                    } catch (error) {
                                                        showAlert('error', error.message || t('posSettlement.messages.approvalFailed'));
                                                    } finally {
                                                        setActionLoading('');
                                                    }
                                                }}>{t('posSettlement.actions.reject')}</Button>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="rounded-3xl border border-slate-200 p-4 dark:border-slate-700">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t('posSettlement.detail.reconciliation')}</p>
                                            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center justify-between"><span>{t('posSettlement.labels.openingFloat')}</span><span>{formatCurrency(selectedSettlement.openingFloat || 0)}</span></div>
                                                <div className="flex items-center justify-between"><span>{t('posSettlement.labels.totalSales')}</span><span>{formatCurrency(selectedSettlement.totalSales || 0)}</span></div>
                                                <div className="flex items-center justify-between"><span>{t('posSettlement.labels.totalRefunds')}</span><span>{formatCurrency(selectedSettlement.totalRefunds || 0)}</span></div>
                                                <div className="flex items-center justify-between"><span>{t('posSettlement.labels.cashInflows')}</span><span>{formatCurrency(selectedSettlement.totalCashInflows || 0)}</span></div>
                                                <div className="flex items-center justify-between"><span>{t('posSettlement.labels.cashOutflows')}</span><span>{formatCurrency(selectedSettlement.totalCashOutflows || 0)}</span></div>
                                                <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700"><span>{t('posSettlement.labels.expectedCash')}</span><span>{formatCurrency(selectedSettlement.expectedCashAmount || 0)}</span></div>
                                                <div className="flex items-center justify-between"><span>{t('posSettlement.labels.declaredCash')}</span><span>{formatCurrency(selectedSettlement.declaredCashAmount || 0)}</span></div>
                                                <div className="flex items-center justify-between font-semibold"><span>{t('posSettlement.labels.overShort')}</span><span>{formatCurrency(selectedSettlement.overShortAmount || 0)}</span></div>
                                            </div>
                                        </div>
                                        <div className="rounded-3xl border border-slate-200 p-4 dark:border-slate-700">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t('posSettlement.detail.notes')}</p>
                                            <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                                <p><span className="font-semibold text-slate-900 dark:text-white">{t('posSettlement.labels.closeNotes')}:</span> {selectedSettlement.closingNotes || t('posSettlement.empty.noNotes')}</p>
                                                <p><span className="font-semibold text-slate-900 dark:text-white">{t('posSettlement.labels.approvalNotes')}:</span> {selectedSettlement.settlementApprovalNotes || t('posSettlement.empty.noNotes')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Card padding="none" className="overflow-hidden rounded-[24px] border-dashed" title={t('posSettlement.tenders.title')} subtitle={t('posSettlement.tenders.subtitle')} action={<InfoTip text={t('posSettlement.tenders.info')} />}>
                                        <DataTable
                                            columns={[
                                                { key: 'paymentMethod', header: t('posSettlement.columns.paymentMethod') },
                                                { key: 'expectedAmount', header: t('posSettlement.columns.expectedCash'), render: (value) => formatCurrency(value || 0) },
                                                { key: 'declaredAmount', header: t('posSettlement.columns.declaredCash'), render: (value) => formatCurrency(value || 0) },
                                                { key: 'varianceAmount', header: t('posSettlement.columns.variance'), render: (value) => formatCurrency(value || 0) },
                                            ]}
                                            data={selectedSettlement.tenderCounts || []}
                                            emptyMessage={t('posSettlement.tenders.empty')}
                                        />
                                    </Card>

                                    <Card className="rounded-[24px] border-dashed" title={t('posSettlement.cashMovements.title')} subtitle={t('posSettlement.cashMovements.subtitle')} action={<InfoTip text={t('posSettlement.cashMovements.info')} />}>
                                        <div className="space-y-4">
                                            {activeShift?.id === selectedSettlement.shiftId && selectedSettlement.shiftStatus === 'OPEN' ? (
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    <Select label={t('posSettlement.cashMovements.form.type')} value={cashMovementForm.type} onChange={(event) => setCashMovementForm((current) => ({ ...current, type: event.target.value }))} options={cashMovementTypeOptions} />
                                                    <Input label={t('posSettlement.cashMovements.form.amount')} type="number" min="0" step="0.01" value={cashMovementForm.amount} onChange={(event) => setCashMovementForm((current) => ({ ...current, amount: event.target.value }))} />
                                                    <Input label={t('posSettlement.cashMovements.form.reason')} value={cashMovementForm.reason} onChange={(event) => setCashMovementForm((current) => ({ ...current, reason: event.target.value }))} />
                                                    <Input label={t('posSettlement.cashMovements.form.reference')} value={cashMovementForm.referenceNumber} onChange={(event) => setCashMovementForm((current) => ({ ...current, referenceNumber: event.target.value }))} />
                                                    <div className="md:col-span-2">
                                                        <Input label={t('posSettlement.cashMovements.form.notes')} value={cashMovementForm.notes} onChange={(event) => setCashMovementForm((current) => ({ ...current, notes: event.target.value }))} />
                                                    </div>
                                                    <div className="md:col-span-2 flex justify-end">
                                                        <Button loading={actionLoading === 'cash-movement'} onClick={async () => {
                                                            try {
                                                                setActionLoading('cash-movement');
                                                                await recordPosCashMovement(selectedSettlement.shiftId, {
                                                                    type: cashMovementForm.type,
                                                                    amount: Number(cashMovementForm.amount || 0),
                                                                    reason: cashMovementForm.reason,
                                                                    referenceNumber: cashMovementForm.referenceNumber,
                                                                    notes: cashMovementForm.notes,
                                                                });
                                                                setCashMovementForm({ type: 'PAY_IN', amount: '', reason: '', referenceNumber: '', notes: '' });
                                                                await loadWorkspace({ preferredShiftId: selectedSettlement.shiftId });
                                                                showAlert('success', t('posSettlement.messages.cashMovementRecorded'));
                                                            } catch (error) {
                                                                showAlert('error', error.message || t('posSettlement.messages.cashMovementFailed'));
                                                            } finally {
                                                                setActionLoading('');
                                                            }
                                                        }}>{t('posSettlement.actions.recordCashMovement')}</Button>
                                                    </div>
                                                </div>
                                            ) : null}

                                            <DataTable
                                                columns={[
                                                    { key: 'occurredAt', header: t('posSettlement.columns.occurredAt'), render: (value) => formatDateTime(value) },
                                                    { key: 'type', header: t('posSettlement.columns.type') },
                                                    { key: 'reason', header: t('posSettlement.columns.reason') },
                                                    { key: 'amount', header: t('posSettlement.columns.amount'), render: (value) => formatCurrency(value || 0) },
                                                ]}
                                                data={selectedSettlement.cashMovements || []}
                                                emptyMessage={t('posSettlement.cashMovements.empty')}
                                            />
                                        </div>
                                    </Card>

                                    <Card padding="none" className="overflow-hidden rounded-[24px] border-dashed" title={t('posSettlement.refunds.title')} subtitle={t('posSettlement.refunds.subtitle')} action={<InfoTip text={t('posSettlement.refunds.info')} />}>
                                        <DataTable
                                            columns={[
                                                { key: 'salesRefundId', header: t('posSettlement.columns.refund') },
                                                { key: 'paymentMethod', header: t('posSettlement.columns.paymentMethod') },
                                                { key: 'occurredAt', header: t('posSettlement.columns.occurredAt'), render: (value) => formatDateTime(value) },
                                                { key: 'amount', header: t('posSettlement.columns.amount'), render: (value) => formatCurrency(value || 0) },
                                            ]}
                                            data={selectedSettlement.refundImpacts || []}
                                            emptyMessage={t('posSettlement.refunds.empty')}
                                        />
                                    </Card>
                                </div>
                            ) : (
                                <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    {t('posSettlement.detail.empty')}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PosSettlement;