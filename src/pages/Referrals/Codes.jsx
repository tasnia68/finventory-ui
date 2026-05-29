import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Button,
    Card,
    DataTable,
    Input,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import {
    getOrCreateReferralCode,
    listReferralCodes,
} from '../../services/referralService';

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.content)) return data.data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

const ReferralsCodes = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const roleNames = useMemo(
        () => (Array.isArray(user?.roles)
            ? user.roles.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
            : []),
        [user],
    );
    const canManage = roleNames.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER');

    const [alert, setAlert] = useState(null);
    const [customerId, setCustomerId] = useState('');
    const [customerCodes, setCustomerCodes] = useState([]);
    const [codeLoading, setCodeLoading] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadCustomerCodes = async () => {
        if (!customerId.trim()) {
            showAlert('error', 'Enter a customer ID');
            return;
        }
        try {
            setCodeLoading(true);
            const data = await listReferralCodes(customerId.trim());
            setCustomerCodes(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load codes');
        } finally {
            setCodeLoading(false);
        }
    };

    const handleGetOrCreate = async () => {
        if (!customerId.trim()) {
            showAlert('error', 'Enter a customer ID');
            return;
        }
        try {
            setCodeLoading(true);
            const data = await getOrCreateReferralCode(customerId.trim());
            showAlert('success', `Code: ${data?.code || 'created'}`);
            await loadCustomerCodes();
        } catch (error) {
            showAlert('error', error.message || 'Failed');
        } finally {
            setCodeLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Referral codes</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Look up a customer to view or issue their referral codes
                </p>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            <Card>
                <h3 className="mb-3 text-lg font-semibold">Customer</h3>
                <div className="flex flex-wrap items-end gap-3">
                    <Input
                        label="Customer ID"
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        placeholder="UUID"
                    />
                    <Button variant="secondary" onClick={loadCustomerCodes} loading={codeLoading}>List Codes</Button>
                    {canManage && (
                        <Button onClick={handleGetOrCreate} loading={codeLoading}>Get or Create Code</Button>
                    )}
                </div>
                {customerCodes.length > 0 && (
                    <div className="mt-4">
                        <h4 className="mb-2 font-semibold">Codes</h4>
                        <DataTable
                            columns={[
                                { key: 'code', header: 'Code', render: (v) => <span className="font-mono">{v}</span> },
                                { key: 'status', header: 'Status' },
                                { key: 'createdAt', header: 'Created' },
                                {
                                    key: 'id',
                                    header: 'Actions',
                                    render: (_, row) => (
                                        <Button size="sm" variant="secondary" onClick={() => navigate(`/referrals/codes/${row.id}`)}>
                                            View Attributions
                                        </Button>
                                    ),
                                },
                            ]}
                            data={customerCodes}
                            onRowClick={(row) => navigate(`/referrals/codes/${row.id}`)}
                            emptyMessage="No codes"
                        />
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ReferralsCodes;
