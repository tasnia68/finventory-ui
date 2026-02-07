import React, { useEffect, useState } from 'react';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../services/warehouseService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
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

const Warehouses = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [alert, setAlert] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        type: 'PRIMARY',
        contactNumber: '',
        isActive: true,
    });

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            setLoading(true);
            const data = await getWarehouses();
            setWarehouses(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load warehouses');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            location: '',
            type: 'PRIMARY',
            contactNumber: '',
            isActive: true,
        });
        setEditingWarehouse(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingWarehouse) {
                await updateWarehouse(editingWarehouse.id, formData);
                showAlert('success', 'Warehouse updated successfully');
            } else {
                await createWarehouse(formData);
                showAlert('success', 'Warehouse created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchWarehouses();
        } catch (error) {
            showAlert('error', error.message || 'Failed to save warehouse');
        }
    };

    const handleEdit = (warehouse) => {
        setEditingWarehouse(warehouse);
        setFormData({
            name: warehouse.name || '',
            location: warehouse.location || '',
            type: warehouse.type || 'PRIMARY',
            contactNumber: warehouse.contactNumber || '',
            isActive: warehouse.isActive !== false,
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this warehouse?')) return;
        try {
            await deleteWarehouse(id);
            showAlert('success', 'Warehouse deleted successfully');
            fetchWarehouses();
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete warehouse');
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Warehouse',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{row.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.location || '—'}</div>
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            render: (value) => (
                <Badge variant="info">{value || '—'}</Badge>
            ),
        },
        {
            key: 'contactNumber',
            header: 'Contact',
            render: (value) => (
                <span className="text-sm text-slate-600 dark:text-slate-300">{value || '—'}</span>
            ),
        },
        {
            key: 'isActive',
            header: 'Status',
            render: (value) => (
                <Badge variant={value ? 'success' : 'warning'}>
                    {value ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Warehouses
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Manage locations where stock is stored
                        </p>
                    </div>
                    <Button icon="add" onClick={() => setShowModal(true)}>
                        Add Warehouse
                    </Button>
                </div>

                {alert && (
                    <Alert
                        type={alert.type}
                        message={alert.message}
                        onDismiss={() => setAlert(null)}
                    />
                )}

                <Card padding="none" className="overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={warehouses}
                        loading={loading}
                        emptyMessage="No warehouses found. Create your first warehouse to get started."
                    />
                </Card>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    resetForm();
                }}
                title={editingWarehouse ? 'Edit Warehouse' : 'Create Warehouse'}
            >
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Main Warehouse"
                        required
                    />
                    <Input
                        label="Location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Dhaka"
                    />
                    <Input
                        label="Type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        placeholder="PRIMARY"
                    />
                    <Input
                        label="Contact Number"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                        placeholder="+8801..."
                    />
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="warehouseActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="warehouseActive" className="text-sm text-slate-600 dark:text-slate-300">
                            Active
                        </label>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Save Warehouse</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Warehouses;