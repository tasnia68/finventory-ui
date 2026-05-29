// Shared constants and helpers for Discounts pages

export const DISCOUNT_STATUSES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED'];
export const DISCOUNT_KINDS = [
    'AMOUNT_OFF_ORDER',
    'AMOUNT_OFF_PRODUCTS',
    'FREE_SHIPPING',
    'BOGO',
    'BUNDLE',
    'TIERED_AMOUNT_OFF_ORDER',
    'TIERED_AMOUNT_OFF_PRODUCTS',
];
export const VALUE_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'];
export const APPLIES_TO_SCOPES = ['ALL', 'PRODUCTS', 'CATEGORIES'];
export const CUSTOMER_ELIGIBILITIES = ['ALL', 'FIRST_ORDER_ONLY', 'SPECIFIC_CUSTOMERS', 'CUSTOMER_GROUPS'];
export const MIN_PURCHASE_TYPES = ['NONE', 'AMOUNT', 'QUANTITY'];
export const SALES_CHANNELS = ['ALL', 'ONLINE', 'POS'];
export const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const CODE_STATUSES = ['ACTIVE', 'INACTIVE', 'EXPIRED'];
export const INCLUSION_PRODUCT_SCOPES = ['PRODUCT', 'VARIANT', 'CATEGORY'];
export const INCLUSION_CUSTOMER_SCOPES = ['CUSTOMER', 'CUSTOMER_CATEGORY'];
export const INCLUSION_MODES = ['INCLUDE', 'EXCLUDE'];
export const CUSTOMER_CATEGORY_VALUES = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR', 'ENTERPRISE', 'GOVERNMENT', 'OTHER'];

export const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.content)) return data.data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

export const toInputDateTime = (value) => {
    if (!value) return '';
    return String(value).slice(0, 16);
};

export const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
};

export const toIntegerOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const next = Number.parseInt(value, 10);
    return Number.isFinite(next) ? next : null;
};

export const optionsFrom = (values) => values.map((v) => ({ value: v, label: v }));

export const parseCsv = (value) => String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const getDiscountBadgeVariant = (status) => {
    switch (status) {
        case 'ACTIVE':
            return 'success';
        case 'DRAFT':
            return 'warning';
        case 'SCHEDULED':
            return 'info';
        case 'PAUSED':
            return 'default';
        case 'EXPIRED':
            return 'danger';
        default:
            return 'default';
    }
};

export const getCodeBadgeVariant = (status) => {
    switch (status) {
        case 'ACTIVE': return 'success';
        case 'EXPIRED': return 'danger';
        default: return 'default';
    }
};

export const getRoleNames = (user) => (Array.isArray(user?.roles)
    ? user.roles.map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean)
    : []);

export const createDiscountForm = () => ({
    name: '',
    description: '',
    status: 'DRAFT',
    kind: 'AMOUNT_OFF_ORDER',
    valueType: 'PERCENTAGE',
    value: '',
    maxDiscountAmount: '',
    appliesToScope: 'ALL',
    customerEligibility: 'ALL',
    minPurchaseType: 'NONE',
    minPurchaseAmount: '',
    minPurchaseQuantity: '',
    usageLimitTotal: '',
    usageLimitPerCustomer: '',
    startsAt: '',
    endsAt: '',
    scheduleDaysOfWeek: [],
    scheduleStartTime: '',
    scheduleEndTime: '',
    scheduleTimezone: '',
    stackable: false,
    combineWithOrderDiscounts: false,
    combineWithProductDiscounts: false,
    combineWithShippingDiscounts: false,
    exclusionGroup: '',
    priority: '10',
    autoApply: false,
    salesChannel: 'ALL',
    // BOGO
    bogoBuyQuantity: '',
    bogoGetQuantity: '',
    bogoGetValueType: 'PERCENTAGE',
    bogoGetValue: '',
    // BUNDLE
    bundleQuantity: '',
    bundlePrice: '',
    // FREE_SHIPPING
    freeShippingMaxAmount: '',
    freeShippingCountries: '',
    // Lists
    tiers: [],
    productInclusions: [],
    customerInclusions: [],
});

export const createCodeForm = () => ({
    discountId: '',
    code: '',
    status: 'ACTIVE',
    validFrom: '',
    validTo: '',
    maxRedemptions: '',
    maxRedemptionsPerCustomer: '',
    notes: '',
});

export const discountToFormState = (d) => ({
    name: d.name || '',
    description: d.description || '',
    status: d.status || 'DRAFT',
    kind: d.kind || 'AMOUNT_OFF_ORDER',
    valueType: d.valueType || 'PERCENTAGE',
    value: d.value ?? '',
    maxDiscountAmount: d.maxDiscountAmount ?? '',
    appliesToScope: d.appliesToScope || 'ALL',
    customerEligibility: d.customerEligibility || 'ALL',
    minPurchaseType: d.minPurchaseType || 'NONE',
    minPurchaseAmount: d.minPurchaseAmount ?? '',
    minPurchaseQuantity: d.minPurchaseQuantity ?? '',
    usageLimitTotal: d.usageLimitTotal ?? '',
    usageLimitPerCustomer: d.usageLimitPerCustomer ?? '',
    startsAt: toInputDateTime(d.startsAt),
    endsAt: toInputDateTime(d.endsAt),
    scheduleDaysOfWeek: Array.isArray(d.scheduleDaysOfWeek) ? d.scheduleDaysOfWeek : [],
    scheduleStartTime: d.scheduleStartTime || '',
    scheduleEndTime: d.scheduleEndTime || '',
    scheduleTimezone: d.scheduleTimezone || '',
    stackable: Boolean(d.stackable),
    combineWithOrderDiscounts: Boolean(d.combineWithOrderDiscounts),
    combineWithProductDiscounts: Boolean(d.combineWithProductDiscounts),
    combineWithShippingDiscounts: Boolean(d.combineWithShippingDiscounts),
    exclusionGroup: d.exclusionGroup || '',
    priority: String(d.priority ?? 10),
    autoApply: Boolean(d.autoApply),
    salesChannel: d.salesChannel || 'ALL',
    bogoBuyQuantity: d.bogoBuyQuantity ?? '',
    bogoGetQuantity: d.bogoGetQuantity ?? '',
    bogoGetValueType: d.bogoGetValueType || 'PERCENTAGE',
    bogoGetValue: d.bogoGetValue ?? '',
    bundleQuantity: d.bundleQuantity ?? '',
    bundlePrice: d.bundlePrice ?? '',
    freeShippingMaxAmount: d.freeShippingMaxAmount ?? '',
    freeShippingCountries: Array.isArray(d.freeShippingCountries)
        ? d.freeShippingCountries.join(', ')
        : (d.freeShippingCountries || ''),
    tiers: Array.isArray(d.tiers) ? d.tiers.map((t) => ({
        minSubtotal: t.minSubtotal ?? '',
        minQuantity: t.minQuantity ?? '',
        valueType: t.valueType || 'PERCENTAGE',
        value: t.value ?? '',
        sortOrder: t.sortOrder ?? '',
    })) : [],
    productInclusions: Array.isArray(d.productInclusions) ? d.productInclusions.map((p) => ({
        scope: p.scope || 'PRODUCT',
        entityId: p.entityId || '',
        mode: p.mode || 'INCLUDE',
    })) : [],
    customerInclusions: Array.isArray(d.customerInclusions) ? d.customerInclusions.map((c) => ({
        scope: c.scope || 'CUSTOMER',
        entityId: c.entityId || '',
        mode: c.mode || 'INCLUDE',
    })) : [],
});

export const buildDiscountPayload = (f) => {
    const base = {
        name: f.name,
        description: f.description || null,
        status: f.status,
        kind: f.kind,
        valueType: f.valueType,
        value: toNumberOrNull(f.value),
        maxDiscountAmount: toNumberOrNull(f.maxDiscountAmount),
        appliesToScope: f.appliesToScope,
        customerEligibility: f.customerEligibility,
        minPurchaseType: f.minPurchaseType,
        minPurchaseAmount: toNumberOrNull(f.minPurchaseAmount),
        minPurchaseQuantity: toIntegerOrNull(f.minPurchaseQuantity),
        usageLimitTotal: toIntegerOrNull(f.usageLimitTotal),
        usageLimitPerCustomer: toIntegerOrNull(f.usageLimitPerCustomer),
        startsAt: f.startsAt || null,
        endsAt: f.endsAt || null,
        scheduleDaysOfWeek: f.scheduleDaysOfWeek.length ? f.scheduleDaysOfWeek : null,
        scheduleStartTime: f.scheduleStartTime || null,
        scheduleEndTime: f.scheduleEndTime || null,
        scheduleTimezone: f.scheduleTimezone || null,
        stackable: Boolean(f.stackable),
        combineWithOrderDiscounts: Boolean(f.combineWithOrderDiscounts),
        combineWithProductDiscounts: Boolean(f.combineWithProductDiscounts),
        combineWithShippingDiscounts: Boolean(f.combineWithShippingDiscounts),
        exclusionGroup: f.exclusionGroup || null,
        priority: toIntegerOrNull(f.priority),
        autoApply: Boolean(f.autoApply),
        salesChannel: f.salesChannel,
        productInclusions: f.productInclusions
            .filter((p) => p.entityId)
            .map((p) => ({ scope: p.scope, entityId: p.entityId, mode: p.mode })),
        customerInclusions: f.customerInclusions
            .filter((c) => c.entityId)
            .map((c) => ({ scope: c.scope, entityId: c.entityId, mode: c.mode })),
    };

    if (f.kind === 'BOGO') {
        base.bogoBuyQuantity = toIntegerOrNull(f.bogoBuyQuantity);
        base.bogoGetQuantity = toIntegerOrNull(f.bogoGetQuantity);
        base.bogoGetValueType = f.bogoGetValueType;
        base.bogoGetValue = toNumberOrNull(f.bogoGetValue);
    }
    if (f.kind === 'BUNDLE') {
        base.bundleQuantity = toIntegerOrNull(f.bundleQuantity);
        base.bundlePrice = toNumberOrNull(f.bundlePrice);
    }
    if (f.kind === 'FREE_SHIPPING') {
        base.freeShippingMaxAmount = toNumberOrNull(f.freeShippingMaxAmount);
        base.freeShippingCountries = parseCsv(f.freeShippingCountries);
    }
    if (f.kind === 'TIERED_AMOUNT_OFF_ORDER' || f.kind === 'TIERED_AMOUNT_OFF_PRODUCTS') {
        base.tiers = f.tiers.map((t) => ({
            minSubtotal: toNumberOrNull(t.minSubtotal),
            minQuantity: toIntegerOrNull(t.minQuantity),
            valueType: t.valueType,
            value: toNumberOrNull(t.value),
            sortOrder: toIntegerOrNull(t.sortOrder),
        }));
    }
    return base;
};

export const inputClass = 'block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export const buildInclusionOptions = (baseOptions, entityId, refDataLoading) => {
    if (refDataLoading) {
        const loadingOpt = { value: '__loading__', label: 'Loading…', disabled: true };
        const out = [loadingOpt];
        if (entityId) out.push({ value: entityId, label: `Unknown (id: ${entityId})`, disabled: true });
        return out;
    }
    if (!entityId) return baseOptions;
    const found = baseOptions.some((o) => o.value === entityId);
    if (found) return baseOptions;
    return [
        ...baseOptions,
        { value: entityId, label: `Unknown (id: ${entityId})`, disabled: true },
    ];
};
