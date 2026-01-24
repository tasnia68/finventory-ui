import React, { useState, useEffect } from 'react';
import * as roleService from '../../services/roleService';
import { Card, DataTable, Badge, Button, Input, Alert } from '../../components/common';
import { PERMISSION_LABELS } from '../../constants/permissions';

const Roles = () => {
    const [roles, setRoles] = useState([]);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesData, permissionsData] = await Promise.all([
                    roleService.getRoles(),
                    roleService.getPermissions()
                ]);

                // Handle roles
                const roleList = Array.isArray(rolesData) ? rolesData : (rolesData.content || []);
                setRoles(roleList.map(r => typeof r === 'string' ? { name: r } : r));

                // Handle permissions
                // Assuming backend returns array of strings ["MENU:SALES", ...] or objects
                const permList = Array.isArray(permissionsData) ? permissionsData : (permissionsData.content || []);
                setAvailablePermissions(permList);

            } catch (err) {
                setError('Failed to load data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', permissions: [] });

    const openCreateModal = () => {
        setEditingRole(null);
        setFormData({ name: '', description: '', permissions: [] });
        setShowModal(true);
    };

    const openEditModal = (role) => {
        setEditingRole(role);
        // Extract permission names if they are objects
        const currentPermissions = (role.permissions || []).map(p =>
            typeof p === 'string' ? p : p.name
        );

        setFormData({
            name: role.name,
            description: role.description || '',
            permissions: currentPermissions
        });
        setShowModal(true);
    };

    const handleSaveRole = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (editingRole) {
                await roleService.updateRole(editingRole.id || editingRole.name, formData);
            } else {
                await roleService.createRole(formData);
            }

            setShowModal(false);
            setFormData({ name: '', description: '', permissions: [] });
            setEditingRole(null);

            // Refresh roles
            const data = await roleService.getRoles();
            const roleList = Array.isArray(data) ? data : (data.content || []);
            setRoles(roleList.map(r => typeof r === 'string' ? { name: r } : r));
        } catch (err) {
            setError(err.message || `Failed to ${editingRole ? 'update' : 'create'} role`);
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Role Name',
            render: (name) => (
                <Badge variant="primary">
                    {(name || '').replace('ROLE_', '').replace('_', ' ')}
                </Badge>
            )
        },
        {
            key: 'description',
            header: 'Description',
            render: (_, row) => {
                if (row.description) return row.description;
                const name = row.name || '';
                if (name.includes('ADMIN')) return 'Full system access';
                if (name.includes('MANAGER')) return 'Operational access to manage users and view reports';
                return 'Basic access to view data and perform assigned tasks';
            }
        },
        {
            key: 'actions',
            header: '',
            render: (_, row) => (
                <div className="flex justify-end">
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="edit"
                        onClick={() => openEditModal(row)}
                    >
                        Edit
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Roles & Permissions
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            View and manage system roles
                        </p>
                    </div>
                    <Button icon="add" onClick={openCreateModal}>
                        Create Role
                    </Button>
                </div>

                {error && <Alert type="error" message={error} />}

                <Card padding="none" className="overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={roles}
                        loading={loading}
                        emptyMessage="No roles found"
                    />
                </Card>

                {/* Create/Edit Role Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200" title={editingRole ? 'Edit Role' : 'Create New Role'}>
                            <form onSubmit={handleSaveRole} className="space-y-4">
                                <Input
                                    label="Role Name"
                                    placeholder="e.g. ROLE_MANAGER"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                    required
                                    disabled={!!editingRole} // Disable name editing for existing roles
                                    helperText={editingRole ? "Role name cannot be changed" : "Must start with ROLE_"}
                                />
                                <Input
                                    label="Description"
                                    placeholder="Brief description of the role capabilities"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Permissions
                                    </label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-md">
                                        {availablePermissions.map((perm) => {
                                            const key = typeof perm === 'string' ? perm : perm.name;
                                            const label = (typeof perm === 'object' && perm.description) ? perm.description : (PERMISSION_LABELS[key] || key);

                                            return (
                                                <div key={key} className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id={key}
                                                        checked={formData.permissions?.includes(key)}
                                                        onChange={(e) => {
                                                            const current = formData.permissions || [];
                                                            if (e.target.checked) {
                                                                setFormData({ ...formData, permissions: [...current, key] });
                                                            } else {
                                                                setFormData({ ...formData, permissions: current.filter(p => p !== key) });
                                                            }
                                                        }}
                                                        className="size-4 text-primary focus:ring-primary border-slate-300 rounded"
                                                    />
                                                    <label htmlFor={key} className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                                                        {label}
                                                    </label>
                                                </div>
                                            );
                                        })}
                                        {availablePermissions.length === 0 && (
                                            <p className="text-sm text-slate-500 italic px-2">No permissions found from server.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" loading={saving}>
                                        {editingRole ? 'Save Changes' : 'Create Role'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Roles;
