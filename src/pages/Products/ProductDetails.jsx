import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  getProductTemplate, 
  getProductImages, 
  getProductImageFile,
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
import MetricCard from '../../components/common/MetricCard';
import InfoTip from '../../components/common/InfoTip';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

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
  const [imageUrls, setImageUrls] = useState({});

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
      setImages(Array.isArray(imagesData) ? imagesData : []);
      const normalizedVariants = Array.isArray(variantsData) ? variantsData : [];
      const filteredVariants = normalizedVariants.filter(variant => variant.templateId === id);
      setVariants(filteredVariants);
      setCategories(categoriesData);
      setUoms(uomsData);

      const normalizedImages = Array.isArray(imagesData) ? imagesData : [];
      await loadImageFiles(normalizedImages);
      
      // Set main image as selected
      const mainImage = normalizedImages.find(img => img.isMain) || normalizedImages[0];
      setSelectedImage(mainImage);
    } catch (error) {
      showAlert('error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const loadImageFiles = async (imagesData) => {
    if (!imagesData.length) {
      if (Object.keys(imageUrls).length > 0) {
        Object.values(imageUrls).forEach((url) => {
          if (url) URL.revokeObjectURL(url);
        });
        setImageUrls({});
      }
      return;
    }

    const entries = await Promise.all(
      imagesData.map(async (img) => {
        try {
          const blob = await getProductImageFile(img.id);
          const url = URL.createObjectURL(blob);
          return [img.id, url];
        } catch (error) {
          return [img.id, null];
        }
      })
    );

    setImageUrls((prev) => {
      Object.values(prev).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      return entries.reduce((acc, [id, url]) => {
        if (url) acc[id] = url;
        return acc;
      }, {});
    });
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
      header: 'SKU',
      render: (value, row) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{row.sku}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Variant ID: {row.id}
          </div>
          {row.barcode && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Barcode: {row.barcode}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'attributes',
      header: 'Attributes',
      render: (value, row) => {
        if (!row.attributeValues || row.attributeValues.length === 0) {
          return <span className="text-slate-500 dark:text-slate-400">Default</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {row.attributeValues.map((attrVal) => (
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
      header: 'Price',
      render: (value) => (
        <span className="font-medium text-slate-900 dark:text-white">
          ${value ? value.toFixed(2) : '0.00'}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      render: (value) => (
        <span className="text-slate-600 dark:text-slate-400">
          ${value ? value.toFixed(2) : '0.00'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDeleteVariant(row.id)}
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
    <CatalogPageFrame>
        <CatalogHero
          eyebrow="Phase 3 Catalog"
          title={product.name}
          description={product.description || 'No description'}
          info="Use the detail view to review blueprint metadata, imagery, and all sellable variants before editing or cleanup work."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/products">
                <Button icon="arrow_back" variant="secondary">
                  Back to Products
                </Button>
              </Link>
              <Link to={`/products/${id}/edit`}>
                <Button icon="edit" variant="secondary">
                  Edit Product
                </Button>
              </Link>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard title="Variants" value={variants.length} caption="Sellable records currently linked to this template" icon="inventory_2" tone="blue" />
          <MetricCard title="Images" value={images.length} caption="Media assets currently attached to the template" icon="image" tone="emerald" />
          <MetricCard title="Status" value={product.isActive ? 'Active' : 'Inactive'} caption="Commercial availability of the product blueprint" icon="verified" tone="amber" />
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

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
                        src={imageUrls[selectedImage.id] || selectedImage.url}
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
                            src={imageUrls[img.id] || img.url}
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
            <Card title="Product Variants" action={<InfoTip text="Review attribute combinations here to spot duplicate sellable variants, missing prices, or outdated barcodes." />}>
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
    </CatalogPageFrame>
  );
};

export default ProductDetails;
