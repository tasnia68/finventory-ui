import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
    Input,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomers } from '../../services/customerService';
import {
    getGiftCardBalance,
    listGiftCards,
} from '../../services/giftCardService';
import IssueModal from './IssueModal';

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

const GiftCardsList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const roleNames = useMemo(
        () => (Array.isArray(user?.roles)
            ? user.roles.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
            : []),
        [user],
    );
    const canManage = roleNames.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER');

    const [giftCards, setGiftCards] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    const [issueOpen, setIssueOpen] = useState(false);

    const [lookupCode, setLookupCode] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadAll = async () => {
        try {
            setLoading(true);
            const [cardsData, customerData] = await Promise.all([
                listGiftCards(),
                getCustomers(),
            ]);
            setGiftCards(toList(cardsData));
            setCustomers(toList(customerData));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load gift cards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, []);

    const customerOptions = useMemo(
        () => customers.map((c) => ({ value: c.id, label: c.name })),
        [customers],
    );

    const customerName = (id) => customers.find((c) => c.id === id)?.name || id || '—';

    const handleLookup = async (event) => {
        event.preventDefault();
        if (!lookupCode.trim()) return;
        try {
            setLookupLoading(true);
            const data = await getGiftCardBalance(lookupCode.trim());
            setLookupResult(data);
        } catch (error) {
            setLookupResult(null);
            showAlert('error', error.message || 'Lookup failed');
        } finally {
            setLookupLoading(false);
        }
    };

    const handleIssued = async () => {
        setIssueOpen(false);
        showAlert('success', 'Gift card issued');
        await loadAll();
    };

    const columns = [
        {
            key: 'code',
            header: 'Code',
            render: (value) => <span className="font-mono text-sm">{value}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => <Badge variant={getStatusVariant(value)}>{value}</Badge>,
        },
        { key: 'currency', header: 'Currency' },
        {
            key: 'currentBalance',
            header: 'Balance',
            render: (value, row) => `${value ?? 0} / ${row.initialBalance ?? 0}`,
        },
        {
            key: 'issuedToCustomerId',
            header: 'Issued To',
            render: (value) => customerName(value),
        },
        { key: 'issuedAt', header: 'Issued' },
        { key: 'expiresAt', header: 'Expires' },
    ];

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gift Cards</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Issue, adjust, and audit gift card balances
                    </p>
                </div>
                {canManage && <Button icon="card_giftcard" onClick={() => setIssueOpen(true)}>Issue Gift Card</Button>}
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            <Card>
                <h3 className="mb-3 text-lg font-semibold">Balance Lookup</h3>
                <form onSubmit={handleLookup} className="flex flex-wrap items-end gap-3">
                    <Input
                        label="Gift Card Code"
                        value={lookupCode}
                        onChange={(e) => setLookupCode(e.target.value)}
                        placeholder="Enter code"
                    />
                    <Button type="submit" loading={lookupLoading}>Look Up</Button>
                </form>
                {lookupResult && (
                    <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                        <div><strong>Code:</strong> {lookupResult.code}</div>
                        <div><strong>Balance:</strong> {lookupResult.currentBalance ?? lookupResult.balance ?? 0} {lookupResult.currency}</div>
                        <div><strong>Status:</strong> {lookupResult.status}</div>
                    </div>
                )}
            </Card>

            <Card>
                <DataTable
                    columns={columns}
                    data={giftCards}
                    loading={loading}
                    emptyMessage="No gift cards"
                    onRowClick={(row) => navigate(`/gift-cards/${row.id}`)}
                />
            </Card>

            <IssueModal
                isOpen={issueOpen}
                onClose={() => setIssueOpen(false)}
                onIssued={handleIssued}
                customerOptions={customerOptions}
            />
        </div>
    );
};

export default GiftCardsList;
