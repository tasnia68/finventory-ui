import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button } from '../../components/common';
import { useLanguage } from '../../contexts/LanguageContext';
import { getBatches } from '../../services/batchService';
import {
    createSalesRefund,
    getRmas,
    getStorageLocations,
} from '../../services/salesRefundService';
import { getSalesOrders } from '../../services/salesOrderService';
import { getWarehouses } from '../../services/warehouseService';
import {
    createRefundForm,
    createRefundItem,
    createReplacementItem,
    toList,
} from './constants';
import OrderSelectionCard from './Sections/OrderSelectionCard';
import LinesCard from './Sections/LinesCard';
import ReasonMethodCard from './Sections/ReasonMethodCard';
import ReplacementItemsCard from './Sections/ReplacementItemsCard';
import ReviewCard from './Sections/ReviewCard';

const RefundsExchangesEditor = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [form, setForm] = useState(createRefundForm());
    const [salesOrders, setSalesOrders] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [rmas, setRmas] = useState([]);
    const [storageLocations, setStorageLocations] = useState([]);
    const [batchOptionsByVariant, setBatchOptionsByVariant] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                const [orderData, warehouseData] = await Promise.all([
                    getSalesOrders({ page: 0, size: 100 }),
                    getWarehouses(),
                ]);
                if (cancelled) return;
                setSalesOrders(toList(orderData).filter((order) => ['SHIPPED', 'DELIVERED', 'RETURNED'].includes(order.status)));
                setWarehouses(toList(warehouseData));
            } catch (error) {
                if (!cancelled) showAlert('error', error.message || t('refundsExchanges.messages.loadFailed'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const salesOrderOptions = useMemo(
        () => salesOrders.map((order) => ({ value: order.id, label: `${order.soNumber} • ${order.customerName}` })),
        [salesOrders]
    );
    const warehouseOptions = useMemo(
        () => warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
        [warehouses]
    );
    const rmaOptions = useMemo(
        () => rmas.map((rma) => ({ value: rma.id, label: `${rma.rmaNumber} • ${rma.status}` })),
        [rmas]
    );
    const storageLocationOptions = useMemo(
        () => storageLocations.map((location) => ({ value: location.id, label: location.name })),
        [storageLocations]
    );

    const currentSalesOrder = useMemo(
        () => salesOrders.find((order) => order.id === form.salesOrderId) || null,
        [salesOrders, form.salesOrderId]
    );
    const currentRma = useMemo(
        () => rmas.find((rma) => rma.id === form.rmaId) || null,
        [rmas, form.rmaId]
    );

    const loadCreateDependencies = async (salesOrder) => {
        if (!salesOrder) {
            setRmas([]);
            setStorageLocations([]);
            setBatchOptionsByVariant({});
            return;
        }
        try {
            const [rmaData, locationData, batchGroups] = await Promise.all([
                getRmas({ salesOrderId: salesOrder.id, page: 0, size: 100 }),
                salesOrder.warehouseId ? getStorageLocations(salesOrder.warehouseId) : Promise.resolve([]),
                Promise.all((salesOrder.items || []).map(async (item) => {
                    try {
                        const batches = await getBatches({ productVariantId: item.productVariantId });
                        return [item.productVariantId, toList(batches)];
                    } catch (error) {
                        return [item.productVariantId, []];
                    }
                })),
            ]);
            setRmas(toList(rmaData));
            setStorageLocations(toList(locationData));
            setBatchOptionsByVariant(Object.fromEntries(batchGroups));
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.lookupFailed'));
        }
    };

    useEffect(() => {
        if (!currentSalesOrder) {
            return;
        }
        loadCreateDependencies(currentSalesOrder);
    }, [currentSalesOrder?.id]);

    const handleSalesOrderChange = (salesOrderId) => {
        const order = salesOrders.find((item) => item.id === salesOrderId) || null;
        setForm((current) => ({
            ...current,
            salesOrderId,
            rmaId: '',
            warehouseId: order?.warehouseId || '',
            refundMethod: 'ORIGINAL_PAYMENT_METHOD',
            items: (order?.items || []).map(createRefundItem),
            replacementItems: current.refundType === 'EXCHANGE' ? [createReplacementItem()] : [],
        }));
    };

    const handleRmaChange = (rmaId) => {
        const nextRma = rmas.find((item) => item.id === rmaId) || null;
        setForm((current) => ({
            ...current,
            rmaId,
            items: current.items.map((item) => {
                const matchedLine = nextRma?.items?.find((rmaItem) => rmaItem.salesOrderItemId === item.salesOrderItemId);
                return matchedLine && !item.quantity
                    ? { ...item, quantity: String(matchedLine.quantity || '') }
                    : item;
            }),
        }));
    };

    const handleWarehouseChange = (warehouseId) => {
        setForm((current) => ({ ...current, warehouseId }));
    };

    const handleRefundItemChange = (salesOrderItemId, key, value) => {
        setForm((current) => ({
            ...current,
            items: current.items.map((item) => item.salesOrderItemId === salesOrderItemId ? { ...item, [key]: value } : item),
        }));
    };

    const handleReplacementItemChange = (itemId, key, value) => {
        setForm((current) => ({
            ...current,
            replacementItems: current.replacementItems.map((item) => item.id === itemId ? { ...item, [key]: value } : item),
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const validItems = form.items
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({
                salesOrderItemId: item.salesOrderItemId,
                quantity: Number(item.quantity),
                unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
                returnDisposition: item.returnDisposition,
                reason: item.reason || null,
                batchId: item.batchId || null,
                storageLocationId: item.storageLocationId || null,
                serialNumbers: item.serialNumbers
                    ? item.serialNumbers.split(/[\n,]/).map((value) => value.trim()).filter(Boolean)
                    : [],
            }));

        const validReplacementItems = form.replacementItems
            .filter((item) => item.variant?.id && Number(item.quantity) > 0 && Number(item.unitPrice) > 0)
            .map((item) => ({
                productVariantId: item.variant.id,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            }));

        if (!form.salesOrderId) {
            showAlert('error', t('refundsExchanges.messages.salesOrderRequired'));
            return;
        }
        if (validItems.length === 0) {
            showAlert('error', t('refundsExchanges.messages.itemsRequired'));
            return;
        }
        if (form.refundType === 'EXCHANGE' && validReplacementItems.length === 0) {
            showAlert('error', t('refundsExchanges.messages.replacementRequired'));
            return;
        }

        try {
            setSaving(true);
            const created = await createSalesRefund({
                salesOrderId: form.salesOrderId,
                rmaId: form.rmaId || null,
                warehouseId: form.warehouseId || null,
                refundType: form.refundType,
                refundMethod: form.refundMethod,
                reason: form.reason || null,
                notes: form.notes || null,
                items: validItems,
                replacementItems: form.refundType === 'EXCHANGE' ? validReplacementItems : undefined,
            });
            showAlert('success', t('refundsExchanges.messages.created'));
            if (created?.id) {
                navigate(`/refunds-exchanges/${created.id}`);
            } else {
                navigate('/refunds-exchanges');
            }
        } catch (error) {
            showAlert('error', error.message || t('refundsExchanges.messages.createFailed'));
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
                        {t('refundsExchanges.forms.title')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('refundsExchanges.sections.editorSubtitle')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => navigate('/refunds-exchanges')}>
                        {t('refundsExchanges.actions.close')}
                    </Button>
                    <Button type="submit" loading={saving}>
                        {t('refundsExchanges.actions.save')}
                    </Button>
                </div>
            </div>

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <OrderSelectionCard
                form={form}
                salesOrderOptions={salesOrderOptions}
                rmaOptions={rmaOptions}
                warehouseOptions={warehouseOptions}
                onSalesOrderChange={handleSalesOrderChange}
                onRmaChange={handleRmaChange}
                onWarehouseChange={handleWarehouseChange}
            />

            <LinesCard
                form={form}
                currentRma={currentRma}
                storageLocationOptions={storageLocationOptions}
                batchOptionsByVariant={batchOptionsByVariant}
                onRefundItemChange={handleRefundItemChange}
            />

            <ReasonMethodCard form={form} setForm={setForm} />

            <ReplacementItemsCard
                form={form}
                setForm={setForm}
                onReplacementItemChange={handleReplacementItemChange}
            />

            <ReviewCard form={form} currentSalesOrder={currentSalesOrder} />

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <Button type="button" variant="secondary" onClick={() => navigate('/refunds-exchanges')}>
                    {t('refundsExchanges.actions.close')}
                </Button>
                <Button type="submit" loading={saving}>
                    {t('refundsExchanges.actions.save')}
                </Button>
            </div>
        </form>
    );
};

export default RefundsExchangesEditor;
