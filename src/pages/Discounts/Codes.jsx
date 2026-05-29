import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
    Modal,
    Select,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import {
    createDiscountCode,
    deleteDiscountCode,
    listDiscountCodes,
    listDiscounts,
    updateDiscountCode,
} from '../../services/discountService';
import CodeDrawer from './CodeDrawer';
import { getCodeBadgeVariant, getRoleNames, toList } from './constants';

const DiscountsCodes = () => {
    const { user } = useAuth();
    const roleNames = useMemo(() => getRoleNames(user), [user]);
    const canManage = roleNames.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER');

    const [discounts, setDiscounts] = useState([]);
    const [codes, setCodes] = useState([]);
    const [filterDiscountId, setFilterDiscountId] = useState('');
    const [alert, setAlert] = useState(null);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingCode, setEditingCode] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadCodes = async (discountId = filterDiscountId) => {
        try {
            const data = await listDiscountCodes(discountId || undefined);
            setCodes(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load codes');
        }
    };

    const loadDiscounts = async () => {
        try {
            const data = await listDiscounts();
            setDiscounts(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load discounts');
        }
    };

    useEffect(() => {
        loadDiscounts();
        loadCodes('');
    }, []);

    const discountOptions = useMemo(
        () => discounts.map((d) => ({ value: d.id, label: d.name })),
        [discounts],
    );

    const handleOpenCreate = () => {
        setEditingCode(null);
        setDrawerOpen(true);
    };

    const handleOpenEdit = (code) => {
        setEditingCode(code);
        setDrawerOpen(true);
    };

    const handleSubmit = async (payload, id, discountId) => {
        if (id) {
            await updateDiscountCode(id, payload);
        } else {
            await createDiscountCode(discountId, payload);
        }
        setDrawerOpen(false);
        await loadCodes();
    };

    const handleConfirmDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            setDeleting(true);
            await deleteDiscountCode(confirmDeleteId);
            setConfirmDeleteId(null);
            showAlert('success', 'Code deleted');
            await loadCodes();
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete code');
        } finally {
            setDeleting(false);
        }
    };

    const columns = [
        { key: 'code', header: 'Code' },
        {
            key: 'discountId',
            header: 'Discount',
            render: (value) => discounts.find((d) => d.id === value)?.name || value || '—',
        },
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
                    {canManage && (
                        <>
                            <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(row)}>Edit</Button>
                            <Button size="sm" variant="danger" onClick={() => setConfirmDeleteId(row.id)}>Delete</Button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    const initialDiscountIdForCreate = filterDiscountId || discounts[0]?.id || '';

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Discount codes</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Manage redeemable codes tied to discount campaigns
                    </p>
                </div>
                {canManage && (
                    <Button icon="sell" onClick={handleOpenCreate}>New Code</Button>
                )}
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            <Card>
                <div className="mb-4 flex items-end gap-3">
                    <Select
                        label="Filter by discount"
                        value={filterDiscountId}
                        onChange={(e) => {
                            setFilterDiscountId(e.target.value);
                            loadCodes(e.target.value);
                        }}
                        options={[{ value: '', label: 'All discounts' }, ...discountOptions]}
                        placeholder="All discounts"
                    />
                    <Button variant="secondary" onClick={() => loadCodes()}>Refresh</Button>
                </div>
                <DataTable columns={columns} data={codes} emptyMessage="No codes" />
            </Card>

            <CodeDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                code={editingCode}
                discountId={initialDiscountIdForCreate}
                discountOptions={discountOptions}
                onSubmit={handleSubmit}
                onAlert={showAlert}
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
        </div>
    );
};

export default DiscountsCodes;
