import React, { useCallback, useEffect, useState } from 'react';
import {
  getStorefrontThemeEditor,
  saveStorefrontThemeDraft,
} from '../../services/storefrontService';

const generateId = () => `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const findSection = (draft, templateId, sectionType) => {
  const template = draft?.templates?.[templateId];
  if (!template) return null;
  return template.sections?.find((s) => s.type === sectionType) || null;
};

const replaceBlocks = (draft, templateId, sectionType, newBlocks) => {
  const next = JSON.parse(JSON.stringify(draft));
  const template = next.templates?.[templateId];
  if (!template) return next;
  const section = template.sections?.find((s) => s.type === sectionType);
  if (!section) return next;
  section.blocks = newBlocks;
  return next;
};

const MenuGroup = ({ title, description, blockType, items, onChange }) => {
  const [dragIndex, setDragIndex] = useState(null);

  const addItem = () => {
    onChange([...items, { id: generateId(), type: blockType, label: '', enabled: true, settings: { label: '', href: '/' } }]);
  };

  const updateItem = (idx, field, value) => {
    const next = items.map((item, i) =>
      i === idx ? { ...item, settings: { ...item.settings, [field]: value } } : item,
    );
    onChange(next);
  };

  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const moveItem = (from, to) => {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {items.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">No items yet. Click "Add link" to get started.</div>
        )}
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-4 py-2.5 group ${dragIndex === idx ? 'opacity-50' : ''}`}
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { moveItem(dragIndex, idx); setDragIndex(null); }}
          >
            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 cursor-grab text-base select-none" style={{ fontSize: '18px' }}>drag_indicator</span>
            <input
              type="text"
              value={item.settings?.label || ''}
              onChange={(e) => updateItem(idx, 'label', e.target.value)}
              placeholder="Label"
              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={item.settings?.href || ''}
              onChange={(e) => updateItem(idx, 'href', e.target.value)}
              placeholder="/path or https://..."
              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          + Add link
        </button>
      </div>
    </div>
  );
};

const StorefrontMenus = () => {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    getStorefrontThemeEditor()
      .then((data) => setDraft(data?.themeDocument || null))
      .catch(() => setDraft(null))
      .finally(() => setLoading(false));
  }, []);

  const headerNavBlocks = findSection(draft, 'header', 'header_nav')?.blocks || [];
  const footerLinkBlocks = findSection(draft, 'footer', 'footer_links')?.blocks || [];

  const setHeaderNavBlocks = useCallback((newBlocks) => {
    setDraft((prev) => replaceBlocks(prev, 'header', 'header_nav', newBlocks));
  }, []);

  const setFooterLinkBlocks = useCallback((newBlocks) => {
    setDraft((prev) => replaceBlocks(prev, 'footer', 'footer_links', newBlocks));
  }, []);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setFeedback('');
    try {
      await saveStorefrontThemeDraft(draft);
      setFeedback('Menus saved as draft. Publish to make them live.');
    } catch {
      setFeedback('Failed to save menus.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading menus…</div>;
  }

  if (!draft) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">No theme draft found. Create a theme first.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Menus</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage navigation links for your storefront header and footer. Drag to reorder.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save menus'}
        </button>
      </div>

      {feedback && (
        <div className={`text-sm px-3 py-2 rounded ${feedback.includes('Failed') ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'}`}>
          {feedback}
        </div>
      )}

      <MenuGroup
        title="Main menu"
        description="Links shown in the storefront header navigation bar."
        blockType="nav_link"
        items={headerNavBlocks}
        onChange={setHeaderNavBlocks}
      />

      <MenuGroup
        title="Footer menu"
        description="Links shown in the storefront footer."
        blockType="footer_link"
        items={footerLinkBlocks}
        onChange={setFooterLinkBlocks}
      />
    </div>
  );
};

export default StorefrontMenus;
