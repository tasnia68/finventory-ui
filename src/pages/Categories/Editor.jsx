import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    deleteCategory,
    getCategories,
    getCategory,
    getCategoryPermissions,
    getCategoryTree,
    updateCategory,
    updateCategoryPermissions,
} from '../../services/categoryService';
import { getRoles } from '../../services/roleService';
import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import { CatalogPageFrame } from '../../components/catalog';
import {
    buildCategoryPayload,
    categoryToFormState,
    emptyCategoryForm,
    findCategoryInTree,
    toList,
} from './constants';

const CategoryEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [savingPermissions, setSavingPermissions] = useState(false);
    const [alert, setAlert] = useState(null);

    const [category, setCategory] = useState(null);
    const [form, setForm] = useState(emptyCategoryForm());
    const [flatCategories, setFlatCategories] = useState([]);
    const [tree, setTree] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissionRows, setPermissionRows] = useState([]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadAll = async () => {
        try {
            setLoading(true);
            const [catData, flatData, treeData, rolesData, permissionsData] = await Promise.all([
                getCategory(id),
                getCategories(),
                getCategoryTree(),
                getRoles(),
                getCategoryPermissions(id).catch(() => []),
            ]);

            setCategory(catData || null);
            setForm(categoryToFormState(catData || {}));
            setFlatCategories(toList(flatData));
            setTree(toList(treeData));

            const rolesList = toList(rolesData);
            setRoles(rolesList);

            const existingByRole = toList(permissionsData).reduce((acc, row) => {
                acc[row.roleId] = row;
                return acc;
            }, {});
            setPermissionRows(
                rolesList.map((role) => {
                    const current = existingByRole[role.id];
                    return {
                        roleId: role.id,
                        roleName: role.name,
                        canView: current ? Boolean(current.canView) : true,
                        canEdit: current ? Boolean(current.canEdit) : false,
                    };
                }),
            );
        } catch (error) {
            showAlert('error', error.message || 'Failed to load category');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadAll();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const children = useMemo(() => {
        const node = findCategoryInTree(tree, id);
        return Array.isArray(node?.children) ? node.children : [];
    }, [tree, id]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const payload = buildCategoryPayload(form);
            const updated = await updateCategory(id, payload);
            setCategory(updated || { ...category, ...payload });
            setForm(categoryToFormState(updated || { ...category, ...payload }));
            showAlert('success', 'Category updated successfully');
        } catch (error) {
            showAlert('error', error.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;
        try {
            setDeleting(true);
            await deleteCategory(id);
            navigate('/categories');
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete category');
            setDeleting(false);
        }
    };

    const updatePermissionCell = (roleId, field, value) => {
        setPermissionRows((prev) =>
            prev.map((row) => {
                if (row.roleId !== roleId) return row;
                const next = { ...row, [field]: value };
                if (field === 'canEdit' && value) {
                    next.canView = true;
                }
                return next;
            }),
        );
    };

    const savePermissions = async () => {
        try {
            setSavingPermissions(true);
            await updateCategoryPermissions(id, permissionRows);
            showAlert('success', `Permissions saved for ${category?.name || 'category'}`);
        } catch (error) {
            showAlert('error', error.message || 'Failed to save permissions');
        } finally {
            setSavingPermissions(false);
        }
    };

    if (loading) {
        return (
            <CatalogPageFrame>
                <div className="flex items-center justify-center py-24">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
            </CatalogPageFrame>
        );
    }

    if (!category) {
        return (
            <CatalogPageFrame>
                <Card>
                    <div className="py-12 text-center">
                        <p className="text-slate-500 dark:text-slate-400">Category not found.</p>
                        <div className="mt-4">
                            <Button variant="secondary" onClick={() => navigate('/categories')}>
                                Back to categories
                            </Button>
                        </div>
                    </div>
                </Card>
            </CatalogPageFrame>
        );
    }

    const parentOptions = flatCategories.filter((cat) => String(cat.id) !== String(id));

    return (
        <CatalogPageFrame>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/categories')}
                        className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400"
                    >
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Back to categories
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {category.name}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Edit category details, manage subcategories, and configure role-level access.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="danger" onClick={handleDelete} loading={deleting}>
                        Delete
                    </Button>
                </div>
            </div>

            {alert ? (
                <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
            ) : null}

            <Card title="Category Settings">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Category Name"
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        required
                        placeholder="e.g., Electronics"
                    />
                    <Input
                        label="Description"
                        value={form.description}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                        placeholder="Brief description of this category"
                    />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Storefront Collection Settings
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    Use category merchandising fields to expose this category as a storefront collection.
                                </p>
                            </div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={form.publishedToStorefront}
                                    onChange={(event) =>
                                        setForm({ ...form, publishedToStorefront: event.target.checked })
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                Publish to storefront
                            </label>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <Input
                                label="Storefront Slug"
                                value={form.storefrontSlug}
                                onChange={(event) => setForm({ ...form, storefrontSlug: event.target.value })}
                                placeholder="warehouse-bundles"
                            />
                            <Input
                                label="Storefront Title"
                                value={form.storefrontTitle}
                                onChange={(event) => setForm({ ...form, storefrontTitle: event.target.value })}
                                placeholder="Warehouse Bundles"
                            />
                            <Input
                                label="Storefront Sort Order"
                                type="number"
                                value={form.storefrontSortOrder}
                                onChange={(event) => setForm({ ...form, storefrontSortOrder: event.target.value })}
                                placeholder="20"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Storefront Description
                            </label>
                            <textarea
                                value={form.storefrontDescription}
                                onChange={(event) =>
                                    setForm({ ...form, storefrontDescription: event.target.value })
                                }
                                rows={3}
                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                placeholder="Collection copy used in storefront collection cards."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Parent Category (Optional)
                        </label>
                        <select
                            value={form.parentId || ''}
                            onChange={(event) =>
                                setForm({ ...form, parentId: event.target.value || null })
                            }
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        >
                            <option value="">None (Top Level)</option>
                            {parentOptions.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" type="button" onClick={() => navigate('/categories')}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={saving}>
                            Save changes
                        </Button>
                    </div>
                </form>
            </Card>

            <Card
                title="Subcategories"
                subtitle={`${children.length} direct ${children.length === 1 ? 'child' : 'children'}`}
            >
                {children.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        No subcategories. Create a new category and set this category as its parent to nest it here.
                    </p>
                ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {children.map((child) => (
                            <div
                                key={child.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => navigate(`/categories/${child.id}`)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        navigate(`/categories/${child.id}`);
                                    }
                                }}
                                className="flex cursor-pointer items-center justify-between gap-4 px-2 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {child.name}
                                        </span>
                                        {child.publishedToStorefront ? (
                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                                Storefront
                                            </span>
                                        ) : null}
                                    </div>
                                    {child.description ? (
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {child.description}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    {Array.isArray(child.children) && child.children.length > 0 ? (
                                        <span>{child.children.length} nested</span>
                                    ) : null}
                                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card
                title="Category Permissions"
                subtitle="Role-level visibility and edit access for this category"
            >
                {roles.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        No roles available to configure.
                    </p>
                ) : (
                    <div className="space-y-4">
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Role
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Can View
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Can Edit
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                                    {permissionRows.map((row) => (
                                        <tr key={row.roleId}>
                                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                                                {row.roleName}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={row.canView}
                                                    onChange={(event) =>
                                                        updatePermissionCell(
                                                            row.roleId,
                                                            'canView',
                                                            event.target.checked,
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={row.canEdit}
                                                    onChange={(event) =>
                                                        updatePermissionCell(
                                                            row.roleId,
                                                            'canEdit',
                                                            event.target.checked,
                                                        )
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={savePermissions} loading={savingPermissions}>
                                Save Permissions
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </CatalogPageFrame>
    );
};

export default CategoryEditor;
