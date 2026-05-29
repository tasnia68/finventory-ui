import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input, Select } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { createCustomer } from '../../services/customerService';
import {
    addCartLine,
    fetchCurrentPosShift,
    fetchPosSales,
    finalizePosSale,
    getCashierKpis,
    getCurrentPosShift,
    getPosBootstrap,
    getSuspendedPosSales,
    loadPosCatalog,
    printPosInvoice,
    resumeSuspendedPosSale,
    scanPosBarcode,
    summarizeCart,
    suspendPosSale,
    syncQueuedPosSales,
    updateCartPrice,
    updateCartQuantity,
    removeCartLine,
    cancelSuspendedPosSale,
} from '../../services/posService';
import { previewPricing } from '../../services/discountService';
import PosCartPanel from './PosCartPanel';
import PosCheckoutModal from './PosCheckoutModal';
import PosInvoiceModal from './PosInvoiceModal';
import PosProductGrid from './PosProductGrid';
import PosQuickCustomerModal from './PosQuickCustomerModal';
import { formatCurrency } from './utils';

const DEFAULT_CHECKOUT = {
    paymentMethod: 'CASH',
    tenderedAmount: '',
    discountAmount: '',
    couponCodes: '',
    taxRate: '0',
    notes: '',
    currency: 'USD',
    syncMode: 'online',
    pricingPreview: null,
    payments: [],
    suspendedSaleId: '',
};

const createDefaultCheckout = (currency = 'USD') => ({
    ...DEFAULT_CHECKOUT,
    currency,
});

const PosTerminal = () => {
    const { user } = useAuth();
    const { getBooleanSetting, getSetting } = useSettings();
    const [loading, setLoading] = useState(true);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [alert, setAlert] = useState(null);
    const [online, setOnline] = useState(navigator.onLine);
    const [bootstrap, setBootstrap] = useState({ terminals: [], warehouses: [], customers: [], categories: [], activeShift: null });
    const [catalog, setCatalog] = useState([]);
    const [query, setQuery] = useState('');
    const [barcode, setBarcode] = useState('');
    const [selectedTerminalId, setSelectedTerminalId] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [cart, setCart] = useState([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const defaultCurrency = getSetting('general.localization.defaultCurrency', 'USD');
    const [checkout, setCheckout] = useState(() => createDefaultCheckout(defaultCurrency));
    const [sales, setSales] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);
    const [activeShift, setActiveShift] = useState(getCurrentPosShift());
    const [kpis, setKpis] = useState({ gross: 0, tickets: 0, units: 0, averageTicket: 0, offlineQueued: 0 });
    const [showQuickCustomer, setShowQuickCustomer] = useState(false);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const [pricingPreviewLoading, setPricingPreviewLoading] = useState(false);
    const [pricingPreviewError, setPricingPreviewError] = useState('');
    const [suspendedSales, setSuspendedSales] = useState([]);
    const [suspendedLoading, setSuspendedLoading] = useState(false);
    const autoSyncTriggered = useRef(false);

    const requireOpenShiftBeforeSale = getBooleanSetting('pos.register.requireOpenShiftBeforeSale', true);
    const autoSyncOnReconnect = getBooleanSetting('pos.offline.autoSyncOnReconnect', true);
    const receiptFooterText = getSetting('pos.receipt.footerText', getSetting('general.branding.receiptFooterText', ''));

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const loadBootstrap = async () => {
            try {
                setLoading(true);
                const data = await getPosBootstrap();
                setBootstrap(data);
                const initialTerminalId = data.activeShift?.terminalId || data.terminals?.[0]?.id || '';
                const initialWarehouseId = data.terminals?.find((terminal) => terminal.id === initialTerminalId)?.warehouseId || data.warehouses[0]?.id || '';

                setSelectedTerminalId((current) => current || initialTerminalId);
                setSelectedWarehouseId((current) => current || initialWarehouseId);
                setActiveShift(data.activeShift || getCurrentPosShift());
            } catch (error) {
                showAlert('error', error.message || 'Failed to load POS setup');
            } finally {
                setLoading(false);
            }
        };

        loadBootstrap();
    }, [user?.id]);

    useEffect(() => {
        const terminal = bootstrap.terminals.find((item) => item.id === selectedTerminalId);
        if (terminal?.warehouseId) {
            setSelectedWarehouseId(terminal.warehouseId);
        }
    }, [bootstrap.terminals, selectedTerminalId]);

    useEffect(() => {
        if (!cart.length && checkout.currency !== defaultCurrency) {
            setCheckout((current) => ({ ...current, currency: defaultCurrency }));
        }
    }, [cart.length, checkout.currency, defaultCurrency]);

    useEffect(() => {
        if (!online || !selectedWarehouseId || cart.length === 0) {
            setPricingPreviewLoading(false);
            setPricingPreviewError('');
            setCheckout((current) => current.pricingPreview ? { ...current, pricingPreview: null } : current);
            return undefined;
        }

        let active = true;
        const timer = window.setTimeout(async () => {
            try {
                setPricingPreviewLoading(true);
                setPricingPreviewError('');
                const result = await previewPricing({
                    customerId: selectedCustomerId || null,
                    salesChannel: 'POS',
                    discountCodes: checkout.couponCodes
                        .split(/[\n,]/)
                        .map((value) => value.trim())
                        .filter(Boolean),
                    giftCardCodes: [],
                    referralCode: null,
                    shippingAmount: 0,
                    items: cart.map((line) => ({
                        productVariantId: line.productVariantId,
                        quantity: Number(line.quantity || 0),
                        unitPrice: Number(line.unitPrice || 0),
                    })),
                });

                if (active) {
                    setCheckout((current) => ({ ...current, pricingPreview: result }));
                }
            } catch (error) {
                if (active) {
                    setPricingPreviewError(error.message || 'Unable to evaluate coupon pricing for this basket');
                    setCheckout((current) => current.pricingPreview ? { ...current, pricingPreview: null } : current);
                }
            } finally {
                if (active) {
                    setPricingPreviewLoading(false);
                }
            }
        }, 320);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [cart, checkout.couponCodes, checkout.discountAmount, online, selectedCustomerId, selectedTerminalId, selectedWarehouseId]);

    useEffect(() => {
        let isMounted = true;

        const loadShift = async () => {
            const shift = await fetchCurrentPosShift(selectedTerminalId);
            if (isMounted) {
                setActiveShift(shift);
            }
        };

        if (selectedTerminalId) {
            loadShift();
        } else {
            setActiveShift(null);
        }

        return () => {
            isMounted = false;
        };
    }, [selectedTerminalId]);

    useEffect(() => {
        let isMounted = true;

        const loadSales = async () => {
            try {
                const items = await fetchPosSales({ cashierId: user?.id, terminalId: selectedTerminalId, size: 20 });
                if (isMounted) {
                    setSales(items);
                }
            } catch (error) {
                if (isMounted) {
                    showAlert('error', error.message || 'Failed to load recent POS sales');
                }
            }
        };

        if (user?.id) {
            loadSales();
        }

        return () => {
            isMounted = false;
        };
    }, [user?.id, selectedTerminalId, online]);

    useEffect(() => {
        let isMounted = true;

        const loadKpis = async () => {
            try {
                const data = await getCashierKpis(user?.id, selectedTerminalId);
                if (isMounted) {
                    setKpis(data);
                }
            } catch (error) {
                if (isMounted) {
                    setKpis({ gross: 0, tickets: 0, units: 0, averageTicket: 0, offlineQueued: 0 });
                }
            }
        };

        if (user?.id) {
            loadKpis();
        }

        return () => {
            isMounted = false;
        };
    }, [user?.id, selectedTerminalId, sales, online]);

    useEffect(() => {
        let active = true;

        const loadSuspended = async () => {
            if (!selectedTerminalId || !online) {
                setSuspendedSales([]);
                return;
            }

            try {
                setSuspendedLoading(true);
                const items = await getSuspendedPosSales(selectedTerminalId);
                if (active) {
                    setSuspendedSales(items);
                }
            } catch (error) {
                if (active) {
                    showAlert('error', error.message || 'Failed to load suspended sales');
                }
            } finally {
                if (active) {
                    setSuspendedLoading(false);
                }
            }
        };

        loadSuspended();

        return () => {
            active = false;
        };
    }, [online, selectedTerminalId]);

    useEffect(() => {
        const timer = window.setTimeout(async () => {
            try {
                setCatalogLoading(true);
                const products = await loadPosCatalog({ query, categoryId: selectedCategoryId, warehouseId: selectedWarehouseId, size: 18 });
                setCatalog(products);
            } catch (error) {
                showAlert('error', error.message || 'Failed to load POS catalog');
            } finally {
                setCatalogLoading(false);
            }
        }, 220);

        return () => window.clearTimeout(timer);
    }, [query, selectedCategoryId, selectedWarehouseId, online]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const selectedTerminal = useMemo(() => bootstrap.terminals.find((terminal) => terminal.id === selectedTerminalId) || null, [bootstrap.terminals, selectedTerminalId]);
    const selectedWarehouse = useMemo(() => bootstrap.warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) || null, [bootstrap.warehouses, selectedWarehouseId]);
    const selectedCustomer = useMemo(() => bootstrap.customers.find((customer) => customer.id === selectedCustomerId) || null, [bootstrap.customers, selectedCustomerId]);
    const summary = useMemo(() => summarizeCart(cart, checkout), [cart, checkout]);
    const canSyncSale = Boolean(selectedTerminalId && selectedWarehouseId && online);
    const checkoutBlockedByShift = requireOpenShiftBeforeSale && activeShift?.status !== 'OPEN';

    useEffect(() => {
        if (!online) {
            autoSyncTriggered.current = false;
            return;
        }

        if (!autoSyncOnReconnect || autoSyncTriggered.current || !kpis.offlineQueued) {
            return;
        }

        autoSyncTriggered.current = true;
        handleSyncQueued(true);
    }, [autoSyncOnReconnect, kpis.offlineQueued, online]);

    const handleAddProduct = (product) => {
        setCart((current) => addCartLine(current, product));
        showAlert('success', `${product.sku} added to cart`);
    };

    const handleScan = async (event) => {
        event.preventDefault();
        try {
            const product = await scanPosBarcode(barcode, { warehouseId: selectedWarehouseId });
            setCart((current) => addCartLine(current, product));
            setBarcode('');
            showAlert('success', `${product.sku} scanned into the cart`);
        } catch (error) {
            showAlert('error', error.message || 'Barcode scan failed');
        }
    };

    const handleCheckout = async (event) => {
        event.preventDefault();
        if (checkoutBlockedByShift) {
            showAlert('warning', 'Open a register shift before completing POS sales.');
            return;
        }

        if (checkout.paymentMethod === 'MIXED') {
            const allocated = (checkout.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            const total = Number(summary.total || 0);
            if (Math.abs(allocated - total) > 0.01) {
                showAlert('warning', 'Allocate the full sale total across all tender lines before completing the receipt.');
                return;
            }
        }

        try {
            setSyncing(true);
            const sale = await finalizePosSale({
                cart,
                checkout,
                cashier: user,
                customer: selectedCustomer,
                warehouse: selectedWarehouse,
                terminal: selectedTerminal,
                activeShift,
            });
            setSelectedSale(sale);
            setCart([]);
            setCheckout(createDefaultCheckout(defaultCurrency));
            setPricingPreviewError('');
            setShowCheckout(false);
            setActiveShift(getCurrentPosShift());
            if (selectedTerminalId && online) {
                const holds = await getSuspendedPosSales(selectedTerminalId);
                setSuspendedSales(holds);
            }
            const items = await fetchPosSales({ cashierId: user?.id, terminalId: selectedTerminalId, size: 20 });
            setSales(items);
            showAlert(sale.syncStatus === 'synced' ? 'success' : 'warning', sale.syncStatus === 'synced' ? 'POS sale recorded and synced successfully' : 'POS sale saved locally for offline or deferred sync');
        } catch (error) {
            showAlert('error', error.message || 'Failed to complete POS sale');
        } finally {
            setSyncing(false);
        }
    };

    const handleHoldSale = async () => {
        if (!selectedTerminal || !selectedWarehouse) {
            showAlert('warning', 'Select a POS terminal before placing a basket on hold.');
            return;
        }

        try {
            setSyncing(true);
            const hold = await suspendPosSale({
                terminalId: selectedTerminal.id,
                customerId: selectedCustomer?.id || null,
                warehouseId: selectedWarehouse.id,
                manualDiscountAmount: Number(checkout.discountAmount || 0),
                taxAmount: Number(summary.taxAmount || 0),
                currency: checkout.currency,
                notes: checkout.notes,
                couponCodes: checkout.couponCodes
                    .split(/[\n,]/)
                    .map((value) => value.trim())
                    .filter(Boolean),
                items: cart.map((line) => ({
                    productVariantId: line.productVariantId,
                    quantity: Number(line.quantity || 0),
                    unitPrice: Number(line.unitPrice || 0),
                    lineDiscount: Number(line.lineDiscount || 0),
                })),
            });
            setSuspendedSales((current) => [hold, ...current.filter((item) => item.id !== hold.id)]);
            setCart([]);
            setCheckout(createDefaultCheckout(defaultCurrency));
            setPricingPreviewError('');
            showAlert('success', `${hold.suspendedNumber} placed on hold successfully`);
        } catch (error) {
            showAlert('error', error.message || 'Failed to suspend the current basket');
        } finally {
            setSyncing(false);
        }
    };

    const handleResumeSuspendedSale = async (suspendedSale) => {
        try {
            setSyncing(true);
            const sale = await resumeSuspendedPosSale(suspendedSale.id);
            const taxableBase = Math.max(0, Number(sale.subtotalAmount || 0) - Number(sale.manualDiscountAmount || 0));
            const derivedTaxRate = taxableBase > 0 ? ((Number(sale.taxAmount || 0) / taxableBase) * 100) : 0;

            setSelectedTerminalId(sale.terminalId || selectedTerminalId);
            setSelectedCustomerId(sale.customerId || '');
            setCart(sale.items.map((item) => ({
                id: crypto.randomUUID(),
                productVariantId: item.productVariantId,
                sku: item.sku,
                barcode: item.barcode || '',
                description: item.description,
                unitPrice: Number(item.unitPrice || 0),
                quantity: Number(item.quantity || 0),
                onHand: null,
                lineDiscount: Number(item.lineDiscount || 0),
                lineTotal: Number(item.lineTotal || 0),
            })));
            setCheckout({
                ...createDefaultCheckout(sale.currency || defaultCurrency),
                discountAmount: String(Number(sale.manualDiscountAmount || 0)),
                couponCodes: Array.isArray(sale.couponCodes) ? sale.couponCodes.join(', ') : '',
                taxRate: derivedTaxRate ? String(derivedTaxRate.toFixed(2)) : '0',
                notes: sale.notes || '',
                suspendedSaleId: sale.id,
            });
            setSuspendedSales((current) => current.filter((item) => item.id !== sale.id));
            showAlert('success', `${sale.suspendedNumber} resumed into the active basket`);
        } catch (error) {
            showAlert('error', error.message || 'Failed to resume the suspended basket');
        } finally {
            setSyncing(false);
        }
    };

    const handleCancelSuspendedSale = async (suspendedSaleId) => {
        try {
            setSyncing(true);
            await cancelSuspendedPosSale(suspendedSaleId);
            setSuspendedSales((current) => current.filter((item) => item.id !== suspendedSaleId));
            showAlert('success', 'Suspended basket cancelled successfully');
        } catch (error) {
            showAlert('error', error.message || 'Failed to cancel suspended basket');
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncQueued = async (silentIfEmpty = false) => {
        try {
            setSyncing(true);
            const result = await syncQueuedPosSales(user?.id);
            const items = await fetchPosSales({ cashierId: user?.id, terminalId: selectedTerminalId, size: 20 });
            setSales(items);
            if (result.synced > 0 || !silentIfEmpty) {
                showAlert(result.synced > 0 ? 'success' : 'warning', result.synced > 0 ? `Synced ${result.synced} offline sales` : 'No offline sales were synced');
            }
        } catch (error) {
            showAlert('error', error.message || 'Failed to sync offline sales');
        } finally {
            setSyncing(false);
        }
    };

    const handleCreateQuickCustomer = async (payload) => {
        try {
            setSavingCustomer(true);
            const customer = await createCustomer(payload);
            setBootstrap((current) => ({
                ...current,
                customers: [...current.customers, customer].sort((left, right) => left.name.localeCompare(right.name)),
            }));
            setSelectedCustomerId(customer.id);
            setShowQuickCustomer(false);
            showAlert('success', `${customer.name} added for this sale`);
        } catch (error) {
            showAlert('error', error.message || 'Failed to create customer');
        } finally {
            setSavingCustomer(false);
        }
    };

    if (loading) {
        return <div className="flex-1 bg-background-light dark:bg-background-dark" />;
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-6 dark:bg-background-dark xl:p-7">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px] xl:items-start">
                    <div className="order-2 flex flex-col gap-6 xl:order-1">
                        <Card className="rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Sell Screen</p>
                                        <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Counter checkout</h1>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <Link to="/pos/register" className="inline-flex"><Button variant="secondary" icon="point_of_sale">Register</Button></Link>
                                        <Link to="/pos/settlement" className="inline-flex"><Button variant="secondary" icon="account_balance">Settlement</Button></Link>
                                        <Link to="/pos/sales" className="inline-flex"><Button variant="secondary" icon="receipt_long">Journal</Button></Link>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    <Select value={selectedTerminalId} onChange={(event) => setSelectedTerminalId(event.target.value)} options={bootstrap.terminals.map((terminal) => ({ value: terminal.id, label: `${terminal.name} • ${terminal.warehouseName}` }))} placeholder="POS terminal" label="Counter" />
                                    <Select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} options={bootstrap.customers.map((customer) => ({ value: customer.id, label: customer.name }))} placeholder="Customer or walk-in" label="Customer" />
                                    <Select label="Category" value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} options={bootstrap.categories.map((category) => ({ value: category.id, label: category.name }))} placeholder="All categories" />
                                </div>

                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto]">
                                    <form onSubmit={handleScan}>
                                        <Input label="Barcode" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Scan barcode and press Enter" icon="barcode" />
                                    </form>
                                    <Input label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, barcode, or product" icon="search" />
                                    <div className="flex items-end gap-3">
                                        <Button variant={selectedCustomerId ? 'secondary' : 'primary'} icon="person" onClick={() => setSelectedCustomerId('')}>Walk-in</Button>
                                        <Button variant="secondary" icon="person_add" onClick={() => setShowQuickCustomer(true)}>Quick Customer</Button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Badge variant={activeShift?.status === 'OPEN' ? 'success' : 'warning'}>{activeShift?.status === 'OPEN' ? `Shift open • ${activeShift.cashierName}` : 'Shift closed'}</Badge>
                                    <Badge variant="default">{selectedWarehouse?.name || 'No warehouse selected'}</Badge>
                                    <Badge variant="info">{catalogLoading ? 'Loading results' : `${catalog.length} results`}</Badge>
                                    <Badge variant="default">{cart.length} lines</Badge>
                                    <Badge variant="default">{suspendedSales.length} suspended</Badge>
                                    {kpis.offlineQueued > 0 ? <Badge variant="warning">{kpis.offlineQueued} offline queued</Badge> : null}
                                </div>
                            </div>
                        </Card>

                        <Card className="rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                                <div className="max-w-2xl">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Item Lookup</p>
                                    <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Search results ready for quick add.</h2>
                                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Cashiers should search, confirm price and stock, then add the item directly into the receipt. Results are listed like a register, not a catalog gallery.</p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-700/60">Enter barcode then press Return</span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-700/60">Search by SKU or description</span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-700/60">Click row add for receipt entry</span>
                                </div>
                            </div>
                        </Card>

                        <PosProductGrid products={catalog} loading={catalogLoading} onAdd={handleAddProduct} />

                        <Card className="rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="max-w-2xl">
                                    <div className="flex items-center gap-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Suspended Baskets</p>
                                        <Badge variant={suspendedSales.length > 0 ? 'warning' : 'default'}>{suspendedSales.length}</Badge>
                                    </div>
                                    <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Hold, resume, and clear queued baskets from the counter.</h2>
                                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use hold when a shopper steps away or needs a payment decision. Resume any held basket back into the live cart and keep the register tied to the same terminal.</p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Link to="/pos/settlement" className="inline-flex"><Button variant="secondary" icon="account_balance">Open Settlement Desk</Button></Link>
                                    <Button variant="secondary" icon="pause_circle" onClick={handleHoldSale} disabled={cart.length === 0 || !selectedTerminalId || syncing}>Hold Current Basket</Button>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                {suspendedLoading ? (
                                    <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                        Loading suspended baskets for this terminal.
                                    </div>
                                ) : suspendedSales.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                        No held baskets are waiting on this terminal.
                                    </div>
                                ) : suspendedSales.slice(0, 5).map((sale) => (
                                    <div key={sale.id} className="rounded-3xl border border-slate-200 p-4 dark:border-slate-700">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-semibold text-slate-900 dark:text-white">{sale.suspendedNumber}</p>
                                                    <Badge variant="warning">{sale.status}</Badge>
                                                    <Badge variant="info">{sale.itemCount || sale.items?.length || 0} items</Badge>
                                                </div>
                                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{sale.customerName || 'Walk-in customer'} • {sale.currency || checkout.currency} {Number(sale.totalAmount || 0).toFixed(2)}</p>
                                                <p className="mt-1 text-xs text-slate-400">Held {sale.suspendedAt ? new Date(sale.suspendedAt).toLocaleString() : 'just now'}{sale.notes ? ` • ${sale.notes}` : ''}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" variant="secondary" icon="play_arrow" onClick={() => handleResumeSuspendedSale(sale)} disabled={syncing || (cart.length > 0 && !checkout.suspendedSaleId)}>Resume</Button>
                                                <Button size="sm" variant="ghost" icon="delete" onClick={() => handleCancelSuspendedSale(sale.id)} disabled={syncing}>Cancel</Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="order-1 xl:order-2">
                        <PosCartPanel
                            cart={cart}
                            summary={summary}
                            currency={checkout.currency}
                            customerName={selectedCustomer?.name}
                            terminalName={selectedTerminal?.name}
                            warehouseName={selectedWarehouse?.name}
                            appliedCouponCodes={summary.appliedCouponCodes}
                            checkoutDisabled={!selectedTerminalId || checkoutBlockedByShift}
                            holdDisabled={!selectedTerminalId || syncing || !online}
                            onQuantityChange={(lineId, quantity) => setCart((current) => updateCartQuantity(current, lineId, quantity))}
                            onPriceChange={(lineId, price) => setCart((current) => updateCartPrice(current, lineId, price))}
                            onRemove={(lineId) => setCart((current) => removeCartLine(current, lineId))}
                            onClear={() => setCart([])}
                            onHold={handleHoldSale}
                            onCheckout={() => {
                                if (checkoutBlockedByShift) {
                                    showAlert('warning', 'Open a register shift before completing POS sales.');
                                    return;
                                }

                                setShowCheckout(true);
                            }}
                        />
                    </div>
                </div>
            </div>

            <PosCheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                checkout={checkout}
                setCheckout={setCheckout}
                summary={summary}
                        pricingPreviewLoading={pricingPreviewLoading}
                        pricingPreviewError={pricingPreviewError}
                cart={cart}
                online={online}
                canSyncSale={canSyncSale}
                onSubmit={handleCheckout}
                loading={syncing}
            />

            <PosQuickCustomerModal
                isOpen={showQuickCustomer}
                onClose={() => setShowQuickCustomer(false)}
                onCreate={handleCreateQuickCustomer}
                loading={savingCustomer}
            />

            <PosInvoiceModal sale={selectedSale} isOpen={Boolean(selectedSale)} onClose={() => setSelectedSale(null)} onPrint={(sale) => printPosInvoice(sale, { footerText: receiptFooterText })} />
        </div>
    );
};

export default PosTerminal;