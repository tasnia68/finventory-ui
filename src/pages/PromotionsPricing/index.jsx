import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
    InfoTip,
    Input,
    MetricCard,
    Modal,
    ProductVariantLookup,
    Select,
} from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCategories } from '../../services/categoryService';
import { getCustomers } from '../../services/customerService';
import { getPosTerminals } from '../../services/posService';
import {
    createCoupon,
    createPricingRule,
    createPromotion,
    getCoupons,
    getPricingRules,
    getPromotionAnalytics,
    getPromotions,
    previewPricing,
    updateCoupon,
    updatePricingRule,
    updatePromotion,
    validateCoupon,
} from '../../services/promotionService';
import { getWarehouses } from '../../services/warehouseService';

const SALES_CHANNELS = ['SALES_ORDER', 'POS'];
const PROMOTION_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED'];
const PROMOTION_DISCOUNT_TYPES = ['FIXED_AMOUNT', 'PERCENTAGE', 'BUNDLE', 'BUY_X_GET_Y'];
const PROMOTION_SCOPES = ['ORDER', 'LINE'];
const COUPON_STATUSES = ['ACTIVE', 'INACTIVE', 'EXPIRED'];
const PRICING_RULE_STATUSES = ['ACTIVE', 'INACTIVE'];
const PRICING_RULE_ADJUSTMENT_TYPES = ['FIXED_PRICE', 'FIXED_AMOUNT_OFF', 'PERCENTAGE_OFF'];
const CUSTOMER_CATEGORIES = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR', 'ENTERPRISE', 'GOVERNMENT', 'OTHER'];

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data?.content)) return data.data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

const toInputDateTime = (value) => {
    if (!value) return '';
    return String(value).slice(0, 16);
};

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
};

const toIntegerOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const next = Number.parseInt(value, 10);
    return Number.isFinite(next) ? next : null;
};

const parseCouponCodes = (value) => value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const createPreviewLine = () => ({
    id: crypto.randomUUID(),
    variant: null,
    quantity: '1',
    unitPrice: '',
    manualLineDiscount: '',
});

const createPromotionForm = () => ({
    name: '',
    code: '',
    description: '',
    status: 'DRAFT',
    discountType: 'PERCENTAGE',
    scope: 'ORDER',
    salesChannel: 'SALES_ORDER',
    startsAt: '',
    endsAt: '',
    stackable: true,
    couponRequired: false,
    priority: '10',
    exclusionGroup: '',
    discountValue: '',
    maxDiscountAmount: '',
    minOrderAmount: '',
    minQuantity: '',
    bundleQuantity: '',
    bundlePrice: '',
    buyQuantity: '',
    getQuantity: '',
    usageLimitTotal: '',
    usageLimitPerCustomer: '',
    customerCategory: '',
    warehouseId: '',
    terminalId: '',
    categoryId: '',
    productVariant: null,
});

const createCouponForm = () => ({
    promotionId: '',
    code: '',
    status: 'ACTIVE',
    validFrom: '',
    validTo: '',
    maxRedemptionsTotal: '',
    maxRedemptionsPerCustomer: '',
    notes: '',
});

const createRuleForm = () => ({
    name: '',
    code: '',
    status: 'ACTIVE',
    adjustmentType: 'PERCENTAGE_OFF',
    adjustmentValue: '',
    priority: '10',
    salesChannel: 'SALES_ORDER',
    validFrom: '',
    validTo: '',
    minQuantity: '',
    customerCategory: '',
    customerId: '',
    warehouseId: '',
    terminalId: '',
    categoryId: '',
    productVariant: null,
    notes: '',
});

const createPreviewForm = () => ({
    customerId: '',
    warehouseId: '',
    terminalId: '',
    salesChannel: 'SALES_ORDER',
    manualDiscountAmount: '',
    couponCodes: '',
    couponCheckCode: '',
    items: [createPreviewLine()],
});

const getRoleNames = (user) => (Array.isArray(user?.roles) ? user.roles.map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean) : []);

const getPromotionBadgeVariant = (status) => {
    switch (status) {
        case 'ACTIVE':
            return 'success';
        case 'DRAFT':
            return 'warning';
        case 'INACTIVE':
            return 'default';
        case 'EXPIRED':
            return 'danger';
        default:
            return 'default';
    }
};

const getCouponBadgeVariant = (status) => {
    switch (status) {
        case 'ACTIVE':
            return 'success';
        case 'INACTIVE':
            return 'default';
        case 'EXPIRED':
            return 'danger';
        default:
            return 'default';
    }
};

const getRuleBadgeVariant = (status) => (status === 'ACTIVE' ? 'success' : 'default');

const TabButton = ({ active, children, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
    >
        {children}
    </button>
);

const DetailField = ({ label, value }) => (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
        <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{value || '—'}</div>
    </div>
);

const PromotionsPricing = () => {
    const { user } = useAuth();
    const { t, formatCurrency, formatDateTime, formatNumber } = useLanguage();
    const roleNames = useMemo(() => getRoleNames(user), [user]);
    const canManage = roleNames.some((role) => role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER');

    const [activeTab, setActiveTab] = useState('promotions');
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [couponValidationLoading, setCouponValidationLoading] = useState(false);
    const [savingState, setSavingState] = useState('');
    const [alert, setAlert] = useState(null);
    const [analyticsNotice, setAnalyticsNotice] = useState('');

    const [promotions, setPromotions] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [pricingRules, setPricingRules] = useState([]);
    const [analytics, setAnalytics] = useState(null);

    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [terminals, setTerminals] = useState([]);

    const [selectedPromotionId, setSelectedPromotionId] = useState(null);
    const [selectedCouponId, setSelectedCouponId] = useState(null);
    const [selectedRuleId, setSelectedRuleId] = useState(null);

    const [filters, setFilters] = useState({
        query: '',
        salesChannel: '',
        promotionStatus: '',
        couponStatus: '',
        ruleStatus: '',
        couponRequired: '',
    });
    const [analyticsRange, setAnalyticsRange] = useState({ from: '', to: '' });

    const [promotionModalOpen, setPromotionModalOpen] = useState(false);
    const [couponModalOpen, setCouponModalOpen] = useState(false);
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [editingPromotionId, setEditingPromotionId] = useState(null);
    const [editingCouponId, setEditingCouponId] = useState(null);
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [promotionForm, setPromotionForm] = useState(createPromotionForm());
    const [couponForm, setCouponForm] = useState(createCouponForm());
    const [ruleForm, setRuleForm] = useState(createRuleForm());
    const [previewForm, setPreviewForm] = useState(createPreviewForm());
    const [previewResult, setPreviewResult] = useState(null);
    const [couponValidationResult, setCouponValidationResult] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const selectedPromotion = useMemo(() => promotions.find((promotion) => promotion.id === selectedPromotionId) || null, [promotions, selectedPromotionId]);
    const selectedCoupon = useMemo(() => coupons.find((coupon) => coupon.id === selectedCouponId) || null, [coupons, selectedCouponId]);
    const selectedRule = useMemo(() => pricingRules.find((rule) => rule.id === selectedRuleId) || null, [pricingRules, selectedRuleId]);

    const customerOptions = useMemo(() => customers.map((customer) => ({ value: customer.id, label: customer.name })), [customers]);
    const warehouseOptions = useMemo(() => warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })), [warehouses]);
    const categoryOptions = useMemo(() => categories.map((category) => ({ value: category.id, label: category.name })), [categories]);
    const terminalOptions = useMemo(() => terminals.map((terminal) => ({ value: terminal.id, label: `${terminal.name}${terminal.code ? ` • ${terminal.code}` : ''}` })), [terminals]);
    const promotionOptions = useMemo(() => promotions.map((promotion) => ({ value: promotion.id, label: `${promotion.code} • ${promotion.name}` })), [promotions]);

    const loadAnalytics = async () => {
        if (!canManage) {
            setAnalytics(null);
            setAnalyticsNotice('');
            return;
        }

        try {
            setAnalyticsLoading(true);
            setAnalyticsNotice('');
            const data = await getPromotionAnalytics({
                from: analyticsRange.from || undefined,
                to: analyticsRange.to || undefined,
            });
            setAnalytics(data);
        } catch (error) {
            setAnalytics(null);
            setAnalyticsNotice(error.message || t('promotionsPricing.messages.analyticsRestricted'));
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const loadWorkspace = async () => {
        try {
            setLoading(true);
            const [promotionData, couponData, ruleData, customerData, warehouseData, categoryData, terminalData] = await Promise.all([
                getPromotions(),
                getCoupons(),
                getPricingRules(),
                getCustomers(),
                getWarehouses(),
                getCategories(),
                getPosTerminals(),
            ]);

            const nextPromotions = toList(promotionData);
            const nextCoupons = toList(couponData);
            const nextRules = toList(ruleData);

            setPromotions(nextPromotions);
            setCoupons(nextCoupons);
            setPricingRules(nextRules);
            setCustomers(toList(customerData));
            setWarehouses(toList(warehouseData));
            setCategories(toList(categoryData));
            setTerminals(Array.isArray(terminalData) ? terminalData : []);

            setSelectedPromotionId((current) => nextPromotions.find((promotion) => promotion.id === current)?.id || nextPromotions[0]?.id || null);
            setSelectedCouponId((current) => nextCoupons.find((coupon) => coupon.id === current)?.id || nextCoupons[0]?.id || null);
            setSelectedRuleId((current) => nextRules.find((rule) => rule.id === current)?.id || nextRules[0]?.id || null);
        } catch (error) {
            showAlert('error', error.message || t('promotionsPricing.messages.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWorkspace();
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [canManage]);

    const filteredPromotions = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return promotions.filter((promotion) => {
            if (filters.promotionStatus && promotion.status !== filters.promotionStatus) return false;
            if (filters.salesChannel && promotion.salesChannel !== filters.salesChannel) return false;
            if (filters.couponRequired === 'true' && !promotion.couponRequired) return false;
            if (filters.couponRequired === 'false' && promotion.couponRequired) return false;
            if (!query) return true;
            return [promotion.name, promotion.code, promotion.description, promotion.exclusionGroup, promotion.productVariantSku, promotion.categoryName]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [filters, promotions]);

    const filteredCoupons = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return coupons.filter((coupon) => {
            if (filters.couponStatus && coupon.status !== filters.couponStatus) return false;
            if (filters.salesChannel && promotions.find((promotion) => promotion.id === coupon.promotionId)?.salesChannel !== filters.salesChannel) return false;
            if (!query) return true;
            return [coupon.code, coupon.promotionCode, coupon.promotionName, coupon.notes]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [coupons, filters, promotions]);

    const filteredRules = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return pricingRules.filter((rule) => {
            if (filters.ruleStatus && rule.status !== filters.ruleStatus) return false;
            if (filters.salesChannel && rule.salesChannel !== filters.salesChannel) return false;
            if (!query) return true;
            return [rule.name, rule.code, rule.notes, rule.customerName, rule.categoryName, rule.productVariantSku]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [filters, pricingRules]);

    const summary = useMemo(() => ({
        activePromotions: promotions.filter((promotion) => promotion.status === 'ACTIVE').length,
        liveCoupons: coupons.filter((coupon) => coupon.status === 'ACTIVE').length,
        activeRules: pricingRules.filter((rule) => rule.status === 'ACTIVE').length,
        totalDiscount: Number(analytics?.totalDiscount || 0),
        flaggedCount: Number(analytics?.flaggedCount || 0),
    }), [analytics, coupons, pricingRules, promotions]);

    const promotionColumns = [
        {
            key: 'name',
            header: t('promotionsPricing.columns.promotion'),
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.code} • {t(`promotionsPricing.enums.salesChannel.${row.salesChannel || 'SALES_ORDER'}`)}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: t('promotionsPricing.columns.status'),
            render: (value) => <Badge variant={getPromotionBadgeVariant(value)}>{t(`promotionsPricing.enums.promotionStatus.${value}`)}</Badge>,
        },
        {
            key: 'discountType',
            header: t('promotionsPricing.columns.discountModel'),
            render: (value) => t(`promotionsPricing.enums.discountType.${value}`),
        },
        {
            key: 'discountValue',
            header: t('promotionsPricing.columns.discountValue'),
            render: (value, row) => row.discountType === 'PERCENTAGE' ? `${formatNumber(Number(value || 0), { maximumFractionDigits: 2 })}%` : formatCurrency(Number(value || 0)),
        },
        {
            key: 'startsAt',
            header: t('promotionsPricing.columns.activeWindow'),
            render: (value, row) => `${value ? formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' }) : '—'} / ${row.endsAt ? formatDateTime(row.endsAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}`,
        },
    ];

    const couponColumns = [
        {
            key: 'code',
            header: t('promotionsPricing.columns.coupon'),
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.promotionCode} • {row.promotionName}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: t('promotionsPricing.columns.status'),
            render: (value) => <Badge variant={getCouponBadgeVariant(value)}>{t(`promotionsPricing.enums.couponStatus.${value}`)}</Badge>,
        },
        {
            key: 'redeemedCount',
            header: t('promotionsPricing.columns.redemptions'),
            render: (value) => formatNumber(Number(value || 0)),
        },
        {
            key: 'validFrom',
            header: t('promotionsPricing.columns.validity'),
            render: (value, row) => `${value ? formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' }) : '—'} / ${row.validTo ? formatDateTime(row.validTo, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}`,
        },
    ];

    const ruleColumns = [
        {
            key: 'name',
            header: t('promotionsPricing.columns.rule'),
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.code} • {t(`promotionsPricing.enums.salesChannel.${row.salesChannel || 'SALES_ORDER'}`)}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: t('promotionsPricing.columns.status'),
            render: (value) => <Badge variant={getRuleBadgeVariant(value)}>{t(`promotionsPricing.enums.ruleStatus.${value}`)}</Badge>,
        },
        {
            key: 'adjustmentType',
            header: t('promotionsPricing.columns.adjustment'),
            render: (value) => t(`promotionsPricing.enums.adjustmentType.${value}`),
        },
        {
            key: 'adjustmentValue',
            header: t('promotionsPricing.columns.adjustmentValue'),
            render: (value, row) => row.adjustmentType === 'PERCENTAGE_OFF' ? `${formatNumber(Number(value || 0), { maximumFractionDigits: 2 })}%` : formatCurrency(Number(value || 0)),
        },
        {
            key: 'validFrom',
            header: t('promotionsPricing.columns.validity'),
            render: (value, row) => `${value ? formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' }) : '—'} / ${row.validTo ? formatDateTime(row.validTo, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}`,
        },
    ];

    const openPromotionCreate = () => {
        setEditingPromotionId(null);
        setPromotionForm(createPromotionForm());
        setPromotionModalOpen(true);
    };

    const openPromotionEdit = (promotion) => {
        if (!promotion) return;
        setEditingPromotionId(promotion.id);
        setPromotionForm({
            name: promotion.name || '',
            code: promotion.code || '',
            description: promotion.description || '',
            status: promotion.status || 'DRAFT',
            discountType: promotion.discountType || 'PERCENTAGE',
            scope: promotion.scope || 'ORDER',
            salesChannel: promotion.salesChannel || 'SALES_ORDER',
            startsAt: toInputDateTime(promotion.startsAt),
            endsAt: toInputDateTime(promotion.endsAt),
            stackable: Boolean(promotion.stackable),
            couponRequired: Boolean(promotion.couponRequired),
            priority: String(promotion.priority ?? 10),
            exclusionGroup: promotion.exclusionGroup || '',
            discountValue: promotion.discountValue ?? '',
            maxDiscountAmount: promotion.maxDiscountAmount ?? '',
            minOrderAmount: promotion.minOrderAmount ?? '',
            minQuantity: promotion.minQuantity ?? '',
            bundleQuantity: promotion.bundleQuantity ?? '',
            bundlePrice: promotion.bundlePrice ?? '',
            buyQuantity: promotion.buyQuantity ?? '',
            getQuantity: promotion.getQuantity ?? '',
            usageLimitTotal: promotion.usageLimitTotal ?? '',
            usageLimitPerCustomer: promotion.usageLimitPerCustomer ?? '',
            customerCategory: promotion.customerCategory || '',
            warehouseId: promotion.warehouseId || '',
            terminalId: promotion.terminalId || '',
            categoryId: promotion.categoryId || '',
            productVariant: promotion.productVariantId ? { id: promotion.productVariantId, sku: promotion.productVariantSku || promotion.productVariantId } : null,
        });
        setPromotionModalOpen(true);
    };

    const openCouponCreate = () => {
        setEditingCouponId(null);
        setCouponForm({
            ...createCouponForm(),
            promotionId: selectedPromotionId || promotions[0]?.id || '',
            validFrom: toInputDateTime(new Date().toISOString()),
        });
        setCouponModalOpen(true);
    };

    const openCouponEdit = (coupon) => {
        if (!coupon) return;
        setEditingCouponId(coupon.id);
        setCouponForm({
            promotionId: coupon.promotionId || '',
            code: coupon.code || '',
            status: coupon.status || 'ACTIVE',
            validFrom: toInputDateTime(coupon.validFrom),
            validTo: toInputDateTime(coupon.validTo),
            maxRedemptionsTotal: coupon.maxRedemptionsTotal ?? '',
            maxRedemptionsPerCustomer: coupon.maxRedemptionsPerCustomer ?? '',
            notes: coupon.notes || '',
        });
        setCouponModalOpen(true);
    };

    const openRuleCreate = () => {
        setEditingRuleId(null);
        setRuleForm({
            ...createRuleForm(),
            validFrom: toInputDateTime(new Date().toISOString()),
        });
        setRuleModalOpen(true);
    };

    const openRuleEdit = (rule) => {
        if (!rule) return;
        setEditingRuleId(rule.id);
        setRuleForm({
            name: rule.name || '',
            code: rule.code || '',
            status: rule.status || 'ACTIVE',
            adjustmentType: rule.adjustmentType || 'PERCENTAGE_OFF',
            adjustmentValue: rule.adjustmentValue ?? '',
            priority: String(rule.priority ?? 10),
            salesChannel: rule.salesChannel || 'SALES_ORDER',
            validFrom: toInputDateTime(rule.validFrom),
            validTo: toInputDateTime(rule.validTo),
            minQuantity: rule.minQuantity ?? '',
            customerCategory: rule.customerCategory || '',
            customerId: rule.customerId || '',
            warehouseId: rule.warehouseId || '',
            terminalId: rule.terminalId || '',
            categoryId: rule.categoryId || '',
            productVariant: rule.productVariantId ? { id: rule.productVariantId, sku: rule.productVariantSku || rule.productVariantId } : null,
            notes: rule.notes || '',
        });
        setRuleModalOpen(true);
    };

    const handlePromotionSubmit = async (event) => {
        event.preventDefault();

        try {
            setSavingState('promotion');
            const payload = {
                name: promotionForm.name,
                code: promotionForm.code,
                description: promotionForm.description || null,
                status: promotionForm.status,
                discountType: promotionForm.discountType,
                scope: promotionForm.scope,
                salesChannel: promotionForm.salesChannel || null,
                startsAt: promotionForm.startsAt || null,
                endsAt: promotionForm.endsAt || null,
                stackable: Boolean(promotionForm.stackable),
                couponRequired: Boolean(promotionForm.couponRequired),
                priority: toIntegerOrNull(promotionForm.priority),
                exclusionGroup: promotionForm.exclusionGroup || null,
                discountValue: toNumberOrNull(promotionForm.discountValue),
                maxDiscountAmount: toNumberOrNull(promotionForm.maxDiscountAmount),
                minOrderAmount: toNumberOrNull(promotionForm.minOrderAmount),
                minQuantity: toNumberOrNull(promotionForm.minQuantity),
                bundleQuantity: toNumberOrNull(promotionForm.bundleQuantity),
                bundlePrice: toNumberOrNull(promotionForm.bundlePrice),
                buyQuantity: toNumberOrNull(promotionForm.buyQuantity),
                getQuantity: toNumberOrNull(promotionForm.getQuantity),
                usageLimitTotal: toIntegerOrNull(promotionForm.usageLimitTotal),
                usageLimitPerCustomer: toIntegerOrNull(promotionForm.usageLimitPerCustomer),
                customerCategory: promotionForm.customerCategory || null,
                warehouseId: promotionForm.warehouseId || null,
                terminalId: promotionForm.terminalId || null,
                categoryId: promotionForm.categoryId || null,
                productVariantId: promotionForm.productVariant?.id || null,
            };

            const saved = editingPromotionId
                ? await updatePromotion(editingPromotionId, payload)
                : await createPromotion(payload);

            setPromotionModalOpen(false);
            showAlert('success', t(editingPromotionId ? 'promotionsPricing.messages.promotionUpdated' : 'promotionsPricing.messages.promotionCreated'));
            await loadWorkspace();
            setSelectedPromotionId(saved.id);
        } catch (error) {
            showAlert('error', error.message || t('promotionsPricing.messages.promotionSaveFailed'));
        } finally {
            setSavingState('');
        }
    };

    const handleCouponSubmit = async (event) => {
        event.preventDefault();
        if (!couponForm.promotionId) {
            showAlert('error', t('promotionsPricing.messages.promotionRequired'));
            return;
        }

        try {
            setSavingState('coupon');
            const payload = {
                code: couponForm.code,
                status: couponForm.status,
                validFrom: couponForm.validFrom,
                validTo: couponForm.validTo || null,
                maxRedemptionsTotal: toIntegerOrNull(couponForm.maxRedemptionsTotal),
                maxRedemptionsPerCustomer: toIntegerOrNull(couponForm.maxRedemptionsPerCustomer),
                notes: couponForm.notes || null,
            };

            const saved = editingCouponId
                ? await updateCoupon(editingCouponId, payload)
                : await createCoupon(couponForm.promotionId, payload);

            setCouponModalOpen(false);
            showAlert('success', t(editingCouponId ? 'promotionsPricing.messages.couponUpdated' : 'promotionsPricing.messages.couponCreated'));
            await loadWorkspace();
            setSelectedCouponId(saved.id);
        } catch (error) {
            showAlert('error', error.message || t('promotionsPricing.messages.couponSaveFailed'));
        } finally {
            setSavingState('');
        }
    };

    const handleRuleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSavingState('rule');
            const payload = {
                name: ruleForm.name,
                code: ruleForm.code,
                status: ruleForm.status,
                adjustmentType: ruleForm.adjustmentType,
                adjustmentValue: toNumberOrNull(ruleForm.adjustmentValue),
                priority: toIntegerOrNull(ruleForm.priority),
                salesChannel: ruleForm.salesChannel || null,
                validFrom: ruleForm.validFrom,
                validTo: ruleForm.validTo || null,
                minQuantity: toNumberOrNull(ruleForm.minQuantity),
                customerCategory: ruleForm.customerCategory || null,
                customerId: ruleForm.customerId || null,
                warehouseId: ruleForm.warehouseId || null,
                terminalId: ruleForm.terminalId || null,
                categoryId: ruleForm.categoryId || null,
                productVariantId: ruleForm.productVariant?.id || null,
                notes: ruleForm.notes || null,
            };

            const saved = editingRuleId
                ? await updatePricingRule(editingRuleId, payload)
                : await createPricingRule(payload);

            setRuleModalOpen(false);
            showAlert('success', t(editingRuleId ? 'promotionsPricing.messages.ruleUpdated' : 'promotionsPricing.messages.ruleCreated'));
            await loadWorkspace();
            setSelectedRuleId(saved.id);
        } catch (error) {
            showAlert('error', error.message || t('promotionsPricing.messages.ruleSaveFailed'));
        } finally {
            setSavingState('');
        }
    };

    const handlePreviewLineChange = (lineId, key, value) => {
        setPreviewForm((current) => ({
            ...current,
            items: current.items.map((item) => (item.id === lineId ? { ...item, [key]: value } : item)),
        }));
    };

    const addPreviewLine = () => {
        setPreviewForm((current) => ({ ...current, items: [...current.items, createPreviewLine()] }));
    };

    const removePreviewLine = (lineId) => {
        setPreviewForm((current) => ({
            ...current,
            items: current.items.length > 1 ? current.items.filter((item) => item.id !== lineId) : current.items,
        }));
    };

    const buildPreviewPayload = () => {
        const items = previewForm.items
            .filter((item) => item.variant?.id && Number(item.quantity) > 0)
            .map((item) => {
                const payloadItem = {
                    productVariantId: item.variant.id,
                    quantity: Number(item.quantity),
                };

                const unitPrice = toNumberOrNull(item.unitPrice);
                const manualLineDiscount = toNumberOrNull(item.manualLineDiscount);
                if (unitPrice !== null) payloadItem.unitPrice = unitPrice;
                if (manualLineDiscount !== null) payloadItem.manualLineDiscount = manualLineDiscount;

                return payloadItem;
            });

        return {
            customerId: previewForm.customerId || null,
            warehouseId: previewForm.warehouseId || null,
            terminalId: previewForm.terminalId || null,
            salesChannel: previewForm.salesChannel,
            manualDiscountAmount: toNumberOrNull(previewForm.manualDiscountAmount) || 0,
            couponCodes: parseCouponCodes(previewForm.couponCodes),
            items,
        };
    };

    const handlePreviewSubmit = async (event) => {
        event.preventDefault();
        if (!previewForm.warehouseId) {
            showAlert('error', t('promotionsPricing.messages.warehouseRequired'));
            return;
        }

        const payload = buildPreviewPayload();
        if (payload.items.length === 0) {
            showAlert('error', t('promotionsPricing.messages.previewItemsRequired'));
            return;
        }

        try {
            setPreviewLoading(true);
            const result = await previewPricing(payload);
            setPreviewResult(result);
            showAlert('success', t('promotionsPricing.messages.previewGenerated'));
        } catch (error) {
            showAlert('error', error.message || t('promotionsPricing.messages.previewFailed'));
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleCouponValidation = async () => {
        if (!previewForm.couponCheckCode.trim()) {
            showAlert('error', t('promotionsPricing.messages.couponCodeRequired'));
            return;
        }
        if (!previewForm.warehouseId) {
            showAlert('error', t('promotionsPricing.messages.warehouseRequired'));
            return;
        }

        const previewPayload = buildPreviewPayload();
        if (previewPayload.items.length === 0) {
            showAlert('error', t('promotionsPricing.messages.previewItemsRequired'));
            return;
        }

        try {
            setCouponValidationLoading(true);
            const subtotal = previewPayload.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
            const result = await validateCoupon({
                couponCode: previewForm.couponCheckCode.trim(),
                customerId: previewPayload.customerId,
                warehouseId: previewPayload.warehouseId,
                terminalId: previewPayload.terminalId,
                salesChannel: previewPayload.salesChannel,
                subtotal,
                items: previewPayload.items,
            });
            setCouponValidationResult(result);
            showAlert(result.valid ? 'success' : 'error', result.message || t('promotionsPricing.messages.couponValidated'));
        } catch (error) {
            showAlert('error', error.message || t('promotionsPricing.messages.couponValidationFailed'));
        } finally {
            setCouponValidationLoading(false);
        }
    };

    const tabConfig = [
        { key: 'promotions', label: t('promotionsPricing.tabs.promotions') },
        { key: 'coupons', label: t('promotionsPricing.tabs.coupons') },
        { key: 'pricingRules', label: t('promotionsPricing.tabs.pricingRules') },
        { key: 'preview', label: t('promotionsPricing.tabs.preview') },
        { key: 'analytics', label: t('promotionsPricing.tabs.analytics') },
    ];

    const renderTabAction = () => {
        if (!canManage) return null;
        if (activeTab === 'promotions') {
            return <Button icon="campaign" onClick={openPromotionCreate}>{t('promotionsPricing.actions.newPromotion')}</Button>;
        }
        if (activeTab === 'coupons') {
            return <Button icon="sell" onClick={openCouponCreate}>{t('promotionsPricing.actions.newCoupon')}</Button>;
        }
        if (activeTab === 'pricingRules') {
            return <Button icon="rule_settings" onClick={openRuleCreate}>{t('promotionsPricing.actions.newRule')}</Button>;
        }
        return null;
    };

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background-light p-4 sm:p-6 lg:p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-6 sm:gap-8">
                <SalesHero
                    eyebrow={t('promotionsPricing.eyebrow')}
                    title={t('promotionsPricing.title')}
                    description={t('promotionsPricing.description')}
                    accent="from-sky-500/20 via-transparent to-emerald-500/15"
                    actions={(
                        <>
                            <Input
                                value={filters.query}
                                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                                placeholder={t('promotionsPricing.filters.searchPlaceholder')}
                                className="min-w-[240px]"
                            />
                            <Select
                                value={filters.salesChannel}
                                onChange={(event) => setFilters((current) => ({ ...current, salesChannel: event.target.value }))}
                                options={SALES_CHANNELS.map((value) => ({ value, label: t(`promotionsPricing.enums.salesChannel.${value}`) }))}
                                placeholder={t('promotionsPricing.filters.channel')}
                                className="min-w-[200px]"
                            />
                            {activeTab === 'promotions' ? (
                                <Select
                                    value={filters.promotionStatus}
                                    onChange={(event) => setFilters((current) => ({ ...current, promotionStatus: event.target.value }))}
                                    options={PROMOTION_STATUSES.map((value) => ({ value, label: t(`promotionsPricing.enums.promotionStatus.${value}`) }))}
                                    placeholder={t('promotionsPricing.filters.status')}
                                    className="min-w-[200px]"
                                />
                            ) : null}
                            {activeTab === 'coupons' ? (
                                <Select
                                    value={filters.couponStatus}
                                    onChange={(event) => setFilters((current) => ({ ...current, couponStatus: event.target.value }))}
                                    options={COUPON_STATUSES.map((value) => ({ value, label: t(`promotionsPricing.enums.couponStatus.${value}`) }))}
                                    placeholder={t('promotionsPricing.filters.status')}
                                    className="min-w-[200px]"
                                />
                            ) : null}
                            {activeTab === 'pricingRules' ? (
                                <Select
                                    value={filters.ruleStatus}
                                    onChange={(event) => setFilters((current) => ({ ...current, ruleStatus: event.target.value }))}
                                    options={PRICING_RULE_STATUSES.map((value) => ({ value, label: t(`promotionsPricing.enums.ruleStatus.${value}`) }))}
                                    placeholder={t('promotionsPricing.filters.status')}
                                    className="min-w-[200px]"
                                />
                            ) : null}
                            {activeTab === 'promotions' ? (
                                <Select
                                    value={filters.couponRequired}
                                    onChange={(event) => setFilters((current) => ({ ...current, couponRequired: event.target.value }))}
                                    options={[
                                        { value: 'true', label: t('promotionsPricing.filters.couponRequired') },
                                        { value: 'false', label: t('promotionsPricing.filters.noCouponRequired') },
                                    ]}
                                    placeholder={t('promotionsPricing.filters.couponGate')}
                                    className="min-w-[200px]"
                                />
                            ) : null}
                            <Button variant="secondary" icon="sync" onClick={async () => {
                                await loadWorkspace();
                                await loadAnalytics();
                            }}>{t('promotionsPricing.actions.refresh')}</Button>
                            {renderTabAction()}
                        </>
                    )}
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <MetricCard title={t('promotionsPricing.metrics.activePromotions')} value={formatNumber(summary.activePromotions)} icon="campaign" tone="blue" info={t('promotionsPricing.metricInfo.activePromotions')} caption={t('promotionsPricing.metricCaption.activePromotions')} />
                    <MetricCard title={t('promotionsPricing.metrics.liveCoupons')} value={formatNumber(summary.liveCoupons)} icon="sell" tone="emerald" info={t('promotionsPricing.metricInfo.liveCoupons')} caption={t('promotionsPricing.metricCaption.liveCoupons')} />
                    <MetricCard title={t('promotionsPricing.metrics.activeRules')} value={formatNumber(summary.activeRules)} icon="rule_settings" tone="amber" info={t('promotionsPricing.metricInfo.activeRules')} caption={t('promotionsPricing.metricCaption.activeRules')} />
                    <MetricCard title={t('promotionsPricing.metrics.totalDiscount')} value={canManage ? formatCurrency(summary.totalDiscount) : '—'} icon="local_offer" tone="violet" info={t('promotionsPricing.metricInfo.totalDiscount')} caption={t('promotionsPricing.metricCaption.totalDiscount')} />
                    <MetricCard title={t('promotionsPricing.metrics.flaggedUsage')} value={canManage ? formatNumber(summary.flaggedCount) : '—'} icon="warning" tone="rose" info={t('promotionsPricing.metricInfo.flaggedUsage')} caption={t('promotionsPricing.metricCaption.flaggedUsage')} />
                </div>

                <Card title={t('promotionsPricing.workspace.title')} subtitle={t('promotionsPricing.workspace.subtitle')} action={<InfoTip text={t('promotionsPricing.workspace.info')} />}>
                    <div className="flex flex-wrap gap-2">
                        {tabConfig.map((tab) => (
                            <TabButton key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
                                {tab.label}
                            </TabButton>
                        ))}
                    </div>
                </Card>

                {activeTab === 'promotions' ? (
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
                        <Card padding="none" className="overflow-hidden" title={t('promotionsPricing.registers.promotions.title')} subtitle={t('promotionsPricing.registers.promotions.subtitle')} action={<InfoTip text={t('promotionsPricing.registers.promotions.info')} />}>
                            <DataTable columns={promotionColumns} data={filteredPromotions} loading={loading} emptyMessage={t('promotionsPricing.registers.promotions.empty')} onRowClick={(row) => setSelectedPromotionId(row.id)} />
                        </Card>

                        <Card title={t('promotionsPricing.detail.promotionTitle')} subtitle={selectedPromotion ? selectedPromotion.code : t('promotionsPricing.detail.emptySubtitle')} action={selectedPromotion && canManage ? <Button size="sm" variant="secondary" onClick={() => openPromotionEdit(selectedPromotion)}>{t('promotionsPricing.actions.edit')}</Button> : null}>
                            {!selectedPromotion ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('promotionsPricing.detail.emptyPromotion')}</div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/50">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedPromotion.name}</div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <Badge variant={getPromotionBadgeVariant(selectedPromotion.status)}>{t(`promotionsPricing.enums.promotionStatus.${selectedPromotion.status}`)}</Badge>
                                                    <Badge variant="default">{t(`promotionsPricing.enums.discountType.${selectedPromotion.discountType}`)}</Badge>
                                                    <span>{t(`promotionsPricing.enums.scope.${selectedPromotion.scope}`)}</span>
                                                </div>
                                            </div>
                                            <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">{selectedPromotion.code}</div>
                                        </div>
                                        {selectedPromotion.description ? <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{selectedPromotion.description}</p> : null}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <DetailField label={t('promotionsPricing.labels.channel')} value={selectedPromotion.salesChannel ? t(`promotionsPricing.enums.salesChannel.${selectedPromotion.salesChannel}`) : '—'} />
                                        <DetailField label={t('promotionsPricing.labels.priority')} value={selectedPromotion.priority} />
                                        <DetailField label={t('promotionsPricing.labels.discountValue')} value={selectedPromotion.discountType === 'PERCENTAGE' ? `${formatNumber(Number(selectedPromotion.discountValue || 0), { maximumFractionDigits: 2 })}%` : formatCurrency(Number(selectedPromotion.discountValue || 0))} />
                                        <DetailField label={t('promotionsPricing.labels.maxDiscount')} value={selectedPromotion.maxDiscountAmount ? formatCurrency(Number(selectedPromotion.maxDiscountAmount)) : '—'} />
                                        <DetailField label={t('promotionsPricing.labels.window')} value={`${selectedPromotion.startsAt ? formatDateTime(selectedPromotion.startsAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'} / ${selectedPromotion.endsAt ? formatDateTime(selectedPromotion.endsAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}`} />
                                        <DetailField label={t('promotionsPricing.labels.scopeTarget')} value={selectedPromotion.productVariantSku || selectedPromotion.categoryName || selectedPromotion.terminalName || selectedPromotion.warehouseName || t('promotionsPricing.labels.orderWide')} />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <DetailField label={t('promotionsPricing.labels.stackable')} value={selectedPromotion.stackable ? t('promotionsPricing.labels.yes') : t('promotionsPricing.labels.no')} />
                                        <DetailField label={t('promotionsPricing.labels.couponRequired')} value={selectedPromotion.couponRequired ? t('promotionsPricing.labels.yes') : t('promotionsPricing.labels.no')} />
                                        <DetailField label={t('promotionsPricing.labels.exclusionGroup')} value={selectedPromotion.exclusionGroup || '—'} />
                                        <DetailField label={t('promotionsPricing.labels.customerCategory')} value={selectedPromotion.customerCategory ? t(`promotionsPricing.enums.customerCategory.${selectedPromotion.customerCategory}`) : '—'} />
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                ) : null}

                {activeTab === 'coupons' ? (
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
                        <Card padding="none" className="overflow-hidden" title={t('promotionsPricing.registers.coupons.title')} subtitle={t('promotionsPricing.registers.coupons.subtitle')} action={<InfoTip text={t('promotionsPricing.registers.coupons.info')} />}>
                            <DataTable columns={couponColumns} data={filteredCoupons} loading={loading} emptyMessage={t('promotionsPricing.registers.coupons.empty')} onRowClick={(row) => setSelectedCouponId(row.id)} />
                        </Card>

                        <Card title={t('promotionsPricing.detail.couponTitle')} subtitle={selectedCoupon ? selectedCoupon.code : t('promotionsPricing.detail.emptySubtitle')} action={selectedCoupon && canManage ? <Button size="sm" variant="secondary" onClick={() => openCouponEdit(selectedCoupon)}>{t('promotionsPricing.actions.edit')}</Button> : null}>
                            {!selectedCoupon ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('promotionsPricing.detail.emptyCoupon')}</div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/50">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedCoupon.code}</div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <Badge variant={getCouponBadgeVariant(selectedCoupon.status)}>{t(`promotionsPricing.enums.couponStatus.${selectedCoupon.status}`)}</Badge>
                                                    <span>{selectedCoupon.promotionCode}</span>
                                                    <span>•</span>
                                                    <span>{selectedCoupon.promotionName}</span>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm font-semibold text-slate-900 dark:text-white">{formatNumber(Number(selectedCoupon.redeemedCount || 0))}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <DetailField label={t('promotionsPricing.labels.validFrom')} value={selectedCoupon.validFrom ? formatDateTime(selectedCoupon.validFrom, { dateStyle: 'medium', timeStyle: 'short' }) : '—'} />
                                        <DetailField label={t('promotionsPricing.labels.validTo')} value={selectedCoupon.validTo ? formatDateTime(selectedCoupon.validTo, { dateStyle: 'medium', timeStyle: 'short' }) : '—'} />
                                        <DetailField label={t('promotionsPricing.labels.totalLimit')} value={selectedCoupon.maxRedemptionsTotal ?? '—'} />
                                        <DetailField label={t('promotionsPricing.labels.customerLimit')} value={selectedCoupon.maxRedemptionsPerCustomer ?? '—'} />
                                    </div>

                                    <Card className="bg-slate-50/70 dark:bg-slate-900/40" title={t('promotionsPricing.detail.couponNotes')} subtitle={t('promotionsPricing.detail.couponNotesSubtitle')}>
                                        <div className="text-sm leading-6 text-slate-500 dark:text-slate-400">{selectedCoupon.notes || t('promotionsPricing.detail.noNotes')}</div>
                                    </Card>
                                </div>
                            )}
                        </Card>
                    </div>
                ) : null}

                {activeTab === 'pricingRules' ? (
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
                        <Card padding="none" className="overflow-hidden" title={t('promotionsPricing.registers.rules.title')} subtitle={t('promotionsPricing.registers.rules.subtitle')} action={<InfoTip text={t('promotionsPricing.registers.rules.info')} />}>
                            <DataTable columns={ruleColumns} data={filteredRules} loading={loading} emptyMessage={t('promotionsPricing.registers.rules.empty')} onRowClick={(row) => setSelectedRuleId(row.id)} />
                        </Card>

                        <Card title={t('promotionsPricing.detail.ruleTitle')} subtitle={selectedRule ? selectedRule.code : t('promotionsPricing.detail.emptySubtitle')} action={selectedRule && canManage ? <Button size="sm" variant="secondary" onClick={() => openRuleEdit(selectedRule)}>{t('promotionsPricing.actions.edit')}</Button> : null}>
                            {!selectedRule ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('promotionsPricing.detail.emptyRule')}</div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/50">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedRule.name}</div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <Badge variant={getRuleBadgeVariant(selectedRule.status)}>{t(`promotionsPricing.enums.ruleStatus.${selectedRule.status}`)}</Badge>
                                                    <span>{t(`promotionsPricing.enums.adjustmentType.${selectedRule.adjustmentType}`)}</span>
                                                </div>
                                            </div>
                                            <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">{selectedRule.code}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <DetailField label={t('promotionsPricing.labels.channel')} value={selectedRule.salesChannel ? t(`promotionsPricing.enums.salesChannel.${selectedRule.salesChannel}`) : '—'} />
                                        <DetailField label={t('promotionsPricing.labels.priority')} value={selectedRule.priority} />
                                        <DetailField label={t('promotionsPricing.labels.adjustmentValue')} value={selectedRule.adjustmentType === 'PERCENTAGE_OFF' ? `${formatNumber(Number(selectedRule.adjustmentValue || 0), { maximumFractionDigits: 2 })}%` : formatCurrency(Number(selectedRule.adjustmentValue || 0))} />
                                        <DetailField label={t('promotionsPricing.labels.minQuantity')} value={selectedRule.minQuantity ?? '—'} />
                                        <DetailField label={t('promotionsPricing.labels.customer')} value={selectedRule.customerName || '—'} />
                                        <DetailField label={t('promotionsPricing.labels.scopeTarget')} value={selectedRule.productVariantSku || selectedRule.categoryName || selectedRule.terminalName || selectedRule.warehouseName || t('promotionsPricing.labels.orderWide')} />
                                    </div>

                                    <Card className="bg-slate-50/70 dark:bg-slate-900/40" title={t('promotionsPricing.detail.ruleNotes')} subtitle={t('promotionsPricing.detail.ruleNotesSubtitle')}>
                                        <div className="text-sm leading-6 text-slate-500 dark:text-slate-400">{selectedRule.notes || t('promotionsPricing.detail.noNotes')}</div>
                                    </Card>
                                </div>
                            )}
                        </Card>
                    </div>
                ) : null}

                {activeTab === 'preview' ? (
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(380px,1fr)]">
                        <Card title={t('promotionsPricing.preview.title')} subtitle={t('promotionsPricing.preview.subtitle')} action={<InfoTip text={t('promotionsPricing.preview.info')} />}>
                            <form className="space-y-6" onSubmit={handlePreviewSubmit}>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <Select label={t('promotionsPricing.forms.channel')} value={previewForm.salesChannel} onChange={(event) => setPreviewForm((current) => ({ ...current, salesChannel: event.target.value }))} options={SALES_CHANNELS.map((value) => ({ value, label: t(`promotionsPricing.enums.salesChannel.${value}`) }))} placeholder={t('promotionsPricing.forms.channel')} />
                                    <Select label={t('promotionsPricing.forms.customer')} value={previewForm.customerId} onChange={(event) => setPreviewForm((current) => ({ ...current, customerId: event.target.value }))} options={customerOptions} placeholder={t('promotionsPricing.forms.optionalCustomer')} />
                                    <Select label={t('promotionsPricing.forms.warehouse')} value={previewForm.warehouseId} onChange={(event) => setPreviewForm((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouseOptions} placeholder={t('promotionsPricing.forms.selectWarehouse')} required />
                                    <Select label={t('promotionsPricing.forms.terminal')} value={previewForm.terminalId} onChange={(event) => setPreviewForm((current) => ({ ...current, terminalId: event.target.value }))} options={terminalOptions} placeholder={t('promotionsPricing.forms.optionalTerminal')} />
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Input label={t('promotionsPricing.forms.manualDiscount')} type="number" min="0" step="0.01" value={previewForm.manualDiscountAmount} onChange={(event) => setPreviewForm((current) => ({ ...current, manualDiscountAmount: event.target.value }))} placeholder={t('promotionsPricing.forms.manualDiscountPlaceholder')} />
                                    <Input label={t('promotionsPricing.forms.couponCodes')} value={previewForm.couponCodes} onChange={(event) => setPreviewForm((current) => ({ ...current, couponCodes: event.target.value }))} placeholder={t('promotionsPricing.forms.couponCodesPlaceholder')} />
                                </div>

                                <div className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('promotionsPricing.preview.lines')}</h3>
                                            <InfoTip text={t('promotionsPricing.preview.linesInfo')} />
                                        </div>
                                        <Button type="button" size="sm" variant="ghost" onClick={addPreviewLine}>{t('promotionsPricing.actions.addLine')}</Button>
                                    </div>

                                    {previewForm.items.map((item, index) => (
                                        <div key={item.id} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{t('promotionsPricing.preview.lineLabel', { value: index + 1 })}</div>
                                                {previewForm.items.length > 1 ? <Button type="button" size="sm" variant="ghost" onClick={() => removePreviewLine(item.id)}>{t('promotionsPricing.actions.remove')}</Button> : null}
                                            </div>
                                            <ProductVariantLookup label={t('promotionsPricing.forms.variant')} placeholder={t('promotionsPricing.forms.variantPlaceholder')} selectedVariant={item.variant} onSelect={(variant) => handlePreviewLineChange(item.id, 'variant', variant)} />
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                <Input label={t('promotionsPricing.forms.quantity')} type="number" min="0.000001" step="0.01" value={item.quantity} onChange={(event) => handlePreviewLineChange(item.id, 'quantity', event.target.value)} />
                                                <Input label={t('promotionsPricing.forms.unitPrice')} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => handlePreviewLineChange(item.id, 'unitPrice', event.target.value)} placeholder={t('promotionsPricing.forms.optionalUnitPrice')} />
                                                <Input label={t('promotionsPricing.forms.manualLineDiscount')} type="number" min="0" step="0.01" value={item.manualLineDiscount} onChange={(event) => handlePreviewLineChange(item.id, 'manualLineDiscount', event.target.value)} placeholder={t('promotionsPricing.forms.manualLineDiscountPlaceholder')} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap justify-end gap-3">
                                    <Button type="submit" loading={previewLoading} icon="calculate">{t('promotionsPricing.actions.generatePreview')}</Button>
                                </div>
                            </form>
                        </Card>

                        <div className="space-y-8">
                            <Card title={t('promotionsPricing.preview.resultTitle')} subtitle={t('promotionsPricing.preview.resultSubtitle')} action={<InfoTip text={t('promotionsPricing.preview.resultInfo')} />}>
                                {!previewResult ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('promotionsPricing.preview.empty')}</div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <DetailField label={t('promotionsPricing.preview.baseSubtotal')} value={formatCurrency(Number(previewResult.baseSubtotal || 0))} />
                                            <DetailField label={t('promotionsPricing.preview.totalDiscount')} value={formatCurrency(Number(previewResult.totalDiscount || 0))} />
                                            <DetailField label={t('promotionsPricing.preview.orderDiscount')} value={formatCurrency(Number(previewResult.orderDiscountTotal || 0))} />
                                            <DetailField label={t('promotionsPricing.preview.netSubtotal')} value={formatCurrency(Number(previewResult.netSubtotal || 0))} />
                                        </div>

                                        <div>
                                            <div className="mb-3 flex items-center gap-2">
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('promotionsPricing.preview.appliedPromotions')}</h3>
                                                <InfoTip text={t('promotionsPricing.preview.appliedPromotionsInfo')} />
                                            </div>
                                            <div className="space-y-3">
                                                {(previewResult.appliedPromotions || []).length === 0 ? (
                                                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('promotionsPricing.preview.noPromotions')}</div>
                                                ) : previewResult.appliedPromotions.map((promotion) => (
                                                    <div key={`${promotion.promotionId}-${promotion.couponId || 'none'}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div>
                                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{promotion.promotionName}</div>
                                                                <div className="text-xs text-slate-500 dark:text-slate-400">{promotion.promotionCode}{promotion.couponCode ? ` • ${promotion.couponCode}` : ''}</div>
                                                            </div>
                                                            <Badge variant="success">{formatCurrency(Number(promotion.discountAmount || 0))}</Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="mb-3 flex items-center gap-2">
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t('promotionsPricing.preview.lineResults')}</h3>
                                                <InfoTip text={t('promotionsPricing.preview.lineResultsInfo')} />
                                            </div>
                                            <div className="space-y-3">
                                                {(previewResult.lines || []).map((line) => (
                                                    <div key={`${line.productVariantId}-${line.sku}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                                            <div>
                                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{line.sku || line.productVariantId}</div>
                                                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('promotionsPricing.preview.qtyLabel', { value: formatNumber(Number(line.quantity || 0), { maximumFractionDigits: 2 }) })}</div>
                                                            </div>
                                                            <Badge variant="primary">{formatCurrency(Number(line.lineTotalAmount || 0))}</Badge>
                                                        </div>
                                                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                            <DetailField label={t('promotionsPricing.preview.baseUnitPrice')} value={formatCurrency(Number(line.baseUnitPrice || 0))} />
                                                            <DetailField label={t('promotionsPricing.preview.finalUnitPrice')} value={formatCurrency(Number(line.finalUnitPrice || 0))} />
                                                            <DetailField label={t('promotionsPricing.preview.lineDiscount')} value={formatCurrency(Number(line.lineDiscountAmount || 0))} />
                                                        </div>
                                                        {(line.appliedPromotionCodes || []).length > 0 ? (
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {line.appliedPromotionCodes.map((code) => <Badge key={code} variant="default">{code}</Badge>)}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            <Card title={t('promotionsPricing.validation.title')} subtitle={t('promotionsPricing.validation.subtitle')} action={<InfoTip text={t('promotionsPricing.validation.info')} />}>
                                <div className="space-y-4">
                                    <Input label={t('promotionsPricing.validation.couponCode')} value={previewForm.couponCheckCode} onChange={(event) => setPreviewForm((current) => ({ ...current, couponCheckCode: event.target.value }))} placeholder={t('promotionsPricing.validation.couponCodePlaceholder')} />
                                    <div className="flex justify-end">
                                        <Button loading={couponValidationLoading} icon="verified" onClick={handleCouponValidation}>{t('promotionsPricing.actions.validateCoupon')}</Button>
                                    </div>
                                    {couponValidationResult ? (
                                        <div className={`rounded-2xl border p-4 ${couponValidationResult.valid ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-900/20' : 'border-rose-200 bg-rose-50/70 dark:border-rose-700 dark:bg-rose-900/20'}`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{couponValidationResult.valid ? t('promotionsPricing.validation.valid') : t('promotionsPricing.validation.invalid')}</div>
                                                <Badge variant={couponValidationResult.valid ? 'success' : 'danger'}>{couponValidationResult.coupon?.code || previewForm.couponCheckCode}</Badge>
                                            </div>
                                            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{couponValidationResult.message || '—'}</div>
                                        </div>
                                    ) : null}
                                </div>
                            </Card>
                        </div>
                    </div>
                ) : null}

                {activeTab === 'analytics' ? (
                    <div className="space-y-8">
                        <Card title={t('promotionsPricing.analytics.title')} subtitle={t('promotionsPricing.analytics.subtitle')} action={<InfoTip text={t('promotionsPricing.analytics.info')} />}>
                            <div className="flex flex-wrap items-end gap-4">
                                <Input label={t('promotionsPricing.analytics.from')} type="datetime-local" value={analyticsRange.from} onChange={(event) => setAnalyticsRange((current) => ({ ...current, from: event.target.value }))} className="min-w-[220px]" />
                                <Input label={t('promotionsPricing.analytics.to')} type="datetime-local" value={analyticsRange.to} onChange={(event) => setAnalyticsRange((current) => ({ ...current, to: event.target.value }))} className="min-w-[220px]" />
                                <Button loading={analyticsLoading} icon="insights" onClick={loadAnalytics}>{t('promotionsPricing.actions.refreshAnalytics')}</Button>
                            </div>
                        </Card>

                        {!canManage ? (
                            <Card>
                                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('promotionsPricing.analytics.restricted')}</div>
                            </Card>
                        ) : analyticsNotice ? (
                            <Alert type="error" message={analyticsNotice} onDismiss={() => setAnalyticsNotice('')} />
                        ) : (
                            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)]">
                                <Card padding="none" className="overflow-hidden" title={t('promotionsPricing.analytics.leaderboardTitle')} subtitle={t('promotionsPricing.analytics.leaderboardSubtitle')} action={<InfoTip text={t('promotionsPricing.analytics.leaderboardInfo')} />}>
                                    <DataTable
                                        loading={analyticsLoading}
                                        emptyMessage={t('promotionsPricing.analytics.empty')}
                                        columns={[
                                            {
                                                key: 'promotionName',
                                                header: t('promotionsPricing.analytics.columns.promotion'),
                                                render: (value, row) => (
                                                    <div>
                                                        <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{row.promotionCode}</div>
                                                    </div>
                                                ),
                                            },
                                            {
                                                key: 'appliedCount',
                                                header: t('promotionsPricing.analytics.columns.applied'),
                                                render: (value) => formatNumber(Number(value || 0)),
                                            },
                                            {
                                                key: 'flaggedCount',
                                                header: t('promotionsPricing.analytics.columns.flagged'),
                                                render: (value) => <Badge variant={Number(value || 0) > 0 ? 'danger' : 'success'}>{formatNumber(Number(value || 0))}</Badge>,
                                            },
                                            {
                                                key: 'totalDiscount',
                                                header: t('promotionsPricing.analytics.columns.discount'),
                                                render: (value) => formatCurrency(Number(value || 0)),
                                            },
                                        ]}
                                        data={analytics?.promotions || []}
                                    />
                                </Card>

                                <Card title={t('promotionsPricing.analytics.summaryTitle')} subtitle={t('promotionsPricing.analytics.summarySubtitle')}>
                                    <div className="space-y-4">
                                        <DetailField label={t('promotionsPricing.analytics.appliedCount')} value={formatNumber(Number(analytics?.appliedCount || 0))} />
                                        <DetailField label={t('promotionsPricing.analytics.flaggedCount')} value={formatNumber(Number(analytics?.flaggedCount || 0))} />
                                        <DetailField label={t('promotionsPricing.analytics.totalDiscount')} value={formatCurrency(Number(analytics?.totalDiscount || 0))} />
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            <Modal isOpen={promotionModalOpen} onClose={() => setPromotionModalOpen(false)} title={editingPromotionId ? t('promotionsPricing.forms.editPromotion') : t('promotionsPricing.forms.newPromotion')} size="xl">
                <form className="space-y-5" onSubmit={handlePromotionSubmit}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Input label={t('promotionsPricing.forms.name')} value={promotionForm.name} onChange={(event) => setPromotionForm((current) => ({ ...current, name: event.target.value }))} required />
                        <Input label={t('promotionsPricing.forms.code')} value={promotionForm.code} onChange={(event) => setPromotionForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required />
                        <Select label={t('promotionsPricing.forms.status')} value={promotionForm.status} onChange={(event) => setPromotionForm((current) => ({ ...current, status: event.target.value }))} options={PROMOTION_STATUSES.map((value) => ({ value, label: t(`promotionsPricing.enums.promotionStatus.${value}`) }))} placeholder={t('promotionsPricing.forms.status')} />
                        <Select label={t('promotionsPricing.forms.discountType')} value={promotionForm.discountType} onChange={(event) => setPromotionForm((current) => ({ ...current, discountType: event.target.value }))} options={PROMOTION_DISCOUNT_TYPES.map((value) => ({ value, label: t(`promotionsPricing.enums.discountType.${value}`) }))} placeholder={t('promotionsPricing.forms.discountType')} />
                        <Select label={t('promotionsPricing.forms.scope')} value={promotionForm.scope} onChange={(event) => setPromotionForm((current) => ({ ...current, scope: event.target.value }))} options={PROMOTION_SCOPES.map((value) => ({ value, label: t(`promotionsPricing.enums.scope.${value}`) }))} placeholder={t('promotionsPricing.forms.scope')} />
                        <Select label={t('promotionsPricing.forms.channel')} value={promotionForm.salesChannel} onChange={(event) => setPromotionForm((current) => ({ ...current, salesChannel: event.target.value }))} options={SALES_CHANNELS.map((value) => ({ value, label: t(`promotionsPricing.enums.salesChannel.${value}`) }))} placeholder={t('promotionsPricing.forms.channel')} />
                        <Input label={t('promotionsPricing.forms.startsAt')} type="datetime-local" value={promotionForm.startsAt} onChange={(event) => setPromotionForm((current) => ({ ...current, startsAt: event.target.value }))} />
                        <Input label={t('promotionsPricing.forms.endsAt')} type="datetime-local" value={promotionForm.endsAt} onChange={(event) => setPromotionForm((current) => ({ ...current, endsAt: event.target.value }))} />
                        <Input label={t('promotionsPricing.forms.priority')} type="number" min="0" value={promotionForm.priority} onChange={(event) => setPromotionForm((current) => ({ ...current, priority: event.target.value }))} />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('promotionsPricing.forms.description')}</label>
                        <textarea value={promotionForm.description} onChange={(event) => setPromotionForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t('promotionsPricing.forms.descriptionPlaceholder')} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Input label={t('promotionsPricing.forms.discountValue')} type="number" min="0" step="0.01" value={promotionForm.discountValue} onChange={(event) => setPromotionForm((current) => ({ ...current, discountValue: event.target.value }))} />
                        <Input label={t('promotionsPricing.forms.maxDiscountAmount')} type="number" min="0" step="0.01" value={promotionForm.maxDiscountAmount} onChange={(event) => setPromotionForm((current) => ({ ...current, maxDiscountAmount: event.target.value }))} />
                        <Input label={t('promotionsPricing.forms.minOrderAmount')} type="number" min="0" step="0.01" value={promotionForm.minOrderAmount} onChange={(event) => setPromotionForm((current) => ({ ...current, minOrderAmount: event.target.value }))} />
                        <Input label={t('promotionsPricing.forms.minQuantity')} type="number" min="0" step="0.01" value={promotionForm.minQuantity} onChange={(event) => setPromotionForm((current) => ({ ...current, minQuantity: event.target.value }))} />
                    </div>

                    {promotionForm.discountType === 'BUNDLE' ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input label={t('promotionsPricing.forms.bundleQuantity')} type="number" min="0" step="0.01" value={promotionForm.bundleQuantity} onChange={(event) => setPromotionForm((current) => ({ ...current, bundleQuantity: event.target.value }))} />
                            <Input label={t('promotionsPricing.forms.bundlePrice')} type="number" min="0" step="0.01" value={promotionForm.bundlePrice} onChange={(event) => setPromotionForm((current) => ({ ...current, bundlePrice: event.target.value }))} />
                        </div>
                    ) : null}

                    {promotionForm.discountType === 'BUY_X_GET_Y' ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input label={t('promotionsPricing.forms.buyQuantity')} type="number" min="0" step="0.01" value={promotionForm.buyQuantity} onChange={(event) => setPromotionForm((current) => ({ ...current, buyQuantity: event.target.value }))} />
                            <Input label={t('promotionsPricing.forms.getQuantity')} type="number" min="0" step="0.01" value={promotionForm.getQuantity} onChange={(event) => setPromotionForm((current) => ({ ...current, getQuantity: event.target.value }))} />
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Select label={t('promotionsPricing.forms.customerCategory')} value={promotionForm.customerCategory} onChange={(event) => setPromotionForm((current) => ({ ...current, customerCategory: event.target.value }))} options={CUSTOMER_CATEGORIES.map((value) => ({ value, label: t(`promotionsPricing.enums.customerCategory.${value}`) }))} placeholder={t('promotionsPricing.forms.optionalCustomerCategory')} />
                        <Select label={t('promotionsPricing.forms.warehouse')} value={promotionForm.warehouseId} onChange={(event) => setPromotionForm((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouseOptions} placeholder={t('promotionsPricing.forms.optionalWarehouse')} />
                        <Select label={t('promotionsPricing.forms.terminal')} value={promotionForm.terminalId} onChange={(event) => setPromotionForm((current) => ({ ...current, terminalId: event.target.value }))} options={terminalOptions} placeholder={t('promotionsPricing.forms.optionalTerminal')} />
                        <Select label={t('promotionsPricing.forms.category')} value={promotionForm.categoryId} onChange={(event) => setPromotionForm((current) => ({ ...current, categoryId: event.target.value }))} options={categoryOptions} placeholder={t('promotionsPricing.forms.optionalCategory')} />
                    </div>

                    <ProductVariantLookup label={t('promotionsPricing.forms.variant')} placeholder={t('promotionsPricing.forms.variantPlaceholder')} selectedVariant={promotionForm.productVariant} onSelect={(variant) => setPromotionForm((current) => ({ ...current, productVariant: variant }))} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Input label={t('promotionsPricing.forms.exclusionGroup')} value={promotionForm.exclusionGroup} onChange={(event) => setPromotionForm((current) => ({ ...current, exclusionGroup: event.target.value }))} />
                        <Input label={t('promotionsPricing.forms.usageLimitTotal')} type="number" min="0" value={promotionForm.usageLimitTotal} onChange={(event) => setPromotionForm((current) => ({ ...current, usageLimitTotal: event.target.value }))} />
                        <Input label={t('promotionsPricing.forms.usageLimitPerCustomer')} type="number" min="0" value={promotionForm.usageLimitPerCustomer} onChange={(event) => setPromotionForm((current) => ({ ...current, usageLimitPerCustomer: event.target.value }))} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
                            <input type="checkbox" checked={promotionForm.stackable} onChange={(event) => setPromotionForm((current) => ({ ...current, stackable: event.target.checked }))} className="size-4 rounded border-slate-300 text-primary focus:ring-primary/40" />
                            {t('promotionsPricing.forms.stackable')}
                        </label>
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
                            <input type="checkbox" checked={promotionForm.couponRequired} onChange={(event) => setPromotionForm((current) => ({ ...current, couponRequired: event.target.checked }))} className="size-4 rounded border-slate-300 text-primary focus:ring-primary/40" />
                            {t('promotionsPricing.forms.couponRequired')}
                        </label>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setPromotionModalOpen(false)}>{t('promotionsPricing.actions.close')}</Button>
                        <Button type="submit" loading={savingState === 'promotion'}>{editingPromotionId ? t('promotionsPricing.actions.saveChanges') : t('promotionsPricing.actions.savePromotion')}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={couponModalOpen} onClose={() => setCouponModalOpen(false)} title={editingCouponId ? t('promotionsPricing.forms.editCoupon') : t('promotionsPricing.forms.newCoupon')} size="lg">
                <form className="space-y-5" onSubmit={handleCouponSubmit}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select label={t('promotionsPricing.forms.promotion')} value={couponForm.promotionId} onChange={(event) => setCouponForm((current) => ({ ...current, promotionId: event.target.value }))} options={promotionOptions} placeholder={t('promotionsPricing.forms.selectPromotion')} required />
                        <Input label={t('promotionsPricing.forms.code')} value={couponForm.code} onChange={(event) => setCouponForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required />
                        <Select label={t('promotionsPricing.forms.status')} value={couponForm.status} onChange={(event) => setCouponForm((current) => ({ ...current, status: event.target.value }))} options={COUPON_STATUSES.map((value) => ({ value, label: t(`promotionsPricing.enums.couponStatus.${value}`) }))} placeholder={t('promotionsPricing.forms.status')} />
                        <Input label={t('promotionsPricing.forms.validFrom')} type="datetime-local" value={couponForm.validFrom} onChange={(event) => setCouponForm((current) => ({ ...current, validFrom: event.target.value }))} required />
                        <Input label={t('promotionsPricing.forms.validTo')} type="datetime-local" value={couponForm.validTo} onChange={(event) => setCouponForm((current) => ({ ...current, validTo: event.target.value }))} />
                        <Input label={t('promotionsPricing.forms.maxRedemptionsTotal')} type="number" min="0" value={couponForm.maxRedemptionsTotal} onChange={(event) => setCouponForm((current) => ({ ...current, maxRedemptionsTotal: event.target.value }))} />
                        <Input label={t('promotionsPricing.forms.maxRedemptionsPerCustomer')} type="number" min="0" value={couponForm.maxRedemptionsPerCustomer} onChange={(event) => setCouponForm((current) => ({ ...current, maxRedemptionsPerCustomer: event.target.value }))} />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('promotionsPricing.forms.notes')}</label>
                        <textarea value={couponForm.notes} onChange={(event) => setCouponForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t('promotionsPricing.forms.notesPlaceholder')} />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setCouponModalOpen(false)}>{t('promotionsPricing.actions.close')}</Button>
                        <Button type="submit" loading={savingState === 'coupon'}>{editingCouponId ? t('promotionsPricing.actions.saveChanges') : t('promotionsPricing.actions.saveCoupon')}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={ruleModalOpen} onClose={() => setRuleModalOpen(false)} title={editingRuleId ? t('promotionsPricing.forms.editRule') : t('promotionsPricing.forms.newRule')} size="xl">
                <form className="space-y-5" onSubmit={handleRuleSubmit}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Input label={t('promotionsPricing.forms.name')} value={ruleForm.name} onChange={(event) => setRuleForm((current) => ({ ...current, name: event.target.value }))} required />
                        <Input label={t('promotionsPricing.forms.code')} value={ruleForm.code} onChange={(event) => setRuleForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required />
                        <Select label={t('promotionsPricing.forms.status')} value={ruleForm.status} onChange={(event) => setRuleForm((current) => ({ ...current, status: event.target.value }))} options={PRICING_RULE_STATUSES.map((value) => ({ value, label: t(`promotionsPricing.enums.ruleStatus.${value}`) }))} placeholder={t('promotionsPricing.forms.status')} />
                        <Select label={t('promotionsPricing.forms.adjustmentType')} value={ruleForm.adjustmentType} onChange={(event) => setRuleForm((current) => ({ ...current, adjustmentType: event.target.value }))} options={PRICING_RULE_ADJUSTMENT_TYPES.map((value) => ({ value, label: t(`promotionsPricing.enums.adjustmentType.${value}`) }))} placeholder={t('promotionsPricing.forms.adjustmentType')} />
                        <Input label={t('promotionsPricing.forms.adjustmentValue')} type="number" min="0" step="0.01" value={ruleForm.adjustmentValue} onChange={(event) => setRuleForm((current) => ({ ...current, adjustmentValue: event.target.value }))} required />
                        <Input label={t('promotionsPricing.forms.priority')} type="number" min="0" value={ruleForm.priority} onChange={(event) => setRuleForm((current) => ({ ...current, priority: event.target.value }))} />
                        <Select label={t('promotionsPricing.forms.channel')} value={ruleForm.salesChannel} onChange={(event) => setRuleForm((current) => ({ ...current, salesChannel: event.target.value }))} options={SALES_CHANNELS.map((value) => ({ value, label: t(`promotionsPricing.enums.salesChannel.${value}`) }))} placeholder={t('promotionsPricing.forms.channel')} />
                        <Input label={t('promotionsPricing.forms.validFrom')} type="datetime-local" value={ruleForm.validFrom} onChange={(event) => setRuleForm((current) => ({ ...current, validFrom: event.target.value }))} required />
                        <Input label={t('promotionsPricing.forms.validTo')} type="datetime-local" value={ruleForm.validTo} onChange={(event) => setRuleForm((current) => ({ ...current, validTo: event.target.value }))} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Input label={t('promotionsPricing.forms.minQuantity')} type="number" min="0" step="0.01" value={ruleForm.minQuantity} onChange={(event) => setRuleForm((current) => ({ ...current, minQuantity: event.target.value }))} />
                        <Select label={t('promotionsPricing.forms.customerCategory')} value={ruleForm.customerCategory} onChange={(event) => setRuleForm((current) => ({ ...current, customerCategory: event.target.value }))} options={CUSTOMER_CATEGORIES.map((value) => ({ value, label: t(`promotionsPricing.enums.customerCategory.${value}`) }))} placeholder={t('promotionsPricing.forms.optionalCustomerCategory')} />
                        <Select label={t('promotionsPricing.forms.customer')} value={ruleForm.customerId} onChange={(event) => setRuleForm((current) => ({ ...current, customerId: event.target.value }))} options={customerOptions} placeholder={t('promotionsPricing.forms.optionalCustomer')} />
                        <Select label={t('promotionsPricing.forms.warehouse')} value={ruleForm.warehouseId} onChange={(event) => setRuleForm((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouseOptions} placeholder={t('promotionsPricing.forms.optionalWarehouse')} />
                        <Select label={t('promotionsPricing.forms.terminal')} value={ruleForm.terminalId} onChange={(event) => setRuleForm((current) => ({ ...current, terminalId: event.target.value }))} options={terminalOptions} placeholder={t('promotionsPricing.forms.optionalTerminal')} />
                        <Select label={t('promotionsPricing.forms.category')} value={ruleForm.categoryId} onChange={(event) => setRuleForm((current) => ({ ...current, categoryId: event.target.value }))} options={categoryOptions} placeholder={t('promotionsPricing.forms.optionalCategory')} />
                    </div>

                    <ProductVariantLookup label={t('promotionsPricing.forms.variant')} placeholder={t('promotionsPricing.forms.variantPlaceholder')} selectedVariant={ruleForm.productVariant} onSelect={(variant) => setRuleForm((current) => ({ ...current, productVariant: variant }))} />

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('promotionsPricing.forms.notes')}</label>
                        <textarea value={ruleForm.notes} onChange={(event) => setRuleForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder={t('promotionsPricing.forms.ruleNotesPlaceholder')} />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setRuleModalOpen(false)}>{t('promotionsPricing.actions.close')}</Button>
                        <Button type="submit" loading={savingState === 'rule'}>{editingRuleId ? t('promotionsPricing.actions.saveChanges') : t('promotionsPricing.actions.saveRule')}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default PromotionsPricing;