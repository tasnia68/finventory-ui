import React, { useState, useEffect } from 'react';
import { getProductAttributes, createProductAttribute, updateProductAttribute, deleteProductAttribute } from '../../services/attributeService';
import { getAttributeGroups } from '../../services/attributeService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';

const ATTRIBUTE_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'DROPDOWN', label: 'Dropdown' },
  { value: 'MULTI_SELECT', label: 'Multi-Select' },
];

const Attributes = () => {
  const [attributes, setAttributes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'TEXT',
    required: false,
    options: '',
    validation: '',
    groupId: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attributesData, groupsData] = await Promise.all([
        getProductAttributes(),
        getAttributeGroups(),
      ]);
      setAttributes(Array.isArray(attributesData) ? attributesData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (error) {
      showAlert('error', 'Failed to load attributes');
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
      const data = {
        ...formData,
        groupId: formData.groupId || null,
      };

      if (editingAttribute) {
        await updateProductAttribute(editingAttribute.id, data);
        showAlert('success', 'Attribute updated successfully');
      } else {
        await createProductAttribute(data);
        showAlert('success', 'Attribute created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      showAlert('error', error.message || 'Failed to save attribute');
    }
  };

  const handleEdit = (attribute) => {
    setEditingAttribute(attribute);
    setFormData({
      name: attribute.name,
      type: attribute.type,
      required: attribute.required || false,
      options: attribute.options || '',
      validation: attribute.validation || '',
      groupId: attribute.groupId || null,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attribute?')) return;
    
    try {
      await deleteProductAttribute(id);
      showAlert('success', 'Attribute deleted successfully');
      fetchData();
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete attribute');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'TEXT',
      required: false,
      options: '',
      validation: '',
      groupId: null,
    });
    setEditingAttribute(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'None';
  };

  const columns = [
    {
      key: 'name',
      label: 'Attribute Name',
      render: (attr) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{attr.name}</div>
          {attr.validation && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Pattern: {attr.validation}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (attr) => (
        <Badge variant="info">
          {ATTRIBUTE_TYPES.find(t => t.value === attr.type)?.label || attr.type}
        </Badge>
      ),
    },
    {
      key: 'options',
      label: 'Options',
      render: (attr) => (
        <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
          {attr.options || 'N/A'}
        </div>
      ),
    },
    {
      key: 'required',
      label: 'Required',
      render: (attr) => (
        <Badge variant={attr.required ? 'warning' : 'default'}>
          {attr.required ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'group',
      label: 'Group',
      render: (attr) => (
        <span className="text-slate-900 dark:text-white">
          {getGroupName(attr.groupId)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (attr) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(attr)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
          <button
            onClick={() => handleDelete(attr.id)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Product Attributes
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Define reusable attributes for product variants
            </p>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            icon="add"
          >
            Add Attribute
          </Button>
        </div>

        {/* Alert */}
        {alert && (
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {/* Attributes Table */}
        <DataTable
          columns={columns}
          data={attributes}
          loading={loading}
          emptyMessage="No attributes yet. Create your first attribute to get started."
          emptyIcon="tune"
        />

        {/* Create/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingAttribute ? 'Edit Attribute' : 'Create Attribute'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Attribute Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Color, Size, Material"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {ATTRIBUTE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            {(formData.type === 'DROPDOWN' || formData.type === 'MULTI_SELECT') && (
              <Input
                label="Options (comma-separated)"
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                required
                placeholder="e.g., Red, Blue, Green"
              />
            )}
            {(formData.type === 'TEXT' || formData.type === 'NUMBER') && (
              <Input
                label="Validation Pattern (optional)"
                value={formData.validation}
                onChange={(e) => setFormData({ ...formData, validation: e.target.value })}
                placeholder="e.g., ^[A-Z]{2,}$ for uppercase letters"
              />
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Attribute Group (Optional)
              </label>
              <select
                value={formData.groupId || ''}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value || null })}
                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None</option>
                {groups.map(group => (
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
                checked={formData.required}
                onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
              />
              <label htmlFor="required" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Required attribute
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">
                {editingAttribute ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default Attributes;
