import React, { useState, useEffect } from 'react';
import { getUOMs, createUOM, updateUOM, deleteUOM } from '../../services/uomService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import MetricCard from '../../components/common/MetricCard';
import InfoTip from '../../components/common/InfoTip';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

const UOM_CATEGORIES = [
  { value: 'QUANTITY', label: 'Quantity' },
  { value: 'WEIGHT', label: 'Weight' },
  { value: 'VOLUME', label: 'Volume' },
  { value: 'LENGTH', label: 'Length' },
  { value: 'TIME', label: 'Time' },
];

const UnitsOfMeasure = () => {
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUOM, setEditingUOM] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'QUANTITY',
    isBase: false,
    conversionFactor: 1.0,
  });

  useEffect(() => {
    fetchUOMs();
  }, []);

  const fetchUOMs = async () => {
    try {
      setLoading(true);
      const data = await getUOMs();
      setUoms(data);
    } catch (error) {
      showAlert('error', 'Failed to load units of measure');
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
        conversionFactor: parseFloat(formData.conversionFactor),
      };

      if (editingUOM) {
        await updateUOM(editingUOM.id, data);
        showAlert('success', 'Unit of measure updated successfully');
      } else {
        await createUOM(data);
        showAlert('success', 'Unit of measure created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchUOMs();
    } catch (error) {
      showAlert('error', error.message || 'Failed to save unit of measure');
    }
  };

  const handleEdit = (uom) => {
    setEditingUOM(uom);
    setFormData({
      name: uom.name,
      code: uom.code,
      category: uom.category,
      isBase: uom.isBase,
      conversionFactor: uom.conversionFactor,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this unit of measure?')) return;
    
    try {
      await deleteUOM(id);
      showAlert('success', 'Unit of measure deleted successfully');
      fetchUOMs();
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete unit of measure');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      category: 'QUANTITY',
      isBase: false,
      conversionFactor: 1.0,
    });
    setEditingUOM(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (value, row) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{row.name}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Code: {row.code}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (value) => (
        <Badge variant="info">
          {UOM_CATEGORIES.find(c => c.value === value)?.label || value}
        </Badge>
      ),
    },
    {
      key: 'isBase',
      header: 'Type',
      render: (value) => (
        <Badge variant={value ? 'success' : 'default'}>
          {value ? 'Base Unit' : 'Derived Unit'}
        </Badge>
      ),
    },
    {
      key: 'conversionFactor',
      header: 'Conversion Factor',
      render: (value) => (
        <span className="text-slate-900 dark:text-white">
          {value}
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

  const baseUnitCount = uoms.filter((uom) => uom.isBase).length;
  const coveredCategoryCount = new Set(uoms.map((uom) => uom.category).filter(Boolean)).size;

  return (
    <CatalogPageFrame>
        <CatalogHero
          eyebrow="Phase 3 Catalog"
          title="Standardize how the catalog measures stock."
          description="Keep conversion logic predictable so purchasing, warehouse execution, and reporting all operate on the same unit definitions."
          info="Base units anchor conversion logic. Derived units should only express clean multipliers of the base unit for their category."
          actions={
            <Button onClick={() => setShowModal(true)} icon="add">
              Add Unit
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard title="Defined Units" value={uoms.length} caption="Measurement records available to templates and variants" icon="straighten" tone="blue" />
          <MetricCard title="Base Units" value={baseUnitCount} caption="Reference units used as the anchor for conversions" icon="rule" tone="emerald" />
          <MetricCard title="Covered Categories" value={coveredCategoryCount} caption="Measurement domains currently represented in the catalog" icon="dashboard_customize" tone="amber" />
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <Card title="Measurement Register" subtitle="Audit unit definitions before they flow into product templates" action={<InfoTip text="Review base and derived units regularly to avoid duplicate codes or conflicting conversion factors." />} padding="none">
          <DataTable
            columns={columns}
            data={uoms}
            loading={loading}
            emptyMessage="No units of measure yet. Create your first unit to get started."
            emptyIcon="straighten"
          />
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingUOM ? 'Edit Unit of Measure' : 'Create Unit of Measure'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Unit Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Piece, Kilogram"
            />
            <Input
              label="Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              placeholder="e.g., pc, kg"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {UOM_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isBase"
                checked={formData.isBase}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  isBase: e.target.checked,
                  conversionFactor: e.target.checked ? 1.0 : formData.conversionFactor
                })}
                className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
              />
              <label htmlFor="isBase" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Base Unit (Conversion Factor = 1.0)
              </label>
            </div>
            {!formData.isBase && (
              <Input
                label="Conversion Factor"
                type="number"
                step="0.01"
                value={formData.conversionFactor}
                onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
                required
                placeholder="e.g., 10 (if 1 unit = 10 base units)"
              />
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">
                {editingUOM ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
    </CatalogPageFrame>
  );
};

export default UnitsOfMeasure;
