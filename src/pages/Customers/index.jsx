import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input, MetricCard, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { createCustomer, getCustomers, updateCustomer } from '../../services/customerService';
import CustomerDetailModal from './CustomerDetailModal';
import CustomerFormModal from './CustomerFormModal';
import { formatCurrency, formatDateTime, formatNumber, getCustomerStatusVariant } from '../Sales/utils';

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'BLOCKED'].map((value) => ({ value, label: value }));
const CATEGORY_OPTIONS = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR', 'ENTERPRISE', 'GOVERNMENT', 'OTHER'].map((value) => ({ value, label: value }));

const emptyForm = {
    name: '',
    contactName: '',
    email: '',
    phoneNumber: '',
    address: '',
    creditLimit: '',
    category: 'OTHER',
    isActive: true,
    status: 'ACTIVE',
};

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({ query: '', status: '', category: '' });
    const [formData, setFormData] = useState(emptyForm);
    const [showFormModal, setShowFormModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    useEffect(() => {
        loadCustomers();
    }, []);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        window.setTimeout(() => setAlert(null), 5000);
    };

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const data = await getCustomers();
            setCustomers(Array.isArray(data) ? data : []);
        } catch (error) {
            showAlert('error', error.message || 'Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = useMemo(() => {
        const normalizedQuery = filters.query.trim().toLowerCase();
        return customers.filter((customer) => {
            if (filters.status && customer.status !== filters.status) return false;
            if (filters.category && customer.category !== filters.category) return false;
            if (!normalizedQuery) return true;
            return [customer.name, customer.contactName, customer.email, customer.phoneNumber]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [customers, filters]);

    const summary = useMemo(() => ({
        total: customers.length,
        active: customers.filter((customer) => customer.status === 'ACTIVE').length,
        blocked: customers.filter((customer) => customer.status === 'BLOCKED').length,
        outstanding: customers.reduce((sum, customer) => sum + Number(customer.outstandingBalance || 0), 0),
    }), [customers]);

    const columns = [
        {
            key: 'name',
            header: 'Customer',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.contactName || 'No owner'} • {row.email || 'No email'}</div>
                </div>
            ),
        },
        { key: 'status', header: 'Status', render: (value) => <Badge variant={getCustomerStatusVariant(value)}>{value}</Badge> },
        { key: 'category', header: 'Category', render: (value) => value || 'OTHER' },
        { key: 'availableCredit', header: 'Available Credit', render: (value) => formatCurrency(value) },
        { key: 'updatedAt', header: 'Updated', render: (value) => formatDateTime(value) },
    ];

    const openCreate = () => {
        setEditingCustomer(null);
        setFormData(emptyForm);
        setShowFormModal(true);
    };

    const openEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name || '',
            contactName: customer.contactName || '',
            email: customer.email || '',
            phoneNumber: customer.phoneNumber || '',
            address: customer.address || '',
            creditLimit: customer.creditLimit ?? '',
            category: customer.category || 'OTHER',
            isActive: customer.isActive ?? true,
            status: customer.status || 'ACTIVE',
        });
        setShowFormModal(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const payload = {
                ...formData,
                creditLimit: formData.creditLimit === '' ? null : Number(formData.creditLimit),
            };
            if (editingCustomer) {
                await updateCustomer(editingCustomer.id, payload);
                showAlert('success', 'Customer updated successfully');
            } else {
                await createCustomer(payload);
                showAlert('success', 'Customer created successfully');
            }
            setShowFormModal(false);
            loadCustomers();
        } catch (error) {
            showAlert('error', error.message || 'Failed to save customer');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <SalesHero
                    eyebrow="Customer Management"
                    title="Manage commercial accounts before orders enter fulfillment."
                    description="Sales operations can control customer onboarding, credit posture, and price-list exceptions from one register before demand is committed to warehouse stock."
                    actions={(
                        <>
                            <Input placeholder="Search customer, owner, or email" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="min-w-[260px]" />
                            <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={STATUS_OPTIONS} placeholder="Status" className="min-w-[180px]" />
                            <Select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} options={CATEGORY_OPTIONS} placeholder="Category" className="min-w-[180px]" />
                            <Button variant="secondary" icon="sync" onClick={loadCustomers}>Refresh</Button>
                            <Button icon="add" onClick={openCreate}>Add Customer</Button>
                        </>
                    )}
                    accent="from-rose-500/15 via-transparent to-cyan-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard title="Customers" value={formatNumber(summary.total)} caption="Commercial accounts in the sales workspace" icon="groups" tone="blue" />
                    <MetricCard title="Active Accounts" value={formatNumber(summary.active)} caption="Customers available for new order commitments" icon="verified_user" tone="emerald" />
                    <MetricCard title="Blocked" value={formatNumber(summary.blocked)} caption="Accounts constrained by status or credit posture" icon="block" tone="rose" />
                    <MetricCard title="Outstanding Balance" value={formatCurrency(summary.outstanding)} caption="Open exposure across all customer accounts" icon="credit_score" tone="amber" />
                </div>

                <Card padding="none" className="overflow-hidden" title="Customer Register" subtitle="Master commercial accounts used by sales orders and credit workflows">
                    <DataTable columns={columns} data={filteredCustomers} loading={loading} emptyMessage="No customers found." onRowClick={setSelectedCustomer} />
                </Card>
            </div>

            <CustomerFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} formData={formData} onChange={(field, value) => setFormData((current) => ({ ...current, [field]: value }))} onSubmit={handleSubmit} loading={saving} isEditing={Boolean(editingCustomer)} />

            <CustomerDetailModal
                customer={selectedCustomer}
                isOpen={Boolean(selectedCustomer)}
                onClose={() => setSelectedCustomer(null)}
                onRefresh={loadCustomers}
                onEdit={(customer) => {
                    setSelectedCustomer(null);
                    openEdit(customer);
                }}
            />
        </div>
    );
};

export default Customers;