import React, { useEffect, useState } from 'react';
import { Button, Input, Modal } from '../../components/common';
import {
    getRateCards,
    createRateCard,
    updateRateCard,
    deleteRateCard,
    getDeliveryZones,
} from '../../services/courierService';

const toList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

const emptyRow = (zone) => ({
    id: null,
    zone,
    customerCharge: '',
    courierCost: '',
    codFeePercent: '',
    weightKgIncluded: '',
    perKgOverage: '',
});

const RateCardModal = ({ profile, onClose, onAlert }) => {
    const [zones, setZones] = useState([]);
    const [rows, setRows] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            setLoading(true);
            const [zoneData, cardData] = await Promise.all([getDeliveryZones(), getRateCards(profile.id)]);
            const zoneList = toList(zoneData);
            const cards = toList(cardData);
            setZones(zoneList);
            const byZone = Object.fromEntries(cards.map((c) => [c.zone, c]));
            setRows(zoneList.map((zone) => {
                const card = byZone[zone];
                return card
                    ? {
                          id: card.id,
                          zone,
                          customerCharge: card.customerCharge ?? '',
                          courierCost: card.courierCost ?? '',
                          codFeePercent: card.codFeePercent ?? '',
                          weightKgIncluded: card.weightKgIncluded ?? '',
                          perKgOverage: card.perKgOverage ?? '',
                      }
                    : emptyRow(zone);
            }));
        } catch (error) {
            onAlert('error', error.message || 'Failed to load rate cards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [profile?.id]);

    const updateRow = (zone, field, value) => {
        setRows((current) => current.map((row) => (row.zone === zone ? { ...row, [field]: value } : row)));
    };

    const saveRow = async (row) => {
        if (!row.customerCharge || !row.courierCost) {
            onAlert('error', `Zone ${row.zone}: customer charge and courier cost are required`);
            return;
        }
        try {
            setSaving(true);
            const payload = {
                zone: row.zone,
                customerCharge: Number(row.customerCharge),
                courierCost: Number(row.courierCost),
                codFeePercent: row.codFeePercent === '' ? 0 : Number(row.codFeePercent),
                weightKgIncluded: row.weightKgIncluded === '' ? null : Number(row.weightKgIncluded),
                perKgOverage: row.perKgOverage === '' ? null : Number(row.perKgOverage),
            };
            if (row.id) {
                await updateRateCard(row.id, payload);
            } else {
                await createRateCard(profile.id, payload);
            }
            onAlert('success', `Zone ${row.zone} saved`);
            load();
        } catch (error) {
            onAlert('error', error.message || 'Failed to save rate card');
        } finally {
            setSaving(false);
        }
    };

    const removeRow = async (row) => {
        if (!row.id) return;
        if (!window.confirm(`Delete rate card for zone ${row.zone}?`)) return;
        try {
            await deleteRateCard(row.id);
            onAlert('success', `Zone ${row.zone} removed`);
            load();
        } catch (error) {
            onAlert('error', error.message || 'Failed to delete rate card');
        }
    };

    return (
        <Modal isOpen onClose={onClose} title={`Rate cards — ${profile.displayName}`} size="xl">
            <div className="space-y-4">
                <p className="text-sm text-slate-500">
                    Configure per-zone delivery charges. <span className="font-semibold">Customer charge</span> is what you bill the buyer; <span className="font-semibold">courier cost</span> is what the courier bills you; <span className="font-semibold">COD fee %</span> applies to cash collected on delivery.
                </p>
                {loading ? (
                    <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                                    <th className="py-2 pr-2">Zone</th>
                                    <th className="py-2 pr-2">Customer charge</th>
                                    <th className="py-2 pr-2">Courier cost</th>
                                    <th className="py-2 pr-2">COD fee %</th>
                                    <th className="py-2 pr-2">Kg included</th>
                                    <th className="py-2 pr-2">Per-kg overage</th>
                                    <th className="py-2 pr-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.zone} className="border-b border-slate-100 dark:border-slate-800">
                                        <td className="py-2 pr-2 font-semibold">{row.zone}</td>
                                        <td className="py-2 pr-2"><Input type="number" step="0.01" value={row.customerCharge} onChange={(e) => updateRow(row.zone, 'customerCharge', e.target.value)} /></td>
                                        <td className="py-2 pr-2"><Input type="number" step="0.01" value={row.courierCost} onChange={(e) => updateRow(row.zone, 'courierCost', e.target.value)} /></td>
                                        <td className="py-2 pr-2"><Input type="number" step="0.0001" value={row.codFeePercent} onChange={(e) => updateRow(row.zone, 'codFeePercent', e.target.value)} /></td>
                                        <td className="py-2 pr-2"><Input type="number" step="0.001" value={row.weightKgIncluded} onChange={(e) => updateRow(row.zone, 'weightKgIncluded', e.target.value)} /></td>
                                        <td className="py-2 pr-2"><Input type="number" step="0.01" value={row.perKgOverage} onChange={(e) => updateRow(row.zone, 'perKgOverage', e.target.value)} /></td>
                                        <td className="py-2 pr-2">
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="primary" onClick={() => saveRow(row)} disabled={saving}>Save</Button>
                                                {row.id ? <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeRow(row)}>Delete</Button> : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
};

export default RateCardModal;
