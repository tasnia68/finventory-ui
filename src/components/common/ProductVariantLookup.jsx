import React, { useEffect, useMemo, useRef, useState } from 'react';
import { searchProductVariants } from '../../services/productService';
import Button from './Button';
import Input from './Input';

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const getVariantLabel = (variant) => {
    if (!variant) return '';
    return variant.sku || variant.name || variant.id;
};

const ProductVariantLookup = ({
    label = 'Product Variant',
    placeholder = 'Search by SKU or name',
    selectedVariant,
    onSelect,
    required = false,
    className = '',
}) => {
    const [query, setQuery] = useState(getVariantLabel(selectedVariant));
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setQuery(getVariantLabel(selectedVariant));
    }, [selectedVariant]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        let active = true;
        const trimmedQuery = query.trim();
        const selectedLabel = getVariantLabel(selectedVariant);

        if (trimmedQuery.length < 2 || trimmedQuery === selectedLabel) {
            setResults([]);
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        const timer = window.setTimeout(async () => {
            try {
                const data = await searchProductVariants(trimmedQuery);
                if (active) {
                    setResults(toList(data).slice(0, 8));
                    setIsOpen(true);
                }
            } catch (error) {
                if (active) {
                    setResults([]);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }, 300);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [query, selectedVariant]);

    const selectedSummary = useMemo(() => {
        if (!selectedVariant) return null;
        return {
            title: selectedVariant.name || selectedVariant.sku || selectedVariant.id,
            subtitle: selectedVariant.sku && selectedVariant.name ? selectedVariant.sku : selectedVariant.id,
        };
    }, [selectedVariant]);

    const handleSelect = (variant) => {
        onSelect(variant);
        setQuery(getVariantLabel(variant));
        setResults([]);
        setIsOpen(false);
    };

    const handleClear = () => {
        onSelect(null);
        setQuery('');
        setResults([]);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <Input
                label={label}
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => {
                    if (results.length > 0) setIsOpen(true);
                }}
                placeholder={placeholder}
                required={required}
                icon="search"
            />

            {selectedSummary ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900 dark:text-white">{selectedSummary.title}</div>
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">{selectedSummary.subtitle}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClear}>Clear</Button>
                </div>
            ) : null}

            {isOpen && (loading || results.length > 0) ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {loading ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                            Searching variants...
                        </div>
                    ) : (
                        results.map((variant) => (
                            <button
                                key={variant.id}
                                type="button"
                                onClick={() => handleSelect(variant)}
                                className="flex w-full flex-col gap-0.5 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                            >
                                <span className="font-semibold text-slate-900 dark:text-white">{variant.sku || variant.id}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{variant.name || 'Unnamed variant'}</span>
                            </button>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
};

export default ProductVariantLookup;