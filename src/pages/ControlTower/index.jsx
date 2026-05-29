import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Input, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { getGoodsReceiptNotes } from '../../services/goodsReceiptNoteService';
import { getPickingLists } from '../../services/pickingService';
import { getPurchaseOrders } from '../../services/purchaseOrderService';
import { getSalesOrders } from '../../services/salesOrderService';
import { getShipments, getRmas } from '../../services/shipmentService';
import { getWarehouses } from '../../services/warehouseService';
import { toList } from '../Sales/utils';

const TAB_OPTIONS = [
    { value: 'outbound', label: 'Outbound', path: '/control-tower/outbound' },
    { value: 'inbound', label: 'Inbound', path: '/control-tower/inbound' },
    { value: 'exceptions', label: 'Exceptions', path: '/control-tower/exceptions' },
];

const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            active
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
        }`}
    >
        {children}
    </button>
);

const ControlTower = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [warehouses, setWarehouses] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [pickingLists, setPickingLists] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [rmas, setRmas] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [goodsReceipts, setGoodsReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ query: '', warehouseId: '', provider: '' });

    useEffect(() => {
        loadWorkspace();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadWorkspace = async () => {
        setLoading(true);
        const results = await Promise.allSettled([
            getWarehouses(),
            getSalesOrders({ page: 0, size: 200 }),
            getPickingLists({ page: 0, size: 200 }),
            getShipments({ page: 0, size: 200 }),
            getRmas({ page: 0, size: 200 }),
            getPurchaseOrders({ page: 0, size: 200 }),
            getGoodsReceiptNotes({ page: 0, size: 200 }),
        ]);

        const [warehouseResult, salesOrderResult, pickingResult, shipmentResult, rmaResult, poResult, grnResult] = results;

        if (warehouseResult.status === 'fulfilled') setWarehouses(Array.isArray(warehouseResult.value) ? warehouseResult.value : []);
        if (salesOrderResult.status === 'fulfilled') setSalesOrders(toList(salesOrderResult.value));
        if (pickingResult.status === 'fulfilled') setPickingLists(toList(pickingResult.value));
        if (shipmentResult.status === 'fulfilled') setShipments(toList(shipmentResult.value));
        if (rmaResult.status === 'fulfilled') setRmas(toList(rmaResult.value));
        if (poResult.status === 'fulfilled') setPurchaseOrders(toList(poResult.value));
        if (grnResult.status === 'fulfilled') setGoodsReceipts(toList(grnResult.value));

        const failedMessages = results
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason?.message)
            .filter(Boolean);

        if (failedMessages.length) {
            showAlert('warning', failedMessages[0] || 'Some control tower sources could not be loaded.');
        }

        setLoading(false);
    };

    const providerOptions = useMemo(
        () => [...new Set(shipments.map((shipment) => shipment.courierProvider).filter(Boolean))]
            .sort((left, right) => left.localeCompare(right))
            .map((value) => ({ value, label: value })),
        [shipments]
    );

    const filteredSalesOrders = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return salesOrders.filter((order) => {
            if (filters.warehouseId && order.warehouseId !== filters.warehouseId) return false;
            if (!query) return true;
            return [order.soNumber, order.customerName, order.warehouseName, order.status]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [salesOrders, filters]);

    const filteredShipments = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return shipments.filter((shipment) => {
            if (filters.warehouseId && shipment.warehouseId !== filters.warehouseId) return false;
            if (filters.provider && shipment.courierProvider !== filters.provider) return false;
            if (!query) return true;
            return [
                shipment.shipmentNumber,
                shipment.soNumber,
                shipment.courierProvider,
                shipment.courierReference,
                shipment.trackingNumber,
                shipment.courierDispatchStatus,
                shipment.status,
            ]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [shipments, filters]);

    const filteredPurchaseOrders = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return purchaseOrders.filter((order) => {
            if (!query) return true;
            return [order.poNumber, order.supplierName, order.status]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [purchaseOrders, filters.query]);

    const filteredGoodsReceipts = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        return goodsReceipts.filter((receipt) => {
            if (filters.warehouseId && receipt.warehouseId !== filters.warehouseId) return false;
            if (!query) return true;
            return [receipt.grnNumber, receipt.purchaseOrderNumber, receipt.supplierName, receipt.status]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [goodsReceipts, filters]);

    const activeTab = useMemo(() => {
        const match = TAB_OPTIONS.find((tab) => location.pathname.startsWith(tab.path));
        return match ? match.value : 'outbound';
    }, [location.pathname]);

    const outletContext = {
        loading,
        warehouses,
        rmas,
        pickingLists,
        filteredSalesOrders,
        filteredShipments,
        filteredPurchaseOrders,
        filteredGoodsReceipts,
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Operations Control Tower"
                    title="See the full state pipeline across outbound, inbound, and exceptions."
                    description="One operational surface for approval queues, warehouse execution, courier dispatch, receiving progress, and exception recovery."
                    actions={(
                        <>
                            <Input placeholder="Search order, shipment, PO, GRN, courier, or reference" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[320px]" />
                            <Select value={filters.warehouseId} onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} placeholder="Warehouse" className="min-w-[190px]" />
                            <Select value={filters.provider} onChange={(event) => setFilters((current) => ({ ...current, provider: event.target.value }))} options={providerOptions} placeholder="Courier provider" className="min-w-[190px]" />
                            <Button variant="secondary" icon="sync" onClick={loadWorkspace}>Refresh</Button>
                            <Link to="/fulfillment" className="inline-flex min-h-[46px] items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">Open Fulfillment</Link>
                        </>
                    )}
                    accent="from-cyan-500/15 via-transparent to-amber-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="flex flex-wrap gap-2">
                    {TAB_OPTIONS.map((tab) => (
                        <TabButton key={tab.value} active={activeTab === tab.value} onClick={() => navigate(tab.path)}>
                            {tab.label}
                        </TabButton>
                    ))}
                </div>

                <Outlet context={outletContext} />
            </div>
        </div>
    );
};

export default ControlTower;
