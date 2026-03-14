import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, MetricCard, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { useAuth } from '../../contexts/AuthContext';
import {
    closePosShift,
    fetchCurrentPosShift,
    getCashierKpis,
    getCurrentPosShift,
    getPosBootstrap,
    openPosShift,
    syncQueuedPosSales,
} from '../../services/posService';
import PosShiftModal from '../POS/PosShiftModal';
import { formatCurrency } from '../POS/utils';

const PosRegister = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [alert, setAlert] = useState(null);
    const [online, setOnline] = useState(navigator.onLine);
    const [bootstrap, setBootstrap] = useState({ terminals: [], warehouses: [] });
    const [selectedTerminalId, setSelectedTerminalId] = useState('');
    const [activeShift, setActiveShift] = useState(getCurrentPosShift());
    const [kpis, setKpis] = useState({ gross: 0, tickets: 0, units: 0, averageTicket: 0, offlineQueued: 0 });
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [shiftMode, setShiftMode] = useState('open');

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const loadBootstrap = async () => {
            try {
                setLoading(true);
                const data = await getPosBootstrap();
                setBootstrap({ terminals: data.terminals || [], warehouses: data.warehouses || [] });
                setSelectedTerminalId((current) => current || data.activeShift?.terminalId || data.terminals?.[0]?.id || '');
                setActiveShift(data.activeShift || getCurrentPosShift());
            } catch (error) {
                setAlert({ type: 'error', message: error.message || 'Failed to load register controls' });
            } finally {
                setLoading(false);
            }
        };

        loadBootstrap();
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadShift = async () => {
            const shift = await fetchCurrentPosShift(selectedTerminalId);
            if (isMounted) {
                setActiveShift(shift);
            }
        };

        if (selectedTerminalId) {
            loadShift();
        }

        return () => {
            isMounted = false;
        };
    }, [selectedTerminalId]);

    useEffect(() => {
        let isMounted = true;

        const loadKpis = async () => {
            try {
                const data = await getCashierKpis(user?.id, selectedTerminalId);
                if (isMounted) {
                    setKpis(data);
                }
            } catch {
                if (isMounted) {
                    setKpis({ gross: 0, tickets: 0, units: 0, averageTicket: 0, offlineQueued: 0 });
                }
            }
        };

        if (user?.id) {
            loadKpis();
        }

        return () => {
            isMounted = false;
        };
    }, [user?.id, selectedTerminalId, online]);

    const selectedTerminal = useMemo(() => bootstrap.terminals.find((terminal) => terminal.id === selectedTerminalId) || null, [bootstrap.terminals, selectedTerminalId]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const handleOpenShift = async ({ openingFloat }) => {
        try {
            setWorking(true);
            const shift = await openPosShift({ terminalId: selectedTerminalId, openingFloat });
            setActiveShift(shift);
            setShowShiftModal(false);
            showAlert('success', 'Shift opened successfully');
        } catch (error) {
            showAlert('error', error.message || 'Failed to open shift');
        } finally {
            setWorking(false);
        }
    };

    const handleCloseShift = async ({ closingNotes }) => {
        if (!activeShift?.id) {
            return;
        }
        try {
            setWorking(true);
            await closePosShift({ shiftId: activeShift.id, closingNotes });
            setActiveShift(null);
            setShowShiftModal(false);
            showAlert('success', 'Shift closed successfully');
        } catch (error) {
            showAlert('error', error.message || 'Failed to close shift');
        } finally {
            setWorking(false);
        }
    };

    const handleSyncQueued = async () => {
        try {
            setWorking(true);
            const result = await syncQueuedPosSales(user?.id);
            showAlert(result.synced > 0 ? 'success' : 'warning', result.synced > 0 ? `Synced ${result.synced} offline sales` : 'No offline sales were synced');
            const data = await getCashierKpis(user?.id, selectedTerminalId);
            setKpis(data);
        } catch (error) {
            showAlert('error', error.message || 'Failed to sync offline sales');
        } finally {
            setWorking(false);
        }
    };

    if (loading) {
        return <div className="flex-1 bg-background-light dark:bg-background-dark" />;
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Register Control"
                    title="Open, close, and supervise the live POS register separately from selling."
                    description="Cashiers and supervisors should manage shift state, drawer flow, and offline sync from a control workspace, not from the checkout screen."
                    actions={(
                        <>
                            <Select value={selectedTerminalId} onChange={(event) => setSelectedTerminalId(event.target.value)} options={bootstrap.terminals.map((terminal) => ({ value: terminal.id, label: `${terminal.name} • ${terminal.warehouseName}` }))} placeholder="POS terminal" className="min-w-[280px]" />
                            <Button variant="secondary" icon="sync" onClick={handleSyncQueued} loading={working} disabled={!online}>Sync Offline</Button>
                            <Link to="/pos" className="inline-flex"><Button variant="secondary" icon="point_of_sale">Sell Screen</Button></Link>
                            <Link to="/pos/sales" className="inline-flex"><Button variant="secondary" icon="receipt_long">Sold History</Button></Link>
                        </>
                    )}
                    accent="from-emerald-500/15 via-transparent to-sky-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Today's Gross" value={formatCurrency(kpis.gross)} caption="Sales value for the current cashier" icon="payments" tone="blue" />
                    <MetricCard title="Tickets" value={kpis.tickets} caption="Completed receipts handled today" icon="receipt_long" tone="emerald" />
                    <MetricCard title="Average Basket" value={formatCurrency(kpis.averageTicket)} caption="Average receipt value during this business day" icon="shopping_basket" tone="violet" />
                    <MetricCard title="Offline Queue" value={kpis.offlineQueued} caption={online ? 'Pending local tickets waiting for sync' : 'Device offline, sync unavailable'} icon="cloud_off" tone="amber" />
                </div>

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
                    <Card className="rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Current Register</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{selectedTerminal?.name || 'Choose a counter'}</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{selectedTerminal?.warehouseName || 'No warehouse assigned'} • {selectedTerminal?.terminalCode || 'No code'}</p>

                        <div className="mt-6 rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Shift Status</p>
                            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{activeShift?.status === 'OPEN' ? 'Open' : 'Closed'}</p>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{activeShift?.status === 'OPEN' ? `Opened by ${activeShift.cashierName}` : 'No active cashier shift on this counter.'}</p>
                            {activeShift?.openedAt ? <p className="mt-1 text-xs text-slate-400">Opened {new Date(activeShift.openedAt).toLocaleString()}</p> : null}
                            {activeShift?.closedAt ? <p className="mt-1 text-xs text-slate-400">Closed {new Date(activeShift.closedAt).toLocaleString()}</p> : null}

                            <div className="mt-5 flex flex-wrap gap-3">
                                <Button
                                    icon={activeShift?.status === 'OPEN' ? 'lock_open_right' : 'point_of_sale'}
                                    onClick={() => {
                                        setShiftMode(activeShift?.status === 'OPEN' ? 'close' : 'open');
                                        setShowShiftModal(true);
                                    }}
                                    disabled={!selectedTerminalId || (!activeShift && !online)}
                                >
                                    {activeShift?.status === 'OPEN' ? 'Close Shift' : 'Open Shift'}
                                </Button>
                                <Link to="/pos" className="inline-flex"><Button variant="secondary">Go To Selling</Button></Link>
                            </div>
                        </div>
                    </Card>

                    <Card className="rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Operational Notes</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Register workflow</h2>
                        <div className="mt-6 space-y-4 text-sm text-slate-500 dark:text-slate-400">
                            <p>Open the shift before the cashier starts selling on this counter.</p>
                            <p>Use Counter Setup when a terminal needs activation, deactivation, or warehouse reassignment.</p>
                            <p>Use Sold History to review who sold each receipt, including cashier, counter, customer, and total.</p>
                        </div>
                        <div className="mt-6 flex flex-col gap-3">
                            <Link to="/pos/sales" className="inline-flex"><Button variant="secondary" icon="receipt_long">Review Sold History</Button></Link>
                            <Link to="/pos/counters" className="inline-flex"><Button variant="secondary" icon="storefront">Manage Counters</Button></Link>
                        </div>
                    </Card>
                </div>
            </div>

            <PosShiftModal
                isOpen={showShiftModal}
                mode={shiftMode}
                terminal={selectedTerminal}
                shift={activeShift}
                loading={working}
                onClose={() => setShowShiftModal(false)}
                onOpenShift={handleOpenShift}
                onCloseShift={handleCloseShift}
            />
        </div>
    );
};

export default PosRegister;
