import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Input, MetricCard, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
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
    loadPosCatalog,
    printPosInvoice,
    scanPosBarcode,
    summarizeCart,
    syncQueuedPosSales,
    updateCartPrice,
    updateCartQuantity,
    removeCartLine,
} from '../../services/posService';
import { previewPricing } from '../../services/promotionService';
import PosCartPanel from './PosCartPanel';
import PosCheckoutModal from './PosCheckoutModal';
import PosInvoiceModal from './PosInvoiceModal';
import PosProductGrid from './PosProductGrid';
import PosQuickCustomerModal from './PosQuickCustomerModal';
import PosRecentSalesPanel from './PosRecentSalesPanel';
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
                    warehouseId: selectedWarehouseId,
                    terminalId: selectedTerminalId || null,
                    salesChannel: 'POS',
                    manualDiscountAmount: Number(checkout.discountAmount || 0),
                    couponCodes: checkout.couponCodes
                        .split(/[\n,]/)
                        .map((value) => value.trim())
                        .filter(Boolean),
                    items: cart.map((line) => ({
                        productVariantId: line.productVariantId,
                        quantity: Number(line.quantity || 0),
                        unitPrice: Number(line.unitPrice || 0),
                        manualLineDiscount: Number(line.lineDiscount || 0),
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
            const items = await fetchPosSales({ cashierId: user?.id, terminalId: selectedTerminalId, size: 20 });
            setSales(items);
            showAlert(sale.syncStatus === 'synced' ? 'success' : 'warning', sale.syncStatus === 'synced' ? 'POS sale recorded and synced successfully' : 'POS sale saved locally for offline or deferred sync');
        } catch (error) {
            showAlert('error', error.message || 'Failed to complete POS sale');
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
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-8">
                <SalesHero
                    eyebrow="POS Terminal"
                    title="Process point-of-sale transactions from a controlled terminal workspace."
                    description="Use this screen to scan items, complete sales, queue offline tickets, and keep cashier activity tied to the active register."
                    actions={(
                        <>
                            <Select value={selectedTerminalId} onChange={(event) => setSelectedTerminalId(event.target.value)} options={bootstrap.terminals.map((terminal) => ({ value: terminal.id, label: `${terminal.name} • ${terminal.warehouseName}` }))} placeholder="POS terminal" className="min-w-[280px]" />
                            <Select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} options={bootstrap.customers.map((customer) => ({ value: customer.id, label: customer.name }))} placeholder="Customer or walk-in" className="min-w-[240px]" />
                            <Button variant="secondary" icon="person_add" onClick={() => setShowQuickCustomer(true)}>Quick Customer</Button>
                            <Link to="/pos/register" className="inline-flex"><Button variant="secondary" icon="point_of_sale">Register Control</Button></Link>
                            <Link to="/pos/sales" className="inline-flex"><Button variant="secondary" icon="receipt_long">Sold History</Button></Link>
                            <Link to="/pos/counters" className="inline-flex">
                                <Button variant="secondary" icon="storefront">Counter Setup</Button>
                            </Link>
                        </>
                    )}
                    accent="from-blue-500/15 via-transparent to-emerald-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Today's Gross" value={formatCurrency(kpis.gross)} caption="Sales value recorded by this cashier today" icon="payments" tone="blue" />
                    <MetricCard title="Tickets" value={kpis.tickets} caption="Completed POS sales for this cashier today" icon="receipt_long" tone="emerald" />
                    <MetricCard title="Average Basket" value={formatCurrency(kpis.averageTicket)} caption="Average total per ticket handled this shift" icon="shopping_basket" tone="violet" />
                    <MetricCard title="Shift Status" value={activeShift?.status === 'OPEN' ? 'Open' : 'Closed'} caption={activeShift?.status === 'OPEN' ? `Register opened by ${activeShift.cashierName}` : (requireOpenShiftBeforeSale ? 'Open the register from Register Control before selling' : 'Current policy allows sales without an open shift')} icon="point_of_sale" tone="amber" />
                </div>

                <Card className="rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Active Counter</p>
                            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{selectedTerminal?.name || 'Choose a counter'}</h2>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{selectedWarehouse?.name || 'No warehouse bound'} • {activeShift?.status === 'OPEN' ? `Shift open by ${activeShift.cashierName}` : 'No open shift on this counter'}</p>
                            <p className="mt-1 text-xs text-slate-400">{activeShift?.openedAt ? `Opened ${new Date(activeShift.openedAt).toLocaleString()}` : (requireOpenShiftBeforeSale ? 'Open the register before posting live sales.' : 'Sales can proceed without an active shift under the current policy.')}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link to="/pos/register" className="inline-flex"><Button variant="secondary" icon="point_of_sale">Manage Register</Button></Link>
                            <Button variant={selectedCustomerId ? 'secondary' : 'primary'} icon="person" onClick={() => setSelectedCustomerId('')}>Use Walk-in Customer</Button>
                            <Button variant="secondary" icon="person_add" onClick={() => setShowQuickCustomer(true)}>Add Named Customer</Button>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1.55fr)_minmax(400px,0.85fr)]">
                    <div className="flex flex-col gap-8">
                        <Card className="rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                                <div className="max-w-2xl">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Live Catalog</p>
                                    <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Barcode scan or browse the sellable catalog.</h2>
                                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Scanner-ready barcode input sits beside keyword and category filters so operators can work at speed during busy counter periods.</p>
                                </div>
                                <div className="grid w-full gap-3 md:grid-cols-3 xl:max-w-3xl">
                                    <form onSubmit={handleScan}>
                                        <Input label="Barcode Input" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Scan barcode and press Enter" icon="barcode" />
                                    </form>
                                    <Input label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SKU, barcode, or keyword" icon="search" />
                                    <Select label="Category" value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} options={bootstrap.categories.map((category) => ({ value: category.id, label: category.name }))} placeholder="All categories" />
                                </div>
                            </div>
                        </Card>

                        <PosProductGrid products={catalog} loading={catalogLoading} onAdd={handleAddProduct} />
                        <PosRecentSalesPanel sales={sales.slice(0, 8)} currency={checkout.currency} onOpenInvoice={setSelectedSale} onSyncQueued={handleSyncQueued} syncing={syncing} online={online} />
                    </div>

                    <PosCartPanel
                        cart={cart}
                        summary={summary}
                        currency={checkout.currency}
                        customerName={selectedCustomer?.name}
                        terminalName={selectedTerminal?.name}
                        warehouseName={selectedWarehouse?.name}
                        appliedCouponCodes={summary.appliedCouponCodes}
                        checkoutDisabled={!selectedTerminalId || checkoutBlockedByShift}
                        onQuantityChange={(lineId, quantity) => setCart((current) => updateCartQuantity(current, lineId, quantity))}
                        onPriceChange={(lineId, price) => setCart((current) => updateCartPrice(current, lineId, price))}
                        onRemove={(lineId) => setCart((current) => removeCartLine(current, lineId))}
                        onClear={() => setCart([])}
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