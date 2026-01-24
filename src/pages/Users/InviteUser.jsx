import React, { useState, useEffect } from 'react';
import { inviteUser } from '../../services/userService';
import { getRoles } from '../../services/roleService';
import { Button, Input, Select, Alert } from '../../components/common';

const InviteUser = ({ onSuccess, onCancel }) => {
    const [email, setEmail] = useState('');
    const [roleName, setRoleName] = useState('');
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingRoles, setFetchingRoles] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const data = await getRoles();
                // Handle roles data structure
                const roleList = Array.isArray(data) ? data : (data.content || []);
                setRoles(roleList.map(r => typeof r === 'string' ? { name: r } : r));
                if (roleList.length > 0) {
                    const firstRole = roleList[0];
                    setRoleName(typeof firstRole === 'string' ? firstRole : firstRole.name);
                }
            } catch (err) {
                setError('Failed to fetch roles');
            } finally {
                setFetchingRoles(false);
            }
        };
        fetchRoles();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await inviteUser(email, roleName);
            onSuccess();
        } catch (err) {
            setError(err.message || 'Failed to send invitation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <Alert type="error" message={error} />}

            <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="colleague@example.com"
                icon="mail"
            />

            <Select
                label="Role"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
                disabled={fetchingRoles}
                options={roles.map(r => ({
                    value: r.name,
                    label: r.name.replace('ROLE_', '').replace('_', ' ')
                }))}
                placeholder={fetchingRoles ? "Loading roles..." : "Select a role"}
            />

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    variant="secondary"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    disabled={fetchingRoles || loading}
                >
                    Send Invitation
                </Button>
            </div>
        </form>
    );
};

export default InviteUser;
