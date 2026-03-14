import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const InfoTip = ({ text, className = '' }) => {
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      return undefined;
    }

    const updatePosition = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      const tooltipWidth = Math.min(320, window.innerWidth - 24);
      const left = Math.min(
        Math.max(rect.left + rect.width / 2 - tooltipWidth / 2, 12),
        window.innerWidth - tooltipWidth - 12,
      );
      const showAbove = rect.bottom + 12 + 120 > window.innerHeight && rect.top > 140;
      const top = showAbove ? rect.top - 12 : rect.bottom + 12;

      setPosition({ left, top });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        aria-label="Show field information"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[18px]">info</span>
      </button>

      {open && typeof document !== 'undefined' ? createPortal(
        <span
          className="pointer-events-none fixed z-[120] rounded-lg bg-slate-900 p-3 text-xs leading-5 text-white shadow-xl"
          style={{
            left: `${position.left}px`,
            top: `${position.top}px`,
            width: `min(20rem, calc(100vw - 1.5rem))`,
            transform: position.top < (buttonRef.current?.getBoundingClientRect().top || 0) ? 'translateY(-100%)' : 'none',
          }}
          role="tooltip"
        >
          {text}
        </span>,
        document.body,
      ) : null}
    </span>
  );
};

export default InfoTip;