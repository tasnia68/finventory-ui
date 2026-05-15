import React, { useEffect, useState } from 'react';
import { generatePurchaseRequisition, getPurchaseRequisitions, convertRequisitionToPurchaseOrder } from '../../services/purchaseRequisitionService';
import { getWarehouses } from '../../services/warehouseService';
import { getSuppliers } from '../../services/supplierService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';

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
    return date.toLocaleString();
};

const PurchaseRequisitions = () => {
    const [requisitions, setRequisitions] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        warehouseId: '',
        notes: '',
    });
    const [converting, setConverting] = useState(null); // { id, reference }
    const [convertForm, setConvertForm] = useState({ supplierId: '', expectedDeliveryDate: '' });
    const [convertBusy, setConvertBusy] = useState(false);

    useEffect(() => {
        fetchRequisitions();
        fetchWarehouses();
        getSuppliers().then((d) => setSuppliers(toList(d))).catch(() => {});
    }, []);

    const fetchRequisitions = async () => {
        try {
            setLoading(true);
            const data = await getPurchaseRequisitions();
            setRequisitions(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load requisitions');
        } finally {
            setLoading(false);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const data = await getWarehouses();
            setWarehouses(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        try {
            await generatePurchaseRequisition({
                warehouseId: formData.warehouseId,
                notes: formData.notes || null,
            });
            showAlert('success', 'Purchase requisition generated');
            setShowModal(false);
            setFormData({ warehouseId: '', notes: '' });
            fetchRequisitions();
        } catch (error) {
            showAlert('error', error.message || 'Failed to generate requisition');
        }
    };

    const warehouseOptions = toList(warehouses).map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name,
    }));

    const openConvert = (row) => {
        setConverting({ id: row.id, reference: row.reference });
        setConvertForm({ supplierId: '', expectedDeliveryDate: '' });
    };

    const submitConvert = async () => {
        if (!convertForm.supplierId) {
            showAlert('error', 'Pick a supplier');
            return;
        }
        try {
            setConvertBusy(true);
            const result = await convertRequisitionToPurchaseOrder(converting.id, {
                supplierId: convertForm.supplierId,
                expectedDeliveryDate: convertForm.expectedDeliveryDate || null,
            });
            const poId = result?.purchaseOrderId || result?.data?.purchaseOrderId;
            showAlert('success', `PO created${poId ? ` (id ${String(poId).slice(0, 8)}…)` : ''}. Edit unit prices, then approve.`);
            setConverting(null);
            fetchRequisitions();
        } catch (error) {
            showAlert('error', error.message || 'Failed to convert requisition');
        } finally {
            setConvertBusy(false);
        }
    };

    const columns = [
        {
            key: 'reference',
            header: 'Reference',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value || row.id}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.warehouseName || row.warehouseId}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => (
                <Badge variant={value === 'DRAFT' ? 'warning' : value === 'APPROVED' ? 'success' : 'default'}>{value || 'DRAFT'}</Badge>
            ),
        },
        { key: 'requestedAt', header: 'Requested', render: (value) => formatDate(value) },
        {
            key: 'actions',
            header: '',
            render: (_, row) => row.status === 'APPROVED' && !row.convertedPurchaseOrderId ? (
                <Button size="sm" variant="secondary" onClick={() => openConvert(row)}>Convert to PO</Button>
            ) : row.convertedPurchaseOrderId ? (
                <span className="text-xs text-slate-500">Converted</span>
            ) : null,
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Purchase Requisitions
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Generate and track requisitions
                        </p>
                    </div>
                    <Button icon="add" onClick={() => setShowModal(true)}>
                        Generate PR
                    </Button>
                </div>

                {alert && (
                    <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
                )}

                <Card padding="none" className="overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={requisitions}
                        loading={loading}
                        emptyMessage="No purchase requisitions found."
                    />
                </Card>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Generate Purchase Requisition"
            >
                <form className="space-y-4" onSubmit={handleGenerate}>
                    <Select
                        label="Warehouse"
                        value={formData.warehouseId}
                        onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                        options={warehouseOptions}
                        required
                    />
                    <Input
                        label="Notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Optional notes"
                    />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Generate</Button>
                    </div>
                </form>
            </Modal>

            {converting ? (
                <Modal isOpen onClose={() => setConverting(null)} title={`Convert ${converting.reference} to PO`} size="md">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">
                            A draft PO will be created with the requisition's lines. Unit prices default to 0 — fill them in on the PO before approval.
                        </p>
                        <Select
                            label="Supplier"
                            value={convertForm.supplierId}
                            onChange={(e) => setConvertForm((c) => ({ ...c, supplierId: e.target.value }))}
                            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                            required
                        />
                        <Input
                            label="Expected delivery"
                            type="date"
                            value={convertForm.expectedDeliveryDate}
                            onChange={(e) => setConvertForm((c) => ({ ...c, expectedDeliveryDate: e.target.value }))}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setConverting(null)} disabled={convertBusy}>Cancel</Button>
                            <Button onClick={submitConvert} disabled={convertBusy}>{convertBusy ? 'Converting…' : 'Create PO'}</Button>
                        </div>
                    </div>
                </Modal>
            ) : null}
        </div>
    );
};

export default PurchaseRequisitions;