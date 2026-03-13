import React, { useState, useEffect } from 'react';
import {
  getCategories,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryPermissions,
  updateCategoryPermissions,
} from '../../services/categoryService';
import { getRoles } from '../../services/roleService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import InfoTip from '../../components/common/InfoTip';
import MetricCard from '../../components/common/MetricCard';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [alert, setAlert] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissionsCategory, setPermissionsCategory] = useState(null);
  const [permissionRows, setPermissionRows] = useState([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: null,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const [treeData, flatData] = await Promise.all([
        getCategoryTree(),
        getCategories(),
      ]);
      setCategories(Array.isArray(treeData) ? treeData : []);
      setFlatCategories(Array.isArray(flatData) ? flatData : []);

      const rolesData = await getRoles();
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      showAlert('error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        showAlert('success', 'Category updated successfully');
      } else {
        await createCategory(formData);
        showAlert('success', 'Category created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      showAlert('error', error.message || 'Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parentId: category.parentId || null,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await deleteCategory(id);
      showAlert('success', 'Category deleted successfully');
      fetchCategories();
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete category');
    }
  };

  const openPermissionsModal = async (category) => {
    try {
      setPermissionsCategory(category);
      setShowPermissionModal(true);

      const existing = await getCategoryPermissions(category.id);
      const existingByRole = (Array.isArray(existing) ? existing : []).reduce((acc, row) => {
        acc[row.roleId] = row;
        return acc;
      }, {});

      const rows = (roles || []).map((role) => {
        const current = existingByRole[role.id];
        return {
          roleId: role.id,
          roleName: role.name,
          canView: current ? Boolean(current.canView) : true,
          canEdit: current ? Boolean(current.canEdit) : false,
        };
      });

      setPermissionRows(rows);
    } catch (error) {
      showAlert('error', error.message || 'Failed to load category permissions');
    }
  };

  const updatePermissionCell = (roleId, field, value) => {
    setPermissionRows((prev) => prev.map((row) => {
      if (row.roleId !== roleId) return row;
      const next = { ...row, [field]: value };
      if (field === 'canEdit' && value) {
        next.canView = true;
      }
      return next;
    }));
  };

  const savePermissions = async () => {
    if (!permissionsCategory) return;

    try {
      setSavingPermissions(true);
      await updateCategoryPermissions(permissionsCategory.id, permissionRows);
      showAlert('success', `Permissions saved for ${permissionsCategory.name}`);
      setShowPermissionModal(false);
      setPermissionsCategory(null);
    } catch (error) {
      showAlert('error', error.message || 'Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', parentId: null });
    setEditingCategory(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const renderCategoryTree = (categoryTree, level = 0) => {
    return categoryTree.map(category => (
      <div key={category.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
        <div 
          className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          style={{ paddingLeft: `${level * 2 + 1}rem` }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {level > 0 && (
                <span className="material-symbols-outlined text-slate-400 text-[20px]">
                  subdirectory_arrow_right
                </span>
              )}
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {category.name}
              </h3>
            </div>
            {category.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" style={{ marginLeft: level > 0 ? '28px' : '0' }}>
                {category.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openPermissionsModal(category)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
              title="Category permissions"
            >
              <span className="material-symbols-outlined text-[20px]">shield_person</span>
            </button>
            <button
              onClick={() => handleEdit(category)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        </div>
        {category.children && category.children.length > 0 && (
          <div>
            {renderCategoryTree(category.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const categoryTree = categories;
  const topLevelCategoryCount = categoryTree.length;
  const nestedCategoryCount = Math.max(flatCategories.length - topLevelCategoryCount, 0);

  return (
    <CatalogPageFrame>
        <CatalogHero
          eyebrow="Phase 3 Catalog"
          title="Keep the catalog hierarchy clean and governed."
          description="Structure templates under clear category trees and define which roles can safely view or edit each branch."
          info="Category permissions help separate catalog ownership between merchandising, operations, and regional teams."
          actions={
            <Button onClick={() => setShowModal(true)} icon="add">
              Add Category
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard title="Total Categories" value={flatCategories.length} caption="Every category currently in the catalog tree" icon="category" tone="blue" />
          <MetricCard title="Top-Level Branches" value={topLevelCategoryCount} caption="Primary catalog branches visible to planners" icon="account_tree" tone="emerald" />
          <MetricCard title="Nested Categories" value={nestedCategoryCount} caption="Subcategories used for deeper assortment control" icon="subdirectory_arrow_right" tone="amber" />
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <Card title="Category Tree">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[64px]">
                category
              </span>
              <p className="text-slate-500 dark:text-slate-400 mt-4">
                No categories yet. Create your first category to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {renderCategoryTree(categoryTree)}
            </div>
          )}
        </Card>

          <Card title="Access Policy" subtitle="Assign category-level visibility and edit access without leaving the workspace">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1">
                Define which roles can view or edit specific categories.
                <InfoTip text="Category permissions are useful when procurement, warehouse, and retail teams should not edit each other's catalog segments." />
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Configure from each category row
              </span>
            </div>
          </Card>

        {/* Create/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingCategory ? 'Edit Category' : 'Create Category'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Category Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Electronics"
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this category"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Parent Category (Optional)
              </label>
              <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None (Top Level)</option>
                {flatCategories
                  .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={showPermissionModal}
          onClose={() => setShowPermissionModal(false)}
          title={`Category Permissions${permissionsCategory ? `: ${permissionsCategory.name}` : ''}`}
          size="xl"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Role-level access for this category.
            </p>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Can View</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Can Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {permissionRows.map((row) => (
                    <tr key={row.roleId}>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{row.roleName}</td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={row.canView}
                          onChange={(e) => updatePermissionCell(row.roleId, 'canView', e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={row.canEdit}
                          onChange={(e) => updatePermissionCell(row.roleId, 'canEdit', e.target.checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowPermissionModal(false)}>
                Cancel
              </Button>
              <Button onClick={savePermissions} loading={savingPermissions}>
                Save Permissions
              </Button>
            </div>
          </div>
        </Modal>
    </CatalogPageFrame>
  );
};

export default Categories;
