import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, MetricCard, Input } from '../../components/common';
import ProcurementHero from '../../components/procurement/ProcurementHero';
import { average, formatDateTime, formatNumber, getSupplierStatusVariant, toList } from '../Procurement/utils';
import { createSupplier, getSuppliers, updateSupplier } from '../../services/supplierService';
import SupplierFormModal from './SupplierFormModal';
import SupplierDetailModal from './SupplierDetailModal';

const emptyForm = {
    name: '',
    contactName: '',
    email: '',
    phoneNumber: '',
    address: '',
    paymentTerms: '',
    rating: '',
    status: 'PENDING',
    isActive: true,
};

const Suppliers = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [query, setQuery] = useState('');
    const [formData, setFormData] = useState(emptyForm);
    const [showFormModal, setShowFormModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const data = await getSuppliers();
            setSuppliers(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    const filteredSuppliers = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return suppliers;
        return suppliers.filter((supplier) => [supplier.name, supplier.contactName, supplier.email, supplier.phoneNumber]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedQuery)));
    }, [query, suppliers]);

    const summary = useMemo(() => ({
        total: suppliers.length,
        approved: suppliers.filter((supplier) => supplier.status === 'APPROVED').length,
        pending: suppliers.filter((supplier) => supplier.status === 'PENDING').length,
        averageRating: average(suppliers.map((supplier) => supplier.rating || 0)),
    }), [suppliers]);

    const columns = [
        {
            key: 'name',
            header: 'Supplier',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.contactName || 'No owner'} • {row.email || 'No email'}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => <Badge variant={getSupplierStatusVariant(value)}>{value || 'PENDING'}</Badge>,
        },
        {
            key: 'paymentTerms',
            header: 'Payment Terms',
            render: (value) => value || '-',
        },
        {
            key: 'rating',
            header: 'Rating',
            render: (value) => (value ? `${Number(value).toFixed(1)} / 5` : 'Unrated'),
        },
        {
            key: 'updatedAt',
            header: 'Updated',
            render: (value) => formatDateTime(value),
        },
    ];

    const handleFormChange = (field, value) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const openCreate = () => {
        setEditingSupplier(null);
        setFormData(emptyForm);
        setShowFormModal(true);
    };

    const openEdit = (supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name || '',
            contactName: supplier.contactName || '',
            email: supplier.email || '',
            phoneNumber: supplier.phoneNumber || '',
            address: supplier.address || '',
            paymentTerms: supplier.paymentTerms || '',
            rating: supplier.rating ?? '',
            status: supplier.status || 'PENDING',
            isActive: supplier.isActive ?? true,
        });
        setShowFormModal(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const payload = {
                ...formData,
                rating: formData.rating === '' ? null : Number(formData.rating),
            };

            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, payload);
                showAlert('success', 'Supplier updated successfully');
            } else {
                await createSupplier(payload);
                showAlert('success', 'Supplier created successfully');
            }
            setShowFormModal(false);
            fetchSuppliers();
        } catch (error) {
            showAlert('error', error.message || 'Failed to save supplier');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <ProcurementHero
                    eyebrow="Supplier Management"
                    title="Control supplier onboarding, pricing, and compliance in one workspace."
                    description="Keep procurement teams on one operating surface for vendor approval, price-list maintenance, and supporting document collection before purchase orders are issued."
                    actions={(
                        <>
                            <Input placeholder="Search supplier, owner, or email" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-[280px]" />
                            <Button variant="secondary" icon="sync" onClick={fetchSuppliers}>Refresh</Button>
                            <Button icon="add" onClick={openCreate}>Add Supplier</Button>
                        </>
                    )}
                    accent="from-sky-500/15 via-transparent to-orange-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Suppliers" value={formatNumber(summary.total)} caption="Active vendor records in procurement scope" icon="diversity_3" tone="blue" />
                    <MetricCard title="Approved" value={formatNumber(summary.approved)} caption="Vendors cleared for PO issuance" icon="verified" tone="emerald" />
                    <MetricCard title="Pending Review" value={formatNumber(summary.pending)} caption="Suppliers waiting for approval workflow" icon="hourglass_top" tone="amber" />
                    <MetricCard title="Average Rating" value={summary.averageRating ? `${summary.averageRating.toFixed(1)} / 5` : 'No rating'} caption="Vendor performance signal across the supplier base" icon="star" tone="violet" />
                </div>

                <Card padding="none" className="overflow-hidden" title="Supplier Register" subtitle="Master vendor list used across procurement and receiving">
                    <DataTable columns={columns} data={filteredSuppliers} loading={loading} emptyMessage="No suppliers found." onRowClick={(row) => setSelectedSupplier(row)} />
                </Card>
            </div>

            <SupplierFormModal
                isOpen={showFormModal}
                onClose={() => setShowFormModal(false)}
                formData={formData}
                onChange={handleFormChange}
                onSubmit={handleSubmit}
                loading={saving}
                isEditing={Boolean(editingSupplier)}
            />

            <SupplierDetailModal
                supplier={selectedSupplier}
                isOpen={Boolean(selectedSupplier)}
                onClose={() => setSelectedSupplier(null)}
                onRefresh={fetchSuppliers}
                onEdit={(supplier) => {
                    setSelectedSupplier(null);
                    openEdit(supplier);
                }}
            />
        </div>
    );
};

export default Suppliers;