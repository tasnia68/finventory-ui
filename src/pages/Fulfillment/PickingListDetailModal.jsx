import React, { useEffect, useState } from 'react';
import { Badge, Button, Input, Modal, Select } from '../../components/common';
import { formatNumber, getPickingStatusVariant, downloadTextFile } from '../Sales/utils';

const PickingListDetailModal = ({ pickingList, isOpen, onClose, users, onAssign, onUpdateTask, onComplete, onDownloadPackingList, loading }) => {
    const [assignedToId, setAssignedToId] = useState('');
    const [draftTasks, setDraftTasks] = useState({});

    useEffect(() => {
        setAssignedToId(pickingList?.assignedToId || '');
        setDraftTasks(Object.fromEntries((pickingList?.tasks || []).map((task) => [task.id, { pickedQuantity: task.pickedQuantity ?? 0, notes: task.notes || '' }])));
    }, [pickingList]);

    if (!pickingList) return null;

    const exportPackingList = async () => {
        const data = await onDownloadPackingList(pickingList.id);
        const lines = (data.tasks || []).map((task) => `${task.sku || task.productVariantName} | ${task.storageLocationName} | batch ${task.batchNumber || '-'} | request ${task.requestedQuantity}`);
        downloadTextFile([`Packing List ${data.pickingNumber}`, '', ...lines].join('\n'), `${data.pickingNumber}.txt`);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={pickingList.pickingNumber} size="xl">
            <div className="space-y-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{pickingList.pickingNumber}</h3>
                            <Badge variant={getPickingStatusVariant(pickingList.status)}>{pickingList.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{pickingList.type} • {pickingList.warehouseName} • {pickingList.tasks?.length || 0} tasks</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{pickingList.notes || 'No picking notes captured.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={exportPackingList}>Export Packing List</Button>
                        {pickingList.status !== 'COMPLETED' ? <Button onClick={() => onComplete(pickingList.id)} disabled={loading}>Complete List</Button> : null}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                    <Select
                        label="Assign Picker"
                        value={assignedToId}
                        onChange={(event) => setAssignedToId(event.target.value)}
                        options={users.map((user) => ({ value: user.id, label: user.email || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.id }))}
                        placeholder="Select picker"
                    />
                    <Button onClick={() => onAssign(pickingList.id, assignedToId)} disabled={!assignedToId || loading}>Assign Picker</Button>
                </div>

                <div className="space-y-3">
                    {(pickingList.tasks || []).map((task) => (
                        <div key={task.id} className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 lg:grid-cols-12">
                            <div className="lg:col-span-4">
                                <div className="font-semibold text-slate-900 dark:text-white">{task.sku || task.productVariantName}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{task.storageLocationName} • batch {task.batchNumber || '-'}</div>
                            </div>
                            <div className="lg:col-span-2 flex items-center text-sm text-slate-500 dark:text-slate-400">Requested {formatNumber(task.requestedQuantity)}</div>
                            <Input className="lg:col-span-2" label="Picked Qty" type="number" min="0" step="0.01" value={draftTasks[task.id]?.pickedQuantity ?? ''} onChange={(event) => setDraftTasks((current) => ({ ...current, [task.id]: { ...current[task.id], pickedQuantity: event.target.value } }))} />
                            <Input className="lg:col-span-3" label="Notes" value={draftTasks[task.id]?.notes ?? ''} onChange={(event) => setDraftTasks((current) => ({ ...current, [task.id]: { ...current[task.id], notes: event.target.value } }))} />
                            <div className="flex items-end lg:col-span-1">
                                <Button size="sm" onClick={() => onUpdateTask(task.id, draftTasks[task.id])} disabled={loading}>Save</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export default PickingListDetailModal;