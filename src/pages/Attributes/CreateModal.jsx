import React, { useEffect, useState } from 'react';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export const ATTRIBUTE_TYPES = [
    { value: 'TEXT', label: 'Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'DATE', label: 'Date' },
    { value: 'DROPDOWN', label: 'Dropdown' },
    { value: 'MULTI_SELECT', label: 'Multi-Select' },
];

const CreateAttributeModal = ({ isOpen, onClose, onCreate, saving }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('TEXT');

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setType('TEXT');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onCreate({ name: trimmed, type });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Attribute">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Attribute Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g., Color, Size, Material"
                />
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Type
                    </label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                    >
                        {ATTRIBUTE_TYPES.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        You can configure options, validation, group, and required flag on the next screen.
                    </p>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={saving}>
                        Create &amp; Continue
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateAttributeModal;
