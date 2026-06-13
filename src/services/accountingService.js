import { request } from './api';
import { getAuthorizationHeaders, getTenantId } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const unwrap = async (promise) => {
    const response = await promise;
    return response?.data !== undefined ? response.data : response;
};

const uploadHeaders = () => {
    const tenantId = getTenantId();
    return {
        ...getAuthorizationHeaders(),
        ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
    };
};

export const getAccounts = () => unwrap(request('/accounting/accounts'));
export const getAccountingAuditLog = (limit = 100) => unwrap(request(`/accounting/audit?limit=${limit}`));
export const getAccountLedger = (accountId, params = {}) => {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.page !== undefined) query.set('page', params.page);
    if (params.size !== undefined) query.set('size', params.size);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return unwrap(request(`/accounting/accounts/${accountId}/ledger${suffix}`));
};
export const createAccount = (payload) => unwrap(request('/accounting/accounts', { method: 'POST', body: payload }));
export const getTaxRates = () => unwrap(request('/accounting/tax-rates'));
export const createTaxRate = (payload) => unwrap(request('/accounting/tax-rates', { method: 'POST', body: payload }));
export const getJournals = () => unwrap(request('/accounting/journals'));
export const createJournal = (payload) => unwrap(request('/accounting/journals', { method: 'POST', body: payload }));
export const getJournalEntries = () => unwrap(request('/accounting/entries'));
export const getPendingFinancialEvents = () => unwrap(request('/accounting/events/pending'));
export const getFinancialEventPreview = (financialEventId) => unwrap(request(`/accounting/events/${financialEventId}/preview`));
export const postSelectedFinancialEvents = (financialEventIds) => unwrap(request('/accounting/events/post-selected', { method: 'POST', body: financialEventIds }));
export const getAccountsPayableInvoices = () => unwrap(request('/accounting/ap/invoices'));
export const createAccountsPayableInvoice = (payload) => unwrap(request('/accounting/ap/invoices', { method: 'POST', body: payload }));
export const recordAccountsPayablePayment = (invoiceId, payload) => unwrap(request(`/accounting/ap/invoices/${invoiceId}/payments`, { method: 'POST', body: payload }));
export const getAccountsPayableAging = () => unwrap(request('/accounting/ap/aging'));
export const getAccountsReceivableInvoices = () => unwrap(request('/accounting/ar/invoices'));
export const createAccountsReceivableInvoice = (payload) => unwrap(request('/accounting/ar/invoices', { method: 'POST', body: payload }));
export const recordAccountsReceivablePayment = (invoiceId, payload) => unwrap(request(`/accounting/ar/invoices/${invoiceId}/payments`, { method: 'POST', body: payload }));
export const getAccountsReceivableAging = () => unwrap(request('/accounting/ar/aging'));
export const getTreasuryAccounts = () => unwrap(request('/accounting/treasury/accounts'));
export const createTreasuryAccount = (payload) => unwrap(request('/accounting/treasury/accounts', { method: 'POST', body: payload }));
export const getTreasuryReconciliations = () => unwrap(request('/accounting/treasury/reconciliations'));
export const createTreasuryReconciliation = (payload) => unwrap(request('/accounting/treasury/reconciliations', { method: 'POST', body: payload }));
export const completeTreasuryReconciliation = (reconciliationId, payload) => unwrap(request(`/accounting/treasury/reconciliations/${reconciliationId}/complete`, { method: 'POST', body: payload }));
export const createManualJournalEntry = (payload) => unwrap(request('/accounting/entries/manual', { method: 'POST', body: payload }));
export const getJournalEntryAttachments = (journalEntryId) => unwrap(request(`/accounting/entries/${journalEntryId}/attachments`));
export const uploadJournalEntryAttachment = async (journalEntryId, file, notes = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) {
        formData.append('notes', notes);
    }

    const response = await fetch(`${API_BASE_URL}/accounting/entries/${journalEntryId}/attachments`, {
        method: 'POST',
        headers: uploadHeaders(),
        body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to upload journal entry attachment');
    }

    return data?.data !== undefined ? data.data : data;
};
export const getJournalEntryAttachmentFile = async (attachmentId) => {
    const response = await fetch(`${API_BASE_URL}/accounting/entries/attachments/${attachmentId}/file`, {
        method: 'GET',
        headers: uploadHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to download journal entry attachment');
    }

    return response.blob();
};
export const deleteJournalEntryAttachment = (attachmentId) => unwrap(request(`/accounting/entries/attachments/${attachmentId}`, { method: 'DELETE' }));
export const getRecurringJournalTemplates = () => unwrap(request('/accounting/recurring-templates'));
export const createRecurringJournalTemplate = (payload) => unwrap(request('/accounting/recurring-templates', { method: 'POST', body: payload }));
export const runDueRecurringJournalTemplates = (runDate) => {
    const query = new URLSearchParams();
    if (runDate) query.set('runDate', runDate);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return unwrap(request(`/accounting/recurring-templates/run-due${suffix}`, { method: 'POST' }));
};
export const postPendingFinancialEvents = () => unwrap(request('/accounting/entries/post-pending', { method: 'POST' }));
export const reverseJournalEntry = (journalEntryId, payload) => unwrap(request(`/accounting/entries/${journalEntryId}/reverse`, { method: 'POST', body: payload }));
export const getTrialBalance = () => unwrap(request('/accounting/trial-balance'));
export const getProfitAndLoss = () => unwrap(request('/accounting/statements/profit-and-loss'));
export const getBalanceSheet = () => unwrap(request('/accounting/statements/balance-sheet'));
export const downloadAccountingStatement = async (statement, format) => {
    const endpoints = {
        trialBalance: '/accounting/trial-balance',
        profitAndLoss: '/accounting/statements/profit-and-loss',
        balanceSheet: '/accounting/statements/balance-sheet',
    };
    const endpoint = endpoints[statement];
    if (!endpoint) {
        throw new Error('Unknown accounting statement');
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}?format=${format}`, {
        method: 'GET',
        headers: uploadHeaders(),
    });
    if (!response.ok) {
        throw new Error('Failed to download accounting statement');
    }
    return response.blob();
};
export const getCashFlow = (params = {}) => {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return unwrap(request(`/accounting/statements/cash-flow${suffix}`));
};
export const getVatReturn = (params = {}) => {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return unwrap(request(`/accounting/reports/vat${suffix}`));
};
