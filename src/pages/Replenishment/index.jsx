import React, { useEffect, useState } from 'react';
import {
    createReplenishmentRule,
    updateReplenishmentRule,
    deleteReplenishmentRule,
    getReplenishmentRules,
    getReplenishmentSuggestions,
    getStockAlerts,
} from '../../services/replenishmentService';
import { getWarehouses } from '../../services/warehouseService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';

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
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [filters, setFilters] = useState({ warehouseId: '' });
    const [formData, setFormData] = useState({
        productVariantId: '',
        warehouseId: '',
        minStock: '',
        maxStock: '',
        reorderQuantity: '',
        safetyStock: '',
        leadTimeDays: '',
        isEnabled: true,
    });

    useEffect(() => {
        fetchData();
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const data = await getWarehouses();
            setWarehouses(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rulesData, suggestionsData, alertsData] = await Promise.all([
                getReplenishmentRules({ warehouseId: filters.warehouseId || undefined }),
                getReplenishmentSuggestions({ warehouseId: filters.warehouseId || undefined }),
                getStockAlerts({ warehouseId: filters.warehouseId || undefined }),
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
            productVariantId: '',
            warehouseId: '',
            minStock: '',
            maxStock: '',
            reorderQuantity: '',
            safetyStock: '',
            leadTimeDays: '',
            isEnabled: true,
        });
        setEditingRule(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
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
        }
    };

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setFormData({
            productVariantId: rule.productVariantId || '',
            warehouseId: rule.warehouseId || '',
            minStock: rule.minStock ?? '',
            maxStock: rule.maxStock ?? '',
            reorderQuantity: rule.reorderQuantity ?? '',
            safetyStock: rule.safetyStock ?? '',
            leadTimeDays: rule.leadTimeDays ?? '',
            isEnabled: rule.isEnabled !== false,
        });
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

    const warehouseOptions = toList(warehouses).map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name,
    }));

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
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
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
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Replenishment
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Manage min/max rules and suggestions
                        </p>
                    </div>
                    <Button icon="add" onClick={() => setShowModal(true)}>
                        Add Rule
                    </Button>
                </div>

                {alert && (
                    <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
                )}

                <Card title="Filters">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Warehouse"
                            value={filters.warehouseId}
                            onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                            options={warehouseOptions}
                            placeholder="All warehouses"
                        />
                        <div className="flex items-end gap-3">
                            <Button variant="secondary" onClick={() => setFilters({ warehouseId: '' })}>
                                Reset
                            </Button>
                            <Button onClick={fetchData}>Apply</Button>
                        </div>
                    </div>
                </Card>

                <Card padding="none" className="overflow-hidden" title="Rules">
                    <DataTable
                        columns={ruleColumns}
                        data={rules}
                        loading={loading}
                        emptyMessage="No replenishment rules found."
                    />
                </Card>

                <Card padding="none" className="overflow-hidden" title="Suggestions">
                    <DataTable
                        columns={suggestionColumns}
                        data={suggestions}
                        loading={loading}
                        emptyMessage="No suggestions available."
                    />
                </Card>

                <Card padding="none" className="overflow-hidden" title="Stock Alerts">
                    <DataTable
                        columns={alertColumns}
                        data={alerts}
                        loading={loading}
                        emptyMessage="No alerts available."
                    />
                </Card>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingRule ? 'Edit Rule' : 'Create Rule'}
                size="lg"
            >
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <Input
                        label="Product Variant ID"
                        value={formData.productVariantId}
                        onChange={(e) => setFormData({ ...formData, productVariantId: e.target.value })}
                        required
                    />
                    <Select
                        label="Warehouse"
                        value={formData.warehouseId}
                        onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                        options={warehouseOptions}
                        required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Min Stock"
                            type="number"
                            value={formData.minStock}
                            onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                            required
                        />
                        <Input
                            label="Max Stock"
                            type="number"
                            value={formData.maxStock}
                            onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Reorder Quantity"
                            type="number"
                            value={formData.reorderQuantity}
                            onChange={(e) => setFormData({ ...formData, reorderQuantity: e.target.value })}
                            required
                        />
                        <Input
                            label="Safety Stock"
                            type="number"
                            value={formData.safetyStock}
                            onChange={(e) => setFormData({ ...formData, safetyStock: e.target.value })}
                        />
                    </div>
                    <Input
                        label="Lead Time Days"
                        type="number"
                        value={formData.leadTimeDays}
                        onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="ruleEnabled"
                            checked={formData.isEnabled}
                            onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="ruleEnabled" className="text-sm text-slate-600 dark:text-slate-300">
                            Enabled
                        </label>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Save Rule</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Replenishment;