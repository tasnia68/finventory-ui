import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProductTemplate, updateProductTemplate, getProductTemplate, uploadProductImage, createProductVariant, getProductImages, getProductImageFile, getProductVariants, updateProductVariant } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { getUOMs } from '../../services/uomService';
import { createProductAttribute, getProductAttributes } from '../../services/attributeService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import MetricCard from '../../components/common/MetricCard';
import InfoTip from '../../components/common/InfoTip';
import { CatalogHero, CatalogPageFrame } from '../../components/catalog';

const STEPS = [
  { id: 1, name: 'Basic Info', icon: 'info' },
  { id: 2, name: 'Images', icon: 'image' },
  { id: 3, name: 'Attributes', icon: 'tune' },
  { id: 4, name: 'Variants', icon: 'inventory' },
];

const CreateProduct = () => {
  const navigate = useNavigate();
  const { id: productId } = useParams();
  const isEditMode = Boolean(productId);
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Basic Info
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    categoryId: '',
    uomId: '',
    isActive: true,
    publishedToStorefront: false,
    storefrontSlug: '',
    storefrontTitle: '',
    storefrontDescription: '',
    storefrontSortOrder: '',
    storefrontSeoTitle: '',
    storefrontSeoDescription: '',
  });
  const [createdTemplate, setCreatedTemplate] = useState(null);

  // Step 2: Images
  const [images, setImages] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Step 3: Attributes
  const [attributes, setAttributes] = useState([]); // Stores created attributes with IDs
  const [newAttribute, setNewAttribute] = useState({ name: '', type: 'DROPDOWN', values: '', required: false });

  // Step 4: Variants
  const [variants, setVariants] = useState([]);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCompareAtPrice, setBulkCompareAtPrice] = useState('');
  const [skuTemplate, setSkuTemplate] = useState('');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  };

  useEffect(() => {
    fetchData();
    if (isEditMode) {
      loadProductData();
    }
  }, []);

  useEffect(() => {
    if (isEditMode && currentStep === 4) {
      refreshVariants();
    }
  }, [isEditMode, currentStep]);

  const fetchData = async () => {
    try {
      const [categoriesData, uomsData] = await Promise.all([
        getCategories(),
        getUOMs(),
      ]);
      setCategories(categoriesData);
      setUoms(uomsData);
    } catch (error) {
      showAlert('error', 'Failed to load data');
    }
  };

  const loadProductData = async () => {
    try {
      setLoading(true);
      const [product, imagesData, variantsData, attributesData] = await Promise.all([
        getProductTemplate(productId),
        getProductImages(productId),
        getProductVariants(productId),
        getProductAttributes(productId),
      ]);
      setTemplateData({
        name: product.name,
        description: product.description || '',
        categoryId: product.categoryId,
        uomId: product.uomId,
        isActive: product.isActive,
        publishedToStorefront: product.publishedToStorefront || false,
        storefrontSlug: product.storefrontSlug || '',
        storefrontTitle: product.storefrontTitle || '',
        storefrontDescription: product.storefrontDescription || '',
        storefrontSortOrder: product.storefrontSortOrder ?? '',
        storefrontSeoTitle: product.storefrontSeoTitle || '',
        storefrontSeoDescription: product.storefrontSeoDescription || '',
      });
      setCreatedTemplate(product);

      const normalizedImages = Array.isArray(imagesData) ? imagesData : [];
      const imageEntries = await Promise.all(
        normalizedImages.map(async (img) => {
          try {
            const blob = await getProductImageFile(img.id);
            const url = URL.createObjectURL(blob);
            return { id: img.id, url, isMain: img.isMain };
          } catch (error) {
            return null;
          }
        })
      );
      const loadedImages = imageEntries.filter(Boolean);
      setImages(loadedImages);
      const mainIndex = loadedImages.findIndex((img) => img.isMain);
      setMainImageIndex(mainIndex >= 0 ? mainIndex : 0);

      const normalizedAttributes = Array.isArray(attributesData) ? attributesData : [];
      setAttributes(
        normalizedAttributes.map((attr) => ({
          ...attr,
          values: attr.options ? attr.options.split(',').map((v) => v.trim()).filter(Boolean) : [],
        }))
      );

      const normalizedVariants = Array.isArray(variantsData) ? variantsData : [];
      const filteredVariants = normalizedVariants.filter((variant) => variant.templateId === productId);
      setVariants(
        filteredVariants.map((variant) => ({
          ...variant,
          compareAtPrice: variant.compareAtPrice ?? '',
          storefrontBadge: variant.storefrontBadge || '',
          storefrontFeatured: variant.storefrontFeatured || false,
          templateId: productId,
          displayName: variant.attributeValues && variant.attributeValues.length > 0
            ? variant.attributeValues.map((val) => val.value).join('-')
            : 'Default Variant',
        }))
      );
      showAlert('info', 'Loaded product for editing');
    } catch (error) {
      showAlert('error', 'Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  const refreshVariants = async () => {
    try {
      const variantsData = await getProductVariants(productId);
      const normalizedVariants = Array.isArray(variantsData) ? variantsData : [];
      const filteredVariants = normalizedVariants.filter((variant) => variant.templateId === productId);
      setVariants(
        filteredVariants.map((variant) => ({
          ...variant,
          compareAtPrice: variant.compareAtPrice ?? '',
          storefrontBadge: variant.storefrontBadge || '',
          storefrontFeatured: variant.storefrontFeatured || false,
          templateId: productId,
          displayName: variant.attributeValues && variant.attributeValues.length > 0
            ? variant.attributeValues.map((val) => val.value).join('-')
            : 'Default Variant',
        }))
      );
    } catch (error) {
      showAlert('error', 'Failed to refresh variants');
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Step 1: Create/Update Template
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      let template;
      const payload = {
        ...templateData,
        storefrontSortOrder: templateData.storefrontSortOrder === '' ? null : Number(templateData.storefrontSortOrder),
      };
      if (isEditMode) {
        template = await updateProductTemplate(productId, payload);
        showAlert('success', 'Product template updated successfully');
      } else {
        template = await createProductTemplate(payload);
        showAlert('success', 'Product template created successfully');
      }
      setCreatedTemplate(template);
      setCurrentStep(2);
    } catch (error) {
      showAlert('error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} product template`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Upload Images
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    try {
      setUploadingImage(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isMain = images.length === 0 && i === 0; // First image is main
        await uploadProductImage(createdTemplate.id, file, isMain);
        
        // Add preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, { url: reader.result, file, isMain }]);
        };
        reader.readAsDataURL(file);
      }
      showAlert('success', 'Images uploaded successfully');
    } catch (error) {
      showAlert('error', error.message || 'Failed to upload images');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleStep2Next = () => {
    if (images.length === 0) {
      showAlert('warning', 'Please upload at least one image');
      return;
    }
    setCurrentStep(3);
  };

  // Step 3: Attributes
  const handleAddAttribute = async () => {
    if (!newAttribute.name || !newAttribute.values) {
      showAlert('warning', 'Please enter attribute name and values');
      return;
    }

    const values = newAttribute.values.split(',').map(v => v.trim()).filter(v => v);
    if (values.length === 0) {
      showAlert('warning', 'Please enter at least one value');
      return;
    }

    try {
      // Create ProductAttribute via API
      const attributeData = {
        name: newAttribute.name,
        type: newAttribute.type,
        required: newAttribute.required,
        options: newAttribute.values,
        templateId: createdTemplate.id,
      };
      
      const createdAttr = await createProductAttribute(attributeData);
      setAttributes([...attributes, { ...createdAttr, values }]);
      setNewAttribute({ name: '', type: 'DROPDOWN', values: '', required: false });
      showAlert('success', 'Attribute created successfully');
    } catch (error) {
      showAlert('error', error.message || 'Failed to create attribute');
    }
  };

  const handleRemoveAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleStep3Next = () => {
    if (isEditMode && variants.length > 0) {
      setCurrentStep(4);
      return;
    }
    if (attributes.length === 0) {
      // No attributes - create single variant
      const defaultVariant = {
        sku: `${createdTemplate.name.toUpperCase().replace(/\s/g, '-')}-001`,
        barcode: '',
        price: '',
        compareAtPrice: '',
        storefrontBadge: '',
        storefrontFeatured: false,
        cost: '',
        templateId: createdTemplate.id,
        attributeValues: [],
      };
      setVariants([defaultVariant]);
    } else {
      // Generate variant combinations
      const combinations = generateVariantCombinations(attributes);
      const generatedVariants = combinations.map((combo, index) => {
        const variantName = combo.map(c => c.value).join('-');
        const sku = `${createdTemplate.name.toUpperCase().replace(/\s/g, '-')}-${variantName.toUpperCase()}`;
        return {
          sku,
          barcode: '',
          price: '',
          compareAtPrice: '',
          storefrontBadge: '',
          storefrontFeatured: false,
          cost: '',
          templateId: createdTemplate.id,
          attributeValues: combo.map(c => ({
            attributeId: c.attributeId,
            value: c.value
          })),
          displayName: variantName,
        };
      });
      setVariants(generatedVariants);
    }
    setCurrentStep(4);
  };

  const generateVariantCombinations = (attrs) => {
    if (attrs.length === 0) return [];
    
    const [first, ...rest] = attrs;
    const restCombinations = rest.length > 0 ? generateVariantCombinations(rest) : [null];
    
    const combinations = [];
    for (const value of first.values) {
      for (const restCombo of restCombinations) {
        const combo = [
          { attributeId: first.id, attributeName: first.name, value },
          ...(restCombo || [])
        ];
        combinations.push(combo);
      }
    }
    return combinations;
  };

  // Step 4: Create Variants
  const handleVariantChange = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const handleRemoveVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const applyBulkPrice = () => {
    if (bulkPrice === '') return;
    const priceValue = parseFloat(bulkPrice);
    if (Number.isNaN(priceValue)) {
      showAlert('error', 'Bulk price must be a valid number');
      return;
    }
    setVariants(prev => prev.map(v => ({ ...v, price: priceValue })));
  };

  const applyBulkCompareAtPrice = () => {
    if (bulkCompareAtPrice === '') return;
    const priceValue = parseFloat(bulkCompareAtPrice);
    if (Number.isNaN(priceValue)) {
      showAlert('error', 'Bulk compare-at price must be a valid number');
      return;
    }
    setVariants(prev => prev.map(v => ({ ...v, compareAtPrice: priceValue })));
  };

  const applySkuTemplate = () => {
    if (!skuTemplate.trim()) return;
    const baseName = createdTemplate?.name || templateData.name || 'PRODUCT';
    setVariants(prev => prev.map(v => {
      const attrs = v.attributeValues || [];
      let sku = skuTemplate;
      sku = sku.replace('{Product}', baseName.toUpperCase().replace(/\s/g, '-'));
      attrs.forEach(attr => {
        const key = `{${attr.attributeName || attr.attributeId}}`;
        sku = sku.replace(key, String(attr.value).toUpperCase().replace(/\s/g, '-'));
      });
      return { ...v, sku };
    }));
  };

  const handleStep4Submit = async () => {
    try {
      setLoading(true);
      
      // Validate variants
      for (const variant of variants) {
        if (!variant.sku || !variant.price) {
          showAlert('error', 'All variants must have SKU and Price');
          return;
        }
      }

      // Create all variants
      for (const variant of variants) {
        const data = {
          ...variant,
          price: parseFloat(variant.price),
          compareAtPrice: variant.compareAtPrice === '' || variant.compareAtPrice === null || variant.compareAtPrice === undefined
            ? null
            : parseFloat(variant.compareAtPrice),
          cost: variant.cost ? parseFloat(variant.cost) : 0,
        };
        if (isEditMode && variant.id) {
          await updateProductVariant(variant.id, data);
        } else {
          await createProductVariant(data);
        }
      }

      showAlert('success', isEditMode ? 'Product updated successfully' : 'Product created successfully with all variants');
      setTimeout(() => {
        navigate(`/products/${createdTemplate.id}`);
      }, 1500);
    } catch (error) {
      showAlert('error', error.message || 'Failed to create variants');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                currentStep >= step.id
                  ? 'bg-primary text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{step.icon}</span>
            </div>
            <span className={`hidden sm:block font-medium ${
              currentStep >= step.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
            }`}>
              {step.name}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-4 ${
              currentStep > step.id ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <CatalogPageFrame size="md">
        <CatalogHero
          eyebrow="Phase 3 Catalog"
          title={isEditMode ? 'Refine the full product blueprint and its variants.' : 'Build a product blueprint step by step.'}
          description={isEditMode ? 'Adjust the template, media, attribute model, and sellable variants in one controlled flow.' : 'Move from template basics to images, attributes, and final variant review without losing context.'}
          info="This is the complete template workflow for products that need multiple sellable variants or richer merchandising structure."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard title="Current Step" value={`${currentStep}/${STEPS.length}`} caption="Progress through the template workflow" icon="conversion_path" tone="blue" />
          <MetricCard title="Images Staged" value={images.length} caption="Product images currently attached to this template" icon="image" tone="emerald" />
          <MetricCard title="Variants Drafted" value={variants.length} caption="Sellable variants currently staged or loaded" icon="inventory" tone="amber" />
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <Card title="Workflow Progress" subtitle="Each step adds another layer of product definition" action={<InfoTip text="Save the template foundation first, then upload media, define attributes, and finish with sellable variants." />}>
          {renderStepIndicator()}
        </Card>

        <Card>
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Product Information
              </h2>
              <Input
                label="Product Name"
                value={templateData.name}
                onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                required
                placeholder="e.g., Premium T-Shirt"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={templateData.description}
                  onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
                  rows={4}
                  className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Product description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={templateData.categoryId}
                  onChange={(e) => setTemplateData({ ...templateData, categoryId: e.target.value })}
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
                  Base Unit of Measure
                </label>
                <select
                  value={templateData.uomId}
                  onChange={(e) => setTemplateData({ ...templateData, uomId: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select Unit</option>
                  {uoms.map(uom => (
                    <option key={uom.id} value={uom.id}>{uom.name} ({uom.code})</option>
                  ))}
                </select>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Storefront Merchandising</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Control whether this template is visible in the storefront and override how it appears publicly.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={templateData.publishedToStorefront}
                      onChange={(e) => setTemplateData({ ...templateData, publishedToStorefront: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    Publish to storefront
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Storefront Slug"
                    value={templateData.storefrontSlug}
                    onChange={(e) => setTemplateData({ ...templateData, storefrontSlug: e.target.value })}
                    placeholder="barcode-printer-x1"
                  />
                  <Input
                    label="Storefront Title"
                    value={templateData.storefrontTitle}
                    onChange={(e) => setTemplateData({ ...templateData, storefrontTitle: e.target.value })}
                    placeholder="Public-facing product title"
                  />
                  <Input
                    label="Storefront Sort Order"
                    type="number"
                    value={templateData.storefrontSortOrder}
                    onChange={(e) => setTemplateData({ ...templateData, storefrontSortOrder: e.target.value })}
                    placeholder="10"
                  />
                  <Input
                    label="SEO Title"
                    value={templateData.storefrontSeoTitle}
                    onChange={(e) => setTemplateData({ ...templateData, storefrontSeoTitle: e.target.value })}
                    placeholder="Search-friendly title"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Storefront Description
                  </label>
                  <textarea
                    value={templateData.storefrontDescription}
                    onChange={(e) => setTemplateData({ ...templateData, storefrontDescription: e.target.value })}
                    rows={3}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    placeholder="Merchandising description used in public storefront cards and details."
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    SEO Description
                  </label>
                  <textarea
                    value={templateData.storefrontSeoDescription}
                    onChange={(e) => setTemplateData({ ...templateData, storefrontSeoDescription: e.target.value })}
                    rows={3}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    placeholder="Search meta description for the storefront page."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => navigate('/products')}>
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  {isEditMode ? 'Update & Continue' : 'Next: Upload Images'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Images */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Product Images
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Upload Images
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-slate-500 dark:text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-primary/90
                    file:cursor-pointer cursor-pointer"
                  disabled={uploadingImage}
                />
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img.url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700"
                      />
                      {index === mainImageIndex && (
                        <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button onClick={handleStep2Next} disabled={uploadingImage}>
                  Next: Add Attributes
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Attributes */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Product Attributes (Optional)
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Add attributes like Color, Size, etc. to create variants
              </p>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Input
                    placeholder="Attribute name (e.g., Color)"
                    value={newAttribute.name}
                    onChange={(e) => setNewAttribute({ ...newAttribute, name: e.target.value })}
                  />
                  <select
                    value={newAttribute.type}
                    onChange={(e) => setNewAttribute({ ...newAttribute, type: e.target.value })}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="DROPDOWN">Dropdown</option>
                    <option value="TEXT">Text</option>
                    <option value="NUMBER">Number</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Values (comma-separated, e.g., Red, Blue)"
                    value={newAttribute.values}
                    onChange={(e) => setNewAttribute({ ...newAttribute, values: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="required"
                      checked={newAttribute.required}
                      onChange={(e) => setNewAttribute({ ...newAttribute, required: e.target.checked })}
                      className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="required" className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      Required
                    </label>
                  </div>
                  <Button onClick={handleAddAttribute} icon="add">
                    Add
                  </Button>
                </div>
              </div>
              {attributes.length > 0 && (
                <div className="space-y-2">
                  {attributes.map((attr, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white">{attr.name}:</span>
                        <span className="text-slate-600 dark:text-slate-400 ml-2">
                          {attr.values.join(', ')}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveAttribute(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button onClick={handleStep3Next} icon="auto_awesome">
                  Generate Variants
                </Button>
                <Button onClick={() => setCurrentStep(4)}>
                  Next: Review Variants
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Variants */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Product Variants
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-end gap-2">
                  <Input
                    label="Bulk Price"
                    type="number"
                    step="0.01"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    placeholder="e.g., 29.99"
                  />
                  <Button variant="ghost" onClick={applyBulkPrice}>
                    Apply
                  </Button>
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    label="Bulk Compare-at Price"
                    type="number"
                    step="0.01"
                    value={bulkCompareAtPrice}
                    onChange={(e) => setBulkCompareAtPrice(e.target.value)}
                    placeholder="e.g., 34.99"
                  />
                  <Button variant="ghost" onClick={applyBulkCompareAtPrice}>
                    Apply
                  </Button>
                </div>
                <div className="flex items-end gap-2 md:col-span-2">
                  <Input
                    label="SKU Template"
                    value={skuTemplate}
                    onChange={(e) => setSkuTemplate(e.target.value)}
                    placeholder="e.g., {Product}-{Color}-{Size}"
                  />
                  <Button variant="ghost" onClick={applySkuTemplate}>
                    Apply
                  </Button>
                </div>
              </div>
              {isEditMode && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Existing variants are loaded automatically. Use refresh if you added variants elsewhere.
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={refreshVariants}>
                      Refresh
                    </Button>
                    <Button
                      onClick={() =>
                        setVariants((prev) => [
                          ...prev,
                          {
                            sku: '',
                            barcode: '',
                            price: 0,
                            compareAtPrice: '',
                            storefrontBadge: '',
                            storefrontFeatured: false,
                            cost: 0,
                            templateId: createdTemplate?.id || productId,
                            attributeValues: [],
                            displayName: 'New Variant',
                          },
                        ])
                      }
                      icon="add"
                    >
                      Add Variant
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {variant.displayName || 'Default Variant'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {variant.storefrontFeatured ? (
                        <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Featured
                        </span>
                      ) : null}
                      {variant.storefrontBadge ? (
                        <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold uppercase tracking-[0.14em] text-primary">
                          {variant.storefrontBadge}
                        </span>
                      ) : null}
                      <span className="text-slate-500 dark:text-slate-400">
                        Current price: {formatCurrency(variant.price)}
                      </span>
                      {variant.compareAtPrice ? (
                        <span className="text-slate-400 line-through">
                          {formatCurrency(variant.compareAtPrice)}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="SKU"
                        value={variant.sku}
                        onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                        required
                      />
                      <Input
                        label="Barcode"
                        value={variant.barcode}
                        onChange={(e) => handleVariantChange(index, 'barcode', e.target.value)}
                      />
                      <Input
                        label="Price"
                        type="number"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                        required
                      />
                      <Input
                        label="Compare-at Price"
                        type="number"
                        step="0.01"
                        value={variant.compareAtPrice}
                        onChange={(e) => handleVariantChange(index, 'compareAtPrice', e.target.value)}
                      />
                      <Input
                        label="Storefront Badge"
                        value={variant.storefrontBadge}
                        onChange={(e) => handleVariantChange(index, 'storefrontBadge', e.target.value)}
                        placeholder="Featured, Wireless, Limited"
                      />
                      <Input
                        label="Cost"
                        type="number"
                        step="0.01"
                        value={variant.cost}
                        onChange={(e) => handleVariantChange(index, 'cost', e.target.value)}
                      />
                      <div className="flex items-center rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={Boolean(variant.storefrontFeatured)}
                            onChange={(e) => handleVariantChange(index, 'storefrontFeatured', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          Mark as featured in storefront
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" onClick={() => handleRemoveVariant(index)}>
                        Remove Variant
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button onClick={handleStep4Submit} loading={loading}>
                  {isEditMode ? 'Save Changes' : 'Create Product'}
                </Button>
              </div>
            </div>
          )}
        </Card>
    </CatalogPageFrame>
  );
};

export default CreateProduct;
