import React from 'react';
import { Card, Select } from '../../../components/common';
import { useLanguage } from '../../../contexts/LanguageContext';

const OrderSelectionCard = ({
    form,
    salesOrderOptions,
    rmaOptions,
    warehouseOptions,
    onSalesOrderChange,
    onRmaChange,
    onWarehouseChange,
}) => {
    const { t } = useLanguage();
    return (
        <Card
            title={t('refundsExchanges.sections.order.title')}
            subtitle={t('refundsExchanges.sections.order.subtitle')}
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Select
                    label={t('refundsExchanges.forms.salesOrder')}
                    value={form.salesOrderId}
                    onChange={(event) => onSalesOrderChange(event.target.value)}
                    options={salesOrderOptions}
                    placeholder={t('refundsExchanges.forms.selectSalesOrder')}
                    required
                />
                <Select
                    label={t('refundsExchanges.forms.rma')}
                    value={form.rmaId}
                    onChange={(event) => onRmaChange(event.target.value)}
                    options={rmaOptions}
                    placeholder={t('refundsExchanges.forms.optionalRma')}
                />
                <Select
                    label={t('refundsExchanges.forms.warehouse')}
                    value={form.warehouseId}
                    onChange={(event) => onWarehouseChange(event.target.value)}
                    options={warehouseOptions}
                    placeholder={t('refundsExchanges.forms.selectWarehouse')}
                    required
                />
            </div>
        </Card>
    );
};

export default OrderSelectionCard;
