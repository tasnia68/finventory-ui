import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSimpleProduct } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { getUOMs } from '../../services/uomService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';

const CreateSimpleProduct = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    uomId: '',
    sku: '',
    barcode: '',
    price: '',
    cost: '',
    isBatchTracked: false,
    isSerialTracked: false,
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesData, uomsData] = await Promise.all([
        getCategories(),
        getUOMs(),
      ]);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setUoms(Array.isArray(uomsData) ? uomsData : []);
    } catch (error) {
      showAlert('error', 'Failed to load data');
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
      };

      const result = await createSimpleProduct(data);
      showAlert('success', 'Simple product created successfully');
      
      setTimeout(() => {
        navigate(`/products/${result.templateId}`);
      }, 1500);
    } catch (error) {
      showAlert('error', error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Create Simple Product
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            For unique products without variations (color, size, etc.)
          </p>
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>When to use:</strong> Laptops, furniture, machinery, or any product that doesn't have color/size variations.
              For products with variants, use <a href="/products/create" className="underline hover:text-blue-600">Template-Variant flow</a>.
            </p>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Information Section */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Product Information
              </h2>
              <div className="space-y-4">
                <Input
                  label="Product Name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  placeholder="e.g., Dell XPS 15"
                />
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Product description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => handleChange('categoryId', e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Unit of Measure
                    </label>
                    <select
                      value={formData.uomId}
                      onChange={(e) => handleChange('uomId', e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Select Unit</option>
                      {uoms.map(uom => (
                        <option key={uom.id} value={uom.id}>{uom.name} ({uom.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SKU & Pricing Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                SKU & Pricing
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="SKU Code"
                    value={formData.sku}
                    onChange={(e) => handleChange('sku', e.target.value)}
                    required
                    placeholder="e.g., DELL-XPS15-001"
                  />
                  
                  <Input
                    label="Barcode (Optional)"
                    value={formData.barcode}
                    onChange={(e) => handleChange('barcode', e.target.value)}
                    placeholder="e.g., 9876543210"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Selling Price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    required
                    placeholder="0.00"
                  />
                  
                  <Input
                    label="Cost (Optional)"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => handleChange('cost', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Tracking Options Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Tracking Options
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <input
                    type="checkbox"
                    id="serialTracked"
                    checked={formData.isSerialTracked}
                    onChange={(e) => handleChange('isSerialTracked', e.target.checked)}
                    className="w-4 h-4 mt-1 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <div>
                    <label htmlFor="serialTracked" className="font-medium text-slate-900 dark:text-white cursor-pointer">
                      Serial Number Tracking
                    </label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Track each item individually with unique serial numbers (recommended for electronics)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <input
                    type="checkbox"
                    id="batchTracked"
                    checked={formData.isBatchTracked}
                    onChange={(e) => handleChange('isBatchTracked', e.target.checked)}
                    className="w-4 h-4 mt-1 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <div>
                    <label htmlFor="batchTracked" className="font-medium text-slate-900 dark:text-white cursor-pointer">
                      Batch/Lot Tracking
                    </label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Group items by batch or lot numbers (useful for manufacturing dates)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    className="w-4 h-4 mt-1 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <div>
                    <label htmlFor="isActive" className="font-medium text-slate-900 dark:text-white cursor-pointer">
                      Active Product
                    </label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Product is available for sale and visible in the catalog
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button variant="ghost" onClick={() => navigate('/products')}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Product
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateSimpleProduct;
