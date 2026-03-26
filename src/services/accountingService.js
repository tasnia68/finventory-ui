import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response?.data !== undefined ? response.data : response;
};

export const getAccounts = () => unwrap(request('/accounting/accounts'));
export const createAccount = (payload) => unwrap(request('/accounting/accounts', { method: 'POST', body: payload }));
export const getJournals = () => unwrap(request('/accounting/journals'));
export const createJournal = (payload) => unwrap(request('/accounting/journals', { method: 'POST', body: payload }));
export const getJournalEntries = () => unwrap(request('/accounting/entries'));
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
export const postPendingFinancialEvents = () => unwrap(request('/accounting/entries/post-pending', { method: 'POST' }));
export const reverseJournalEntry = (journalEntryId, payload) => unwrap(request(`/accounting/entries/${journalEntryId}/reverse`, { method: 'POST', body: payload }));
export const getTrialBalance = () => unwrap(request('/accounting/trial-balance'));
export const getProfitAndLoss = () => unwrap(request('/accounting/statements/profit-and-loss'));
export const getBalanceSheet = () => unwrap(request('/accounting/statements/balance-sheet'));
