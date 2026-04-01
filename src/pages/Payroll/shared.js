export const formatMoney = (value, currency = 'BDT') =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const formatNumber = (value, digits = 2) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const fullName = (row) => {
  const name = [row.userFirstName, row.userLastName].filter(Boolean).join(' ').trim();
  return name || row.userEmail || row.employeeName || 'Unassigned';
};

export const emptyStructureComponent = () => ({
  payrollComponentId: '',
  amount: '',
  rate: '',
  sortOrder: 0,
});
