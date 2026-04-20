import React, { useEffect, useState, useCallback } from 'react';
import {
  getStorefrontCmsPages,
  createStorefrontCmsPage,
  updateStorefrontCmsPage,
  deleteStorefrontCmsPage,
} from '../../services/storefrontService';

const empty = { title: '', slug: '', body: '', published: false };

const formatDateTime = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

const StorefrontPagesManager = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [feedback, setFeedback] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getStorefrontCmsPages()
      .then((data) => setPages(Array.isArray(data) ? data : []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  const openNew = () => {
    setEditing('new');
    setForm(empty);
  };

  const openEdit = (page) => {
    setEditing(page.id);
    setForm({ title: page.title, slug: page.slug, body: page.body || '', published: page.published });
  };

  const close = () => { setEditing(null); setForm(empty); };

  const autoSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setForm((prev) => ({
      ...prev,
      title,
      slug: editing === 'new' ? autoSlug(title) : prev.slug,
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      if (editing === 'new') {
        await createStorefrontCmsPage(form);
        flash('Page created');
      } else {
        await updateStorefrontCmsPage(editing, form);
        flash('Page updated');
      }
      close();
      load();
    } catch (err) {
      flash(err?.message || 'Failed to save', false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await deleteStorefrontCmsPage(id);
      flash('Page deleted');
      setConfirmDelete(null);
      load();
    } catch (err) {
      flash(err?.message || 'Failed to delete', false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Content Pages</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage custom storefront pages (policies, about, etc.)
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New page
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${feedback.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
          {feedback.msg}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading pages…</div>
      ) : pages.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No content pages yet. Create your first page.</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">/{p.slug}</td>
                  <td className="px-4 py-3">
                    {p.published ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Published
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDateTime(p.updatedAt)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(p)} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 text-xs font-medium">Edit</button>
                    <button onClick={() => setConfirmDelete(p.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete page?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editing === 'new' ? 'New page' : 'Edit page'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={handleTitleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Refund Policy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. refund-policy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                  rows={10}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Page content (HTML supported)…"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Published
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={close} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.slug.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition"
              >
                {saving ? 'Saving…' : editing === 'new' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorefrontPagesManager;
