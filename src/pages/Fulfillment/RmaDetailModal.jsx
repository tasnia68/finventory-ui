import React from 'react';
import { Badge, Button, Card, DataTable, Modal } from '../../components/common';
import { formatDateTime, formatNumber, getRmaStatusVariant } from '../Sales/utils';

const RmaDetailModal = ({ rma, isOpen, onClose, onTransition, loading }) => {
    if (!rma) return null;

    const actions = [];
    if (rma.status === 'REQUESTED') {
        actions.push({ label: 'Approve', status: 'APPROVED' });
        actions.push({ label: 'Reject', status: 'REJECTED', variant: 'danger' });
        actions.push({ label: 'Cancel', status: 'CANCELLED', variant: 'secondary' });
    }
    if (rma.status === 'APPROVED') {
        actions.push({ label: 'Mark Received', status: 'RECEIVED' });
    }
    if (rma.status === 'RECEIVED') {
        actions.push({ label: 'Complete Return', status: 'COMPLETED' });
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={rma.rmaNumber} size="lg">
            <div className="space-y-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{rma.rmaNumber}</h3>
                        <Badge variant={getRmaStatusVariant(rma.status)}>{rma.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{rma.soNumber} • {rma.shipmentNumber || 'Order-level return'} • Requested {formatDateTime(rma.requestedAt)}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{rma.reason || 'No header reason captured.'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{rma.notes || 'No additional notes.'}</p>
                    <div className="flex flex-wrap gap-2">
                        {actions.map((action) => (
                            <Button key={action.status} variant={action.variant || 'primary'} onClick={() => onTransition(rma.id, action.status)} disabled={loading}>{action.label}</Button>
                        ))}
                    </div>
                </div>

                <Card padding="none" className="overflow-hidden" title="Returned Items" subtitle="Quantities authorized on this return">
                    <DataTable
                        columns={[
                            { key: 'sku', header: 'Variant' },
                            { key: 'quantity', header: 'Qty', render: (value) => formatNumber(value) },
                            { key: 'reason', header: 'Reason', render: (value) => value || '-' },
                        ]}
                        data={rma.items || []}
                        emptyMessage="No RMA items found."
                    />
                </Card>
            </div>
        </Modal>
    );
};

export default RmaDetailModal;