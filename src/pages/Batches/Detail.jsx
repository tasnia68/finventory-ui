import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBatch, getBatchHistory } from '../../services/batchService';
import { Alert, Badge, Button, Card, DataTable } from '../../components/common';
import ExpiryModal from './ExpiryModal';

const toList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data?.content && Array.isArray(data.data.content)) return data.data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
};

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
};

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

const formatNumber = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

const getBatchHealth = (expiryDate) => {
    if (!expiryDate) {
        return { label: 'No expiry', variant: 'default', daysRemaining: null };
    }

    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { label: 'Expired', variant: 'danger', daysRemaining: diffDays };
    }
    if (diffDays <= 30) {
        return { label: 'Expiring', variant: 'warning', daysRemaining: diffDays };
    }
    return { label: 'Healthy', variant: 'success', daysRemaining: diffDays };
};

const BatchDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [batch, setBatch] = useState(null);
    const [historyRows, setHistoryRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [showExpiryModal, setShowExpiryModal] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadBatch = async () => {
        try {
            setLoading(true);
            const data = await getBatch(id);
            setBatch(data?.data || data || null);
        } catch (error) {
            showAlert('error', error.message || 'Failed to load batch');
            setBatch(null);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            setHistoryLoading(true);
            const data = await getBatchHistory(id);
            setHistoryRows(toList(data));
        } catch (error) {
            setHistoryRows([]);
            showAlert('error', error.message || 'Failed to load batch history');
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        loadBatch();
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleExpiryUpdated = async () => {
        setShowExpiryModal(false);
        showAlert('success', 'Batch dating updated successfully');
        await Promise.all([loadBatch(), loadHistory()]);
    };

    const health = getBatchHealth(batch?.expiryDate);

    const historyColumns = [
        {
            key: 'type',
            header: 'Movement',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || 'Movement'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.reason || row.referenceId || 'No reference'}</div>
                </div>
            ),
        },
        { key: 'quantity', header: 'Quantity', render: (value) => formatNumber(value) },
        { key: 'warehouseName', header: 'Warehouse', render: (value) => value || '-' },
        { key: 'createdBy', header: 'Recorded By', render: (value) => value || '-' },
        { key: 'createdAt', header: 'Timestamp', render: (value) => formatDateTime(value) },
    ];

    return (
        <div className="flex-1 overflow-y-auto space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" icon="arrow_back" onClick={() => navigate('/batches')}>
                            Back
                        </Button>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {batch ? `Batch ${batch.batchNumber || batch.id}` : 'Batch'}
                        </h1>
                        {batch && <Badge variant={health.variant}>{health.label}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Review dating, location, and the full movement history for this lot.
                    </p>
                </div>
                {batch && (
                    <Button icon="edit" onClick={() => setShowExpiryModal(true)}>Update Expiry</Button>
                )}
            </div>

            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

            {loading && !batch && (
                <Card>
                    <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
                </Card>
            )}

            {!loading && !batch && (
                <Card>
                    <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Batch not found.
                    </div>
                </Card>
            )}

            {batch && (
                <Card>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Batch Number</div>
                            <div className="font-semibold">{batch.batchNumber || batch.id}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Variant</div>
                            <div className="font-semibold">{batch.productVariantSku || batch.productVariantId || '—'}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Quantity</div>
                            <div className="font-semibold">{formatNumber(batch.quantity ?? batch.currentQuantity ?? 0)}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Status</div>
                            <div className="font-semibold">{batch.status || health.label}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Manufactured</div>
                            <div className="font-semibold">{formatDate(batch.manufacturingDate)}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Expires</div>
                            <div className="font-semibold">{formatDate(batch.expiryDate)}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Shelf Life</div>
                            <div className="font-semibold">
                                {health.daysRemaining === null ? 'No shelf-life rule recorded' : `${health.daysRemaining} day(s)`}
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="text-xs uppercase text-slate-400">Location</div>
                            <div className="font-semibold">{batch.warehouseName || batch.locationName || '—'}</div>
                        </div>
                    </div>
                </Card>
            )}

            <Card>
                <h4 className="mb-3 font-semibold">Movement History</h4>
                <DataTable
                    columns={historyColumns}
                    data={historyRows}
                    loading={historyLoading}
                    emptyMessage="No movement history found for this batch."
                />
            </Card>

            <ExpiryModal
                isOpen={showExpiryModal}
                onClose={() => setShowExpiryModal(false)}
                batch={batch}
                onUpdated={handleExpiryUpdated}
            />
        </div>
    );
};

export default BatchDetail;
