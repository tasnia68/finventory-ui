import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Input,
    Select,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { listDiscounts } from '../../services/discountService';
import {
    getReferralProgram,
    upsertReferralProgram,
} from '../../services/referralService';

const PROGRAM_STATUSES = ['ACTIVE', 'PAUSED', 'ENDED'];
const REWARD_TRIGGERS = ['ON_REFEREE_SIGNUP', 'ON_REFEREE_FIRST_ORDER', 'ON_REFEREE_NTH_ORDER'];

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.content)) return data.data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

const optionsFrom = (values) => values.map((v) => ({ value: v, label: v }));

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
};

const toIntegerOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const next = Number.parseInt(value, 10);
    return Number.isFinite(next) ? next : null;
};

const createProgramForm = () => ({
    name: '',
    status: 'ACTIVE',
    referrerDiscountId: '',
    refereeDiscountId: '',
    rewardTrigger: 'ON_REFEREE_FIRST_ORDER',
    minRefereeOrderAmount: '',
    refereeNthOrder: '',
    maxReferralsPerCustomer: '',
    description: '',
});

const ReferralsProgram = () => {
    const { user } = useAuth();
    const roleNames = useMemo(
        () => (Array.isArray(user?.roles)
            ? user.roles.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
            : []),
        [user],
    );
    const canManage = roleNames.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER');

    const [alert, setAlert] = useState(null);
    const [saving, setSaving] = useState(false);

    const [programForm, setProgramForm] = useState(createProgramForm());
    const [programLoading, setProgramLoading] = useState(true);
    const [discounts, setDiscounts] = useState([]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadProgram = async () => {
        try {
            setProgramLoading(true);
            const [prog, discountList] = await Promise.all([
                getReferralProgram().catch(() => null),
                listDiscounts().catch(() => []),
            ]);
            setDiscounts(toList(discountList));
            if (prog) {
                setProgramForm({
                    name: prog.name || '',
                    status: prog.status || 'ACTIVE',
                    referrerDiscountId: prog.referrerDiscountId || '',
                    refereeDiscountId: prog.refereeDiscountId || '',
                    rewardTrigger: prog.rewardTrigger || 'ON_REFEREE_FIRST_ORDER',
                    minRefereeOrderAmount: prog.minRefereeOrderAmount ?? '',
                    refereeNthOrder: prog.refereeNthOrder ?? '',
                    maxReferralsPerCustomer: prog.maxReferralsPerCustomer ?? '',
                    description: prog.description || '',
                });
            }
        } catch (error) {
            showAlert('error', error.message || 'Failed to load program');
        } finally {
            setProgramLoading(false);
        }
    };

    useEffect(() => { loadProgram(); }, []);

    const discountOptions = useMemo(
        () => [{ value: '', label: '— none —' }, ...discounts.map((d) => ({ value: d.id, label: d.name }))],
        [discounts],
    );

    const handleProgramSubmit = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const payload = {
                name: programForm.name,
                status: programForm.status,
                referrerDiscountId: programForm.referrerDiscountId || null,
                refereeDiscountId: programForm.refereeDiscountId || null,
                rewardTrigger: programForm.rewardTrigger,
                minRefereeOrderAmount: toNumberOrNull(programForm.minRefereeOrderAmount),
                refereeNthOrder: toIntegerOrNull(programForm.refereeNthOrder),
                maxReferralsPerCustomer: toIntegerOrNull(programForm.maxReferralsPerCustomer),
                description: programForm.description || null,
            };
            await upsertReferralProgram(payload);
            showAlert('success', 'Program saved');
        } catch (error) {
            showAlert('error', error.message || 'Failed to save program');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Referral program</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Configure rewards, triggers, and limits for your referral program
                </p>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            <Card>
                {programLoading ? (
                    <div className="flex justify-center py-12">
                        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
                    </div>
                ) : (
                    <form onSubmit={handleProgramSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                label="Name"
                                required
                                value={programForm.name}
                                onChange={(e) => setProgramForm((f) => ({ ...f, name: e.target.value }))}
                            />
                            <Select
                                label="Status"
                                value={programForm.status}
                                onChange={(e) => setProgramForm((f) => ({ ...f, status: e.target.value }))}
                                options={optionsFrom(PROGRAM_STATUSES)}
                            />
                            <Select
                                label="Referrer Discount"
                                value={programForm.referrerDiscountId}
                                onChange={(e) => setProgramForm((f) => ({ ...f, referrerDiscountId: e.target.value }))}
                                options={discountOptions}
                                placeholder="— none —"
                            />
                            <Select
                                label="Referee Discount"
                                value={programForm.refereeDiscountId}
                                onChange={(e) => setProgramForm((f) => ({ ...f, refereeDiscountId: e.target.value }))}
                                options={discountOptions}
                                placeholder="— none —"
                            />
                            <Select
                                label="Reward Trigger"
                                value={programForm.rewardTrigger}
                                onChange={(e) => setProgramForm((f) => ({ ...f, rewardTrigger: e.target.value }))}
                                options={optionsFrom(REWARD_TRIGGERS)}
                            />
                            <Input
                                label="Min Referee Order Amount"
                                type="number"
                                step="0.01"
                                value={programForm.minRefereeOrderAmount}
                                onChange={(e) => setProgramForm((f) => ({ ...f, minRefereeOrderAmount: e.target.value }))}
                            />
                            {programForm.rewardTrigger === 'ON_REFEREE_NTH_ORDER' && (
                                <Input
                                    label="Referee Nth Order"
                                    type="number"
                                    value={programForm.refereeNthOrder}
                                    onChange={(e) => setProgramForm((f) => ({ ...f, refereeNthOrder: e.target.value }))}
                                />
                            )}
                            <Input
                                label="Max Referrals Per Customer"
                                type="number"
                                value={programForm.maxReferralsPerCustomer}
                                onChange={(e) => setProgramForm((f) => ({ ...f, maxReferralsPerCustomer: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                            <textarea
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                                rows={3}
                                value={programForm.description}
                                onChange={(e) => setProgramForm((f) => ({ ...f, description: e.target.value }))}
                            />
                        </div>
                        {canManage && (
                            <div>
                                <Button type="submit" loading={saving}>Save Program</Button>
                            </div>
                        )}
                    </form>
                )}
            </Card>
        </div>
    );
};

export default ReferralsProgram;
