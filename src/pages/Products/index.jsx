import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  bulkUpdateProducts,
  deleteProductVariant,
  exportProductsCsv,
  getProductHistory,
  getProductTemplates,
  getProducts,
  importProductsCsv,
  searchProducts,
} from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Card from '../../components/common/Card';
import InfoTip from '../../components/common/InfoTip';
import MetricCard from '../../components/common/MetricCard';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

const Products = () => {
  const formatCurrency = (value) => new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

  const [variants, setVariants] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [filters, setFilters] = useState({
    q: '',
    categoryId: '',
    templateId: '',
    attributeId: '',
    attributeValue: '',
  });
  const [selectedVariantIds, setSelectedVariantIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState({
    percentagePriceAdjustment: '',
    absolutePriceAdjustment: '',
    active: '',
  });
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySku, setHistorySku] = useState('');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const menuRef = useRef(null);
  const importInputRef = useRef(null);

  React.useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        const [templatesData, categoriesData] = await Promise.all([
          getProductTemplates(),
          getCategories(),
        ]);
        setTemplates(Array.isArray(templatesData) ? templatesData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (error) {
        showAlert('error', 'Failed to load product workspace');
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, []);

  React.useEffect(() => {
    loadVariants();
  }, [filters.q, filters.categoryId, filters.templateId, filters.attributeId, filters.attributeValue]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowCreateMenu(false);
      }
    };

    if (showCreateMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCreateMenu]);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const shouldUseAdvanced =
        Boolean(filters.q.trim()) ||
        Boolean(filters.attributeId) ||
        Boolean(filters.attributeValue.trim());

      const response = shouldUseAdvanced
        ? await searchProducts({
            q: filters.q || undefined,
            categoryId: filters.categoryId || undefined,
            templateId: filters.templateId || undefined,
            attributeId: filters.attributeId || undefined,
            attributeValue: filters.attributeValue || undefined,
            size: 200,
          })
        : await getProducts({
            categoryId: filters.categoryId || undefined,
            templateId: filters.templateId || undefined,
            size: 200,
          });

      const list = Array.isArray(response?.content)
        ? response.content
        : Array.isArray(response)
          ? response
          : [];

      setVariants(list);
      setSelectedVariantIds((prev) => prev.filter((id) => list.some((row) => row.id === id)));
    } catch (error) {
      showAlert('error', error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const templateMap = useMemo(() => {
    return templates.reduce((acc, template) => {
      acc[template.id] = template;
      return acc;
    }, {});
  }, [templates]);

  const availableAttributes = useMemo(() => {
    const map = {};
    variants.forEach((variant) => {
      (variant.attributeValues || []).forEach((attr) => {
        if (!map[attr.attributeId]) {
          map[attr.attributeId] = attr.attributeId;
        }
      });
    });
    return Object.keys(map);
  }, [variants]);

  const activeTemplateCount = templates.filter((template) => template.isActive).length;

  const handleDeleteVariant = async (id) => {
    if (!window.confirm('Delete this variant? This action is permanent.')) return;
    
    try {
      await deleteProductVariant(id);
      showAlert('success', 'Variant deleted successfully');
      await loadVariants();
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete variant');
    }
  };

  const toggleVariantSelection = (id) => {
    setSelectedVariantIds((prev) => (
      prev.includes(id) ? prev.filter((variantId) => variantId !== id) : [...prev, id]
    ));
  };

  const toggleSelectAll = () => {
    if (selectedVariantIds.length === variants.length) {
      setSelectedVariantIds([]);
      return;
    }
    setSelectedVariantIds(variants.map((variant) => variant.id));
  };

  const openHistory = async (variant) => {
    try {
      setShowHistoryModal(true);
      setHistoryLoading(true);
      setHistorySku(variant.sku);
      const response = await getProductHistory(variant.id, { size: 50, sort: 'createdAt,desc' });
      setHistoryRows(Array.isArray(response?.content) ? response.content : []);
    } catch (error) {
      showAlert('error', error.message || 'Failed to load product history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleBulkOperation = async () => {
    if (selectedVariantIds.length === 0) {
      showAlert('warning', 'Select at least one variant for bulk operation');
      return;
    }

    const hasAnyOperation =
      bulkData.percentagePriceAdjustment !== '' ||
      bulkData.absolutePriceAdjustment !== '' ||
      bulkData.active !== '';

    if (!hasAnyOperation) {
      showAlert('warning', 'Choose at least one update field');
      return;
    }

    const payload = {
      productVariantIds: selectedVariantIds,
    };

    if (bulkData.percentagePriceAdjustment !== '') {
      payload.percentagePriceAdjustment = Number(bulkData.percentagePriceAdjustment);
    }
    if (bulkData.absolutePriceAdjustment !== '') {
      payload.absolutePriceAdjustment = Number(bulkData.absolutePriceAdjustment);
    }
    if (bulkData.active !== '') {
      payload.active = bulkData.active === 'true';
    }

    try {
      setSubmittingBulk(true);
      const result = await bulkUpdateProducts(payload);
      showAlert(
        result.errors && result.errors.length > 0 ? 'warning' : 'success',
        `Bulk updated ${result.totalUpdated}/${result.totalRequested} variants`
      );
      setShowBulkModal(false);
      setBulkData({ percentagePriceAdjustment: '', absolutePriceAdjustment: '', active: '' });
      setSelectedVariantIds([]);
      await loadVariants();
    } catch (error) {
      showAlert('error', error.message || 'Bulk update failed');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleImportClick = () => {
    if (importInputRef.current) {
      importInputRef.current.click();
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importProductsCsv(file);
      showAlert(
        result.failed > 0 ? 'warning' : 'success',
        `Imported ${result.imported}/${result.totalRows} rows` + (result.failed > 0 ? ` (${result.failed} failed)` : '')
      );
      await loadVariants();
    } catch (error) {
      showAlert('error', error.message || 'CSV import failed');
    } finally {
      event.target.value = '';
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportProductsCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product-variants-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showAlert('success', 'CSV exported successfully');
    } catch (error) {
      showAlert('error', error.message || 'CSV export failed');
    }
  };

  const parseSnapshot = (snapshot) => {
    try {
      const parsed = JSON.parse(snapshot || '{}');
      const attrs = Array.isArray(parsed.attributeValues) ? parsed.attributeValues.length : 0;
      return `SKU: ${parsed.sku || '-'} | Price: ${parsed.price ?? '-'} | Compare-at: ${parsed.compareAtPrice ?? '-'} | Badge: ${parsed.storefrontBadge || '-'} | Featured: ${parsed.storefrontFeatured ? 'Yes' : 'No'} | Attributes: ${attrs}`;
    } catch (error) {
      return 'Snapshot unavailable';
    }
  };

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={variants.length > 0 && selectedVariantIds.length === variants.length}
          onChange={toggleSelectAll}
          aria-label="Select all variants"
        />
      ),
      render: (value, row) => (
        <input
          type="checkbox"
          checked={selectedVariantIds.includes(row.id)}
          onChange={() => toggleVariantSelection(row.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select variant ${row.sku}`}
        />
      ),
      className: 'w-10',
    },
    {
      key: 'sku',
      header: 'Variant',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{row.sku}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
            <span>Template: {templateMap[row.templateId]?.name || 'Unknown'}</span>
            {row.mainImageId && (
              <Badge variant="default">Image</Badge>
            )}
            {templateMap[row.templateId]?.publishedToStorefront ? (
              <Badge variant="success">Storefront</Badge>
            ) : null}
            {row.storefrontFeatured ? (
              <Badge variant="warning">Featured</Badge>
            ) : null}
            {row.storefrontBadge ? (
              <Badge variant="info">{row.storefrontBadge}</Badge>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (value, row) => (
        <span className="text-slate-900 dark:text-white">
          {categories.find((cat) => cat.id === templateMap[row.templateId]?.categoryId)?.name || 'N/A'}
        </span>
      ),
    },
    {
      key: 'attributes',
      header: 'Attributes',
      render: (value, row) => {
        const attrs = row.attributeValues || [];
        if (attrs.length === 0) {
          return <span className="text-slate-500 dark:text-slate-400">Default</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {attrs.slice(0, 3).map((attr) => (
              <Badge key={`${row.id}-${attr.attributeId}`} variant="default">
                {attr.value}
              </Badge>
            ))}
            {attrs.length > 3 && <Badge variant="info">+{attrs.length - 3}</Badge>}
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Price',
      render: (value, row) => (
        <div className="space-y-1">
          <span className="block font-semibold text-slate-900 dark:text-white">
            {formatCurrency(value)}
          </span>
          {row.compareAtPrice ? (
            <span className="block text-xs text-slate-400 line-through">
              {formatCurrency(row.compareAtPrice)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'merchandising',
      header: 'Storefront Merchandising',
      render: (value, row) => (
        <div className="flex flex-wrap gap-2">
          {row.storefrontBadge ? <Badge variant="info">{row.storefrontBadge}</Badge> : <Badge variant="default">No badge</Badge>}
          <Badge variant={row.storefrontFeatured ? 'warning' : 'default'}>
            {row.storefrontFeatured ? 'Featured' : 'Standard'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Template Status',
      render: (value, row) => {
        const isActive = templateMap[row.templateId]?.isActive;
        const storefrontPublished = templateMap[row.templateId]?.publishedToStorefront;
        return (
          <div className="flex flex-wrap gap-2">
            <Badge variant={isActive ? 'success' : 'warning'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={storefrontPublished ? 'info' : 'default'}>
              {storefrontPublished ? 'Published to Storefront' : 'Backoffice Only'}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (value) => (
        <span className="text-slate-600 dark:text-slate-300">
          {value ? new Date(value).toLocaleString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/products/${row.templateId}/edit`}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
            title="Edit product"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </Link>
          <button
            onClick={() => openHistory(row)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
            title="View history"
          >
            <span className="material-symbols-outlined text-[20px]">history</span>
          </button>
          <button
            onClick={() => handleDeleteVariant(row.id)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
            title="Delete variant"
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
          title="Run the product workspace like an operations cockpit."
          description="Review variants, filter catalog quality issues, run bulk maintenance, and trace change history without leaving the product workspace."
          info="This screen is the fast-control layer for template and variant maintenance. Use bulk operations carefully because they can affect multiple sellable SKUs at once."
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start xl:justify-end">
              <Button variant="secondary" icon="upload_file" onClick={handleImportClick}>
                Import CSV
              </Button>
              <Button variant="secondary" icon="download" onClick={handleExport}>
                Export CSV
              </Button>
              <Button variant="secondary" icon="edit_note" onClick={() => setShowBulkModal(true)}>
                Bulk Update
              </Button>
              <div className="relative" ref={menuRef}>
                <Link to="/products/new">
                  <Button icon="add">Add product</Button>
                </Link>
              </div>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard title="Visible Variants" value={variants.length} caption="Variants returned by the current workspace filters" icon="inventory_2" tone="blue" />
          <MetricCard title="Selected Variants" value={selectedVariantIds.length} caption="Variants currently staged for bulk actions" icon="select_check_box" tone="emerald" />
          <MetricCard title="Active Templates" value={activeTemplateCount} caption="Blueprints available for live product operations" icon="verified" tone="amber" />
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleImportFile}
        />

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                Search
                <InfoTip text="Search by SKU or barcode. Use this for fast lookup during receiving, counting, or support calls." />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="SKU, barcode, or keyword"
                  type="text"
                  value={filters.q}
                  onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                Category
                <InfoTip text="Filter variants under a product category for focused pricing or audit operations." />
              </label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Template</label>
              <select
                value={filters.templateId}
                onChange={(e) => setFilters((prev) => ({ ...prev, templateId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All templates</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                Attribute Id
                <InfoTip text="Use attribute-based filtering for quality checks like finding all variants with a specific attribute definition." />
              </label>
              <select
                value={filters.attributeId}
                onChange={(e) => setFilters((prev) => ({ ...prev, attributeId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Any attribute</option>
                {availableAttributes.map((attrId) => (
                  <option key={attrId} value={attrId}>{attrId}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Attribute Value</label>
              <input
                className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="e.g. Red"
                type="text"
                value={filters.attributeValue}
                onChange={(e) => setFilters((prev) => ({ ...prev, attributeValue: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedVariantIds.length} selected for bulk operations
              </p>
              <Button
                variant="ghost"
                icon="restart_alt"
                onClick={() => setFilters({ q: '', categoryId: '', templateId: '', attributeId: '', attributeValue: '' })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        <DataTable
          columns={columns}
          data={variants}
          loading={loading}
          emptyMessage="No variants found. Start by creating a product template and variants."
          emptyIcon="inventory_2"
        />

        <Modal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          title="Bulk Update Variants"
          size="lg"
        >
          <div className="space-y-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Updating {selectedVariantIds.length} variants.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                  Percentage Price Adjustment
                  <InfoTip text="Use positive or negative values. Example: 5 for +5%, -10 for a markdown." />
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bulkData.percentagePriceAdjustment}
                  onChange={(e) => setBulkData((prev) => ({ ...prev, percentagePriceAdjustment: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                  Absolute Price Adjustment
                  <InfoTip text="Add or subtract a fixed amount from each selected variant price." />
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bulkData.absolutePriceAdjustment}
                  onChange={(e) => setBulkData((prev) => ({ ...prev, absolutePriceAdjustment: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  placeholder="e.g. -2.50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Template Active Status
              </label>
              <select
                value={bulkData.active}
                onChange={(e) => setBulkData((prev) => ({ ...prev, active: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              >
                <option value="">Do not change</option>
                <option value="true">Set active</option>
                <option value="false">Set inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="ghost" onClick={() => setShowBulkModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkOperation} loading={submittingBulk}>
                Apply Bulk Update
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          title={`History: ${historySku}`}
          size="xl"
        >
          {historyLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : historyRows.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No history entries found.</p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {historyRows.map((row) => (
                <div key={row.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">v{row.versionNumber}</Badge>
                      <Badge variant="default">{row.changeType}</Badge>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {parseSnapshot(row.snapshot)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Modal>
    </CatalogPageFrame>
  );
};

export default Products;
