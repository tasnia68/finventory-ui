import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input, MetricCard } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import {
    createRma,
    getRmas,
    getShipments,
    updateRmaStatus,
} from '../../services/shipmentService';
import {
    formatDateTime,
    formatNumber,
    getRmaStatusVariant,
    toList,
} from '../Sales/utils';
import { showAlertHelper } from './constants';
import RmaDetailModal from './RmaDetailModal';

const Returns = () => {
    const [rmas, setRmas] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [filters, setFilters] = useState({ query: '' });
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [alert, setAlert] = useState(null);
    const [selectedRma, setSelectedRma] = useState(null);

    const showAlert = showAlertHelper(setAlert);

    const loadPage = async () => {
        setLoading(true);
        const results = await Promise.allSettled([
            getRmas({ page: 0, size: 100 }),
            getShipments({ page: 0, size: 100 }),
        ]);
        const [rmaResult, shipmentResult] = results;
        setRmas(rmaResult.status === 'fulfilled' ? toList(rmaResult.value) : []);
        setShipments(shipmentResult.status === 'fulfilled' ? toList(shipmentResult.value) : []);

        const failedMessages = results
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason?.message)
            .filter(Boolean);
        if (failedMessages.length > 0) {
            showAlert('error', failedMessages[0] || 'Failed to load returns workspace');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadPage();
    }, []);

    const filteredRmas = useMemo(() => {
        const normalizedQuery = filters.query.trim().toLowerCase();
        return rmas.filter((rma) => {
            if (!normalizedQuery) return true;
            return [rma.rmaNumber, rma.soNumber, rma.shipmentNumber]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [rmas, filters.query]);

    const summary = useMemo(() => ({
        openRmas: rmas.filter((rma) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(rma.status)).length,
        deliveredShipments: shipments.filter((shipment) => shipment.status === 'DELIVERED').length,
    }), [rmas, shipments]);

    const runAction = async (action, successMessage) => {
        try {
            setWorking(true);
            const result = await action();
            showAlert('success', successMessage);
            await loadPage();
            return result;
        } catch (error) {
            showAlert('error', error.message || 'Fulfillment action failed');
            throw error;
        } finally {
            setWorking(false);
        }
    };

    const handleCreateRma = async (payload) => {
        const created = await runAction(() => createRma(payload), 'RMA created successfully');
        setSelectedRma(created);
    };

    const handleUpdateRmaStatus = async (id, status) => {
        const updated = await runAction(() => updateRmaStatus(id, { status, notes: null }), `RMA moved to ${status}`);
        setSelectedRma(updated);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Fulfillment Control"
                    title="Returns"
                    description="Customer return authorizations and exception handling workflow."
                    actions={(
                        <Button variant="secondary" icon="sync" onClick={loadPage}>Refresh</Button>
                    )}
                    accent="from-orange-500/15 via-transparent to-cyan-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="flex flex-wrap items-center gap-3">
                    <Input placeholder="Search RMA, SO, or shipment number" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[300px]" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <MetricCard title="Open RMAs" value={formatNumber(summary.openRmas)} caption="Returns still in authorization flow" icon="assignment_return" tone="violet" />
                    <MetricCard title="Total Returns" value={formatNumber(rmas.length)} caption="All-time return authorizations" icon="receipt_long" tone="slate" />
                    <MetricCard title="Delivered Shipments" value={formatNumber(summary.deliveredShipments)} caption="Successfully completed deliveries" icon="task_alt" tone="emerald" />
                </div>

                <Card padding="none" className="overflow-hidden" title="Returns Register" subtitle="Customer return authorizations and exception handling workflow">
                    <DataTable
                        loading={loading}
                        emptyMessage="No RMAs found."
                        onRowClick={setSelectedRma}
                        columns={[
                            { key: 'rmaNumber', header: 'RMA' },
                            { key: 'soNumber', header: 'Sales Order' },
                            { key: 'shipmentNumber', header: 'Shipment', render: (value) => value || '-' },
                            { key: 'status', header: 'Status', render: (value) => <Badge variant={getRmaStatusVariant(value)}>{value}</Badge> },
                            { key: 'requestedAt', header: 'Requested', render: (value) => formatDateTime(value) },
                        ]}
                        data={filteredRmas}
                    />
                </Card>
            </div>

            <RmaDetailModal
                rma={selectedRma}
                isOpen={Boolean(selectedRma)}
                onClose={() => setSelectedRma(null)}
                onTransition={handleUpdateRmaStatus}
                loading={working}
            />
        </div>
    );
};

export default Returns;
