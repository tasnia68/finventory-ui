import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Input, Select } from '../../components/common';
import SalesHero from '../../components/sales/SalesHero';
import { createPosTerminal, getPosBootstrap, getPosTerminalRegister, updatePosTerminalStatus } from '../../services/posService';

const INITIAL_FORM = {
    name: '',
    terminalCode: '',
    warehouseId: '',
    notes: '',
};

const PosCounters = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [updatingTerminalId, setUpdatingTerminalId] = useState(null);
    const [alert, setAlert] = useState(null);
    const [bootstrap, setBootstrap] = useState({ terminals: [], warehouses: [] });
    const [form, setForm] = useState(INITIAL_FORM);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await getPosBootstrap();
                const terminals = await getPosTerminalRegister({ includeInactive: true });
                setBootstrap({ terminals: terminals || [], warehouses: data.warehouses || [] });
                setForm((current) => ({ ...current, warehouseId: current.warehouseId || data.warehouses?.[0]?.id || '' }));
            } catch (error) {
                setAlert({ type: 'error', message: error.message || 'Failed to load POS counters' });
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const warehouseOptions = useMemo(
        () => bootstrap.warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
        [bootstrap.warehouses]
    );

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const terminal = await createPosTerminal({
                name: form.name.trim(),
                terminalCode: form.terminalCode.trim() || undefined,
                warehouseId: form.warehouseId,
                notes: form.notes.trim() || undefined,
            });
            setBootstrap((current) => ({ ...current, terminals: [...current.terminals, terminal].sort((left, right) => left.name.localeCompare(right.name)) }));
            setForm((current) => ({ ...INITIAL_FORM, warehouseId: current.warehouseId }));
            setAlert({ type: 'success', message: `Counter ${terminal.name} created successfully` });
        } catch (error) {
            setAlert({ type: 'error', message: error.message || 'Failed to create POS counter' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleTerminal = async (terminal) => {
        try {
            setUpdatingTerminalId(terminal.id);
            const updated = await updatePosTerminalStatus(terminal.id, {
                active: !terminal.active,
                notes: terminal.notes || null,
            });
            setBootstrap((current) => ({
                ...current,
                terminals: current.terminals
                    .map((item) => (item.id === updated.id ? updated : item))
                    .sort((left, right) => left.name.localeCompare(right.name)),
            }));
            setAlert({ type: 'success', message: `${updated.name} ${updated.active ? 'activated' : 'deactivated'} successfully` });
        } catch (error) {
            setAlert({ type: 'error', message: error.message || 'Failed to update POS counter status' });
        } finally {
            setUpdatingTerminalId(null);
        }
    };

    if (loading) {
        return <div className="flex-1 bg-background-light dark:bg-background-dark" />;
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-8">
                <SalesHero
                    eyebrow="POS Counter Setup"
                    title="Create counters and bind each one to an operating warehouse."
                    description="Counter setup lives separately from checkout so supervisors can provision terminals without crowding the selling screen. Each counter is tied to one warehouse and can open its own cashier shift."
                    accent="from-amber-500/15 via-transparent to-blue-500/10"
                />

                {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
                    <Card className="rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">New Counter</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Add POS terminal</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Create a named counter, optionally set a custom terminal code, and choose the warehouse it sells from.</p>

                        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                            <Input label="Counter Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Front Counter 1" required />
                            <Input label="Terminal Code" value={form.terminalCode} onChange={(event) => setForm((current) => ({ ...current, terminalCode: event.target.value.toUpperCase() }))} placeholder="Optional, auto-generated if blank" />
                            <Select label="Warehouse" value={form.warehouseId} onChange={(event) => setForm((current) => ({ ...current, warehouseId: event.target.value }))} options={warehouseOptions} placeholder="Select warehouse" required />
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Optional setup notes for the cashier team" />
                            </div>
                            <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-700">
                                <Button type="submit" loading={saving} disabled={!form.name.trim() || !form.warehouseId}>Create Counter</Button>
                            </div>
                        </form>
                    </Card>

                    <Card className="rounded-[30px] border border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Provisioned Counters</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Current terminal register</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">These counters are available to cashiers on the POS selling page.</p>

                        <div className="mt-6 space-y-3">
                            {bootstrap.terminals.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    No counters created yet.
                                </div>
                            ) : bootstrap.terminals.map((terminal) => (
                                <div key={terminal.id} className="rounded-3xl border border-slate-200 p-4 dark:border-slate-700">
                                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="text-lg font-black text-slate-900 dark:text-white">{terminal.name}</p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{terminal.terminalCode} • {terminal.warehouseName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={terminal.active ? 'success' : 'warning'}>{terminal.active ? 'Active' : 'Inactive'}</Badge>
                                            <Button
                                                size="sm"
                                                variant={terminal.active ? 'danger' : 'secondary'}
                                                loading={updatingTerminalId === terminal.id}
                                                onClick={() => handleToggleTerminal(terminal)}
                                            >
                                                {terminal.active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                        </div>
                                    </div>
                                    {terminal.notes ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{terminal.notes}</p> : null}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PosCounters;