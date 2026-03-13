import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProductAttributes, getProductAttribute, createProductAttribute, updateProductAttribute, deleteProductAttribute, getAttributeGroups } from '../../services/attributeService';
import { getProductTemplates } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import InfoTip from '../../components/common/InfoTip';
import MetricCard from '../../components/common/MetricCard';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

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
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [inheritedAttributes, setInheritedAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [alert, setAlert] = useState(null);
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    type: 'TEXT',
    required: false,
    options: '',
    validationRegex: '',
    groupId: null,
    templateId: '',
  });

  useEffect(() => {
    fetchTemplatesAndGroups();
  }, []);

  useEffect(() => {
    const templateIdFromQuery = searchParams.get('templateId');
    if (templateIdFromQuery) {
      setSelectedTemplateId(templateIdFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedTemplateId) {
      fetchAttributes(selectedTemplateId);
      fetchInheritedAttributes(selectedTemplateId);
    } else {
      setAttributes([]);
      setInheritedAttributes([]);
    }
  }, [selectedTemplateId]);

  const fetchTemplatesAndGroups = async () => {
    try {
      setLoading(true);
      const [templatesData, groupsData, categoriesData] = await Promise.all([
        getProductTemplates(),
        getAttributeGroups(),
        getCategories(),
      ]);
      const normalizedTemplates = Array.isArray(templatesData) ? templatesData : [];
      setTemplates(normalizedTemplates);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      if (!selectedTemplateId && normalizedTemplates.length > 0) {
        setSelectedTemplateId(normalizedTemplates[0].id);
      }
    } catch (error) {
      showAlert('error', 'Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttributes = async (templateId) => {
    try {
      setLoading(true);
      const attributesData = await getProductAttributes(templateId);
      setAttributes(Array.isArray(attributesData) ? attributesData : []);
    } catch (error) {
      showAlert('error', 'Failed to load attributes');
      setAttributes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInheritedAttributes = async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    const category = categories.find(c => c.id === template?.categoryId);
    const attributeIds = category?.attributeIds || [];

    if (attributeIds.length === 0) {
      setInheritedAttributes([]);
      return;
    }

    try {
      const items = await Promise.all(
        attributeIds.map(async (attrId) => {
          try {
            const attr = await getProductAttribute(attrId);
            return { id: attrId, name: attr?.name || attrId };
          } catch (error) {
            return { id: attrId, name: attrId };
          }
        })
      );
      setInheritedAttributes(items);
    } catch (error) {
      setInheritedAttributes(attributeIds.map((id) => ({ id, name: id })));
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!selectedTemplateId) {
        showAlert('error', 'Please select a template first');
        return;
      }

      if ((formData.type === 'DROPDOWN' || formData.type === 'MULTI_SELECT') && !formData.options.trim()) {
        showAlert('error', 'Options are required for dropdown or multi-select attributes');
        return;
      }

      const data = {
        ...formData,
        groupId: formData.groupId || null,
        templateId: selectedTemplateId,
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
      fetchAttributes(selectedTemplateId);
    } catch (error) {
      showAlert('error', error.message || 'Failed to save attribute');
    }
  };

  const handleEdit = (attribute) => {
    if (attribute.templateId && attribute.templateId !== selectedTemplateId) {
      setSelectedTemplateId(attribute.templateId);
    }
    setEditingAttribute(attribute);
    setFormData({
      name: attribute.name,
      type: attribute.type,
      required: attribute.required || false,
      options: attribute.options || '',
      validationRegex: attribute.validationRegex || '',
      groupId: attribute.groupId || null,
      templateId: attribute.templateId || selectedTemplateId,
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
      validationRegex: '',
      groupId: null,
      templateId: selectedTemplateId,
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

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedCategory = categories.find(c => c.id === selectedTemplate?.categoryId);
  const inheritedAttributeIds = selectedCategory?.attributeIds || [];
  const groupedAttributeCount = attributes.filter((attribute) => attribute.groupId).length;

  const columns = [
    {
      key: 'name',
      header: 'Attribute Name',
      render: (value, row) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{row.name}</div>
          {row.validationRegex && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Pattern: {row.validationRegex}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (value) => (
        <Badge variant="info">
          {ATTRIBUTE_TYPES.find(t => t.value === value)?.label || value}
        </Badge>
      ),
    },
    {
      key: 'options',
      header: 'Options',
      render: (value) => (
        <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
          {value || 'N/A'}
        </div>
      ),
    },
    {
      key: 'required',
      header: 'Required',
      render: (value) => (
        <Badge variant={value ? 'warning' : 'default'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'group',
      header: 'Group',
      render: (value, row) => (
        <span className="text-slate-900 dark:text-white">
          {getGroupName(row.groupId)}
        </span>
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

  return (
    <CatalogPageFrame>
        <CatalogHero
          eyebrow="Phase 3 Catalog"
          title="Define variant logic once and reuse it safely."
          description="Manage template attributes with enough context to keep category inheritance, option design, and validation rules aligned."
          info="Use template-level attributes for variant behavior and category-level attributes for common metadata inherited across multiple templates."
          actions={
            <Button onClick={() => setShowModal(true)} icon="add" disabled={!selectedTemplateId}>
              Add Attribute
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard title="Template Attributes" value={attributes.length} caption="Attributes directly managed on the selected template" icon="tune" tone="blue" />
          <MetricCard title="Inherited Attributes" value={inheritedAttributeIds.length} caption="Category attributes inherited into the current template context" icon="move_down" tone="emerald" />
          <MetricCard title="Grouped Attributes" value={groupedAttributeCount} caption="Attributes currently organized into attribute groups" icon="folder_supervised" tone="amber" />
        </div>

        <Card title="Template Context" subtitle="Pick the template you want to configure before creating or editing attributes">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                Template
                <InfoTip text="Attributes are scoped to a product template. Selecting a different template swaps the attribute workspace." />
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            {!selectedTemplateId && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Select a template to view and manage attributes.
              </div>
            )}
          </div>
        </Card>

        {selectedTemplateId && (
          <Card title="Inherited Category Attributes" subtitle="These attributes come from the selected template's category and remain visible for context">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Category: {selectedCategory?.name || 'N/A'}
              </span>
            </div>
            {inheritedAttributeIds.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No inherited attributes for this category.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {inheritedAttributes.length > 0
                  ? inheritedAttributes.map((attr) => (
                      <Badge key={attr.id} variant="default">
                        {attr.name}
                      </Badge>
                    ))
                  : inheritedAttributeIds.map((attrId) => (
                      <Badge key={attrId} variant="default">
                        {attrId}
                      </Badge>
                    ))}
              </div>
            )}
          </Card>
        )}

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <Card title="Attribute Register" subtitle="Attribute definitions for the active template" action={<InfoTip text="Keep option labels concise and validation rules focused on actual data quality checks." />} padding="none">
          <DataTable
            columns={columns}
            data={attributes}
            loading={loading}
            emptyMessage={selectedTemplateId ? 'No attributes yet. Create your first attribute to get started.' : 'Select a template to view attributes.'}
            emptyIcon="tune"
          />
        </Card>

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
                value={formData.validationRegex}
                onChange={(e) => setFormData({ ...formData, validationRegex: e.target.value })}
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
    </CatalogPageFrame>
  );
};

export default Attributes;
