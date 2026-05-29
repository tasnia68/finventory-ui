import React, { useState } from 'react';
import { Badge, Button, Card, DataTable, Modal } from '../../../components/common';
import CodeDrawer from '../CodeDrawer';
import {
    createDiscountCode,
    deleteDiscountCode,
    updateDiscountCode,
} from '../../../services/discountService';
import { getCodeBadgeVariant, toList } from '../constants';

const CodesCard = ({ discountId, codes, onCodesChanged, onAlert }) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingCode, setEditingCode] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const handleOpenCreate = () => {
        setEditingCode(null);
        setDrawerOpen(true);
    };

    const handleOpenEdit = (code) => {
        setEditingCode(code);
        setDrawerOpen(true);
    };

    const handleSubmit = async (payload, id) => {
        if (id) {
            await updateDiscountCode(id, payload);
        } else {
            await createDiscountCode(discountId, payload);
        }
        setDrawerOpen(false);
        await onCodesChanged?.();
    };

    const handleConfirmDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            setDeleting(true);
            await deleteDiscountCode(confirmDeleteId);
            setConfirmDeleteId(null);
            onAlert?.('success', 'Code deleted');
            await onCodesChanged?.();
        } catch (error) {
            onAlert?.('error', error.message || 'Failed to delete code');
        } finally {
            setDeleting(false);
        }
    };

    const columns = [
        { key: 'code', header: 'Code' },
        {
            key: 'status',
            header: 'Status',
            render: (value) => <Badge variant={getCodeBadgeVariant(value)}>{value}</Badge>,
        },
        { key: 'validFrom', header: 'From' },
        { key: 'validTo', header: 'To' },
        { key: 'maxRedemptions', header: 'Max Total' },
        { key: 'maxRedemptionsPerCustomer', header: 'Max/Customer' },
        {
            key: 'id',
            header: 'Actions',
            render: (_, row) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(row)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => setConfirmDeleteId(row.id)}>Delete</Button>
                </div>
            ),
        },
    ];

    return (
        <Card
            title="Codes"
            subtitle="Manage discount codes associated with this campaign."
            action={<Button size="sm" icon="sell" onClick={handleOpenCreate}>Add code</Button>}
        >
            <DataTable columns={columns} data={toList(codes)} emptyMessage="No codes yet" />

            <CodeDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                code={editingCode}
                discountId={discountId}
                onSubmit={handleSubmit}
                onAlert={onAlert}
            />

            <Modal
                isOpen={Boolean(confirmDeleteId)}
                onClose={() => (deleting ? null : setConfirmDeleteId(null))}
                title="Delete code?"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</Button>
                        <Button variant="danger" loading={deleting} onClick={handleConfirmDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
};

export default CodesCard;
