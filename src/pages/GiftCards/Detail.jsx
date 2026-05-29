import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomers } from '../../services/customerService';
import {
    getGiftCard,
    getGiftCardTransactions,
} from '../../services/giftCardService';
import AdjustModal from './AdjustModal';

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.content)) return data.data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

const getStatusVariant = (status) => {
    switch (status) {
        case 'ACTIVE': return 'success';
        case 'REDEEMED': return 'default';
        case 'EXPIRED': return 'danger';
        case 'VOIDED': return 'danger';
        default: return 'default';
    }
};

const sortByCreatedDesc = (txs) => {
    const copy = [...txs];
    copy.sort((a, b) => {
        const av = a?.createdAt || '';
        const bv = b?.createdAt || '';
        if (av === bv) return 0;
        return av < bv ? 1 : -1;
    });
    return copy;
};

const GiftCardDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const { user } = useAuth();
    const roleNames = useMemo(
        () => (Array.isArray(user?.roles)
            ? user.roles.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
            : []),
        [user],
    );
    const canManage = roleNames.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER');

    const [card, setCard] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [adjustOpen, setAdjustOpen] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadCard = async () => {
        try {
            setLoading(true);
            const data = await getGiftCard(id);
            setCard(data);
        } catch (error) {
            showAlert('error', error.message || 'Failed to load gift card');
            setCard(null);
        } finally {
            setLoading(false);
        }
    };

    const loadTransactions = async () => {
        try {
            setTransactionsLoading(true);
            const data = await getGiftCardTransactions(id);
            setTransactions(sortByCreatedDesc(toList(data)));
        } catch (error) {
            setTransactions([]);
            showAlert('error', error.message || 'Failed to load transactions');
        } finally {
            setTransactionsLoading(false);
        }
    };

    const loadCustomers = async () => {
        try {
            const data = await getCustomers();
            setCustomers(toList(data));
        } catch (error) {
            // Non-fatal — customer name will fall back to id.
            setCustomers([]);
        }
    };

    useEffect(() => {
        if (!id) return;
        loadCard();
        loadTransactions();
        loadCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const customerName = (cid) => customers.find((c) => c.id === cid)?.name || cid || '—';

    const handleAdjusted = async () => {
        setAdjustOpen(false);
        showAlert('success', 'Balance adjusted');
        await Promise.all([loadCard(), loadTransactions()]);
    };

    const txColumns = [
        { key: 'type', header: 'Type' },
        { key: 'amount', header: 'Amount' },
        { key: 'balanceAfter', header: 'Balance After' },
        { key: 'reference', header: 'Reference' },
        { key: 'createdAt', header: 'When' },
    ];

    return (
        <div className="flex-1 overflow-y-auto space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" icon="arrow_back" onClick={() => navigate('/gift-cards')}>
                            Back
                        </Button>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {card ? `Gift Card ${card.code}` : 'Gift Card'}
                        </h1>
                        {card?.status && <Badge variant={getStatusVariant(card.status)}>{card.status}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        View balance, audit history, and adjust this gift card
                    </p>
                </div>
                {canManage && card && (
                    <Button icon="tune" onClick={() => setAdjustOpen(true)}>Adjust Balance</Button>
                )}
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            {loading && !card && (
                <Card>
                    <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
                </Card>
            )}

            {card && (
                <Card>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Balance</div>
                            <div className="font-semibold">{card.currentBalance ?? 0} {card.currency}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Initial</div>
                            <div className="font-semibold">{card.initialBalance ?? 0} {card.currency}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Status</div>
                            <div className="font-semibold">{card.status || '—'}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Expires</div>
                            <div className="font-semibold">{card.expiresAt || '—'}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Issued</div>
                            <div className="font-semibold">{card.issuedAt || '—'}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Issued To</div>
                            <div className="font-semibold">{customerName(card.issuedToCustomerId)}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Source</div>
                            <div className="font-semibold">{card.source || '—'}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Code</div>
                            <div className="font-mono text-sm font-semibold">{card.code || '—'}</div>
                        </div>
                    </div>
                    {card.notes && (
                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                            <div className="text-xs uppercase text-slate-400">Notes</div>
                            <div className="mt-1 whitespace-pre-wrap">{card.notes}</div>
                        </div>
                    )}
                </Card>
            )}

            <Card>
                <h4 className="mb-3 font-semibold">Transactions</h4>
                <DataTable
                    columns={txColumns}
                    data={transactions}
                    loading={transactionsLoading}
                    emptyMessage="No transactions"
                />
            </Card>

            <AdjustModal
                isOpen={adjustOpen}
                onClose={() => setAdjustOpen(false)}
                giftCardId={card?.id}
                onAdjusted={handleAdjusted}
            />
        </div>
    );
};

export default GiftCardDetail;
