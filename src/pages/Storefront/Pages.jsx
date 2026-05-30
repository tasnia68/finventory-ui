import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getStorefrontThemeEditor,
  getStorefrontThemePreview,
  publishStorefrontTheme,
  restoreStorefrontThemeRevision,
  saveStorefrontThemeDraft,
} from '../../services/storefrontService';
import { getProductTemplates } from '../../services/productService';
import { getCategoryTree } from '../../services/categoryService';
import { getWarehouses } from '../../services/warehouseService';
import { useAuth } from '../../contexts/AuthContext';
import ImageField from '../../components/storefront/ImageField';
import RichTextField from '../../components/storefront/RichTextField';
import ViewportToggle from '../../components/storefront/ViewportToggle';
import useUndoRedo from '../../hooks/useUndoRedo';

const PREVIEW_URL_FALLBACK = import.meta.env.VITE_STOREFRONT_PREVIEW_URL || 'http://localhost:5174/preview';

const computePreviewUrl = (tenantSubdomain) => {
    if (typeof window === 'undefined') return PREVIEW_URL_FALLBACK;
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return PREVIEW_URL_FALLBACK;
    }
    const baseHost = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    const platformHost = baseHost.split('.').slice(-2).join('.');
    if (tenantSubdomain && tenantSubdomain !== 'platform') {
        return `${protocol}//${tenantSubdomain}.${platformHost}/preview`;
    }
    return `${protocol}//${platformHost}/preview`;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const flattenCategoryTree = (entries = []) => entries.flatMap((entry) => [
  entry,
  ...flattenCategoryTree(entry.children || []),
]);

const ShopifyCard = ({ title, subtitle, actions, children }) => (
  <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="text-base font-bold text-slate-950 dark:text-white">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
    <div className="mt-5">{children}</div>
  </div>
);

const FieldLabel = ({ children }) => (
  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{children}</span>
);

const reorderList = (items, fromIndex, toIndex) => {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const derivePreviewBlocks = (previewConfig, templateId, sectionId) => {
  const previewSection = previewConfig?.pages?.[templateId]?.sections?.find((section) => section.id === sectionId);
  if (!previewSection) {
    return [];
  }

  if (previewSection.type === 'featured_products') {
    const products = previewSection.resolvedProducts || [];
    const blockIds = previewSection.productBlockIds || [];
    return products.map((product, index) => ({
      id: blockIds[index] || `${previewSection.id}-product-${index + 1}`,
      type: 'dynamic_product_preview',
      label: product.name || `Product ${index + 1}`,
      enabled: true,
      derived: true,
      settings: {
        productSlug: product.slug || '',
        collection: product.collectionTitle || product.category || '',
        price: product.price ?? '',
      },
    }));
  }

  if (previewSection.type === 'featured_collections') {
    const collections = previewSection.collections || [];
    const blockIds = previewSection.collectionBlockIds || [];
    return collections.map((collection, index) => ({
      id: blockIds[index] || `${previewSection.id}-collection-${index + 1}`,
      type: 'dynamic_collection_preview',
      label: collection.title || `Collection ${index + 1}`,
      enabled: true,
      derived: true,
      settings: {
        collectionSlug: collection.slug || '',
        description: collection.caption || collection.description || '',
      },
    }));
  }

  return [];
};

const Pages = () => {
  const { user } = useAuth();
  const previewUrl = React.useMemo(() => computePreviewUrl(user?.tenantSubdomain), [user?.tenantSubdomain]);
  const [searchParams, setSearchParams] = useSearchParams();
  const iframeRef = React.useRef(null);
  const saveTimeoutRef = React.useRef(null);
  const readyRef = React.useRef(false);

  const [draft, setDraft] = React.useState(null);
  const [schema, setSchema] = React.useState(null);
  const [revisions, setRevisions] = React.useState([]);
  const [previewConfig, setPreviewConfig] = React.useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('settings');
  const [selectedSectionId, setSelectedSectionId] = React.useState('');
  const [selectedBlockId, setSelectedBlockId] = React.useState('');
  const [productOptions, setProductOptions] = React.useState([]);
  const [collectionOptions, setCollectionOptions] = React.useState([]);
  const [warehouseOptions, setWarehouseOptions] = React.useState([]);
  const [dragSectionId, setDragSectionId] = React.useState('');
  const [dragBlockId, setDragBlockId] = React.useState('');
  const [viewport, setViewport] = React.useState('desktop');
  const [status, setStatus] = React.useState('Loading theme editor…');

  React.useEffect(() => {
    let active = true;
    Promise.all([
      getStorefrontThemeEditor(),
      getStorefrontThemePreview(),
      getProductTemplates().catch(() => []),
      getCategoryTree().catch(() => []),
      getWarehouses().catch(() => []),
    ]).then(([editor, preview, templates, categories, warehouses]) => {
      if (!active) return;
      readyRef.current = false;
      setDraft(editor.draftThemeDocument);
      setSchema(editor.schema || {});
      setRevisions(editor.revisions || []);
      setPreviewConfig(preview);
      setProductOptions(
        templates.map((template) => ({
          value: template.storefrontSlug || template.slug || template.name,
          label: template.name,
        })).filter((item) => item.value),
      );
      setCollectionOptions(
        flattenCategoryTree(categories).map((category) => ({
          value: category.storefrontSlug || category.slug || category.name,
          label: category.name,
        })).filter((item) => item.value),
      );
      setWarehouseOptions(
        (Array.isArray(warehouses) ? warehouses : []).map((warehouse) => ({
          value: warehouse.id,
          label: warehouse.name,
        })).filter((item) => item.value),
      );
      setStatus('All changes auto-save to draft.');
      const templateParam = searchParams.get('template');
      const sectionParam = searchParams.get('section');
      const blockParam = searchParams.get('block');
      if (templateParam) {
        setSelectedTemplateId(templateParam);
        setSelectedSectionId(sectionParam || '');
        setSelectedBlockId(blockParam || '');
      }
      window.setTimeout(() => {
        readyRef.current = true;
      }, 0);
    });
    return () => {
      active = false;
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    const next = new URLSearchParams();
    if (selectedTemplateId && selectedTemplateId !== 'settings') {
      next.set('template', selectedTemplateId);
    }
    if (selectedSectionId) {
      next.set('section', selectedSectionId);
    }
    if (selectedBlockId) {
      next.set('block', selectedBlockId);
    }
    setSearchParams(next, { replace: true });
  }, [selectedTemplateId, selectedSectionId, selectedBlockId, setSearchParams]);

  const templateTree = schema?.templateTree || [];
  const currentTemplate = selectedTemplateId !== 'settings' ? draft?.templates?.[selectedTemplateId] : null;
  const currentSection = currentTemplate?.sections?.find((section) => section.id === selectedSectionId) || currentTemplate?.sections?.[0] || null;
  const previewOnlyBlocks = React.useMemo(
    () => derivePreviewBlocks(previewConfig, selectedTemplateId, currentSection?.id),
    [previewConfig, selectedTemplateId, currentSection?.id],
  );
  const currentSectionBlocks = React.useMemo(
    () => ([...(currentSection?.blocks || []), ...previewOnlyBlocks]),
    [currentSection?.blocks, previewOnlyBlocks],
  );
  const currentBlock = currentSectionBlocks.find((block) => block.id === selectedBlockId) || null;

  const postPreviewMessage = React.useCallback((message) => {
    iframeRef.current?.contentWindow?.postMessage(message, '*');
  }, []);

  const handleViewportChange = React.useCallback((id, width) => {
    setViewport(id);
    postPreviewMessage({ type: 'STOREFRONT_PREVIEW_VIEWPORT', viewport: id, width });
  }, [postPreviewMessage]);

  const undoRedo = useUndoRedo(draft, setDraft);

  React.useEffect(() => {
    const handleMessage = (event) => {
      const payload = event.data || {};
      if (payload.type === 'STOREFRONT_THEME_PREVIEW_READY' && previewConfig) {
        postPreviewMessage({ type: 'STOREFRONT_PREVIEW_CONFIG', config: previewConfig });
      }
      if (payload.type === 'STOREFRONT_PREVIEW_SELECT_NODE' && payload.nodeId) {
        const parts = String(payload.nodeId).split(':');
        if (parts.length >= 3) {
          setSelectedTemplateId(parts[1]);
          setSelectedSectionId(parts[2] || '');
          setSelectedBlockId(parts[3] || '');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [previewConfig, postPreviewMessage]);

  React.useEffect(() => {
    if (!previewConfig) {
      return;
    }
    postPreviewMessage({ type: 'STOREFRONT_PREVIEW_CONFIG', config: previewConfig });
  }, [previewConfig, postPreviewMessage]);

  React.useEffect(() => {
    const nodeId = selectedTemplateId === 'settings'
      ? ''
      : selectedBlockId
        ? `block:${selectedTemplateId}:${selectedSectionId}:${selectedBlockId}`
        : selectedSectionId
          ? `section:${selectedTemplateId}:${selectedSectionId}`
          : '';
    postPreviewMessage({ type: 'STOREFRONT_PREVIEW_SELECT', nodeId });
  }, [selectedTemplateId, selectedSectionId, selectedBlockId, postPreviewMessage]);

  React.useEffect(() => {
    if (!draft || !readyRef.current) {
      return;
    }
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(async () => {
      setStatus('Saving draft…');
      const saved = await saveStorefrontThemeDraft(draft);
      const preview = await getStorefrontThemePreview();
      setDraft(saved);
      setPreviewConfig(preview);
      setStatus('Draft saved.');
    }, 500);
  }, [draft]);

  const updateDraft = (updater) => {
    setDraft((current) => clone(typeof updater === 'function' ? updater(clone(current)) : updater));
  };

  const settingsGroups = schema?.settingsGroups || [];
  const sectionDefinitions = schema?.sectionDefinitions || {};
  const blockDefinitions = schema?.blockDefinitions || {};
  const templatePresets = schema?.templatePresets || {};

  const updateGroupField = (groupId, fieldId, value) => {
    updateDraft((current) => {
      current.settings[groupId] = { ...(current.settings[groupId] || {}), [fieldId]: value };
      if (groupId === 'site' && fieldId === 'templateKey') {
        current.templateKey = value;
      }
      return current;
    });
  };

  const updateSection = (templateId, sectionId, updater) => {
    updateDraft((current) => {
      const template = current.templates[templateId];
      template.sections = template.sections.map((section) => (section.id === sectionId ? updater(section) : section));
      return current;
    });
  };

  const updateBlock = (templateId, sectionId, blockId, updater) => {
    updateSection(templateId, sectionId, (section) => ({
      ...section,
      blocks: (section.blocks || []).map((block) => (block.id === blockId ? updater(block) : block)),
    }));
  };

  const addSection = (templateId, type) => {
    const definition = sectionDefinitions[type];
    updateDraft((current) => {
      current.templates[templateId].sections.push({
        id: createId(type),
        type,
        label: definition?.label || type,
        variant: 'default',
        enabled: true,
        groupType: definition?.group || 'body',
        settings: {},
        blocks: [],
      });
      return current;
    });
  };

  const moveSectionToGroup = (templateId, sectionId, newGroupType) => {
    updateDraft((current) => {
      current.templates[templateId].sections = current.templates[templateId].sections.map((section) =>
        section.id === sectionId ? { ...section, groupType: newGroupType } : section
      );
      return current;
    });
  };

  const getSectionGroupType = (section) => section?.groupType
    || sectionDefinitions[section?.type]?.group
    || 'body';

  const GROUP_ORDER = ['header', 'body', 'footer', 'aside'];
  const GROUP_LABEL = { header: 'Header', body: 'Body', footer: 'Footer', aside: 'Aside' };
  const GROUP_TINT = {
    header: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    body: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    footer: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    aside: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  };

  const bucketSectionsByGroup = (sections = []) => {
    const buckets = new Map(GROUP_ORDER.map((g) => [g, []]));
    sections.forEach((section) => {
      const groupType = getSectionGroupType(section);
      if (!buckets.has(groupType)) buckets.set(groupType, []);
      buckets.get(groupType).push(section);
    });
    return Array.from(buckets.entries())
      .filter(([, items]) => items.length > 0)
      .map(([groupType, items]) => ({ groupType, items }));
  };

  const duplicateSection = (templateId, section) => {
    updateDraft((current) => {
      current.templates[templateId].sections.push({
        ...clone(section),
        id: createId(section.type),
        label: `${section.label} copy`,
      });
      return current;
    });
  };

  const removeSection = (templateId, sectionId) => {
    updateDraft((current) => {
      current.templates[templateId].sections = current.templates[templateId].sections.filter((section) => section.id !== sectionId);
      return current;
    });
    setSelectedSectionId('');
    setSelectedBlockId('');
  };

  const addBlock = (templateId, sectionId, blockType) => {
    const definition = blockDefinitions[blockType];
    updateSection(templateId, sectionId, (section) => ({
      ...section,
      blocks: [
        ...(section.blocks || []),
        { id: createId(blockType), type: blockType, label: definition?.label || blockType, enabled: true, settings: {} },
      ],
    }));
  };

  const duplicateBlock = (templateId, sectionId, block) => {
    updateSection(templateId, sectionId, (section) => ({
      ...section,
      blocks: [...(section.blocks || []), { ...clone(block), id: createId(block.type), label: `${block.label} copy` }],
    }));
  };

  const removeBlock = (templateId, sectionId, blockId) => {
    updateSection(templateId, sectionId, (section) => ({
      ...section,
      blocks: (section.blocks || []).filter((block) => block.id !== blockId),
    }));
    setSelectedBlockId('');
  };

  const renderField = (field, value, onChange) => {
    const commonClassName = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950';
    if (field.type === 'textarea') {
      return <textarea rows={3} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={commonClassName} />;
    }
    if (field.type === 'select') {
      return (
        <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={commonClassName}>
          {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      );
    }
    if (field.type === 'toggle') {
      return (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold ${value ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
        >
          {value ? 'Enabled' : 'Disabled'}
        </button>
      );
    }
    if (field.type === 'color') {
      return <input type="color" value={value || '#000000'} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950" />;
    }
    if (field.type === 'number') {
      return <input type="number" value={value ?? ''} onChange={(event) => onChange(Number(event.target.value) || 0)} className={commonClassName} />;
    }
    if (field.type === 'image') {
      return <ImageField value={value ?? ''} onChange={onChange} />;
    }
    if (field.type === 'richtext') {
      return <RichTextField value={value ?? ''} onChange={onChange} />;
    }
    if (field.type === 'url') {
      return <input type="url" value={value ?? ''} onChange={(event) => onChange(event.target.value)} placeholder="https://…" className={commonClassName} />;
    }
    if (field.type === 'video') {
      return <input type="url" value={value ?? ''} onChange={(event) => onChange(event.target.value)} placeholder="https://…/video.mp4 or youtube URL" className={commonClassName} />;
    }
    if (field.type === 'entity_product') {
      return (
        <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={commonClassName}>
          <option value="">Select a product</option>
          {productOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      );
    }
    if (field.type === 'entity_collection') {
      return (
        <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={commonClassName}>
          <option value="">Select a collection</option>
          {collectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      );
    }
    if (field.type === 'entity_warehouse') {
      return (
        <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={commonClassName}>
          <option value="">Default warehouse</option>
          {warehouseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      );
    }
    return <input type="text" value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={commonClassName} />;
  };

  if (!draft || !schema) {
    return <div className="h-full overflow-hidden bg-slate-50 dark:bg-slate-950" />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <section className="flex flex-1 overflow-hidden">
        <div className="mx-auto flex w-full max-w-[1920px] flex-1 overflow-hidden xl:grid xl:gap-0 xl:grid-cols-[320px_minmax(0,1fr)_minmax(420px,560px)]">
          <div className="space-y-5 overflow-y-auto border-r border-slate-200 px-6 py-6 dark:border-slate-800">
            <ShopifyCard title="Theme editor" subtitle={status}>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId('settings');
                    setSelectedSectionId('');
                    setSelectedBlockId('');
                  }}
                  className={`flex w-full items-center justify-between rounded-[18px] border px-4 py-4 text-left ${selectedTemplateId === 'settings' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}
                >
                  <span className="text-sm font-bold text-slate-950 dark:text-white">Theme settings</span>
                </button>

                {templateTree.filter((item) => item.id !== 'settings').map((node) => {
                  const template = draft.templates[node.id];
                  return (
                    <div key={node.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(node.id);
                          setSelectedSectionId(template?.sections?.[0]?.id || '');
                          setSelectedBlockId('');
                        }}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-sm font-bold text-slate-950 dark:text-white">{node.label}</span>
                        <span className="text-xs text-slate-400">{template?.sections?.length || 0} sections</span>
                      </button>
                      <div className="mt-3 space-y-4">
                        {bucketSectionsByGroup(template?.sections || []).map(({ groupType, items }) => (
                          <div key={groupType}>
                            <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${GROUP_TINT[groupType] || 'bg-slate-100 text-slate-600'}`}>
                              <span>{GROUP_LABEL[groupType] || groupType}</span>
                              <span className="opacity-60">·</span>
                              <span>{items.length}</span>
                            </div>
                            <div className="space-y-2">
                              {items.map((section, indexInGroup) => (
                                <div key={section.id} className="group relative">
                                  <button
                                    type="button"
                                    draggable
                                    onDragStart={() => setDragSectionId(section.id)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={() => {
                                      if (!dragSectionId || dragSectionId === section.id) return;
                                      updateDraft((current) => {
                                        const templateState = current.templates[node.id];
                                        const fromIndex = templateState.sections.findIndex((item) => item.id === dragSectionId);
                                        const toIndex = templateState.sections.findIndex((item) => item.id === section.id);
                                        // Crossing groups: assign target's groupType to the dragged section.
                                        const dragged = templateState.sections[fromIndex];
                                        if (dragged && getSectionGroupType(dragged) !== groupType) {
                                          dragged.groupType = groupType;
                                        }
                                        templateState.sections = reorderList(templateState.sections, fromIndex, toIndex);
                                        return current;
                                      });
                                      setDragSectionId('');
                                    }}
                                    onClick={() => {
                                      setSelectedTemplateId(node.id);
                                      setSelectedSectionId(section.id);
                                      setSelectedBlockId('');
                                    }}
                                    className={`flex w-full items-center justify-between rounded-[16px] border px-3 py-3 text-left ${selectedSectionId === section.id && selectedTemplateId === node.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{section.label}</div>
                                      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">#{indexInGroup + 1} · {section.type}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={getSectionGroupType(section)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          moveSectionToGroup(node.id, section.id, e.target.value);
                                        }}
                                        title="Move to group"
                                        className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 opacity-0 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950"
                                      >
                                        {GROUP_ORDER.map((g) => (
                                          <option key={g} value={g}>{GROUP_LABEL[g]}</option>
                                        ))}
                                      </select>
                                      <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${section.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                        {section.enabled ? 'ON' : 'OFF'}
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(templatePresets[node.id] || []).map((preset) => (
                          <button
                            key={`${node.id}-${preset.type}`}
                            type="button"
                            onClick={() => addSection(node.id, preset.type)}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                          >
                            Add {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ShopifyCard>

            <ShopifyCard
              title="Revisions"
              subtitle="Immutable published snapshots"
              actions={(
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={undoRedo.undo}
                    disabled={!undoRedo.canUndo}
                    title="Undo (⌘Z)"
                    className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"
                  >
                    ↶ Undo
                  </button>
                  <button
                    type="button"
                    onClick={undoRedo.redo}
                    disabled={!undoRedo.canRedo}
                    title="Redo (⌘⇧Z)"
                    className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"
                  >
                    ↷ Redo
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const published = await publishStorefrontTheme({ note: 'Published from theme editor' });
                      const next = await getStorefrontThemeEditor();
                      setRevisions(next.revisions || []);
                      setStatus(`Published ${published.label}.`);
                    }}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                  >
                    Publish draft
                  </button>
                </div>
              )}
            >
              <div className="space-y-3">
                {revisions.map((revision) => (
                  <div key={revision.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{revision.label}</div>
                        <div className="mt-1 text-xs text-slate-400">{revision.publishedAt}</div>
                        {revision.note ? <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{revision.note}</div> : null}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await restoreStorefrontThemeRevision(revision.id, { note: `Restored ${revision.label}` });
                          const next = await getStorefrontThemeEditor();
                          const preview = await getStorefrontThemePreview();
                          setDraft(next.draftThemeDocument);
                          setRevisions(next.revisions || []);
                          setPreviewConfig(preview);
                          setStatus(`Restored ${revision.label}.`);
                        }}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ShopifyCard>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-6">
            {selectedTemplateId === 'settings' ? (
              <ShopifyCard title="Theme settings" subtitle="Brand, theme tokens, and storefront-wide behavior">
                <div className="space-y-6">
                  {settingsGroups.map((group) => (
                    <div key={group.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{group.label}</div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {(group.fields || []).map((field) => (
                          <label key={field.id} className={`block ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                            <FieldLabel>{field.label}</FieldLabel>
                            {renderField(field, draft.settings?.[group.id]?.[field.id], (value) => updateGroupField(group.id, field.id, value))}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ShopifyCard>
            ) : currentTemplate ? (
              <>
                {currentSection ? (
                  <ShopifyCard
                    title={currentSection.label}
                    subtitle={`${currentTemplate.label} · ${currentSection.type}`}
                    actions={(
                      <>
                        <button type="button" onClick={() => updateSection(selectedTemplateId, currentSection.id, (section) => ({ ...section, enabled: !section.enabled }))} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{currentSection.enabled ? 'Hide section' : 'Show section'}</button>
                        <button type="button" onClick={() => duplicateSection(selectedTemplateId, currentSection)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Duplicate</button>
                        <button type="button" onClick={() => removeSection(selectedTemplateId, currentSection.id)} className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:text-rose-300">Remove</button>
                      </>
                    )}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <FieldLabel>Section label</FieldLabel>
                        <input value={currentSection.label || ''} onChange={(event) => updateSection(selectedTemplateId, currentSection.id, (section) => ({ ...section, label: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
                      </label>
                      <label className="block">
                        <FieldLabel>Variant</FieldLabel>
                        <input value={currentSection.variant || ''} onChange={(event) => updateSection(selectedTemplateId, currentSection.id, (section) => ({ ...section, variant: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
                      </label>
                      {(sectionDefinitions[currentSection.type]?.settings || []).map((field) => (
                        <label key={field.id} className={`block ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                          <FieldLabel>{field.label}</FieldLabel>
                          {renderField(field, currentSection.settings?.[field.id], (value) => updateSection(selectedTemplateId, currentSection.id, (section) => ({
                            ...section,
                            settings: { ...(section.settings || {}), [field.id]: value },
                          })))}
                        </label>
                      ))}
                    </div>
                  </ShopifyCard>
                ) : null}

                {currentSection ? (
                  <ShopifyCard
                    title="Blocks"
                    subtitle="Section content blocks"
                    actions={(
                      <div className="flex flex-wrap gap-2">
                        {(sectionDefinitions[currentSection.type]?.blockTypes || []).map((blockType) => (
                          <button key={blockType} type="button" onClick={() => addBlock(selectedTemplateId, currentSection.id, blockType)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                            Add {(blockDefinitions[blockType]?.label || blockType)}
                          </button>
                        ))}
                      </div>
                    )}
                  >
                    <div className="space-y-3">
                      {currentSectionBlocks.map((block, index) => (
                        <div
                          key={block.id}
                          draggable={!block.derived}
                          onDragStart={() => {
                            if (!block.derived) {
                              setDragBlockId(block.id);
                            }
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (block.derived) return;
                            if (!dragBlockId || dragBlockId === block.id) return;
                            updateSection(selectedTemplateId, currentSection.id, (section) => {
                              const fromIndex = (section.blocks || []).findIndex((item) => item.id === dragBlockId);
                              const toIndex = (section.blocks || []).findIndex((item) => item.id === block.id);
                              return { ...section, blocks: reorderList(section.blocks || [], fromIndex, toIndex) };
                            });
                            setDragBlockId('');
                          }}
                          onClick={() => setSelectedBlockId(block.id)}
                            className={`rounded-[18px] border p-4 transition ${selectedBlockId === block.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-bold text-slate-900 dark:text-white">{block.label || blockDefinitions[block.type]?.label || block.type}</div>
                              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">#{index + 1} · {block.type}{block.derived ? ' · preview' : ''}</div>
                            </div>
                            {block.derived ? (
                              <div className="rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:text-blue-300">
                                Dynamic source
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button type="button" onClick={(event) => { event.stopPropagation(); updateBlock(selectedTemplateId, currentSection.id, block.id, (current) => ({ ...current, enabled: !current.enabled })); }} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{block.enabled ? 'Hide' : 'Show'}</button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); duplicateBlock(selectedTemplateId, currentSection.id, block); }} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Duplicate</button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); removeBlock(selectedTemplateId, currentSection.id, block.id); }} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:text-rose-300">Remove</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ShopifyCard>
                ) : null}

                {currentBlock ? (
                  <ShopifyCard title={currentBlock.label || blockDefinitions[currentBlock.type]?.label || currentBlock.type} subtitle="Block settings">
                    {currentBlock.derived ? (
                      <div className="space-y-4">
                        <div className="rounded-[18px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                          This item comes from the section&apos;s dynamic source. Change the section source, collection, limit, or manual block list to affect what appears here.
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {Object.entries(currentBlock.settings || {}).map(([key, value]) => (
                            <div key={key} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{key}</div>
                              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{String(value || '—')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {(blockDefinitions[currentBlock.type]?.settings || []).map((field) => (
                          <label key={field.id} className={`block ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                            <FieldLabel>{field.label}</FieldLabel>
                            {renderField(field, currentBlock.settings?.[field.id], (value) => updateBlock(selectedTemplateId, currentSection.id, currentBlock.id, (block) => ({
                              ...block,
                              settings: { ...(block.settings || {}), [field.id]: value },
                            })))}
                          </label>
                        ))}
                      </div>
                    )}
                  </ShopifyCard>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="space-y-5 overflow-y-auto border-l border-slate-200 px-6 py-6 dark:border-slate-800">
            <ShopifyCard
              title="Live preview"
              subtitle="Real storefront iframe powered by the draft theme document"
              actions={(
                <ViewportToggle value={viewport} onChange={handleViewportChange} />
              )}
            >
              <div className="rounded-[22px] border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-950">
                <div className={`mx-auto overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${viewport === 'mobile' ? 'max-w-[390px]' : viewport === 'tablet' ? 'max-w-[820px]' : 'max-w-full'}`}>
                  <iframe ref={iframeRef} title="Storefront preview" src={previewUrl} className="w-full border-0 h-[calc(100vh-220px)] min-h-[600px]" />
                </div>
              </div>
            </ShopifyCard>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pages;
