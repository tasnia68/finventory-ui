import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createProductBulk,
  updateProductBulk,
  getProductTemplate,
  getProductVariants,
  getProductImages,
  uploadProductImage,
  deleteProductImage,
  setMainImage,
} from '../../services/productService';
import { getCategoryTree } from '../../services/categoryService';
import { getWarehouses } from '../../services/warehouseService';
import { getUOMs } from '../../services/uomService';
import { getStockLevels } from '../../services/stockService';
import { generateMatrix, reconcileMatrix } from '../../utils/variantMatrix';
import RichTextField from '../../components/storefront/RichTextField';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft', tint: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  { value: 'ACTIVE', label: 'Active', tint: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { value: 'ARCHIVED', label: 'Archived', tint: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
];

const flattenCategoryTree = (entries = []) => entries.flatMap((entry) => [entry, ...flattenCategoryTree(entry.children || [])]);

const Section = ({ title, subtitle, actions, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
    <div className="p-5">{children}</div>
  </section>
);

const Field = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</span>
    <div className="mt-1.5">{children}</div>
    {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
  </label>
);

const inputClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';

const blankOptionGroup = () => ({ name: '', values: [] });
const blankVariantRow = (label = 'Default') => ({
  id: null,
  sku: '',
  barcode: '',
  price: '',
  compareAtPrice: '',
  cost: '',
  storefrontBadge: '',
  storefrontFeatured: false,
  attributeValues: {},
  label,
  stocks: {}, // { warehouseId: { quantity, delta } }
});

const ProductEditor = () => {
  const { id: templateId } = useParams();
  const isEditMode = Boolean(templateId);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Reference data
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [uoms, setUoms] = useState([]);

  // Form state
  const [draft, setDraft] = useState({
    name: '',
    description: '',
    status: 'DRAFT',
    vendor: '',
    productType: '',
    tags: '',
    categoryId: '',
    uomId: '',
    publishedToStorefront: true,
    storefrontSlug: '',
    storefrontSeoTitle: '',
    storefrontSeoDescription: '',
  });
  const [optionGroups, setOptionGroups] = useState([]);
  const [variants, setVariants] = useState(() => [blankVariantRow()]);
  const [pricingDefaults, setPricingDefaults] = useState({ price: '', compareAtPrice: '', cost: '' });

  // Images: edit mode stores server objects {id, url, isMain}; create mode queues File objects to upload after first save.
  const [serverImages, setServerImages] = useState([]);
  const [queuedFiles, setQueuedFiles] = useState([]);

  // Load reference data on mount
  useEffect(() => {
    (async () => {
      try {
        const [tree, wh, u] = await Promise.all([getCategoryTree(), getWarehouses(), getUOMs()]);
        setCategories(flattenCategoryTree(Array.isArray(tree) ? tree : []));
        setWarehouses(Array.isArray(wh) ? wh : []);
        setUoms(Array.isArray(u) ? u : []);
      } catch (err) {
        setError(err.message || 'Failed to load reference data.');
      }
    })();
  }, []);

  // Edit-mode hydration
  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      try {
        setLoading(true);
        const [tpl, vars, imgs] = await Promise.all([
          getProductTemplate(templateId),
          getProductVariants(templateId),
          getProductImages(templateId).catch(() => []),
        ]);
        setDraft({
          name: tpl.name || '',
          description: tpl.description || '',
          status: tpl.status || (tpl.isActive === false ? 'ARCHIVED' : 'ACTIVE'),
          vendor: tpl.vendor || '',
          productType: tpl.productType || '',
          tags: tpl.tags || '',
          categoryId: tpl.categoryId || '',
          uomId: tpl.uomId || '',
          publishedToStorefront: tpl.publishedToStorefront !== false,
          storefrontSlug: tpl.storefrontSlug || '',
          storefrontSeoTitle: tpl.storefrontSeoTitle || '',
          storefrontSeoDescription: tpl.storefrontSeoDescription || '',
        });
        setServerImages(imgs || []);

        // Build option groups from variant attribute values.
        const attributesByName = new Map();
        const varList = Array.isArray(vars) ? vars : (vars?.content || vars?.items || []);
        for (const v of varList) {
          for (const av of v.attributeValues || []) {
            // attribute name not surfaced on variant DTO; fall back to attributeId as label.
            const name = av.attributeName || av.name || av.attributeId;
            if (!attributesByName.has(name)) attributesByName.set(name, new Set());
            attributesByName.get(name).add(av.value);
          }
        }
        const groups = Array.from(attributesByName.entries()).map(([name, valuesSet]) => ({
          name,
          values: Array.from(valuesSet),
        }));
        setOptionGroups(groups);

        // Hydrate variants — fetch each variant's stock levels in parallel
        const stockResults = await Promise.all(
          varList.map((v) => getStockLevels({ productVariantId: v.id }).catch(() => []))
        );
        const hydratedVariants = varList.map((v, i) => {
          const stockEntries = Array.isArray(stockResults[i]) ? stockResults[i] : (stockResults[i]?.content || []);
          const stocks = {};
          for (const s of stockEntries) {
            const wid = s.warehouseId || s.warehouse?.id;
            if (wid) {
              const prev = Number(stocks[wid]?.quantity || 0);
              stocks[wid] = { quantity: prev + Number(s.quantity || 0), delta: 0 };
            }
          }
          const attributeValues = {};
          for (const av of v.attributeValues || []) {
            const name = av.attributeName || av.name || av.attributeId;
            attributeValues[name] = av.value;
          }
          return {
            id: v.id,
            sku: v.sku || '',
            barcode: v.barcode || '',
            price: v.price ?? '',
            compareAtPrice: v.compareAtPrice ?? '',
            cost: v.cost ?? '',
            storefrontBadge: v.storefrontBadge || '',
            storefrontFeatured: !!v.storefrontFeatured,
            attributeValues,
            label: Object.values(attributeValues).join(' / ') || `Variant ${i + 1}`,
            stocks,
          };
        });
        setVariants(hydratedVariants.length > 0 ? hydratedVariants : [blankVariantRow()]);

        // Seed pricing defaults from the cheapest variant
        if (hydratedVariants.length > 0) {
          const first = hydratedVariants[0];
          setPricingDefaults({
            price: first.price || '',
            compareAtPrice: first.compareAtPrice || '',
            cost: first.cost || '',
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load product.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isEditMode, templateId]);

  // Regenerate variant matrix when option groups change.
  const regenerateVariants = (nextGroups) => {
    const matrix = generateMatrix(nextGroups);
    setVariants((current) => {
      const newRows = matrix.map((row) => ({
        ...blankVariantRow(row.label),
        attributeValues: row.attributeValues,
        price: pricingDefaults.price,
        compareAtPrice: pricingDefaults.compareAtPrice,
        cost: pricingDefaults.cost,
      }));
      return reconcileMatrix(newRows, current);
    });
  };

  const handleAddOptionGroup = () => {
    const next = [...optionGroups, blankOptionGroup()];
    setOptionGroups(next);
    // Don't regenerate until the group has at least one value.
  };

  const handleUpdateOptionGroup = (index, patch) => {
    const next = optionGroups.map((g, i) => (i === index ? { ...g, ...patch } : g));
    setOptionGroups(next);
    if (patch.values || patch.name) {
      regenerateVariants(next);
    }
  };

  const handleRemoveOptionGroup = (index) => {
    const next = optionGroups.filter((_, i) => i !== index);
    setOptionGroups(next);
    regenerateVariants(next);
  };

  const handleVariantField = (index, field, value) => {
    setVariants((current) => current.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const handleStockChange = (variantIndex, warehouseId, value) => {
    setVariants((current) => current.map((v, i) => {
      if (i !== variantIndex) return v;
      const current = v.stocks?.[warehouseId]?.quantity || 0;
      return {
        ...v,
        stocks: {
          ...(v.stocks || {}),
          [warehouseId]: { quantity: Number(value || 0), delta: Number(value || 0) - current },
        },
      };
    }));
  };

  const handlePricingDefaultChange = (field, value) => {
    setPricingDefaults((p) => ({ ...p, [field]: value }));
    // Push the default into any variant that hasn't been individually edited.
    setVariants((current) => current.map((v) => ({
      ...v,
      [field]: v[field] === '' || v[field] === pricingDefaults[field] ? value : v[field],
    })));
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    addFilesToImageList(files);
  };

  const handleFilePick = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    addFilesToImageList(files);
    event.target.value = '';
  };

  const addFilesToImageList = async (files) => {
    if (isEditMode && templateId) {
      // Upload immediately to preserve drag-drop simplicity
      try {
        for (const file of files) {
          const isMain = serverImages.length === 0;
          const result = await uploadProductImage(templateId, file, isMain);
          setServerImages((prev) => [...prev, result]);
        }
      } catch (err) {
        setError(err.message || 'Image upload failed.');
      }
    } else {
      setQueuedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeImage = async (image, queuedIndex) => {
    if (image?.id && templateId) {
      try {
        await deleteProductImage(templateId, image.id);
        setServerImages((prev) => prev.filter((img) => img.id !== image.id));
      } catch (err) {
        setError(err.message || 'Image delete failed.');
      }
    } else if (queuedIndex != null) {
      setQueuedFiles((prev) => prev.filter((_, i) => i !== queuedIndex));
    }
  };

  const setImageAsMain = async (image) => {
    if (!image?.id || !templateId) return;
    try {
      await setMainImage(templateId, image.id);
      setServerImages((prev) => prev.map((img) => ({ ...img, isMain: img.id === image.id })));
    } catch (err) {
      setError(err.message || 'Setting main image failed.');
    }
  };

  // Build the payload for the bulk endpoint.
  const buildPayload = () => {
    const attributes = optionGroups
      .filter((g) => g.name && g.values?.length)
      .map((g) => ({
        name: g.name,
        type: 'DROPDOWN',
        required: false,
        options: g.values.join(','),
      }));

    const variantSpecs = variants.map((v) => {
      const initialStocks = warehouses
        .map((w) => {
          const cell = v.stocks?.[w.id];
          if (!cell) return null;
          const qty = isEditMode ? cell.delta : cell.quantity;
          if (!qty || Number(qty) === 0) return null;
          return {
            warehouseId: w.id,
            quantity: Number(qty),
            unitCost: v.cost ? Number(v.cost) : (pricingDefaults.cost ? Number(pricingDefaults.cost) : null),
            reason: isEditMode ? 'Stock adjustment from product editor' : 'Initial stock from product editor',
          };
        })
        .filter(Boolean);

      return {
        id: v.id || undefined,
        sku: v.sku || undefined,
        barcode: v.barcode || undefined,
        price: v.price ? Number(v.price) : Number(pricingDefaults.price || 0),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
        cost: v.cost ? Number(v.cost) : (pricingDefaults.cost ? Number(pricingDefaults.cost) : null),
        storefrontBadge: v.storefrontBadge || null,
        storefrontFeatured: !!v.storefrontFeatured,
        attributeValues: Object.keys(v.attributeValues || {}).length ? v.attributeValues : undefined,
        initialStocks: initialStocks.length ? initialStocks : undefined,
        stockAdjustments: isEditMode && initialStocks.length ? initialStocks : undefined,
      };
    });

    return {
      template: {
        name: draft.name,
        description: draft.description,
        status: draft.status,
        isActive: draft.status !== 'ARCHIVED',
        vendor: draft.vendor || null,
        productType: draft.productType || null,
        tags: draft.tags || null,
        categoryId: draft.categoryId || null,
        uomId: draft.uomId || null,
        publishedToStorefront: draft.publishedToStorefront,
        storefrontSlug: draft.storefrontSlug || null,
        storefrontSeoTitle: draft.storefrontSeoTitle || null,
        storefrontSeoDescription: draft.storefrontSeoDescription || null,
      },
      attributes,
      variants: variantSpecs,
    };
  };

  const handleSave = async () => {
    if (!draft.name?.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!draft.categoryId) {
      setError('Category is required.');
      return;
    }
    if (!draft.uomId) {
      setError('Unit of measure is required.');
      return;
    }

    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = buildPayload();
      let saved;
      if (isEditMode) {
        saved = await updateProductBulk(templateId, payload);
        setStatus('Saved.');
      } else {
        saved = await createProductBulk(payload);
        // Upload queued images now that we have the template id
        if (queuedFiles.length > 0 && saved?.id) {
          for (let i = 0; i < queuedFiles.length; i += 1) {
            const isMain = i === 0;
            await uploadProductImage(saved.id, queuedFiles[i], isMain).catch(() => {});
          }
        }
        setStatus('Product created.');
        navigate(`/products/${saved.id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const totalStockUnits = useMemo(() => variants.reduce((sum, v) => {
    return sum + Object.values(v.stocks || {}).reduce((s, cell) => s + Number(cell?.quantity || 0), 0);
  }, 0), [variants]);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</div>;
  }

  const statusOption = STATUS_OPTIONS.find((s) => s.value === draft.status) || STATUS_OPTIONS[0];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* TOP BAR */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button type="button" onClick={() => navigate('/products')} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Back">←</button>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Untitled product"
            className="min-w-0 flex-1 max-w-md bg-transparent text-base font-semibold text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white"
          />
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusOption.tint}`}>{statusOption.label}</span>
          {status ? <span className="truncate text-xs text-emerald-600 dark:text-emerald-400">{status}</span> : null}
          {error ? <span className="truncate text-xs text-red-600 dark:text-red-400">{error}</span> : null}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={handleSave} disabled={saving} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {/* BODY — left scrollable sections + sticky right sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {/* BASICS */}
            <Section title="Basics" subtitle="Title and description shown across admin and storefront.">
              <div className="space-y-4">
                <Field label="Title">
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} placeholder="Short, descriptive product name" />
                </Field>
                <Field label="Description">
                  <RichTextField value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
                </Field>
              </div>
            </Section>

            {/* MEDIA */}
            <Section title="Media" subtitle="First image becomes the main. Drag to reorder.">
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className="grid grid-cols-3 gap-3 sm:grid-cols-4"
              >
                {serverImages.map((img) => (
                  <div key={img.id} className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <img src={img.url || `/api/v1/product-images/${img.id}/file`} alt="" className="aspect-square w-full object-cover" />
                    {img.isMain ? (
                      <span className="absolute left-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Main</span>
                    ) : null}
                    <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-0 group-hover:opacity-100 transition">
                      {!img.isMain ? (
                        <button type="button" onClick={() => setImageAsMain(img)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-white">Set main</button>
                      ) : <span />}
                      <button type="button" onClick={() => removeImage(img)} className="rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-red-500">Remove</button>
                    </div>
                  </div>
                ))}
                {queuedFiles.map((file, idx) => (
                  <div key={`queued-${idx}`} className="group relative overflow-hidden rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <img src={URL.createObjectURL(file)} alt="" className="aspect-square w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded-full bg-slate-700/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Queued</span>
                    <button type="button" onClick={() => removeImage(null, idx)} className="absolute right-1 bottom-1 rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100">Remove</button>
                  </div>
                ))}
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500">
                  <span className="text-2xl">+</span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider">Add</span>
                  <input type="file" multiple accept="image/*" onChange={handleFilePick} className="hidden" />
                </label>
              </div>
              {serverImages.length === 0 && queuedFiles.length === 0 ? (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">Add at least one image — products without photos perform worse on storefront.</p>
              ) : null}
            </Section>

            {/* PRICING */}
            <Section title="Pricing" subtitle="Defaults for every variant. Override per-row in the Variants section.">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Price">
                  <input type="number" step="0.01" value={pricingDefaults.price} onChange={(e) => handlePricingDefaultChange('price', e.target.value)} className={inputClass} placeholder="0.00" />
                </Field>
                <Field label="Compare-at">
                  <input type="number" step="0.01" value={pricingDefaults.compareAtPrice} onChange={(e) => handlePricingDefaultChange('compareAtPrice', e.target.value)} className={inputClass} placeholder="Optional" />
                </Field>
                <Field label="Cost" hint="Stored on variant; used for stock movements.">
                  <input type="number" step="0.01" value={pricingDefaults.cost} onChange={(e) => handlePricingDefaultChange('cost', e.target.value)} className={inputClass} placeholder="Per-unit cost" />
                </Field>
              </div>
            </Section>

            {/* VARIANTS */}
            <Section
              title="Variants"
              subtitle="Add option groups (Color, Size, Material) — the variant matrix generates automatically."
              actions={
                <button type="button" onClick={handleAddOptionGroup} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                  + Add option
                </button>
              }
            >
              <div className="space-y-3">
                {optionGroups.map((group, gi) => (
                  <div key={gi} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-center gap-2">
                      <input
                        value={group.name}
                        onChange={(e) => handleUpdateOptionGroup(gi, { name: e.target.value })}
                        placeholder="Option name (Color, Size...)"
                        className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                      <button type="button" onClick={() => handleRemoveOptionGroup(gi)} className="rounded p-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" title="Remove option">✕</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.values.map((value, vi) => (
                        <span key={vi} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                          {value}
                          <button type="button" onClick={() => handleUpdateOptionGroup(gi, { values: group.values.filter((_, i) => i !== vi) })} className="text-slate-400 hover:text-red-500">×</button>
                        </span>
                      ))}
                      <input
                        placeholder="Add value, press ↵"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            e.preventDefault();
                            handleUpdateOptionGroup(gi, { values: [...group.values, e.target.value.trim()] });
                            e.target.value = '';
                          }
                        }}
                        className="min-w-[120px] flex-1 rounded-md border border-dashed border-slate-300 bg-transparent px-2 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none dark:border-slate-700 dark:text-slate-200"
                      />
                    </div>
                  </div>
                ))}

                {variants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          <th className="px-2 py-2">Variant</th>
                          <th className="px-2 py-2">SKU</th>
                          <th className="px-2 py-2">Price</th>
                          <th className="px-2 py-2">Cost</th>
                          <th className="px-2 py-2">Barcode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v, vi) => (
                          <tr key={vi} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">{v.label || `Variant ${vi + 1}`}</td>
                            <td className="px-2 py-1.5"><input value={v.sku || ''} onChange={(e) => handleVariantField(vi, 'sku', e.target.value)} placeholder="Auto" className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950" /></td>
                            <td className="px-2 py-1.5"><input type="number" step="0.01" value={v.price || ''} onChange={(e) => handleVariantField(vi, 'price', e.target.value)} className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950" /></td>
                            <td className="px-2 py-1.5"><input type="number" step="0.01" value={v.cost || ''} onChange={(e) => handleVariantField(vi, 'cost', e.target.value)} className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950" /></td>
                            <td className="px-2 py-1.5"><input value={v.barcode || ''} onChange={(e) => handleVariantField(vi, 'barcode', e.target.value)} className="w-32 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </Section>

            {/* INVENTORY */}
            <Section title="Inventory" subtitle="Stock per variant per warehouse. Edit-mode changes record StockMovement rows.">
              {warehouses.length === 0 ? (
                <p className="text-xs text-slate-500">No warehouses configured.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <th className="px-2 py-2">Variant</th>
                        {warehouses.map((w) => (
                          <th key={w.id} className="px-2 py-2 text-right">{w.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, vi) => (
                        <tr key={vi} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">{v.label || `Variant ${vi + 1}`}</td>
                          {warehouses.map((w) => (
                            <td key={w.id} className="px-2 py-1.5 text-right">
                              <input
                                type="number"
                                value={v.stocks?.[w.id]?.quantity ?? ''}
                                onChange={(e) => handleStockChange(vi, w.id, e.target.value)}
                                placeholder="0"
                                className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-right text-xs dark:border-slate-700 dark:bg-slate-950"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* STOREFRONT / SEO */}
            <Section title="Search engine listing" subtitle="Storefront slug + SEO. Defaults derived from product name.">
              <div className="space-y-3">
                <Field label="Slug" hint="Used in the storefront URL. Lowercase + hyphens.">
                  <input value={draft.storefrontSlug} onChange={(e) => setDraft({ ...draft, storefrontSlug: e.target.value })} className={inputClass} placeholder="auto-generated-from-name" />
                </Field>
                <Field label="SEO title">
                  <input value={draft.storefrontSeoTitle} onChange={(e) => setDraft({ ...draft, storefrontSeoTitle: e.target.value })} className={inputClass} placeholder="Falls back to product title" />
                </Field>
                <Field label="SEO description">
                  <textarea value={draft.storefrontSeoDescription} onChange={(e) => setDraft({ ...draft, storefrontSeoDescription: e.target.value })} rows={3} className={inputClass} placeholder="Falls back to product description" />
                </Field>
              </div>
            </Section>
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="w-80 flex-shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</h3>
              <div className="mt-2 space-y-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="status" checked={draft.status === opt.value} onChange={() => setDraft({ ...draft, status: opt.value })} />
                    <span className="text-slate-800 dark:text-slate-200">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Publish to storefront</h3>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.publishedToStorefront} onChange={(e) => setDraft({ ...draft, publishedToStorefront: e.target.checked })} />
                <span className="text-slate-800 dark:text-slate-200">Visible on storefront</span>
              </label>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Organization</h3>
              <div className="mt-3 space-y-3">
                <Field label="Category">
                  <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className={inputClass}>
                    <option value="">Select…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Unit of measure">
                  <select value={draft.uomId} onChange={(e) => setDraft({ ...draft, uomId: e.target.value })} className={inputClass}>
                    <option value="">Select…</option>
                    {uoms.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </Field>
                <Field label="Vendor">
                  <input value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} className={inputClass} placeholder="Brand / supplier" />
                </Field>
                <Field label="Product type">
                  <input value={draft.productType} onChange={(e) => setDraft({ ...draft, productType: e.target.value })} className={inputClass} placeholder="T-shirt, mug, ..." />
                </Field>
                <Field label="Tags" hint="Comma-separated">
                  <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} className={inputClass} placeholder="summer, sale, new" />
                </Field>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Inventory summary</h3>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{totalStockUnits.toLocaleString()}</p>
              <p className="text-xs text-slate-500">units across all warehouses</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProductEditor;
