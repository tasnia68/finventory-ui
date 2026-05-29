import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
} from '../../components/common';
import { useLanguage } from '../../contexts/LanguageContext';
import { getGoodsReceiptNotes } from '../../services/goodsReceiptNoteService';
import {
    sumRejectedQuantity,
    toList,
} from './constants';
import ReceivingModal from './Sections/ReceivingModal';

const Receiving = () => {
    const navigate = useNavigate();
    const { t, formatNumber, formatDateTime } = useLanguage();

    const [goodsReceipts, setGoodsReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalInitialReceipt, setModalInitialReceipt] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadReceipts = async () => {
        try {
            setLoading(true);
            const data = await getGoodsReceiptNotes({ page: 0, size: 100 });
            const list = toList(data).filter((goodsReceipt) => ['VERIFIED', 'COMPLETED'].includes(goodsReceipt.status));
            setGoodsReceipts(list);
        } catch (error) {
            showAlert('error', error.message || t('damageControl.messages.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReceipts();
    }, []);

    const receivingCandidates = useMemo(
        () => goodsReceipts.filter((goodsReceipt) => sumRejectedQuantity(goodsReceipt) > 0),
        [goodsReceipts],
    );

    const openModal = (receipt = null) => {
        setModalInitialReceipt(receipt);
        setModalOpen(true);
    };

    const columns = [
        {
            key: 'grnNumber',
            header: t('damageControl.columns.receipt'),
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.supplierName} • {row.warehouseName}</div>
                </div>
            ),
        },
        {
            key: 'receivedDate',
            header: t('damageControl.columns.receivedDate'),
            render: (value) => value ? formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' }) : '—',
        },
        {
            key: 'items',
            header: t('damageControl.columns.rejectedQuantity'),
            render: (_, row) => <Badge variant="warning">{formatNumber(sumRejectedQuantity(row))}</Badge>,
        },
        {
            key: 'status',
            header: t('damageControl.columns.receiptStatus'),
            render: (value) => <Badge variant={value === 'COMPLETED' ? 'success' : 'warning'}>{value}</Badge>,
        },
        {
            key: 'actions',
            header: t('damageControl.columns.actions'),
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={(event) => {
                            event.stopPropagation();
                            openModal(row);
                        }}
                    >
                        {t('damageControl.actions.capture')}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/damage-control/claims/new?goodsReceiptId=${row.id}`);
                        }}
                    >
                        {t('damageControl.actions.claim')}
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('damageControl.receiving.title')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('damageControl.receiving.subtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" icon="sync" onClick={loadReceipts}>
                        {t('damageControl.actions.refresh')}
                    </Button>
                    <Button
                        icon="warehouse"
                        onClick={() => openModal(null)}
                        disabled={receivingCandidates.length === 0}
                    >
                        {t('damageControl.actions.captureReceivingDamage')}
                    </Button>
                </div>
            </div>

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            <Card padding="none" className="overflow-hidden">
                <DataTable
                    columns={columns}
                    data={receivingCandidates}
                    loading={loading}
                    emptyMessage={t('damageControl.receiving.empty')}
                />
            </Card>

            <ReceivingModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                receivingCandidates={receivingCandidates}
                initialGoodsReceipt={modalInitialReceipt}
                onAlert={showAlert}
                onCreated={(created) => {
                    loadReceipts();
                    if (created?.id) navigate(`/damage-control/incidents/${created.id}`);
                }}
            />
        </div>
    );
};

export default Receiving;
