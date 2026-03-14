import React from 'react';
import { Badge, Button, Card, DataTable, Modal, Select } from '../../components/common';
import { formatCurrency, formatDateTime, getSaleSyncVariant } from './utils';

const SCOPE_OPTIONS = [
    { value: 'terminal', label: 'This Counter' },
    { value: 'mine', label: 'My Sales' },
    { value: 'all', label: 'All Counters' },
];

const PosSalesRegisterModal = ({ isOpen, onClose, sales, scope, onScopeChange, loading, onRefresh, onOpenInvoice }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Sold Register" size="xl">
            <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Track who sold each receipt, at which counter, for which customer, and at what total.</p>
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                        <Select label="Scope" value={scope} onChange={(event) => onScopeChange(event.target.value)} options={SCOPE_OPTIONS} className="min-w-[200px]" />
                        <Button variant="secondary" icon="sync" onClick={onRefresh} loading={loading}>Refresh</Button>
                    </div>
                </div>

                <Card padding="none" className="overflow-hidden">
                    <DataTable
                        loading={loading}
                        emptyMessage="No sold tickets found."
                        columns={[
                            { key: 'invoiceNumber', header: 'Receipt' },
                            { key: 'createdAt', header: 'Sold At', render: (value) => formatDateTime(value) },
                            { key: 'cashierName', header: 'Sold By' },
                            { key: 'terminalName', header: 'Counter', render: (value, row) => `${value || 'POS terminal'} • ${row.warehouseName || 'No warehouse'}` },
                            { key: 'customerName', header: 'Customer' },
                            { key: 'paymentMethod', header: 'Payment' },
                            { key: 'total', header: 'Total', render: (value, row) => formatCurrency(value, row.currency) },
                            { key: 'syncStatus', header: 'Sync', render: (value) => <Badge variant={getSaleSyncVariant(value)}>{value.replaceAll('_', ' ')}</Badge> },
                            { key: 'actions', header: '', render: (_, row) => <Button size="sm" variant="ghost" onClick={() => onOpenInvoice(row)}>Receipt</Button> },
                        ]}
                        data={sales}
                    />
                </Card>
            </div>
        </Modal>
    );
};

export default PosSalesRegisterModal;
