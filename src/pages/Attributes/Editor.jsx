import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    getProductAttribute,
    updateProductAttribute,
    deleteProductAttribute,
    getAttributeGroups,
} from '../../services/attributeService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { ATTRIBUTE_TYPES } from './CreateModal';

const splitOptions = (value) =>
    (value || '')
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

const joinOptions = (values) =>
    values
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v.length > 0)
        .join(', ');

const supportsOptions = (type) => type === 'DROPDOWN' || type === 'MULTI_SELECT';
const supportsValidation = (type) => type === 'TEXT' || type === 'NUMBER';

const AttributeEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fallbackTemplateId = searchParams.get('templateId') || '';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [alert, setAlert] = useState(null);
    const [groups, setGroups] = useState([]);
    const [form, setForm] = useState({
        name: '',
        type: 'TEXT',
        required: false,
        validationRegex: '',
        groupId: null,
        templateId: '',
    });
    const [values, setValues] = useState([]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                const [attr, groupsData] = await Promise.all([
                    getProductAttribute(id),
                    getAttributeGroups().catch(() => []),
                ]);
                if (cancelled) return;
                if (!attr) {
                    showAlert('error', 'Attribute not found');
                    return;
                }
                setForm({
                    name: attr.name || '',
                    type: attr.type || 'TEXT',
                    required: !!attr.required,
                    validationRegex: attr.validationRegex || '',
                    groupId: attr.groupId || null,
                    templateId: attr.templateId || fallbackTemplateId,
                });
                setValues(splitOptions(attr.options));
                setGroups(Array.isArray(groupsData) ? groupsData : []);
            } catch (error) {
                if (!cancelled) showAlert('error', error.message || 'Failed to load attribute');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    const templateQuery = form.templateId ? `?templateId=${form.templateId}` : '';

    const updateValue = (index, next) => {
        setValues((prev) => prev.map((v, i) => (i === index ? next : v)));
    };

    const addValue = () => setValues((prev) => [...prev, '']);

    const removeValue = (index) => setValues((prev) => prev.filter((_, i) => i !== index));

    const moveValue = (index, direction) => {
        setValues((prev) => {
            const target = index + direction;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!form.name.trim()) {
            showAlert('error', 'Attribute name is required');
            return;
        }
        const optionsString = supportsOptions(form.type) ? joinOptions(values) : '';
        if (supportsOptions(form.type) && !optionsString) {
            showAlert('error', 'Add at least one option for dropdown or multi-select attributes');
            return;
        }
        try {
            setSaving(true);
            const payload = {
                name: form.name,
                type: form.type,
                required: !!form.required,
                options: optionsString,
                validationRegex: supportsValidation(form.type) ? form.validationRegex : '',
                groupId: form.groupId || null,
                templateId: form.templateId || null,
            };
            await updateProductAttribute(id, payload);
            showAlert('success', 'Attribute updated successfully');
        } catch (error) {
            showAlert('error', error.message || 'Failed to save attribute');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this attribute?')) return;
        try {
            setDeleting(true);
            await deleteProductAttribute(id);
            navigate(`/attributes${templateQuery}`);
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete attribute');
            setDeleting(false);
        }
    };

    const typeLabel = useMemo(
        () => ATTRIBUTE_TYPES.find((t) => t.value === form.type)?.label || form.type,
        [form.type],
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit attribute</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {form.name || 'Attribute settings'} <Badge variant="info">{typeLabel}</Badge>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => navigate(`/attributes${templateQuery}`)}>
                        Back
                    </Button>
                    <Button type="button" variant="danger" onClick={handleDelete} loading={deleting}>
                        Delete
                    </Button>
                    <Button type="submit" loading={saving}>
                        Update
                    </Button>
                </div>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

            <Card title="Settings" subtitle="Core attribute definition shared with the product template">
                <div className="space-y-4">
                    <Input
                        label="Attribute Name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        placeholder="e.g., Color, Size, Material"
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Type
                        </label>
                        <select
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                            className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        >
                            {ATTRIBUTE_TYPES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {supportsValidation(form.type) && (
                        <Input
                            label="Validation Pattern (optional)"
                            value={form.validationRegex}
                            onChange={(e) => setForm({ ...form, validationRegex: e.target.value })}
                            placeholder="e.g., ^[A-Z]{2,}$ for uppercase letters"
                        />
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Attribute Group (Optional)
                        </label>
                        <select
                            value={form.groupId || ''}
                            onChange={(e) => setForm({ ...form, groupId: e.target.value || null })}
                            className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">None</option>
                            {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="required"
                            checked={form.required}
                            onChange={(e) => setForm({ ...form, required: e.target.checked })}
                            className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="required" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Required attribute
                        </label>
                    </div>
                </div>
            </Card>

            {supportsOptions(form.type) && (
                <Card
                    title="Values"
                    subtitle="Define the selectable options. Drag-free reorder using the arrow controls; order is preserved."
                    action={
                        <Button type="button" size="sm" icon="add" onClick={addValue}>
                            Add value
                        </Button>
                    }
                >
                    {values.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            No values yet. Add the first option to start populating this attribute.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {values.map((value, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                                >
                                    <span className="w-8 text-center text-xs text-slate-500 dark:text-slate-400">
                                        {index + 1}
                                    </span>
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={(e) => updateValue(index, e.target.value)}
                                        placeholder={`Value ${index + 1}`}
                                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => moveValue(index, -1)}
                                        disabled={index === 0}
                                        className="p-2 text-slate-500 hover:text-primary disabled:opacity-30"
                                        aria-label="Move up"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveValue(index, 1)}
                                        disabled={index === values.length - 1}
                                        className="p-2 text-slate-500 hover:text-primary disabled:opacity-30"
                                        aria-label="Move down"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeValue(index)}
                                        className="p-2 text-slate-500 hover:text-red-600"
                                        aria-label="Remove value"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <Button type="button" variant="secondary" onClick={() => navigate(`/attributes${templateQuery}`)}>
                    Cancel
                </Button>
                <Button type="submit" loading={saving}>
                    Update
                </Button>
            </div>
        </form>
    );
};

export default AttributeEditor;
