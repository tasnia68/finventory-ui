import React, { useEffect, useState } from 'react';
import {
    createCycleCount,
    scheduleCycleCount,
    startCycleCount,
    finishCycleCount,
    approveCycleCount,
    getCycleCounts,
} from '../../services/cycleCountService';
import { getWarehouses } from '../../services/warehouseService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';

const COUNT_TYPES = [
    { value: 'FULL', label: 'Full' },
    { value: 'PARTIAL', label: 'Partial' },
    { value: 'CYCLE', label: 'Cycle' },
];

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

const CycleCounts = () => {
    const [counts, setCounts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        warehouseId: '',
        type: 'FULL',
        dueDate: '',
        description: '',
        assignedUserId: '',
    });

    useEffect(() => {
        fetchCounts();
        fetchWarehouses();
    }, []);

    const fetchCounts = async () => {
        try {
            setLoading(true);
            const data = await getCycleCounts();
            setCounts(toList(data));
        } catch (error) {
            showAlert('error', error.message || 'Failed to load cycle counts');
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

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createCycleCount(formData);
            showAlert('success', 'Cycle count created');
            setShowModal(false);
            setFormData({ warehouseId: '', type: 'FULL', dueDate: '', description: '', assignedUserId: '' });
            fetchCounts();
        } catch (error) {
            showAlert('error', error.message || 'Failed to create cycle count');
        }
    };

    const handleAction = async (action, id) => {
        try {
            if (action === 'schedule') await scheduleCycleCount(id);
            if (action === 'start') await startCycleCount(id);
            if (action === 'finish') await finishCycleCount(id);
            if (action === 'approve') await approveCycleCount(id);
            showAlert('success', `Cycle count ${action}d`);
            fetchCounts();
        } catch (error) {
            showAlert('error', error.message || 'Action failed');
        }
    };

    const warehouseOptions = toList(warehouses).map((warehouse) => ({
        value: warehouse.id,
        label: warehouse.name,
    }));

    const columns = [
        {
            key: 'id',
            header: 'Cycle Count',
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{row.reference || row.id}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.warehouseName || row.warehouseId}</div>
                </div>
            ),
        },
        { key: 'type', header: 'Type' },
        { key: 'status', header: 'Status', render: (value) => <Badge variant="info">{value || 'NEW'}</Badge> },
        { key: 'dueDate', header: 'Due', render: (value) => formatDate(value) },
        {
            key: 'actions',
            header: 'Actions',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleAction('schedule', row.id)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">event</span>
                    </button>
                    <button
                        onClick={() => handleAction('start', row.id)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-mint-600 dark:hover:text-mint-400 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">play_circle</span>
                    </button>
                    <button
                        onClick={() => handleAction('finish', row.id)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </button>
                    <button
                        onClick={() => handleAction('approve', row.id)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">verified</span>
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
                            Cycle Counts
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Schedule and review physical inventory counts
                        </p>
                    </div>
                    <Button icon="add" onClick={() => setShowModal(true)}>
                        Create Cycle Count
                    </Button>
                </div>

                {alert && (
                    <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
                )}

                <Card padding="none" className="overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={counts}
                        loading={loading}
                        emptyMessage="No cycle counts found."
                    />
                </Card>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Create Cycle Count"
            >
                <form className="space-y-4" onSubmit={handleCreate}>
                    <Select
                        label="Warehouse"
                        value={formData.warehouseId}
                        onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                        options={warehouseOptions}
                        required
                    />
                    <Select
                        label="Type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        options={COUNT_TYPES}
                        required
                    />
                    <Input
                        label="Due Date"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        required
                    />
                    <Input
                        label="Assigned User ID"
                        value={formData.assignedUserId}
                        onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                    />
                    <Input
                        label="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Create</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CycleCounts;