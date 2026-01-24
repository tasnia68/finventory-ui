import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserKey, updateUser, deleteUser } from '../../services/userService';
import { getRoles } from '../../services/roleService';
import { Button, Input, Card, Alert, Badge, Select, Modal } from '../../components/common';

const UserDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        enabled: true,
        role: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userData, rolesData] = await Promise.all([
                    getUserKey(id),
                    getRoles()
                ]);

                setUser(userData);

                // Handle roles data structure (array or page object)
                const roleList = Array.isArray(rolesData) ? rolesData : (rolesData.content || []);
                setRoles(roleList.map(r => typeof r === 'string' ? { name: r } : r));

                // Determine current role (taking the first one found)
                const currentRole = userData.roles && userData.roles.length > 0 ? userData.roles[0] : '';

                // Handle cases where role is an object { name: "ROLE_ADMIN" } or structure
                const currentRoleName = typeof currentRole === 'string' ? currentRole : (currentRole.name || '');

                setFormData({
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email || '',
                    enabled: userData.enabled !== undefined ? userData.enabled : true,
                    role: currentRoleName,
                });
            } catch (err) {
                setError('Failed to load user details');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({
            ...formData,
            [e.target.name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            await updateUser(id, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                enabled: formData.enabled,
                roles: formData.role ? [formData.role] : [],
            });
            setSuccess('User updated successfully');

            // Update local user state to reflect changes
            setUser(prev => ({
                ...prev,
                firstName: formData.firstName,
                lastName: formData.lastName,
                enabled: formData.enabled,
                roles: formData.role ? [formData.role] : []
            }));
        } catch (err) {
            setError(err.message || 'Failed to update user');
            window.scrollTo(0, 0);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteUser(id);
            navigate('/users');
        } catch (err) {
            setError(err.message || 'Failed to delete user');
            setShowDeleteModal(false);
            setDeleting(false);
            window.scrollTo(0, 0);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
            </div>
        );
    }

    if (!user && !loading) {
        return (
            <div className="flex-1 p-8">
                <Alert type="error" message="User not found" />
                <Button className="mt-4" onClick={() => navigate('/users')}>Back to Users</Button>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-3xl mx-auto flex flex-col gap-8">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            User Details
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Manage user account and permissions
                        </p>
                    </div>
                    <Button variant="secondary" onClick={() => navigate('/users')}>
                        Back
                    </Button>
                </div>

                <Card title="Account Information">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {success && <Alert type="success" message={success} />}
                        {error && <Alert type="error" message={error} />}

                        <div className="flex items-center gap-4 mb-6">
                            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl uppercase">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {user.firstName} {user.lastName}
                                </h3>
                                <div className="flex gap-2 mt-1">
                                    {user.roles && user.roles.map(role => (
                                        <Badge key={typeof role === 'string' ? role : role.name} variant="info" size="sm">
                                            {(typeof role === 'string' ? role : role.name).replace('ROLE_', '').replace('_', ' ')}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Input
                                label="First Name"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                            />
                            <Input
                                label="Last Name"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <Input
                            label="Email Address"
                            name="email"
                            value={formData.email}
                            disabled
                            icon="mail"
                            className="opacity-75"
                        />

                        <Select
                            label="Role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            options={roles.map(r => ({
                                value: r.name,
                                label: r.name.replace('ROLE_', '').replace('_', ' ')
                            }))}
                            required
                        />

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="enabled"
                                name="enabled"
                                checked={formData.enabled}
                                onChange={handleChange}
                                className="size-4 text-primary focus:ring-primary border-slate-300 rounded"
                            />
                            <label htmlFor="enabled" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Account Enabled
                            </label>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button
                                type="button"
                                variant="danger"
                                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-900/20"
                                onClick={() => setShowDeleteModal(true)}
                            >
                                Delete User
                            </Button>
                            <Button type="submit" loading={saving}>
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Card>

                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title="Delete User"
                >
                    <div className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-300">
                            Are you sure you want to delete <strong>{user.firstName} {user.lastName}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={handleDelete} loading={deleting}>
                                Delete User
                            </Button>
                        </div>
                    </div>
                </Modal>

            </div>
        </div>
    );
};

export default UserDetails;
