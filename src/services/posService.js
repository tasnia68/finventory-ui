import { request } from './api';

const STORAGE_KEYS = {
    sales: 'logistra.pos.sales',
    catalogCache: 'logistra.pos.catalog-cache',
    activeShift: 'logistra.pos.active-shift',
};

const MAX_CACHED_PRODUCTS = 250;

const readJson = (key, fallback) => {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.error(`Failed to parse local storage key ${key}`, error);
        return fallback;
    }
};

const writeJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const unwrap = async (promise) => {
    const response = await promise;
    return response?.data !== undefined ? response.data : response;
};

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const slugDate = (value = new Date()) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

const randomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const normalizeCatalogItem = (item) => ({
    id: item.id,
    sku: item.sku,
    barcode: item.barcode || '',
    price: Number(item.price || 0),
    imageUrl: item.imageUrl || null,
    description: item.description || item.name || 'POS item',
    onHand: item.onHand === null || item.onHand === undefined ? null : Number(item.onHand || 0),
});

const mergeCatalogCache = (items) => {
    const current = readJson(STORAGE_KEYS.catalogCache, []);
    const map = new Map(current.map((item) => [item.id, item]));

    items.forEach((item) => {
        map.set(item.id, {
            ...map.get(item.id),
            ...item,
            cachedAt: new Date().toISOString(),
        });
    });

    const next = Array.from(map.values())
        .sort((left, right) => new Date(right.cachedAt || 0) - new Date(left.cachedAt || 0))
        .slice(0, MAX_CACHED_PRODUCTS);

    writeJson(STORAGE_KEYS.catalogCache, next);
    return next;
};

const getCachedCatalog = () => readJson(STORAGE_KEYS.catalogCache, []);

const getSalesStore = () => readJson(STORAGE_KEYS.sales, []);

const getActiveShiftStore = () => readJson(STORAGE_KEYS.activeShift, null);

const saveSalesStore = (sales) => {
    writeJson(STORAGE_KEYS.sales, sales.slice(0, 300));
};

const saveActiveShiftStore = (shift) => {
    if (!shift) {
        localStorage.removeItem(STORAGE_KEYS.activeShift);
        return;
    }

    writeJson(STORAGE_KEYS.activeShift, shift);
};

const filterCachedCatalog = (query) => {
    const normalizedQuery = query.trim().toLowerCase();
    return getCachedCatalog().filter((item) => {
        if (!normalizedQuery) return true;
        return [item.sku, item.barcode, item.description]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
};

const normalizeCatalogResponse = (payload) => toList(payload).map(normalizeCatalogItem);

const normalizeShift = (shift) => {
    if (!shift) return null;

    return {
        ...shift,
        openingFloat: Number(shift.openingFloat || 0),
        expectedCashAmount: Number(shift.expectedCashAmount || 0),
        declaredCashAmount: Number(shift.declaredCashAmount || 0),
        overShortAmount: Number(shift.overShortAmount || 0),
    };
};

const normalizeSale = (sale) => ({
    id: sale.id,
    invoiceNumber: sale.receiptNumber,
    receiptNumber: sale.receiptNumber,
    clientSaleId: sale.clientSaleId,
    createdAt: sale.saleTime,
    saleTime: sale.saleTime,
    cashierId: sale.cashierId,
    cashierName: sale.cashierName,
    customerId: sale.customerId,
    customerName: sale.customerName,
    warehouseId: sale.warehouseId,
    warehouseName: sale.warehouseName,
    terminalId: sale.terminalId,
    terminalName: sale.terminalName,
    shiftId: sale.shiftId,
    paymentMethod: sale.paymentMethod,
    suspendedSaleId: sale.suspendedSaleId || null,
    currency: sale.currency || 'USD',
    tenderedAmount: Number(sale.tenderedAmount || 0),
    subtotal: Number(sale.subtotal || 0),
    discountAmount: Number(sale.discountAmount || 0),
    taxAmount: Number(sale.taxAmount || 0),
    taxRateId: sale.taxRateId || null,
    taxRateCode: sale.taxRateCode || '',
    taxRateName: sale.taxRateName || '',
    total: Number(sale.totalAmount || 0),
    changeDue: Number(sale.changeAmount || 0),
    notes: sale.notes || '',
    appliedCouponCodes: Array.isArray(sale.appliedCouponCodes)
        ? sale.appliedCouponCodes
        : String(sale.appliedCouponCodes || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
    payments: Array.isArray(sale.payments) ? sale.payments.map((payment) => ({
        id: payment.id,
        paymentMethod: payment.paymentMethod,
        amount: Number(payment.amount || 0),
        referenceNumber: payment.referenceNumber || '',
        notes: payment.notes || '',
    })) : [],
    syncStatus: 'synced',
    syncError: null,
    backendOrderId: sale.salesOrderId,
    backendSoNumber: sale.soNumber,
    itemCount: Array.isArray(sale.items) ? sale.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0,
    items: Array.isArray(sale.items) ? sale.items.map((item) => ({
        id: item.id,
        productVariantId: item.productVariantId,
        sku: item.sku,
        barcode: item.barcode,
        description: item.description,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        lineDiscount: Number(item.lineDiscount || 0),
        lineTotal: Number(item.lineTotal || 0),
    })) : [],
    saleStatus: sale.saleStatus,
});

const normalizeSuspendedSale = (sale) => ({
    id: sale.id,
    suspendedNumber: sale.suspendedNumber,
    terminalId: sale.terminalId,
    terminalName: sale.terminalName,
    cashierId: sale.cashierId,
    cashierName: sale.cashierName,
    customerId: sale.customerId,
    customerName: sale.customerName,
    warehouseId: sale.warehouseId,
    warehouseName: sale.warehouseName,
    status: sale.status,
    suspendedAt: sale.suspendedAt,
    completedAt: sale.completedAt,
    cancelledAt: sale.cancelledAt,
    manualDiscountAmount: Number(sale.manualDiscountAmount || 0),
    taxAmount: Number(sale.taxAmount || 0),
    subtotalAmount: Number(sale.subtotalAmount || 0),
    totalAmount: Number(sale.totalAmount || 0),
    currency: sale.currency || 'USD',
    couponCodes: Array.isArray(sale.couponCodes) ? sale.couponCodes : [],
    notes: sale.notes || '',
    items: Array.isArray(sale.items) ? sale.items.map((item) => ({
        id: item.id,
        productVariantId: item.productVariantId,
        sku: item.sku,
        description: item.description,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        lineDiscount: Number(item.lineDiscount || 0),
        lineTotal: Number(item.lineTotal || 0),
    })) : [],
});

const normalizeKpis = (payload) => ({
    gross: Number(payload?.grossSales || 0),
    tickets: Number(payload?.ticketCount || 0),
    units: Number(payload?.unitsSold || 0),
    averageTicket: Number(payload?.averageTicket || 0),
    offlineQueued: getSalesStore().filter((sale) => sale.syncStatus === 'pending_sync').length,
});

const createInvoiceNumber = () => `POS-${slugDate()}-${randomCode()}`;

const computeTotals = ({ items, discountAmount = 0, taxRate = 0, tenderedAmount = 0, pricingPreview = null }) => {
    const subtotal = pricingPreview?.baseSubtotal !== undefined
        ? Number(pricingPreview.baseSubtotal || 0)
        : items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const effectiveDiscount = pricingPreview?.totalDiscount !== undefined
        ? Math.max(0, Number(pricingPreview.totalDiscount || 0))
        : Math.max(0, Number(discountAmount || 0));
    const taxableBase = pricingPreview?.netSubtotal !== undefined
        ? Math.max(0, Number(pricingPreview.netSubtotal || 0))
        : Math.max(0, subtotal - effectiveDiscount);
    const taxAmount = taxableBase * (Number(taxRate || 0) / 100);
    const total = taxableBase + taxAmount;
    const changeDue = Math.max(0, Number(tenderedAmount || 0) - total);

    return {
        subtotal,
        discountAmount: effectiveDiscount,
        taxRate: Number(taxRate || 0),
        taxAmount,
        total,
        changeDue,
        appliedCouponCodes: Array.isArray(pricingPreview?.appliedCouponCodes) ? pricingPreview.appliedCouponCodes : [],
    };
};

const summarizeOfflineKpis = (cashierId) => {
    const sales = getPosSales(cashierId);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const today = sales.filter((sale) => new Date(sale.createdAt) >= start);
    const gross = today.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const tickets = today.length;
    const units = today.reduce((sum, sale) => sum + Number(sale.itemCount || 0), 0);

    return {
        gross,
        tickets,
        units,
        averageTicket: tickets > 0 ? gross / tickets : 0,
        offlineQueued: sales.filter((sale) => sale.syncStatus === 'pending_sync').length,
    };
};

const buildBackendSalePayload = (sale) => ({
    clientSaleId: sale.clientSaleId,
    terminalId: sale.terminalId,
    customerId: sale.customerId || null,
    shiftId: sale.shiftId || null,
    warehouseId: sale.warehouseId,
    paymentMethod: sale.paymentMethod,
    suspendedSaleId: sale.suspendedSaleId || null,
    discountAmount: Number(sale.discountAmount || 0),
    taxAmount: Number(sale.taxAmount || 0),
    taxRateId: sale.taxRateId || null,
    tenderedAmount: Number(sale.tenderedAmount || 0),
    couponCodes: Array.isArray(sale.appliedCouponCodes) ? sale.appliedCouponCodes : [],
    currency: sale.currency || 'USD',
    notes: sale.notes || '',
    payments: Array.isArray(sale.payments) ? sale.payments.map((payment) => ({
        paymentMethod: payment.paymentMethod,
        amount: Number(payment.amount || 0),
        referenceNumber: payment.referenceNumber || '',
        notes: payment.notes || '',
    })) : [],
    items: sale.items.map((item) => ({
        productVariantId: item.productVariantId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineDiscount: Number(item.lineDiscount || 0),
    })),
});

const syncSaleToBackend = async (sale) => {
    const created = await unwrap(request('/pos/sales', {
        method: 'POST',
        body: buildBackendSalePayload(sale),
    }));

    return normalizeSale(created);
};

const updateStoredSale = (id, updater) => {
    const sales = getSalesStore();
    const updated = sales.map((sale) => (sale.id === id ? updater(sale) : sale));
    saveSalesStore(updated);
    return updated.find((sale) => sale.id === id);
};

const openShift = async (terminalId) => {
    const shift = await unwrap(request('/pos/shifts/open', {
        method: 'POST',
        body: {
            terminalId,
            openingFloat: 0,
        },
    }));
    saveActiveShiftStore(shift);
    return shift;
};

export const openPosShift = async ({ terminalId, openingFloat = 0 }) => {
    const shift = normalizeShift(await unwrap(request('/pos/shifts/open', {
        method: 'POST',
        body: {
            terminalId,
            openingFloat,
        },
    })));
    saveActiveShiftStore(shift);
    return shift;
};

export const closePosShift = async ({ shiftId, closingNotes = '', tenderCounts = [] }) => {
    const shift = normalizeShift(await unwrap(request(`/pos/shifts/${shiftId}/close`, {
        method: 'POST',
        body: {
            closingNotes,
            tenderCounts,
        },
    })));
    saveActiveShiftStore(null);
    return shift;
};

export const fetchCurrentPosShift = async (terminalId) => {
    if (!terminalId || !navigator.onLine) {
        return getActiveShiftStore();
    }

    try {
        const shift = normalizeShift(await unwrap(request(`/pos/shifts/current?terminalId=${encodeURIComponent(terminalId)}`)));
        saveActiveShiftStore(shift);
        return shift;
    } catch {
        saveActiveShiftStore(null);
        return null;
    }
};

const getOrCreateShift = async (terminalId, bootstrapShift = null) => {
    if (!terminalId) return null;

    if (bootstrapShift && bootstrapShift.terminalId === terminalId && bootstrapShift.status === 'OPEN') {
        saveActiveShiftStore(bootstrapShift);
        return bootstrapShift;
    }

    const cached = getActiveShiftStore();
    if (cached && cached.terminalId === terminalId && cached.status === 'OPEN') {
        return cached;
    }

    try {
        const shift = normalizeShift(await unwrap(request(`/pos/shifts/current?terminalId=${encodeURIComponent(terminalId)}`)));
        saveActiveShiftStore(shift);
        return shift;
    } catch {
        return openShift(terminalId);
    }
};

export const getPosBootstrap = async () => {
    const payload = await unwrap(request('/pos/bootstrap'));
    const bootstrap = {
        terminals: Array.isArray(payload?.terminals) ? payload.terminals : [],
        warehouses: Array.isArray(payload?.warehouses) ? payload.warehouses : [],
        customers: Array.isArray(payload?.customers) ? payload.customers.filter((customer) => customer.isActive !== false && customer.status === 'ACTIVE') : [],
        categories: Array.isArray(payload?.categories) ? payload.categories : [],
        activeShift: normalizeShift(payload?.activeShift || null),
    };

    if (bootstrap.activeShift) {
        saveActiveShiftStore(bootstrap.activeShift);
    }

    return bootstrap;
};

export const getPosTerminals = async () => {
    const payload = await unwrap(request('/pos/terminals'));
    return Array.isArray(payload) ? payload : [];
};

export const getPosShiftSettlement = async (shiftId) => unwrap(request(`/pos/shifts/${shiftId}/settlement`));

export const approvePosShiftSettlement = async (shiftId, payload) => unwrap(request(`/pos/shifts/${shiftId}/settlement-approval`, {
    method: 'POST',
    body: payload,
}));

export const getDailyPosSettlement = async ({ businessDate = '', terminalId = '' } = {}) => {
    const params = new URLSearchParams();
    if (businessDate) params.set('businessDate', businessDate);
    if (terminalId) params.set('terminalId', terminalId);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return unwrap(request(`/pos/settlement/daily${suffix}`));
};

export const recordPosCashMovement = async (shiftId, payload) => unwrap(request(`/pos/shifts/${shiftId}/cash-movements`, {
    method: 'POST',
    body: payload,
}));

export const getPosCashMovements = async (shiftId) => {
    const payload = await unwrap(request(`/pos/shifts/${shiftId}/cash-movements`));
    return Array.isArray(payload) ? payload : [];
};

export const suspendPosSale = async (payload) => normalizeSuspendedSale(await unwrap(request('/pos/suspended-sales', {
    method: 'POST',
    body: payload,
})));

export const getSuspendedPosSales = async (terminalId) => {
    const payload = await unwrap(request(`/pos/suspended-sales?terminalId=${encodeURIComponent(terminalId)}`));
    return Array.isArray(payload) ? payload.map(normalizeSuspendedSale) : [];
};

export const resumeSuspendedPosSale = async (suspendedSaleId) => normalizeSuspendedSale(await unwrap(request(`/pos/suspended-sales/${suspendedSaleId}/resume`, {
    method: 'POST',
}))); 

export const cancelSuspendedPosSale = async (suspendedSaleId) => normalizeSuspendedSale(await unwrap(request(`/pos/suspended-sales/${suspendedSaleId}/cancel`, {
    method: 'POST',
})));

export const getPosTerminalRegister = async ({ includeInactive = false } = {}) => {
    const params = new URLSearchParams();
    if (includeInactive) {
        params.set('includeInactive', 'true');
    }
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const payload = await unwrap(request(`/pos/terminals${suffix}`));
    return Array.isArray(payload) ? payload : [];
};

export const createPosTerminal = async (terminal) => {
    const payload = await unwrap(request('/pos/terminals', {
        method: 'POST',
        body: terminal,
    }));
    return payload;
};

export const updatePosTerminalStatus = async (terminalId, payload) => unwrap(request(`/pos/terminals/${terminalId}/status`, {
    method: 'PATCH',
    body: payload,
}));

export const loadPosCatalog = async ({ query = '', categoryId = '', warehouseId = '', size = 24 } = {}) => {
    if (!navigator.onLine) {
        return filterCachedCatalog(query).slice(0, size);
    }

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (categoryId) params.set('categoryId', categoryId);
    if (warehouseId) params.set('warehouseId', warehouseId);
    params.set('page', '0');
    params.set('size', String(size));

    const payload = await unwrap(request(`/pos/catalog?${params.toString()}`));
    const catalog = normalizeCatalogResponse(payload);
    mergeCatalogCache(catalog);
    return catalog;
};

export const scanPosBarcode = async (barcode, { warehouseId = '' } = {}) => {
    const normalized = barcode.trim();
    if (!normalized) {
        throw new Error('Barcode is required');
    }

    if (!navigator.onLine) {
        const cached = getCachedCatalog().find((item) => item.barcode === normalized || item.sku === normalized);
        if (!cached) {
            throw new Error('Barcode not found in local POS cache');
        }
        return cached;
    }

    const params = new URLSearchParams();
    params.set('barcode', normalized);
    if (warehouseId) params.set('warehouseId', warehouseId);

    const payload = await unwrap(request(`/pos/catalog/scan?${params.toString()}`));
    const item = normalizeCatalogItem(payload);
    mergeCatalogCache([item]);
    return item;
};

import { generateUUID } from '../utils/uuid';

export const createCartLine = (product, quantity = 1) => ({
    id: generateUUID(),
    productVariantId: product.id,
    sku: product.sku,
    barcode: product.barcode,
    description: product.description,
    unitPrice: Number(product.price || 0),
    quantity: Number(quantity || 1),
    onHand: product.onHand,
    lineDiscount: 0,
    lineTotal: Number(product.price || 0) * Number(quantity || 1),
});

export const addCartLine = (cart, product) => {
    const existing = cart.find((line) => line.productVariantId === product.id);
    if (!existing) {
        return [...cart, createCartLine(product)];
    }

    return cart.map((line) => line.productVariantId === product.id
        ? { ...line, quantity: line.quantity + 1, lineTotal: (line.quantity + 1) * line.unitPrice }
        : line);
};

export const updateCartQuantity = (cart, lineId, quantity) => {
    const parsed = Math.max(1, Number(quantity || 1));
    return cart.map((line) => line.id === lineId
        ? { ...line, quantity: parsed, lineTotal: parsed * Number(line.unitPrice || 0) }
        : line);
};

export const updateCartPrice = (cart, lineId, unitPrice) => {
    const parsed = Math.max(0, Number(unitPrice || 0));
    return cart.map((line) => line.id === lineId
        ? { ...line, unitPrice: parsed, lineTotal: parsed * Number(line.quantity || 0) }
        : line);
};

export const removeCartLine = (cart, lineId) => cart.filter((line) => line.id !== lineId);

export const summarizeCart = (cart, checkout = {}) => ({
    itemCount: cart.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
    lineCount: cart.length,
    ...computeTotals({
        items: cart,
        discountAmount: checkout.discountAmount,
        taxRate: checkout.taxRate,
        tenderedAmount: checkout.tenderedAmount,
        pricingPreview: checkout.pricingPreview,
    }),
});

export const finalizePosSale = async ({ cart, checkout, cashier, customer, warehouse, terminal, activeShift }) => {
    const totals = summarizeCart(cart, checkout);
    const shift = navigator.onLine ? await getOrCreateShift(terminal?.id, activeShift) : activeShift || getActiveShiftStore();
    const payments = Array.isArray(checkout.payments) && checkout.payments.length > 0
        ? checkout.payments
            .map((payment) => ({
                paymentMethod: payment.paymentMethod,
                amount: Number(payment.amount || 0),
                referenceNumber: payment.referenceNumber || '',
                notes: payment.notes || '',
            }))
            .filter((payment) => payment.paymentMethod && payment.amount > 0)
        : [{
            paymentMethod: checkout.paymentMethod,
            amount: Number(totals.total || 0),
            referenceNumber: '',
            notes: '',
        }];
    const salePaymentMethod = checkout.paymentMethod === 'MIXED' || payments.length > 1
        ? 'MIXED'
        : checkout.paymentMethod;
    const tenderedAmount = checkout.paymentMethod === 'CASH'
        ? Number(checkout.tenderedAmount || 0)
        : Number(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    const sale = {
        id: generateUUID(),
        clientSaleId: generateUUID(),
        invoiceNumber: createInvoiceNumber(),
        createdAt: new Date().toISOString(),
        cashierId: cashier?.id || null,
        cashierName: cashier?.firstName && cashier?.lastName ? `${cashier.firstName} ${cashier.lastName}` : cashier?.email || 'Cashier',
        customerId: customer?.id || null,
        customerName: customer?.name || 'Walk-in customer',
        warehouseId: warehouse?.id || null,
        warehouseName: warehouse?.name || 'Unassigned warehouse',
        terminalId: terminal?.id || null,
        terminalName: terminal?.name || 'POS terminal',
        shiftId: shift?.id || null,
        paymentMethod: salePaymentMethod,
        currency: checkout.currency || 'USD',
        tenderedAmount,
        taxRateId: checkout.taxRateId || null,
        notes: checkout.notes || '',
        suspendedSaleId: checkout.suspendedSaleId || null,
        appliedCouponCodes: Array.isArray(checkout.pricingPreview?.appliedCouponCodes)
            ? checkout.pricingPreview.appliedCouponCodes
            : [],
        payments,
        syncMode: checkout.syncMode,
        items: cart.map((line) => ({ ...line })),
        ...totals,
        syncStatus: 'local_only',
        syncError: null,
        backendOrderId: null,
        backendSoNumber: null,
    };

    if (navigator.onLine && sale.terminalId && sale.warehouseId && checkout.syncMode !== 'local') {
        try {
            const syncedSale = await syncSaleToBackend(sale);
            const sales = [syncedSale, ...getSalesStore().filter((current) => current.clientSaleId !== syncedSale.clientSaleId)]
                .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
            saveSalesStore(sales);
            return syncedSale;
        } catch (error) {
            sale.syncStatus = 'pending_sync';
            sale.syncError = error.message || 'Failed to sync sale';
        }
    } else if (sale.terminalId && sale.warehouseId) {
        sale.syncStatus = 'pending_sync';
        sale.syncError = navigator.onLine ? 'Sale is queued for deferred sync' : 'Device is offline';
    }

    const sales = [sale, ...getSalesStore()].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    saveSalesStore(sales);
    return sale;
};

export const getPosSales = (cashierId) => {
    const sales = getSalesStore().sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    if (!cashierId) return sales;
    return sales.filter((sale) => sale.cashierId === cashierId);
};

export const fetchPosSales = async ({ cashierId = '', terminalId = '', page = 0, size = 20 } = {}) => {
    if (!navigator.onLine) {
        return getPosSales(cashierId).slice(0, size);
    }

    const params = new URLSearchParams();
    if (cashierId) params.set('cashierId', cashierId);
    if (terminalId) params.set('terminalId', terminalId);
    params.set('page', String(page));
    params.set('size', String(size));

    const payload = await unwrap(request(`/pos/sales?${params.toString()}`));
    const remoteSales = toList(payload).map(normalizeSale);
    const pendingLocal = getPosSales(cashierId).filter((sale) => sale.syncStatus === 'pending_sync');
    const merged = [...pendingLocal, ...remoteSales].reduce((accumulator, current) => {
        const duplicate = accumulator.find((item) => item.clientSaleId && current.clientSaleId && item.clientSaleId === current.clientSaleId);
        if (!duplicate) {
            accumulator.push(current);
        }
        return accumulator;
    }, []);

    saveSalesStore(merged);
    return merged;
};

export const getCashierKpis = async (cashierId, terminalId = '') => {
    if (!navigator.onLine) {
        return summarizeOfflineKpis(cashierId);
    }

    const params = new URLSearchParams();
    if (cashierId) params.set('cashierId', cashierId);
    if (terminalId) params.set('terminalId', terminalId);
    const payload = await unwrap(request(`/pos/kpis?${params.toString()}`));
    return normalizeKpis(payload);
};

export const syncQueuedPosSales = async (cashierId) => {
    const sales = getSalesStore();
    const pending = sales.filter((sale) => sale.syncStatus === 'pending_sync' && (!cashierId || sale.cashierId === cashierId));
    let synced = 0;
    let failed = 0;

    for (const sale of pending) {
        if (!sale.terminalId || !sale.warehouseId || !navigator.onLine) {
            failed += 1;
            continue;
        }

        try {
            const syncedSale = await syncSaleToBackend(sale);
            updateStoredSale(sale.id, () => ({ ...syncedSale }));
            synced += 1;
        } catch (error) {
            updateStoredSale(sale.id, (current) => ({
                ...current,
                syncError: error.message || 'Failed to sync sale',
            }));
            failed += 1;
        }
    }

    return { synced, failed, pending: pending.length };
};

export const getCurrentPosShift = () => getActiveShiftStore();

export const buildInvoiceHtml = (sale, options = {}) => {
    const footerText = options.footerText || '';
    const lines = sale.items.map((item) => `
        <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${item.sku}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">${item.quantity}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">${Number(item.unitPrice || 0).toFixed(2)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">${Number(item.lineTotal || 0).toFixed(2)}</td>
        </tr>
    `).join('');

    return `
        <html>
            <head>
                <title>${sale.invoiceNumber}</title>
                <meta charset="utf-8" />
            </head>
            <body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;">
                <h1 style="margin:0 0 8px;">Logistra POS Receipt</h1>
                <p style="margin:0 0 4px;">Invoice: ${sale.invoiceNumber}</p>
                <p style="margin:0 0 4px;">Date: ${new Date(sale.createdAt).toLocaleString()}</p>
                <p style="margin:0 0 4px;">Cashier: ${sale.cashierName}</p>
                <p style="margin:0 0 4px;">Terminal: ${sale.terminalName || 'POS terminal'}</p>
                <p style="margin:0 0 16px;">Customer: ${sale.customerName}</p>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #cbd5e1;">Item</th>
                            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #cbd5e1;">Qty</th>
                            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #cbd5e1;">Unit</th>
                            <th style="text-align:right;padding:8px 0;border-bottom:2px solid #cbd5e1;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${lines}</tbody>
                </table>
                <div style="margin-top:16px;text-align:right;">
                    <p>Subtotal: ${Number(sale.subtotal || 0).toFixed(2)}</p>
                    <p>Discount: ${Number(sale.discountAmount || 0).toFixed(2)}</p>
                    <p>Tax: ${Number(sale.taxAmount || 0).toFixed(2)}</p>
                    <p style="font-size:20px;font-weight:700;">Total: ${Number(sale.total || 0).toFixed(2)}</p>
                </div>
                ${footerText ? `<p style="margin-top:20px;font-size:12px;color:#475569;">${footerText}</p>` : ''}
            </body>
        </html>
    `;
};

export const printPosInvoice = (sale, options = {}) => {
    const popup = window.open('', '_blank', 'width=720,height=900');
    if (!popup) {
        throw new Error('Unable to open print window');
    }

    popup.document.open();
    popup.document.write(buildInvoiceHtml(sale, options));
    popup.document.close();
    popup.focus();
    popup.print();
};
