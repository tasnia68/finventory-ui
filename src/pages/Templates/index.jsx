import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProductTemplates, deleteProductTemplate } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { getUOMs } from '../../services/uomService';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import InfoTip from '../../components/common/InfoTip';
import MetricCard from '../../components/common/MetricCard';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [templatesData, categoriesData, uomsData] = await Promise.all([
        getProductTemplates(),
        getCategories(),
        getUOMs(),
      ]);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setUoms(Array.isArray(uomsData) ? uomsData : []);
    } catch (error) {
      showAlert('error', 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template? This will also delete all variants.')) return;

    try {
      await deleteProductTemplate(id);
      showAlert('success', 'Template deleted successfully');
      fetchData();
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete template');
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'N/A';
  };

  const getUOMName = (uomId) => {
    const uom = uoms.find(u => u.id === uomId);
    return uom ? uom.name : 'N/A';
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !categoryFilter || template.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeTemplateCount = templates.filter((template) => template.isActive).length;
  const coveredCategoryCount = new Set(templates.map((template) => template.categoryId).filter(Boolean)).size;

  const columns = [
    {
      key: 'name',
      header: 'Template',
      render: (value, row) => (
        <div>
          <div className="flex items-center gap-2">
            <Link 
              to={`/products/${row.id}`}
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {row.name}
            </Link>
            {row.variantCount && row.variantCount > 1 && (
              <Badge variant="info">
                {row.variantCount} variants
              </Badge>
            )}
          </div>
          {row.description && (
            <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (value, row) => (
        <span className="text-slate-900 dark:text-white">
          {getCategoryName(row.categoryId)}
        </span>
      ),
    },
    {
      key: 'uom',
      header: 'Unit',
      render: (value, row) => (
        <Badge variant="default">
          {getUOMName(row.uomId)}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (value) => (
        <Badge variant={value ? 'success' : 'warning'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/attributes?templateId=${row.id}`}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
            title="Manage attributes"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </Link>
          <Link
            to={`/products/${row.id}/edit`}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
            title="Edit template"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </Link>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
            title="Delete template"
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
          title="Manage reusable product blueprints."
          description="Templates sit at the center of the catalog model, connecting categories, units, attributes, and variant generation rules."
          info="Treat templates as product blueprints. Clean templates reduce downstream SKU cleanup and make variant generation more reliable."
          actions={
            <Link to="/products/create">
              <Button icon="add">Create Template</Button>
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard title="Templates" value={templates.length} caption="Product blueprints currently defined in the catalog" icon="inventory_2" tone="blue" />
          <MetricCard title="Active Templates" value={activeTemplateCount} caption="Blueprints available for ongoing catalog operations" icon="verified" tone="emerald" />
          <MetricCard title="Covered Categories" value={coveredCategoryCount} caption="Catalog branches with at least one template definition" icon="dataset" tone="amber" />
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <Card title="Template Filters" subtitle="Narrow the blueprint register before reviewing or editing" action={<InfoTip text="Use category filtering when auditing coverage gaps or narrowing template maintenance work to one branch of the catalog." />}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            </div>
            <input
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Search templates..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        </Card>

        <Card title="Template Register" subtitle="Blueprints and their catalog status" padding="none">
          <DataTable
            columns={columns}
            data={filteredTemplates}
            loading={loading}
            emptyMessage="No templates found. Create your first template to get started."
            emptyIcon="category"
          />
        </Card>
    </CatalogPageFrame>
  );
};

export default Templates;
