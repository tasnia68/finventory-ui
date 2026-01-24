import React, { useState, useEffect } from 'react';
import * as roleService from '../../services/roleService';
import { Card, DataTable, Badge, Button, Input, Alert } from '../../components/common';

const Roles = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const data = await roleService.getRoles();
                const roleList = Array.isArray(data) ? data : (data.content || []);
                // Transform purely string roles to objects if needed, though they usually come as objects with permissions
                // Assuming simple response for now based on context
                setRoles(roleList.map(r => typeof r === 'string' ? { name: r } : r));
            } catch (err) {
                setError('Failed to load roles');
            } finally {
                setLoading(false);
            }
        };
        fetchRoles();
    }, []);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newRole, setNewRole] = useState({ name: '', description: '' });

    const handleCreateRole = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        try {
            await roleService.createRole(newRole);
            setShowCreateModal(false);
            setNewRole({ name: '', description: '' });
            // Refresh roles
            const data = await roleService.getRoles();
            const roleList = Array.isArray(data) ? data : (data.content || []);
            setRoles(roleList.map(r => typeof r === 'string' ? { name: r } : r));
        } catch (err) {
            setError(err.message || 'Failed to create role');
        } finally {
            setCreating(false);
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
                    <Button icon="add" onClick={() => setShowCreateModal(true)}>
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

                {/* Create Role Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200" title="Create New Role">
                            <form onSubmit={handleCreateRole} className="space-y-4">
                                <Input
                                    label="Role Name"
                                    placeholder="e.g. ROLE_MANAGER"
                                    value={newRole.name}
                                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value.toUpperCase() })}
                                    required
                                    helperText="Must start with ROLE_"
                                />
                                <Input
                                    label="Description"
                                    placeholder="Brief description of the role capabilities"
                                    value={newRole.description}
                                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                                />
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={creating}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" loading={creating}>
                                        Create Role
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
