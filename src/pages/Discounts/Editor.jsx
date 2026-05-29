import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Button,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import {
    createDiscount,
    getDiscount,
    listDiscountCodes,
    updateDiscount,
} from '../../services/discountService';
import { getProductTemplates, getProducts } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { getCustomers } from '../../services/customerService';
import {
    buildDiscountPayload,
    createDiscountForm,
    discountToFormState,
    getRoleNames,
    toList,
} from './constants';
import BasicsCard from './Sections/BasicsCard';
import ValueCard from './Sections/ValueCard';
import EligibilityCard from './Sections/EligibilityCard';
import AppliesToCard from './Sections/AppliesToCard';
import ScheduleLimitsCard from './Sections/ScheduleLimitsCard';
import StackingCard from './Sections/StackingCard';
import CodesCard from './Sections/CodesCard';

const DiscountEditor = () => {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id || null;
    const mode = id ? 'edit' : 'create';

    const { user } = useAuth();
    const roleNames = useMemo(() => getRoleNames(user), [user]);
    const canManage = roleNames.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER');

    const [form, setForm] = useState(createDiscountForm());
    const [loading, setLoading] = useState(mode === 'edit');
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);
    const [codes, setCodes] = useState([]);

    const [productTemplates, setProductTemplates] = useState([]);
    const [productVariants, setProductVariants] = useState([]);
    const [categories, setCategories] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [refDataLoading, setRefDataLoading] = useState(true);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    // Load reference data once
    useEffect(() => {
        let cancelled = false;
        const loadReferenceData = async () => {
            setRefDataLoading(true);
            const results = await Promise.allSettled([
                getProductTemplates(),
                getProducts(),
                getCategories(),
                getCustomers(),
            ]);
            if (cancelled) return;
            const [tplRes, varRes, catRes, custRes] = results;
            setProductTemplates(tplRes.status === 'fulfilled' ? toList(tplRes.value) : []);
            setProductVariants(varRes.status === 'fulfilled' ? toList(varRes.value) : []);
            setCategories(catRes.status === 'fulfilled' ? toList(catRes.value) : []);
            setCustomers(custRes.status === 'fulfilled' ? toList(custRes.value) : []);
            setRefDataLoading(false);
        };
        loadReferenceData();
        return () => { cancelled = true; };
    }, []);

    // Load discount for edit
    useEffect(() => {
        if (mode !== 'edit' || !id) return;
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                const data = await getDiscount(id);
                if (cancelled) return;
                setForm(discountToFormState(data || {}));
            } catch (error) {
                if (!cancelled) showAlert('error', error.message || 'Failed to load discount');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [id, mode]);

    const loadCodes = async () => {
        if (mode !== 'edit' || !id) return;
        try {
            const data = await listDiscountCodes(id);
            setCodes(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load codes');
        }
    };

    useEffect(() => {
        if (mode === 'edit' && id) loadCodes();
    }, [id, mode]);

    const refData = useMemo(() => ({
        productTemplates,
        productVariants,
        categories,
        customers,
        refDataLoading,
    }), [productTemplates, productVariants, categories, customers, refDataLoading]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canManage) return;
        try {
            setSaving(true);
            const payload = buildDiscountPayload(form);
            if (mode === 'edit') {
                await updateDiscount(id, payload);
                showAlert('success', 'Discount updated');
            } else {
                const created = await createDiscount(payload);
                showAlert('success', 'Discount created');
                if (created?.id) {
                    navigate(`/discounts/${created.id}`);
                }
            }
        } catch (error) {
            showAlert('error', error.message || 'Failed to save discount');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {mode === 'edit' ? 'Edit discount' : 'New discount'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {mode === 'edit' ? form.name || 'Discount details' : 'Define a new discount campaign'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => navigate('/discounts')}>
                        Back
                    </Button>
                    {canManage && (
                        <Button type="submit" loading={saving}>
                            {mode === 'edit' ? 'Update' : 'Create'}
                        </Button>
                    )}
                </div>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            <BasicsCard form={form} setForm={setForm} />
            <ValueCard form={form} setForm={setForm} />
            <EligibilityCard form={form} setForm={setForm} refData={refData} />
            <AppliesToCard form={form} setForm={setForm} refData={refData} />
            <ScheduleLimitsCard form={form} setForm={setForm} />
            <StackingCard form={form} setForm={setForm} />

            {mode === 'edit' && id && (
                <CodesCard
                    discountId={id}
                    codes={codes}
                    onCodesChanged={loadCodes}
                    onAlert={showAlert}
                />
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <Button type="button" variant="secondary" onClick={() => navigate('/discounts')}>
                    Cancel
                </Button>
                {canManage && (
                    <Button type="submit" loading={saving}>
                        {mode === 'edit' ? 'Update' : 'Create'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default DiscountEditor;
