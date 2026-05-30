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

// Flat section header used inside the slim inspector panel (no card chrome).
const InspectorSection = ({ title, actions, children }) => (
  <div className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{title}</div>
      {actions ? <div className="flex flex-wrap gap-1">{actions}</div> : null}
    </div>
    <div className="px-4 pb-4">{children}</div>
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

  const handlePublish = async () => {
    const published = await publishStorefrontTheme({ note: 'Published from theme editor' });
    const next = await getStorefrontThemeEditor();
    setRevisions(next.revisions || []);
    setStatus(`Published ${published.label}.`);
  };

  const activePageLabel = templateTree.find((n) => n.id === selectedTemplateId)?.label || 'Theme settings';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Top bar — Shopify-style: theme name + page selector + viewport + undo/redo + Save */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Boutique</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Live</span>
          {status ? <span className="truncate text-xs text-slate-500 dark:text-slate-400">{status}</span> : null}
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 dark:text-white">{activePageLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <ViewportToggle value={viewport} onChange={handleViewportChange} />
          <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={undoRedo.undo}
            disabled={!undoRedo.canUndo}
            title="Undo (⌘Z)"
            className="rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
          >↶</button>
          <button
            type="button"
            onClick={undoRedo.redo}
            disabled={!undoRedo.canRedo}
            title="Redo (⌘⇧Z)"
            className="rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
          >↷</button>
          <button
            type="button"
            onClick={handlePublish}
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >Save</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — flat section tree, Shopify-style */}
        <aside className="flex w-72 flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex-shrink-0 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Sections</div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{activePageLabel}</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedTemplateId('settings');
                setSelectedSectionId('');
                setSelectedBlockId('');
              }}
              className={`flex w-full items-center gap-2 border-l-2 px-4 py-2.5 text-left text-sm ${selectedTemplateId === 'settings' ? 'border-blue-500 bg-blue-50 font-semibold text-blue-900 dark:bg-blue-950/30 dark:text-blue-100' : 'border-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}`}
            >
              <span aria-hidden>⚙</span><span>Theme settings</span>
            </button>

            {templateTree.filter((item) => item.id !== 'settings').map((node) => {
              const template = draft.templates[node.id];
              return (
                <div key={node.id} className="border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(node.id);
                      setSelectedSectionId('');
                      setSelectedBlockId('');
                    }}
                    className="flex w-full items-center justify-between px-4 py-2 text-left"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{node.label}</span>
                    <span className="text-[10px] text-slate-400">{template?.sections?.length || 0}</span>
                  </button>
                  {bucketSectionsByGroup(template?.sections || []).map(({ groupType, items }) => (
                    <div key={groupType}>
                      {items.length > 0 ? (
                        <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{GROUP_LABEL[groupType] || groupType}</div>
                      ) : null}
                      {items.map((section) => {
                        const isSelected = selectedSectionId === section.id && selectedTemplateId === node.id;
                        return (
                          <button
                            key={section.id}
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
                            className={`flex w-full items-center gap-2 border-l-2 pl-8 pr-4 py-2 text-left text-sm ${isSelected ? 'border-blue-500 bg-blue-50 font-semibold text-blue-900 dark:bg-blue-950/30 dark:text-blue-100' : 'border-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'} ${section.enabled === false ? 'opacity-50' : ''}`}
                          >
                            <span aria-hidden className="text-slate-400">▢</span>
                            <span className="flex-1 truncate">{section.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  {/* Add section pill */}
                  <details className="group/add px-4 py-2">
                    <summary className="cursor-pointer list-none text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                      + Add section
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(templatePresets[node.id] || []).map((preset) => (
                        <button
                          key={`${node.id}-${preset.type}`}
                          type="button"
                          onClick={() => addSection(node.id, preset.type)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER — full-bleed preview canvas */}
        <main className="flex flex-1 flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
          <div className="flex flex-1 items-start justify-center overflow-auto p-6">
            <div
              className={`shadow-2xl rounded-lg overflow-hidden bg-white ring-1 ring-slate-200 dark:ring-slate-700 transition-all ${
                viewport === 'mobile' ? 'w-[390px] h-[844px]'
                : viewport === 'tablet' ? 'w-[820px] h-[1180px]'
                : 'w-full h-[calc(100vh-128px)] min-h-[600px]'
              }`}
            >
              <iframe ref={iframeRef} title="Storefront preview" src={previewUrl} className="w-full h-full border-0" />
            </div>
          </div>
        </main>

        {/* RIGHT — contextual inspector */}
        <aside className="flex w-[360px] flex-shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {selectedTemplateId === 'settings' ? (
            <>
              <div className="flex-shrink-0 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="text-base font-semibold text-slate-900 dark:text-white">Theme settings</div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Brand, tokens, storefront-wide</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {settingsGroups.map((group) => (
                  <InspectorSection key={group.id} title={group.label}>
                    <div className="space-y-4">
                      {(group.fields || []).map((field) => (
                        <label key={field.id} className="block">
                          <FieldLabel>{field.label}</FieldLabel>
                          {renderField(field, draft.settings?.[group.id]?.[field.id], (value) => updateGroupField(group.id, field.id, value))}
                        </label>
                      ))}
                    </div>
                  </InspectorSection>
                ))}
              </div>
            </>
          ) : currentTemplate && currentSection ? (
            <>
              <div className="flex-shrink-0 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{currentTemplate.label} · {currentSection.type}</div>
                <div className="mt-0.5 truncate text-base font-semibold text-slate-900 dark:text-white">{currentSection.label}</div>
                <div className="mt-2 flex gap-1">
                  <button type="button" onClick={() => updateSection(selectedTemplateId, currentSection.id, (section) => ({ ...section, enabled: !section.enabled }))} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                    {currentSection.enabled ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" onClick={() => duplicateSection(selectedTemplateId, currentSection)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                    Duplicate
                  </button>
                  <button type="button" onClick={() => removeSection(selectedTemplateId, currentSection.id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300">
                    Remove
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <InspectorSection title="Content">
                  <div className="space-y-4">
                    <label className="block">
                      <FieldLabel>Section label</FieldLabel>
                      <input value={currentSection.label || ''} onChange={(event) => updateSection(selectedTemplateId, currentSection.id, (section) => ({ ...section, label: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                    </label>
                    {(sectionDefinitions[currentSection.type]?.settings || []).map((field) => (
                      <label key={field.id} className="block">
                        <FieldLabel>{field.label}</FieldLabel>
                        {renderField(field, currentSection.settings?.[field.id], (value) => updateSection(selectedTemplateId, currentSection.id, (section) => ({
                          ...section,
                          settings: { ...(section.settings || {}), [field.id]: value },
                        })))}
                      </label>
                    ))}
                  </div>
                </InspectorSection>

                {(sectionDefinitions[currentSection.type]?.blockTypes || []).length > 0 || currentSectionBlocks.length > 0 ? (
                  <InspectorSection
                    title="Blocks"
                    actions={(sectionDefinitions[currentSection.type]?.blockTypes || []).map((blockType) => (
                      <button key={blockType} type="button" onClick={() => addBlock(selectedTemplateId, currentSection.id, blockType)} className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                        + {(blockDefinitions[blockType]?.label || blockType)}
                      </button>
                    ))}
                  >
                    <div className="space-y-1.5">
                      {currentSectionBlocks.map((block, index) => (
                        <div
                          key={block.id}
                          draggable={!block.derived}
                          onDragStart={() => { if (!block.derived) setDragBlockId(block.id); }}
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
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${selectedBlockId === block.id ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-slate-900 dark:text-white">{block.label || blockDefinitions[block.type]?.label || block.type}</div>
                            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{block.type}{block.derived ? ' · dynamic' : ''}</div>
                          </div>
                          {!block.derived ? (
                            <div className="flex gap-1">
                              <button type="button" onClick={(event) => { event.stopPropagation(); duplicateBlock(selectedTemplateId, currentSection.id, block); }} className="rounded p-1 text-[10px] text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" title="Duplicate">⎘</button>
                              <button type="button" onClick={(event) => { event.stopPropagation(); removeBlock(selectedTemplateId, currentSection.id, block.id); }} className="rounded p-1 text-[10px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Remove">✕</button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </InspectorSection>
                ) : null}

                {currentBlock ? (
                  <InspectorSection title={`Block — ${currentBlock.label || blockDefinitions[currentBlock.type]?.label || currentBlock.type}`}>
                    {currentBlock.derived ? (
                      <div className="space-y-3">
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                          From the section&apos;s dynamic source. Adjust the source above to change this.
                        </div>
                        {Object.entries(currentBlock.settings || {}).map(([key, value]) => (
                          <div key={key}>
                            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{key}</div>
                            <div className="text-sm text-slate-900 dark:text-white">{String(value || '—')}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(blockDefinitions[currentBlock.type]?.settings || []).map((field) => (
                          <label key={field.id} className="block">
                            <FieldLabel>{field.label}</FieldLabel>
                            {renderField(field, currentBlock.settings?.[field.id], (value) => updateBlock(selectedTemplateId, currentSection.id, currentBlock.id, (block) => ({
                              ...block,
                              settings: { ...(block.settings || {}), [field.id]: value },
                            })))}
                          </label>
                        ))}
                      </div>
                    )}
                  </InspectorSection>
                ) : null}
              </div>
            </>
          ) : currentTemplate ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">{currentTemplate.label}</div>
              <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Pick a section</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Select a section from the left to edit its content here.</p>
              <div className="mt-6 space-y-2 text-left text-xs text-slate-500 dark:text-slate-400">
                <div className="flex justify-between gap-4"><span>Undo</span><kbd className="rounded border border-slate-300 px-1.5 text-[10px] dark:border-slate-700">⌘Z</kbd></div>
                <div className="flex justify-between gap-4"><span>Redo</span><kbd className="rounded border border-slate-300 px-1.5 text-[10px] dark:border-slate-700">⌘⇧Z</kbd></div>
              </div>
            </div>
          ) : null}

          {/* Revisions footer (always visible at bottom of inspector) */}
          {revisions.length > 0 ? (
            <div className="flex-shrink-0 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <details>
                <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{revisions.length} revisions</summary>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {revisions.slice(0, 8).map((revision) => (
                    <div key={revision.id} className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900 dark:text-white">{revision.label}</div>
                        <div className="truncate text-[10px] text-slate-400">{revision.publishedAt}</div>
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
                        className="rounded text-[10px] text-blue-600 hover:underline dark:text-blue-400"
                      >Restore</button>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
};

export default Pages;
