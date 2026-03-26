export const formatNumber = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const emptyManualLine = () => ({
  accountId: '',
  description: '',
  debitAmount: '',
  creditAmount: '',
});

export const emptyPayment = () => ({
  amount: '',
  paymentDate: '',
  paymentMethod: '',
  paymentReference: '',
  notes: '',
});

export const toList = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.content) ? value.content : [];
