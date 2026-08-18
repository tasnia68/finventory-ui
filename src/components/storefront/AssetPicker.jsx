import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteStorefrontAsset,
  listStorefrontAssets,
  resolveStorefrontAssetUrl,
  uploadStorefrontAsset,
} from '../../services/storefrontService';

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
  const [library, setLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError('');
    try {
      const assets = await listStorefrontAssets();
      setLibrary(Array.isArray(assets) ? assets : []);
    } catch (err) {
      setLibraryError(err.message || 'Could not load the media library.');
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
      setManualUrl(initialValue);
      setError('');
      loadLibrary();
    }
  }, [open, initialValue, loadLibrary]);

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
      // StorefrontAssetUploadDto: { assetType, filename, storagePath, publicUrl }
      const url = result?.publicUrl || result?.url || result?.assetUrl || result?.path || '';
      if (!url) throw new Error('Upload succeeded but no URL returned.');
      loadLibrary();
      handleSelect(url);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (asset) => {
    const confirmed = window.confirm(
      `Delete ${asset.filename}? Sections still using this image will show a broken image.`,
    );
    if (!confirmed) return;
    try {
      await deleteStorefrontAsset(asset.storagePath);
      loadLibrary();
    } catch (err) {
      setLibraryError(err.message || 'Could not delete the asset.');
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

        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Media library</h3>
            <button
              type="button"
              onClick={loadLibrary}
              disabled={libraryLoading}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-40 dark:hover:text-white"
            >
              {libraryLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {libraryError ? <p className="mb-2 text-sm text-red-600">{libraryError}</p> : null}

          {libraryLoading && library.length === 0 ? (
            <p className="text-sm text-slate-500">Loading your uploaded assets…</p>
          ) : null}

          {!libraryLoading && library.length === 0 && !libraryError ? (
            <p className="text-sm text-slate-500">
              Nothing uploaded yet — upload a file above and it will appear here.
            </p>
          ) : null}

          {library.length > 0 ? (
            <div className="grid max-h-72 grid-cols-4 gap-3 overflow-y-auto">
              {library.map((asset) => (
                <div
                  key={asset.storagePath}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(asset.publicUrl)}
                    className="block w-full text-left hover:opacity-90"
                    title={asset.filename}
                  >
                    <img
                      src={resolveStorefrontAssetUrl(asset.publicUrl)}
                      alt=""
                      className="h-24 w-full object-cover"
                    />
                    <span className="block truncate px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {asset.filename}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(asset);
                    }}
                    className="absolute right-1 top-1 hidden rounded-full bg-white/90 px-2 py-1 text-xs text-slate-600 shadow hover:text-red-600 group-hover:block dark:bg-slate-900/90 dark:text-slate-300"
                    aria-label={`Delete ${asset.filename}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {recents.length > 0 ? (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Recently used</h3>
            <div className="grid max-h-40 grid-cols-6 gap-2 overflow-y-auto">
              {recents.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => handleSelect(url)}
                  className="overflow-hidden rounded-2xl border border-slate-200 hover:border-slate-500 dark:border-slate-700"
                >
                  <img src={resolveStorefrontAssetUrl(url)} alt="" className="h-16 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AssetPicker;
