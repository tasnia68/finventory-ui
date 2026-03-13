import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Modal, Input, Select, DataTable, ProductVariantLookup } from '../../components/common';
import {
    addSupplierProduct,
    approveSupplier,
    deleteSupplierDocument,
    deleteSupplierProduct,
    getSupplierDocumentFile,
    getSupplierDocuments,
    getSupplierProducts,
    rejectSupplier,
    updateSupplierProduct,
    uploadSupplierDocument,
} from '../../services/supplierService';
import { downloadBlob, formatCurrency, formatDateTime, getSupplierStatusVariant, toList } from '../Procurement/utils';

const SupplierDetailModal = ({ supplier, isOpen, onClose, onRefresh, onEdit }) => {
    const [products, setProducts] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [priceForm, setPriceForm] = useState({ supplierSku: '', price: '', currency: 'USD', leadTimeDays: '' });
    const [documentForm, setDocumentForm] = useState({ documentType: '', notes: '', file: null });

    useEffect(() => {
        if (isOpen && supplier?.id) {
            loadDetail();
        }
    }, [isOpen, supplier?.id]);

    const showAlert = (type, message) => setAlert({ type, message });

    const loadDetail = async () => {
        try {
            setLoading(true);
            const [productData, documentData] = await Promise.all([
                getSupplierProducts(supplier.id),
                getSupplierDocuments(supplier.id),
            ]);
            setProducts(toList(productData));
            setDocuments(toList(documentData));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load supplier details');
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (action) => {
        try {
            if (action === 'approve') {
                await approveSupplier(supplier.id);
            } else {
                await rejectSupplier(supplier.id);
            }
            showAlert('success', `Supplier ${action}d successfully`);
            await onRefresh();
            await loadDetail();
        } catch (error) {
            showAlert('error', error.message || `Failed to ${action} supplier`);
        }
    };

    const handleAddProduct = async (event) => {
        event.preventDefault();
        if (!selectedVariant) {
            showAlert('error', 'Select a product variant first');
            return;
        }

        try {
            await addSupplierProduct(supplier.id, {
                supplierId: supplier.id,
                productVariantId: selectedVariant.id,
                supplierSku: priceForm.supplierSku || null,
                price: priceForm.price === '' ? null : Number(priceForm.price),
                currency: priceForm.currency || 'USD',
                leadTimeDays: priceForm.leadTimeDays === '' ? null : Number(priceForm.leadTimeDays),
            });
            setSelectedVariant(null);
            setPriceForm({ supplierSku: '', price: '', currency: 'USD', leadTimeDays: '' });
            showAlert('success', 'Supplier price list updated');
            loadDetail();
        } catch (error) {
            showAlert('error', error.message || 'Failed to add supplier product');
        }
    };

    const handleUploadDocument = async (event) => {
        event.preventDefault();
        if (!documentForm.file) {
            showAlert('error', 'Choose a file to upload');
            return;
        }

        try {
            await uploadSupplierDocument(supplier.id, documentForm.file, documentForm.documentType, documentForm.notes);
            setDocumentForm({ documentType: '', notes: '', file: null });
            showAlert('success', 'Supplier document uploaded');
            loadDetail();
        } catch (error) {
            showAlert('error', error.message || 'Failed to upload supplier document');
        }
    };

    const productColumns = useMemo(() => [
        {
            key: 'productVariantName',
            header: 'Variant',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{row.supplierSku || value || row.productVariantId}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{value || row.productVariantId}</div>
                </div>
            ),
        },
        {
            key: 'price',
            header: 'Vendor Price',
            render: (value, row) => formatCurrency(value, row.currency),
        },
        {
            key: 'leadTimeDays',
            header: 'Lead Time',
            render: (value) => `${value || 0} days`,
        },
        {
            key: 'id',
            header: 'Actions',
            render: (_, row) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => updateSupplierProduct(row.id, { supplierSku: row.supplierSku, price: row.price, currency: row.currency, leadTimeDays: row.leadTimeDays }).then(loadDetail).catch((error) => showAlert('error', error.message || 'Failed to resave supplier pricing'))}>Sync</Button>
                    <Button size="sm" variant="danger" onClick={() => deleteSupplierProduct(row.id).then(loadDetail).catch((error) => showAlert('error', error.message || 'Failed to remove supplier pricing'))}>Remove</Button>
                </div>
            ),
        },
    ], [supplier?.id]);

    const documentColumns = useMemo(() => [
        {
            key: 'filename',
            header: 'Document',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.documentType}</div>
                </div>
            ),
        },
        {
            key: 'notes',
            header: 'Notes',
            render: (value) => value || '-',
        },
        {
            key: 'createdAt',
            header: 'Uploaded',
            render: (value) => formatDateTime(value),
        },
        {
            key: 'id',
            header: 'Actions',
            render: (_, row) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={async () => {
                        try {
                            const blob = await getSupplierDocumentFile(row.id);
                            downloadBlob(blob, row.filename);
                        } catch (error) {
                            showAlert('error', error.message || 'Failed to download document');
                        }
                    }}>Download</Button>
                    <Button size="sm" variant="danger" onClick={() => deleteSupplierDocument(row.id).then(loadDetail).catch((error) => showAlert('error', error.message || 'Failed to delete document'))}>Delete</Button>
                </div>
            ),
        },
    ], [supplier?.id]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={supplier ? supplier.name : 'Supplier Detail'} size="xl">
            {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} className="mb-4" /> : null}

            {supplier ? (
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{supplier.name}</h3>
                                <Badge variant={getSupplierStatusVariant(supplier.status)}>{supplier.status}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{supplier.contactName || 'No owner assigned'} • {supplier.email || 'No email'} • {supplier.phoneNumber || 'No phone'}</p>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{supplier.address || 'No supplier address recorded'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => onEdit(supplier)}>Edit</Button>
                            {supplier.status === 'PENDING' ? <Button onClick={() => handleApproval('approve')}>Approve</Button> : null}
                            {supplier.status !== 'REJECTED' && supplier.status !== 'APPROVED' ? <Button variant="danger" onClick={() => handleApproval('reject')}>Reject</Button> : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                        <Card title="Supplier Price List" subtitle="Products, landed buying price, and lead-time commitments" padding="md">
                            <form className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-2" onSubmit={handleAddProduct}>
                                <ProductVariantLookup label="Variant" selectedVariant={selectedVariant} onSelect={setSelectedVariant} className="md:col-span-2" />
                                <Input label="Supplier SKU" value={priceForm.supplierSku} onChange={(event) => setPriceForm((current) => ({ ...current, supplierSku: event.target.value }))} />
                                <Input label="Price" type="number" min="0" step="0.01" value={priceForm.price} onChange={(event) => setPriceForm((current) => ({ ...current, price: event.target.value }))} />
                                <Select label="Currency" value={priceForm.currency} onChange={(event) => setPriceForm((current) => ({ ...current, currency: event.target.value }))} options={[{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }]} placeholder="Select currency" />
                                <Input label="Lead time (days)" type="number" min="0" value={priceForm.leadTimeDays} onChange={(event) => setPriceForm((current) => ({ ...current, leadTimeDays: event.target.value }))} />
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit">Add Supplier Product</Button>
                                </div>
                            </form>
                            <DataTable columns={productColumns} data={products} loading={loading} emptyMessage="No supplier price list entries found." />
                        </Card>

                        <Card title="Compliance Documents" subtitle="Contracts, tax forms, certificates, and approvals" padding="md">
                            <form className="mb-4 space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" onSubmit={handleUploadDocument}>
                                <Input label="Document type" value={documentForm.documentType} onChange={(event) => setDocumentForm((current) => ({ ...current, documentType: event.target.value }))} required placeholder="MSA, Tax Certificate, Insurance" />
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">File</label>
                                    <input type="file" onChange={(event) => setDocumentForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                                    <textarea value={documentForm.notes} onChange={(event) => setDocumentForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit">Upload Document</Button>
                                </div>
                            </form>
                            <DataTable columns={documentColumns} data={documents} loading={loading} emptyMessage="No supplier documents uploaded yet." />
                        </Card>
                    </div>
                </div>
            ) : null}
        </Modal>
    );
};

export default SupplierDetailModal;