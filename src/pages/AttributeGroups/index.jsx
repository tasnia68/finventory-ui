import React, { useState, useEffect } from 'react';
import { getAttributeGroups, createAttributeGroup, updateAttributeGroup, deleteAttributeGroup } from '../../services/attributeService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import MetricCard from '../../components/common/MetricCard';
import InfoTip from '../../components/common/InfoTip';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

const AttributeGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await getAttributeGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      showAlert('error', 'Failed to load attribute groups');
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
      if (editingGroup) {
        await updateAttributeGroup(editingGroup.id, formData);
        showAlert('success', 'Attribute group updated successfully');
      } else {
        await createAttributeGroup(formData);
        showAlert('success', 'Attribute group created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchGroups();
    } catch (error) {
      showAlert('error', error.message || 'Failed to save attribute group');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attribute group?')) return;
    
    try {
      await deleteAttributeGroup(id);
      showAlert('success', 'Attribute group deleted successfully');
      fetchGroups();
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete attribute group');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingGroup(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const describedGroupCount = groups.filter((group) => Boolean(group.description)).length;

  return (
    <CatalogPageFrame>
        <CatalogHero
          eyebrow="Phase 3 Catalog"
          title="Organize attributes into reviewable groups."
          description="Use groups to keep template design readable for merchandising, QA, and integration teams working across shared product definitions."
          info="A good grouping scheme keeps technical specs, dimensions, compliance fields, and merchandising fields separate without duplicating attributes."
          actions={
            <Button onClick={() => setShowModal(true)} icon="add">
              Add Group
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard title="Attribute Groups" value={groups.length} caption="Named groupings available for catalog configuration" icon="folder_special" tone="blue" />
          <MetricCard title="Documented Groups" value={describedGroupCount} caption="Groups with descriptions to guide maintainers" icon="article" tone="emerald" />
          <MetricCard title="Needs Description" value={Math.max(groups.length - describedGroupCount, 0)} caption="Groups that still rely on name-only context" icon="edit_note" tone="amber" />
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <Card title="Grouping Guidance" subtitle="Keep attribute organization consistent across templates" action={<InfoTip text="Prefer stable groups such as Dimensions, Commercial Data, Technical Specs, and Compliance rather than product-specific buckets." />}>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Group labels should reflect how your teams review data, not how one product happens to be modeled today. Stable grouping makes templates easier to maintain as the catalog expands.
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : groups.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[64px]">
                folder_special
              </span>
              <p className="text-slate-500 dark:text-slate-400 mt-4">
                No attribute groups yet. Create your first group to get started.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <Card key={group.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {group.description}
                      </p>
                    )}
                    {group.createdBy && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        Created by {group.createdBy}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(group)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingGroup ? 'Edit Attribute Group' : 'Create Attribute Group'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Group Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Dimensions, Technical Specs"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Brief description of this group..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
    </CatalogPageFrame>
  );
};

export default AttributeGroups;
