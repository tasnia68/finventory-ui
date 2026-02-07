import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  getProductTemplate, 
  getProductImages, 
  getProductVariants,
  deleteProductVariant 
} from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { getUOMs } from '../../services/uomService';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import DataTable from '../../components/common/DataTable';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const [productData, imagesData, variantsData, categoriesData, uomsData] = await Promise.all([
        getProductTemplate(id),
        getProductImages(id),
        getProductVariants(id),
        getCategories(),
        getUOMs(),
      ]);
      setProduct(productData);
      setImages(imagesData);
      setVariants(variantsData);
      setCategories(categoriesData);
      setUoms(uomsData);
      
      // Set main image as selected
      const mainImage = imagesData.find(img => img.isMain) || imagesData[0];
      setSelectedImage(mainImage);
    } catch (error) {
      showAlert('error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleDeleteVariant = async (variantId) => {
    if (!window.confirm('Are you sure you want to delete this variant?')) return;
    
    try {
      await deleteProductVariant(variantId);
      showAlert('success', 'Variant deleted successfully');
      fetchProductDetails();
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete variant');
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

  const variantColumns = [
    {
      key: 'sku',
      label: 'SKU',
      render: (variant) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{variant.sku}</div>
          {variant.barcode && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Barcode: {variant.barcode}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'attributes',
      label: 'Attributes',
      render: (variant) => {
        if (!variant.attributeValues || variant.attributeValues.length === 0) {
          return <span className="text-slate-500 dark:text-slate-400">Default</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {variant.attributeValues.map((attrVal) => (
              <Badge key={attrVal.id} variant="default">
                {attrVal.attributeName}: {attrVal.value}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: 'price',
      label: 'Price',
      render: (variant) => (
        <span className="font-medium text-slate-900 dark:text-white">
          ${variant.price ? variant.price.toFixed(2) : '0.00'}
        </span>
      ),
    },
    {
      key: 'cost',
      label: 'Cost',
      render: (variant) => (
        <span className="text-slate-600 dark:text-slate-400">
          ${variant.cost ? variant.cost.toFixed(2) : '0.00'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (variant) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDeleteVariant(variant.id)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[64px]">
            inventory_2
          </span>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Product not found</p>
          <Link to="/products" className="text-primary hover:text-primary/80 mt-2 inline-block">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <Link 
            to="/products"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
              arrow_back
            </span>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {product.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {product.description || 'No description'}
            </p>
          </div>
          <Link to={`/products/${id}/edit`}>
            <Button icon="edit" variant="secondary">
              Edit Product
            </Button>
          </Link>
        </div>

        {/* Alert */}
        {alert && (
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Images */}
          <div className="lg:col-span-1">
            <Card title="Product Images">
              {images.length > 0 ? (
                <div className="space-y-4">
                  {selectedImage && (
                    <div className="aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img
                        src={selectedImage.url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {images.map((img) => (
                        <div
                          key={img.id}
                          onClick={() => setSelectedImage(img)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                            selectedImage?.id === img.id
                              ? 'border-primary'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={`${product.name} ${img.id}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[48px]">
                    image
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                    No images uploaded
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Product Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Product Information">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Category
                  </label>
                  <p className="text-slate-900 dark:text-white mt-1">
                    {getCategoryName(product.categoryId)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Base Unit
                  </label>
                  <p className="text-slate-900 dark:text-white mt-1">
                    {getUOMName(product.uomId)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge variant={product.isActive ? 'success' : 'warning'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Total Variants
                  </label>
                  <p className="text-slate-900 dark:text-white mt-1">
                    {variants.length}
                  </p>
                </div>
              </div>
            </Card>

            {/* Variants */}
            <Card title="Product Variants">
              <DataTable
                columns={variantColumns}
                data={variants}
                loading={false}
                emptyMessage="No variants created yet"
                emptyIcon="inventory"
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
