import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
} from '../../components/common';
import { listReferralAttributions } from '../../services/referralService';

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.content)) return data.data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

const getCodeStatusVariant = (status) => {
    switch (status) {
        case 'ACTIVE': return 'success';
        case 'DISABLED':
        case 'EXPIRED': return 'danger';
        default: return 'default';
    }
};

const ReferralCodeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [alert, setAlert] = useState(null);
    const [attributions, setAttributions] = useState([]);
    const [attrLoading, setAttrLoading] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadAttributions = async () => {
        if (!id) return;
        try {
            setAttrLoading(true);
            const data = await listReferralAttributions(id);
            setAttributions(toList(data));
        } catch (error) {
            setAttributions([]);
            showAlert('error', error.message || 'Failed to load attributions');
        } finally {
            setAttrLoading(false);
        }
    };

    useEffect(() => {
        loadAttributions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const refereesCount = attributions.length;
    const rewardsPaidCount = attributions.filter((a) => a?.rewardedAt).length;
    const firstAttribution = attributions[0];
    const codeValue = firstAttribution?.code || firstAttribution?.referralCode || id;
    const codeStatus = firstAttribution?.referralStatus || firstAttribution?.codeStatus || '—';

    return (
        <div className="flex-1 overflow-y-auto space-y-6 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/referrals/codes')}>
                        ← Back to codes
                    </Button>
                    <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Referral code details</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Full attribution history for this referral code
                    </p>
                </div>
                <Button variant="secondary" onClick={loadAttributions} loading={attrLoading}>Refresh</Button>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            <Card>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Code</p>
                        <p className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white">{codeValue}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
                        <p className="mt-1"><Badge variant={getCodeStatusVariant(codeStatus)}>{codeStatus}</Badge></p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Referees</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{refereesCount}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Rewards paid</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{rewardsPaidCount}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="mb-3 text-lg font-semibold">Attributions</h3>
                <DataTable
                    columns={[
                        { key: 'refereeCustomerId', header: 'Referee' },
                        { key: 'status', header: 'Status' },
                        { key: 'orderId', header: 'Order' },
                        { key: 'rewardedAt', header: 'Rewarded' },
                        { key: 'createdAt', header: 'When' },
                    ]}
                    data={attributions}
                    loading={attrLoading}
                    emptyMessage="No attributions"
                />
            </Card>
        </div>
    );
};

export default ReferralCodeDetail;
