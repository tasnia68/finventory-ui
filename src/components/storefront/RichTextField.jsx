import React, { useEffect, useRef } from 'react';

/**
 * Lightweight rich-text editor backed by contenteditable + execCommand.
 * No external deps. Output is HTML stored as a string.
 *
 * For the scope of the storefront builder this covers the 90% case
 * (bold, italic, link, h2, h3, ul, ol). A future upgrade to Tiptap can
 * swap the implementation without changing the field contract.
 */
const Toolbar = ({ onCommand }) => {
  const btn = (label, cmd, arg) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onCommand(cmd, arg);
      }}
      className="rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {label}
    </button>
  );

  return (
    <div className="mb-2 flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
      {btn('B', 'bold')}
      {btn('I', 'italic')}
      {btn('U', 'underline')}
      <span className="mx-1 w-px self-stretch bg-slate-200 dark:bg-slate-700" />
      {btn('H2', 'formatBlock', 'h2')}
      {btn('H3', 'formatBlock', 'h3')}
      {btn('P', 'formatBlock', 'p')}
      <span className="mx-1 w-px self-stretch bg-slate-200 dark:bg-slate-700" />
      {btn('• List', 'insertUnorderedList')}
      {btn('1. List', 'insertOrderedList')}
      <span className="mx-1 w-px self-stretch bg-slate-200 dark:bg-slate-700" />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          const url = window.prompt('Link URL');
          if (url) onCommand('createLink', url);
        }}
        className="rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Link
      </button>
      {btn('Clear', 'removeFormat')}
    </div>
  );
};

const RichTextField = ({ value, onChange }) => {
  const ref = useRef(null);
  const lastValue = useRef(value || '');

  useEffect(() => {
    if (ref.current && (value || '') !== lastValue.current) {
      ref.current.innerHTML = value || '';
      lastValue.current = value || '';
    }
  }, [value]);

  const handleCommand = (cmd, arg) => {
    document.execCommand(cmd, false, arg);
    if (ref.current) {
      const html = ref.current.innerHTML;
      lastValue.current = html;
      onChange(html);
    }
  };

  return (
    <div>
      <Toolbar onCommand={handleCommand} />
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const html = e.currentTarget.innerHTML;
          lastValue.current = html;
          onChange(html);
        }}
        className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950"
      />
    </div>
  );
};

export default RichTextField;
