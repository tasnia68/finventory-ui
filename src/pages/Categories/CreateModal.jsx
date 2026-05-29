import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { createCategory } from '../../services/categoryService';
import { toList } from './constants';

const CreateModal = ({ isOpen, onClose, onCreated, flatCategories }) => {
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setParentId('');
            setError(null);
            setSaving(false);
        }
    }, [isOpen]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!name.trim()) {
            setError('Category name is required');
            return;
        }
        try {
            setSaving(true);
            setError(null);
            const created = await createCategory({
                name: name.trim(),
                description: '',
                parentId: parentId || null,
                publishedToStorefront: true,
                storefrontSlug: '',
                storefrontTitle: '',
                storefrontDescription: '',
                storefrontSortOrder: null,
            });
            if (typeof onCreated === 'function') {
                onCreated(created);
            }
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to create category');
        } finally {
            setSaving(false);
        }
    };

    const parentOptions = toList(flatCategories);

    return (
        <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} title="Create Category">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error ? (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        {error}
                    </div>
                ) : null}
                <Input
                    label="Category Name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    placeholder="e.g., Electronics"
                />
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Parent Category (Optional)
                    </label>
                    <select
                        value={parentId}
                        onChange={(event) => setParentId(event.target.value)}
                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    >
                        <option value="">None (Top Level)</option>
                        {parentOptions.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure storefront settings, description, and permissions from the category editor after creation.
                </p>
                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={saving}>
                        Create
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateModal;
