import React, { useEffect, useMemo, useState } from 'react';
import {
    calculateReplenishmentRule,
    createReplenishmentRule,
    deleteReplenishmentRule,
    getReplenishmentRules,
    getReplenishmentSuggestions,
    getStockAlerts,
    updateReplenishmentRule,
} from '../../services/replenishmentService';
import { getWarehouses } from '../../services/warehouseService';
import { Alert, Badge, Button, Card, DataTable, InfoTip, Input, MetricCard, Modal, ProductVariantLookup, Select } from '../../components/common';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const Replenishment = () => {
    const [rules, setRules] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [filters, setFilters] = useState({ warehouseId: '' });
    const [formData, setFormData] = useState({
        warehouseId: '',
        minStock: '',
        maxStock: '',
        reorderQuantity: '',
        safetyStock: '',
        leadTimeDays: '',
        isEnabled: true,
    });

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        if (filters.warehouseId) {
            fetchData(filters.warehouseId);
        } else {
            setRules([]);
            setSuggestions([]);
            setAlerts([]);
            setLoading(false);
        }
    }, [filters.warehouseId]);

    const fetchWarehouses = async () => {
        try {
            const data = await getWarehouses();
            const list = toList(data);
            setWarehouses(list);
            if (list.length === 1) {
                setFilters({ warehouseId: list[0].id });
            }
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        }
    };

    const fetchData = async (warehouseId = filters.warehouseId) => {
        if (!warehouseId) return;
        try {
            setLoading(true);
            const [rulesData, suggestionsData, alertsData] = await Promise.all([
                getReplenishmentRules({ warehouseId }),
                getReplenishmentSuggestions({ warehouseId }),
                getStockAlerts({ warehouseId }),
            ]);
            setRules(toList(rulesData));
            setSuggestions(toList(suggestionsData));
            setAlerts(toList(alertsData));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load replenishment data');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const resetForm = () => {
        setFormData({
            warehouseId: filters.warehouseId || '',
            minStock: '',
            maxStock: '',
            reorderQuantity: '',
            safetyStock: '',
            leadTimeDays: '',
            isEnabled: true,
        });
        setEditingRule(null);
        setSelectedVariant(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedVariant?.id) {
            showAlert('error', 'Select a product variant before saving the rule');
            return;
        }
        try {
            setSaving(true);
            const payload = {
                ...formData,
                productVariantId: selectedVariant.id,
                minStock: Number(formData.minStock),
                maxStock: Number(formData.maxStock),
                reorderQuantity: Number(formData.reorderQuantity),
                safetyStock: Number(formData.safetyStock || 0),
                leadTimeDays: Number(formData.leadTimeDays || 0),
            };
            if (editingRule) {
                await updateReplenishmentRule(editingRule.id, payload);
                showAlert('success', 'Rule updated successfully');
            } else {
                await createReplenishmentRule(payload);
                showAlert('success', 'Rule created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            showAlert('error', error.message || 'Failed to save rule');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setFormData({
            warehouseId: rule.warehouseId || '',
            minStock: rule.minStock ?? '',
            maxStock: rule.maxStock ?? '',
            reorderQuantity: rule.reorderQuantity ?? '',
            safetyStock: rule.safetyStock ?? '',
            leadTimeDays: rule.leadTimeDays ?? '',
            isEnabled: rule.isEnabled !== false,
        });
        setSelectedVariant({
            id: rule.productVariantId,
            name: rule.productVariantName,
            sku: rule.productVariantName,
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        resetForm();
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this rule?')) return;
        try {
            await deleteReplenishmentRule(id);
            showAlert('success', 'Rule deleted');
            fetchData();
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete rule');
        }
    };

    const handleCalculate = async (id) => {
        try {
            await calculateReplenishmentRule(id);
            showAlert('success', 'Reorder calculation triggered');
            fetchData();
        } catch (error) {
            showAlert('error', error.message || 'Failed to calculate reorder rule');
        }
    };

    const warehouseOptions = toList(warehouses).map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name,
    }));

    const summary = useMemo(() => {
        const enabledRules = rules.filter((rule) => rule.isEnabled).length;
        const totalSuggested = suggestions.reduce((sum, row) => sum + Number(row.suggestedQuantity || 0), 0);
        const criticalAlerts = alerts.filter((row) => row.status === 'BELOW_MIN').length;
        const warehousesCovered = new Set(rules.map((rule) => rule.warehouseId).filter(Boolean)).size;
        return { enabledRules, totalSuggested, criticalAlerts, warehousesCovered };
    }, [alerts, rules, suggestions]);

    const ruleColumns = [
        {
            key: 'productVariantId',
            header: 'Variant',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{row.productVariantName || row.sku || value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Warehouse: {row.warehouseName || row.warehouseId}</div>
                </div>
            ),
        },
        { key: 'minStock', header: 'Min' },
        { key: 'maxStock', header: 'Max' },
        { key: 'reorderQuantity', header: 'Reorder Qty' },
        {
            key: 'isEnabled',
            header: 'Status',
            render: (value) => (
                <Badge variant={value ? 'success' : 'default'}>{value ? 'Enabled' : 'Disabled'}</Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" icon="calculate" onClick={() => handleCalculate(row.id)}>Calculate</Button>
                    <Button variant="secondary" size="sm" icon="edit" onClick={() => handleEdit(row)}>Edit</Button>
                    <Button variant="ghost" size="sm" icon="delete" onClick={() => handleDelete(row.id)}>Delete</Button>
                </div>
            ),
        },
    ];

    const suggestionColumns = [
        { key: 'productVariantName', header: 'Product' },
        { key: 'sku', header: 'SKU' },
        { key: 'currentStock', header: 'Current' },
        { key: 'suggestedQuantity', header: 'Suggested' },
        { key: 'warehouseName', header: 'Warehouse' },
    ];

    const alertColumns = [
        { key: 'productVariantName', header: 'Product' },
        { key: 'sku', header: 'SKU' },
        { key: 'currentStock', header: 'Current' },
        { key: 'minStock', header: 'Min' },
        { key: 'maxStock', header: 'Max' },
        {
            key: 'status',
            header: 'Status',
            render: (value) => (
                <Badge variant={value === 'BELOW_MIN' ? 'danger' : 'warning'}>{value}</Badge>
            ),
        },
    ];

    return (
        <CatalogPageFrame>
            <CatalogHero
                eyebrow="Advanced Inventory"
                title="Warehouse replenishment with rule-driven coverage."
                description="Manage min-max rules, inspect recommended buys or transfers, and review below-min alerts in one warehouse-scoped workspace."
                info="These backend endpoints are warehouse-specific, so select the site first before reviewing rules and suggestions."
                actions={<Button icon="add" onClick={handleCreate} disabled={!filters.warehouseId}>Add Rule</Button>}
            />

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Enabled Rules" value={summary.enabledRules} caption="Active replenishment policies" icon="rule" tone="blue" />
                <MetricCard title="Suggested Qty" value={summary.totalSuggested} caption="Recommended inbound or transfer quantity" icon="shopping_cart" tone="emerald" />
                <MetricCard title="Below-Min Alerts" value={summary.criticalAlerts} caption="SKUs currently under rule minimum" icon="notification_important" tone="rose" />
                <MetricCard title="Warehouses Covered" value={summary.warehousesCovered} caption="Visible in this current dataset" icon="warehouse" tone="violet" />
            </div>

            <Card
                title="Warehouse Scope"
                subtitle="Select the facility you want to manage before loading rules and suggestions."
                action={<InfoTip text="Suggestions and stock alerts are generated per warehouse, not globally." />}
            >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Select
                        label="Warehouse"
                        value={filters.warehouseId}
                        onChange={(event) => setFilters({ warehouseId: event.target.value })}
                        options={warehouseOptions}
                        placeholder="Select a warehouse"
                    />
                    <div className="flex items-end gap-3">
                        <Button variant="secondary" onClick={() => setFilters({ warehouseId: '' })}>Reset</Button>
                        <Button onClick={() => fetchData() } disabled={!filters.warehouseId}>Refresh</Button>
                    </div>
                </div>
            </Card>

            <Card padding="none" className="overflow-hidden" title="Rules" subtitle={filters.warehouseId ? 'Min-max configuration for the selected warehouse' : 'Select a warehouse to load rules.'}>
                <DataTable columns={ruleColumns} data={rules} loading={loading} emptyMessage={filters.warehouseId ? 'No replenishment rules found.' : 'Select a warehouse to load replenishment rules.'} />
            </Card>

            <Card padding="none" className="overflow-hidden" title="Suggestions" subtitle="Recommended replenishment quantities from current stock position">
                <DataTable columns={suggestionColumns} data={suggestions} loading={loading} emptyMessage={filters.warehouseId ? 'No suggestions available.' : 'Select a warehouse to load replenishment suggestions.'} />
            </Card>

            <Card padding="none" className="overflow-hidden" title="Stock Alerts" subtitle="Rules currently below threshold in the selected warehouse">
                <DataTable columns={alertColumns} data={alerts} loading={loading} emptyMessage={filters.warehouseId ? 'No alerts available.' : 'Select a warehouse to load stock alerts.'} />
            </Card>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingRule ? 'Edit Rule' : 'Create Rule'} size="lg">
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <ProductVariantLookup label="Product variant" selectedVariant={selectedVariant} onSelect={setSelectedVariant} required />
                    <Select
                        label="Warehouse"
                        value={formData.warehouseId}
                        onChange={(event) => setFormData((current) => ({ ...current, warehouseId: event.target.value }))}
                        options={warehouseOptions}
                        required
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                            label="Min Stock"
                            type="number"
                            value={formData.minStock}
                            onChange={(event) => setFormData((current) => ({ ...current, minStock: event.target.value }))}
                            required
                        />
                        <Input
                            label="Max Stock"
                            type="number"
                            value={formData.maxStock}
                            onChange={(event) => setFormData((current) => ({ ...current, maxStock: event.target.value }))}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                            label="Reorder Quantity"
                            type="number"
                            value={formData.reorderQuantity}
                            onChange={(event) => setFormData((current) => ({ ...current, reorderQuantity: event.target.value }))}
                            required
                        />
                        <Input
                            label="Safety Stock"
                            type="number"
                            value={formData.safetyStock}
                            onChange={(event) => setFormData((current) => ({ ...current, safetyStock: event.target.value }))}
                        />
                    </div>
                    <Input
                        label="Lead Time Days"
                        type="number"
                        value={formData.leadTimeDays}
                        onChange={(event) => setFormData((current) => ({ ...current, leadTimeDays: event.target.value }))}
                    />
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="ruleEnabled"
                            checked={formData.isEnabled}
                            onChange={(event) => setFormData((current) => ({ ...current, isEnabled: event.target.checked }))}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="ruleEnabled" className="text-sm text-slate-600 dark:text-slate-300">Enabled</label>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit" loading={saving}>Save Rule</Button>
                    </div>
                </form>
            </Modal>
        </CatalogPageFrame>
    );
};

export default Replenishment;