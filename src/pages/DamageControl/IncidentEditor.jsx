import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Button,
} from '../../components/common';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    approveDamageRecord,
    cancelDamageRecord,
    confirmDamageRecord,
    createDamageRecord,
    getDamageDocuments,
    getDamageRecord,
    rejectDamageRecord,
    submitDamageRecordForApproval,
} from '../../services/damageControlService';
import { getWarehouses } from '../../services/warehouseService';
import {
    createInitialIncidentForm,
    toList,
} from './constants';
import IncidentBasicsCard from './Sections/IncidentBasicsCard';
import IncidentItemsCard from './Sections/IncidentItemsCard';
import IncidentDetailCard from './Sections/IncidentDetailCard';
import DocumentsCard from './Sections/DocumentsCard';

const IncidentEditor = () => {
    const navigate = useNavigate();
    const params = useParams();
    const id = params.id || null;
    const mode = id ? 'edit' : 'create';
    const { t } = useLanguage();

    const [form, setForm] = useState(createInitialIncidentForm());
    const [record, setRecord] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(mode === 'edit');
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [alert, setAlert] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    useEffect(() => {
        let cancelled = false;
        const loadWarehouses = async () => {
            try {
                const data = await getWarehouses();
                if (!cancelled) setWarehouses(toList(data));
            } catch (error) {
                if (!cancelled) showAlert('error', error.message || t('damageControl.messages.loadFailed'));
            }
        };
        loadWarehouses();
        return () => { cancelled = true; };
    }, []);

    const loadDetail = async () => {
        if (mode !== 'edit' || !id) return;
        try {
            setLoading(true);
            const [recordData, documentData] = await Promise.all([
                getDamageRecord(id),
                getDamageDocuments(id),
            ]);
            setRecord(recordData);
            setDocuments(toList(documentData));
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.detailFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDetail();
    }, [id, mode]);

    const warehouseOptions = useMemo(
        () => warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
        [warehouses],
    );

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validItems = form.items.filter((item) => item.variant?.id && Number(item.quantity) > 0);

        if (!form.warehouseId) {
            showAlert('error', t('damageControl.messages.warehouseRequired'));
            return;
        }

        if (validItems.length === 0) {
            showAlert('error', t('damageControl.messages.itemRequired'));
            return;
        }

        try {
            setSaving(true);
            const payload = {
                warehouseId: form.warehouseId,
                sourceType: form.sourceType,
                reasonCode: form.reasonCode,
                reference: form.reference || null,
                notes: form.notes || null,
                items: validItems.map((item) => ({
                    productVariantId: item.variant.id,
                    quantity: Number(item.quantity),
                    disposition: item.disposition,
                    serialNumbers: item.serialNumbers
                        ? item.serialNumbers.split(/[,\n]/).map((value) => value.trim()).filter(Boolean)
                        : [],
                })),
            };
            const created = await createDamageRecord(payload);
            showAlert('success', t('damageControl.messages.incidentCreated'));
            if (created?.id) {
                navigate(`/damage-control/incidents/${created.id}`);
            } else {
                navigate('/damage-control/incidents');
            }
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.createFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleRecordAction = async (actionKey) => {
        if (!id) return;
        const map = {
            submit: { fn: submitDamageRecordForApproval, message: t('damageControl.messages.submitted') },
            approve: { fn: approveDamageRecord, message: t('damageControl.messages.approved') },
            reject: { fn: rejectDamageRecord, message: t('damageControl.messages.rejected') },
            confirm: { fn: confirmDamageRecord, message: t('damageControl.messages.confirmed') },
            cancel: { fn: cancelDamageRecord, message: t('damageControl.messages.cancelled') },
        };
        const entry = map[actionKey];
        if (!entry) return;
        try {
            setActionLoading(actionKey);
            await entry.fn(id);
            showAlert('success', entry.message);
            await loadDetail();
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.recordActionFailed'));
        } finally {
            setActionLoading('');
        }
    };

    if (mode === 'edit' && loading && !record) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
            </div>
        );
    }

    if (mode === 'edit') {
        return (
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{record?.recordNumber || t('damageControl.detail.title')}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('damageControl.detail.subtitle')}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => navigate('/damage-control/incidents')}>
                            {t('damageControl.actions.close')}
                        </Button>
                    </div>
                </div>

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                {record ? (
                    <>
                        <IncidentDetailCard
                            record={record}
                            actionLoading={actionLoading}
                            onAction={handleRecordAction}
                        />
                        <DocumentsCard
                            recordId={id}
                            documents={documents}
                            onChanged={loadDetail}
                            onAlert={showAlert}
                        />
                    </>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {t('damageControl.detail.empty')}
                    </div>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('damageControl.forms.incidentTitle')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('damageControl.register.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => navigate('/damage-control/incidents')}>
                        {t('damageControl.actions.close')}
                    </Button>
                    <Button type="submit" loading={saving}>
                        {t('damageControl.actions.saveIncident')}
                    </Button>
                </div>
            </div>

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <IncidentBasicsCard form={form} setForm={setForm} warehouseOptions={warehouseOptions} />
            <IncidentItemsCard form={form} setForm={setForm} />

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <Button type="button" variant="secondary" onClick={() => navigate('/damage-control/incidents')}>
                    {t('damageControl.actions.cancel')}
                </Button>
                <Button type="submit" loading={saving}>
                    {t('damageControl.actions.saveIncident')}
                </Button>
            </div>
        </form>
    );
};

export default IncidentEditor;
