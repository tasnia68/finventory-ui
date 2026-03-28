export const SALES_ORDER_SOURCES = {
  DIRECT: 'DIRECT',
  STOREFRONT: 'STOREFRONT',
  POS: 'POS',
};

export const getSalesOrderSource = (order) => {
  if (!order) {
    return SALES_ORDER_SOURCES.DIRECT;
  }

  if (order.salesChannel === 'POS') {
    return SALES_ORDER_SOURCES.POS;
  }

  const soNumber = String(order.soNumber || '').toUpperCase();
  const notes = String(order.notes || '').toLowerCase();

  if (soNumber.startsWith('SO-WEB-') || notes.includes('storefront checkout')) {
    return SALES_ORDER_SOURCES.STOREFRONT;
  }

  return SALES_ORDER_SOURCES.DIRECT;
};

export const getSalesOrderSourceLabel = (order) => {
  const source = typeof order === 'string' ? order : getSalesOrderSource(order);

  switch (source) {
    case SALES_ORDER_SOURCES.STOREFRONT:
      return 'Storefront';
    case SALES_ORDER_SOURCES.POS:
      return 'POS';
    default:
      return 'Direct';
  }
};

export const getSalesOrderSourceBadgeVariant = (order) => {
  const source = typeof order === 'string' ? order : getSalesOrderSource(order);

  switch (source) {
    case SALES_ORDER_SOURCES.STOREFRONT:
      return 'info';
    case SALES_ORDER_SOURCES.POS:
      return 'success';
    default:
      return 'default';
  }
};
