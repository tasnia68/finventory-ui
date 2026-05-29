import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
    Modal,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { deleteDiscount, listDiscounts } from '../../services/discountService';
import {
    getDiscountBadgeVariant,
    getRoleNames,
    toList,
} from './constants';

const DiscountsList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const roleNames = useMemo(() => getRoleNames(user), [user]);
    const canManage = roleNames.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER');

    const [loading, setLoading] = useState(true);
    const [discounts, setDiscounts] = useState([]);
    const [alert, setAlert] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadDiscounts = async () => {
        try {
            setLoading(true);
            const data = await listDiscounts();
            setDiscounts(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load discounts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDiscounts();
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            setDeleting(true);
            await deleteDiscount(confirmDeleteId);
            showAlert('success', 'Discount deleted');
            setConfirmDeleteId(null);
            await loadDiscounts();
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete discount');
        } finally {
            setDeleting(false);
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Discount',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.kind} · {row.salesChannel}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => <Badge variant={getDiscountBadgeVariant(value)}>{value}</Badge>,
        },
        {
            key: 'valueType',
            header: 'Value',
            render: (value, row) => (value === 'PERCENTAGE' ? `${row.value ?? 0}%` : `${row.value ?? 0}`),
        },
        {
            key: 'startsAt',
            header: 'Window',
            render: (value, row) => `${value || '—'} / ${row.endsAt || '—'}`,
        },
        {
            key: 'id',
            header: 'Actions',
            render: (_, row) => (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {canManage && (
                        <>
                            <Button size="sm" variant="secondary" onClick={() => navigate(`/discounts/${row.id}`)}>
                                Edit
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setConfirmDeleteId(row.id)}>
                                Delete
                            </Button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Discounts</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Manage discount campaigns
                    </p>
                </div>
                {canManage && (
                    <Button icon="local_offer" onClick={() => navigate('/discounts/new')}>New Discount</Button>
                )}
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            <Card>
                <DataTable
                    columns={columns}
                    data={discounts}
                    loading={loading}
                    emptyMessage="No discounts yet"
                    onRowClick={(row) => navigate(`/discounts/${row.id}`)}
                />
            </Card>

            <Modal
                isOpen={Boolean(confirmDeleteId)}
                onClose={() => (deleting ? null : setConfirmDeleteId(null))}
                title="Delete discount?"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        This action cannot be undone. The discount and any associated codes will be removed.
                    </p>
                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="danger" loading={deleting} onClick={handleConfirmDelete}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DiscountsList;
