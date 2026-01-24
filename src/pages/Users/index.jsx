import React, { useState, useEffect } from 'react';
import { getUsers } from '../../services/userService';
import { Button, Card, DataTable, Badge, Modal, Input, Alert } from '../../components/common';
import InviteUser from './InviteUser';
import { useNavigate } from 'react-router-dom';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getUsers();
            let userList = [];

            // Handle various response structures (array key, data key, content key)
            if (Array.isArray(response)) {
                userList = response;
            } else if (response.data && Array.isArray(response.data)) {
                userList = response.data;
            } else if (response.content && Array.isArray(response.content)) {
                userList = response.content;
            }

            setUsers(userList);
        } catch (err) {
            console.error("Users page error:", err);
            // Determine if it's a network error (backend not running)
            if (err.message && err.message.includes('Failed to fetch')) {
                setError('Cannot connect to the server. Please ensure the backend API is running at http://localhost:8080');
            } else {
                setError(err.message || 'Failed to load users');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleInviteSuccess = () => {
        setIsInviteModalOpen(false);
        fetchUsers();
    };

    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            key: 'name',
            header: 'User',
            render: (_, row) => (
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                        {row.firstName?.[0] || 'U'}{row.lastName?.[0] || ''}
                    </div>
                    <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                            {row.firstName} {row.lastName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {row.email}
                        </p>
                    </div>
                </div>
            )
        },
        {
            key: 'roles',
            header: 'Role',
            render: (roles) => (
                <div className="flex gap-1">
                    {roles && roles.map(role => (
                        <Badge key={role} variant="info" size="sm">
                            {role.toString().replace('ROLE_', '').replace('_', ' ')}
                        </Badge>
                    ))}
                </div>
            )
        },
        {
            key: 'enabled',
            header: 'Status',
            render: (enabled) => (
                <Badge variant={enabled ? 'success' : 'warning'} size="sm">
                    {enabled ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            className: 'text-right',
            render: (_, row) => (
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        icon="edit"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/users/${row.id || row.userId}`);
                        }}
                    />
                </div>
            )
        }
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Users
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Manage team members and their roles
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        icon="person_add"
                        onClick={() => setIsInviteModalOpen(true)}
                    >
                        Invite User
                    </Button>
                </div>

                {/* Content */}
                {error && (
                    <Alert
                        type="error"
                        title="Connection Error"
                        message={error}
                        onDismiss={() => setError('')}
                        className="mb-4"
                    />
                )}

                <Card className="overflow-hidden" padding="none">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-4">
                        <Input
                            placeholder="Search users..."
                            icon="search"
                            className="max-w-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <DataTable
                        columns={columns}
                        data={filteredUsers}
                        loading={loading}
                        emptyMessage={error ? "Could not load users" : "No users found"}
                        onRowClick={(row) => navigate(`/users/${row.id || row.userId}`)}
                    />
                </Card>

                {/* Invite Modal */}
                <Modal
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    title="Invite New User"
                >
                    <InviteUser
                        onSuccess={handleInviteSuccess}
                        onCancel={() => setIsInviteModalOpen(false)}
                    />
                </Modal>

            </div>
        </div>
    );
};

export default Users;
