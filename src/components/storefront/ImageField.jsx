import React, { useState } from 'react';
import AssetPicker from './AssetPicker';

const ImageField = ({ value, onChange, placeholder = 'No image selected' }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">—</div>
          )}
        </div>
        <div className="flex-1 truncate text-sm text-slate-600 dark:text-slate-300">
          {value || placeholder}
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
        >
          {value ? 'Change' : 'Browse'}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-2xl px-2 py-2 text-xs text-slate-500 hover:text-red-600"
            aria-label="Remove image"
          >
            ✕
          </button>
        ) : null}
      </div>
      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onChange}
        initialValue={value || ''}
        assetType="image"
      />
    </div>
  );
};

export default ImageField;
