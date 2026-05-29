import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/common';
import { getSalesOrder } from '../../services/salesOrderService';
import {
    approveDelivery,
    bookSteadfast,
    confirmDelivery,
    createRma,
    disputeDelivery,
    generateShippingLabel,
    getDeliveryNote,
    getRmas,
    getShipment,
    getShipments,
    syncSteadfastStatus,
    updateRmaStatus,
    updateShipmentTracking,
} from '../../services/shipmentService';
import { toList } from '../Sales/utils';
import {
    SHIPMENT_QUEUE_CONFIG,
    showAlertHelper,
} from './constants';
import FulfillmentOrderDetailScreen from './FulfillmentOrderDetailScreen';
import RmaDetailModal from './RmaDetailModal';

const ShipmentDetail = () => {
    const navigate = useNavigate();
    const { id: shipmentId } = useParams();
    const [searchParams] = useSearchParams();
    const queueKey = searchParams.get('queue') || 'READY_TO_HANDOFF';

    const [shipment, setShipment] = useState(null);
    const [salesOrder, setSalesOrder] = useState(null);
    const [relatedShipments, setRelatedShipments] = useState([]);
    const [relatedRmas, setRelatedRmas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [alert, setAlert] = useState(null);
    const [selectedRma, setSelectedRma] = useState(null);

    const showAlert = showAlertHelper(setAlert);

    const loadShipmentDetail = useCallback(async (id) => {
        setLoading(true);
        try {
            const detail = await getShipment(id);
            setShipment(detail);
            const [salesOrderData, shipmentList, rmaList] = await Promise.all([
                getSalesOrder(detail.salesOrderId),
                getShipments({ salesOrderId: detail.salesOrderId, page: 0, size: 50, sortBy: 'updatedAt', sortDirection: 'desc' }),
                getRmas({ salesOrderId: detail.salesOrderId, page: 0, size: 50 }),
            ]);
            setSalesOrder(salesOrderData);
            setRelatedShipments(toList(shipmentList));
            setRelatedRmas(toList(rmaList));
            return detail;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                await loadShipmentDetail(shipmentId);
            } catch (error) {
                if (!cancelled) {
                    showAlert('error', error.message || 'Failed to load fulfillment detail');
                    navigate('/fulfillment/shipments');
                }
            }
        };
        run();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shipmentId]);

    const runAction = async (action, successMessage) => {
        try {
            setWorking(true);
            const result = await action();
            showAlert('success', successMessage);
            await loadShipmentDetail(shipmentId);
            return result;
        } catch (error) {
            showAlert('error', error.message || 'Fulfillment action failed');
            throw error;
        } finally {
            setWorking(false);
        }
    };

    const handleUpdateTracking = async (id, payload) => {
        const updated = await runAction(() => updateShipmentTracking(id, payload), 'Shipment tracking updated');
        setShipment(updated);
    };

    const handleGenerateLabel = async (id) => {
        const updated = await runAction(() => generateShippingLabel(id), 'Shipping label generated');
        setShipment(updated);
    };

    const handleConfirmDelivery = async (id) => {
        const updated = await runAction(() => confirmDelivery(id), 'Delivery confirmed successfully');
        setShipment(updated);
    };

    const handleBookSteadfast = async (id) => {
        const updated = await runAction(() => bookSteadfast(id), 'Shipment booked with Steadfast');
        setShipment(updated);
    };

    const handleSyncSteadfast = async (id) => {
        const updated = await runAction(() => syncSteadfastStatus(id), 'Steadfast status synced');
        setShipment(updated);
    };

    const handleApproveDelivery = async (id, payload) => {
        const updated = await runAction(() => approveDelivery(id, payload), 'Delivery review approved');
        setShipment(updated);
    };

    const handleDisputeDelivery = async (id, payload) => {
        const updated = await runAction(() => disputeDelivery(id, payload), 'Delivery marked as disputed');
        setShipment(updated);
    };

    const handleCreateRma = async (payload) => {
        const created = await runAction(() => createRma(payload), 'RMA created successfully');
        setSelectedRma(created);
    };

    const handleUpdateRmaStatus = async (id, status) => {
        const updated = await runAction(() => updateRmaStatus(id, { status, notes: null }), `RMA moved to ${status}`);
        setSelectedRma(updated);
    };

    const handleBack = () => {
        if (queueKey === 'NEEDS_ACTION') {
            navigate('/fulfillment/exceptions');
        } else {
            navigate(`/fulfillment/shipments?queue=${queueKey}`);
        }
    };

    const handleSelectShipment = (next) => {
        if (!next?.id) return;
        navigate(`/fulfillment/shipments/${next.id}?queue=${queueKey}`);
    };

    const queueLabel = SHIPMENT_QUEUE_CONFIG.find((queue) => queue.key === queueKey)?.label || queueKey;

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <FulfillmentOrderDetailScreen
                    salesOrder={salesOrder}
                    shipment={shipment}
                    relatedShipments={relatedShipments}
                    relatedRmas={relatedRmas}
                    queueLabel={queueLabel}
                    loading={working || loading}
                    onBack={handleBack}
                    onSelectShipment={handleSelectShipment}
                    onUpdateTracking={handleUpdateTracking}
                    onGenerateLabel={handleGenerateLabel}
                    onConfirmDelivery={handleConfirmDelivery}
                    onDownloadDeliveryNote={getDeliveryNote}
                    onCreateRma={handleCreateRma}
                    onOpenRma={setSelectedRma}
                    onBookSteadfast={handleBookSteadfast}
                    onSyncSteadfast={handleSyncSteadfast}
                    onApproveDelivery={handleApproveDelivery}
                    onDisputeDelivery={handleDisputeDelivery}
                />
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

export default ShipmentDetail;
