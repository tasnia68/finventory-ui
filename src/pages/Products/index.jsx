import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getProductTemplates, deleteProductTemplate } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { getUOMs } from '../../services/uomService';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData, uomsData] = await Promise.all([
        getProductTemplates(),
        getCategories(),
        getUOMs(),
      ]);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setUoms(Array.isArray(uomsData) ? uomsData : []);
    } catch (error) {
      showAlert('error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? This will also delete all variants.')) return;
    
    try {
      await deleteProductTemplate(id);
      showAlert('success', 'Product deleted successfully');
      fetchData();
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete product');
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !categoryFilter || product.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (product) => (
        <div>
          <div className="flex items-center gap-2">
            <Link 
              to={`/products/${product.id}`}
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {product.name}
            </Link>
            {product.variantCount && product.variantCount > 1 && (
              <Badge variant="info">
                {product.variantCount} variants
              </Badge>
            )}
          </div>
          {product.description && (
            <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
              {product.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (product) => (
        <span className="text-slate-900 dark:text-white">
          {getCategoryName(product.categoryId)}
        </span>
      ),
    },
    {
      key: 'uom',
      label: 'Unit',
      render: (product) => (
        <Badge variant="default">
          {getUOMName(product.uomId)}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (product) => (
        <Badge variant={product.isActive ? 'success' : 'warning'}>
          {product.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (product) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/products/${product.id}`}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">visibility</span>
          </Link>
          <Link
            to={`/products/${product.id}/edit`}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </Link>
          <button
            onClick={() => handleDelete(product.id)}
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
              Products
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage your product catalog and inventory
            </p>
          </div>
          <div className="relative">
            <Button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              icon="add"
            >
              Create Product
              <span className="material-symbols-outlined text-[16px] ml-1">
                {showCreateMenu ? 'expand_less' : 'expand_more'}
              </span>
            </Button>
            {showCreateMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                <div className="p-2">
                  <Link
                    to="/products/create/simple"
                    onClick={() => setShowCreateMenu(false)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="mt-1">
                      <span className="material-symbols-outlined text-primary text-[24px]">inventory</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white">Simple Product</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        For unique items without variants (laptops, furniture, etc.)
                      </div>
                    </div>
                  </Link>
                  <Link
                    to="/products/create"
                    onClick={() => setShowCreateMenu(false)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="mt-1">
                      <span className="material-symbols-outlined text-primary text-[24px]">category</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white">Product with Variants</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        For items with color, size, or other variations (clothing, accessories, etc.)
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            </div>
            <input
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Search products..."
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

        {/* Products Table */}
        <DataTable
          columns={columns}
          data={filteredProducts}
          loading={loading}
          emptyMessage="No products found. Create your first product to get started."
          emptyIcon="inventory_2"
        />
      </div>
    </div>
  );
};

export default Products;
