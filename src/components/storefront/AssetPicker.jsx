import React, { useEffect, useRef, useState } from 'react';
import { uploadStorefrontAsset } from '../../services/storefrontService';

const RECENT_KEY = 'sf-asset-picker-recents';
const MAX_RECENTS = 24;

const loadRecents = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistRecents = (urls) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(urls.slice(0, MAX_RECENTS)));
  } catch {
    /* ignore */
  }
};

const AssetPicker = ({ open, onClose, onSelect, assetType = 'misc', initialValue = '' }) => {
  const fileInputRef = useRef(null);
  const [recents, setRecents] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [manualUrl, setManualUrl] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
      setManualUrl(initialValue);
      setError('');
    }
  }, [open, initialValue]);

  if (!open) return null;

  const handleSelect = (url) => {
    if (!url) return;
    const next = [url, ...recents.filter((r) => r !== url)].slice(0, MAX_RECENTS);
    setRecents(next);
    persistRecents(next);
    onSelect(url);
    onClose();
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadStorefrontAsset(file, assetType);
      const url = result?.url || result?.assetUrl || result?.path || '';
      if (!url) throw new Error('Upload succeeded but no URL returned.');
      handleSelect(url);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Select an asset</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >✕</button>
        </div>

        <div className="mb-4">
          <label className="block">
            <span className="text-sm font-semibold">Paste a URL</span>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://…"
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={() => handleSelect(manualUrl)}
                disabled={!manualUrl}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
              >
                Use
              </button>
            </div>
          </label>
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-2xl border-2 border-dashed border-slate-300 px-4 py-8 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            {uploading ? 'Uploading…' : 'Click to upload a new file'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFile}
            className="hidden"
          />
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        {recents.length > 0 ? (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Recently used</h3>
            <div className="grid max-h-72 grid-cols-4 gap-3 overflow-y-auto">
              {recents.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => handleSelect(url)}
                  className="overflow-hidden rounded-2xl border border-slate-200 hover:border-slate-500 dark:border-slate-700"
                >
                  <img src={url} alt="" className="h-24 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No recent assets yet — upload one or paste a URL above.</p>
        )}
      </div>
    </div>
  );
};

export default AssetPicker;
