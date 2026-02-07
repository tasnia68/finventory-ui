import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProductTemplate, updateProductTemplate, getProductTemplate, uploadProductImage, createProductVariant } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { getUOMs } from '../../services/uomService';
import { createProductAttribute } from '../../services/attributeService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';

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

  useEffect(() => {
    fetchData();
    if (isEditMode) {
      loadProductData();
    }
  }, []);

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
      const product = await getProductTemplate(productId);
      setTemplateData({
        name: product.name,
        description: product.description || '',
        categoryId: product.categoryId,
        uomId: product.uomId,
        isActive: product.isActive,
      });
      setCreatedTemplate(product);
      showAlert('info', 'Loaded product for editing');
    } catch (error) {
      showAlert('error', 'Failed to load product data');
    } finally {
      setLoading(false);
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
      if (isEditMode) {
        template = await updateProductTemplate(productId, templateData);
        showAlert('success', 'Product template updated successfully');
      } else {
        template = await createProductTemplate(templateData);
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
    if (attributes.length === 0) {
      // No attributes - create single variant
      const defaultVariant = {
        sku: `${createdTemplate.name.toUpperCase().replace(/\s/g, '-')}-001`,
        barcode: '',
        price: '',
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
          cost: variant.cost ? parseFloat(variant.cost) : 0,
        };
        await createProductVariant(data);
      }

      showAlert('success', 'Product created successfully with all variants');
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
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {isEditMode ? 'Edit Product' : 'Create New Product'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isEditMode ? 'Update product information and variants' : 'Follow the steps to create a complete product'}
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
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
                <Button onClick={handleStep3Next}>
                  Next: Create Variants
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
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {variant.displayName || 'Default Variant'}
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
                        label="Cost"
                        type="number"
                        step="0.01"
                        value={variant.cost}
                        onChange={(e) => handleVariantChange(index, 'cost', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button onClick={handleStep4Submit} loading={loading}>
                  Create Product
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CreateProduct;
