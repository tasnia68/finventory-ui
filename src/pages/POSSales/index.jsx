import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, DataTable, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPosSales, getPosBootstrap, printPosInvoice } from '../../services/posService';
import PosInvoiceModal from '../POS/PosInvoiceModal';
import { formatCurrency, formatDateTime } from '../POS/utils';

const SCOPE_OPTIONS = [
    { value: 'terminal', label: 'This Counter' },
    { value: 'mine', label: 'My Sales' },
    { value: 'all', label: 'All Counters' },
];

const PosSales = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [bootstrap, setBootstrap] = useState({ terminals: [] });
    const [selectedTerminalId, setSelectedTerminalId] = useState('');
    const [scope, setScope] = useState('terminal');
    const [sales, setSales] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadBootstrap = async () => {
        const data = await getPosBootstrap();
        setBootstrap({ terminals: data.terminals || [] });
        setSelectedTerminalId((current) => current || data.activeShift?.terminalId || data.terminals?.[0]?.id || '');
    };

    const loadSales = async (nextScope = scope, nextTerminalId = selectedTerminalId) => {
        try {
            setLoading(true);
            const scopeOptions = {
                mine: { cashierId: user?.id, size: 100 },
                terminal: { terminalId: nextTerminalId, size: 100 },
                all: { size: 100 },
            };
            const items = await fetchPosSales(scopeOptions[nextScope] || scopeOptions.terminal);
            setSales(items);
        } catch (error) {
            showAlert('error', error.message || 'Failed to load sold history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                await loadBootstrap();
            } catch (error) {
                showAlert('error', error.message || 'Failed to load POS sales workspace');
                setLoading(false);
            }
        };

        initialize();
    }, []);

    useEffect(() => {
        if (user?.id && (scope !== 'terminal' || selectedTerminalId)) {
            loadSales(scope, selectedTerminalId);
        }
    }, [user?.id, scope, selectedTerminalId]);

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Sold History"
                    title="Review sold receipts with cashier, counter, customer, and payment visibility."
                    description="This register is the answer to 'who sold what'. Each row shows the cashier, POS counter, customer, payment method, and receipt total."
                    actions={(
                        <>
                            <Select value={scope} onChange={(event) => setScope(event.target.value)} options={SCOPE_OPTIONS} className="min-w-[200px]" />
                            <Select value={selectedTerminalId} onChange={(event) => setSelectedTerminalId(event.target.value)} options={bootstrap.terminals.map((terminal) => ({ value: terminal.id, label: `${terminal.name} • ${terminal.warehouseName}` }))} placeholder="POS terminal" className="min-w-[280px]" disabled={scope !== 'terminal'} />
                            <Button variant="secondary" icon="sync" onClick={() => loadSales(scope, selectedTerminalId)} loading={loading}>Refresh</Button>
                            <Link to="/pos/register" className="inline-flex"><Button variant="secondary" icon="point_of_sale">Register Control</Button></Link>
                            <Link to="/pos" className="inline-flex"><Button variant="secondary" icon="shopping_cart">Sell Screen</Button></Link>
                        </>
                    )}
                    accent="from-rose-500/15 via-transparent to-sky-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <Card padding="none" className="overflow-hidden" title="POS Receipt Register" subtitle="Cashier-level sold history across counters and customers">
                    <DataTable
                        loading={loading}
                        emptyMessage="No sold tickets found."
                        columns={[
                            { key: 'invoiceNumber', header: 'Receipt' },
                            { key: 'createdAt', header: 'Sold At', render: (value) => formatDateTime(value) },
                            { key: 'cashierName', header: 'Sold By' },
                            { key: 'terminalName', header: 'Counter', render: (value, row) => `${value || 'POS terminal'} • ${row.warehouseName || 'No warehouse'}` },
                            { key: 'customerName', header: 'Customer' },
                            { key: 'itemCount', header: 'Items' },
                            { key: 'paymentMethod', header: 'Payment' },
                            { key: 'backendSoNumber', header: 'Sales Order', render: (value) => value || '-' },
                            { key: 'total', header: 'Total', render: (value, row) => formatCurrency(value, row.currency) },
                            { key: 'changeDue', header: 'Change', render: (value, row) => formatCurrency(value, row.currency) },
                            { key: 'syncStatus', header: 'Sync', render: (value) => <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">{String(value || '').replaceAll('_', ' ')}</span> },
                            { key: 'actions', header: '', render: (_, row) => <Button size="sm" variant="ghost" onClick={() => setSelectedSale(row)}>Receipt</Button> },
                        ]}
                        data={sales}
                    />
                </Card>
            </div>

            <PosInvoiceModal sale={selectedSale} isOpen={Boolean(selectedSale)} onClose={() => setSelectedSale(null)} onPrint={printPosInvoice} />
        </div>
    );
};

export default PosSales;
