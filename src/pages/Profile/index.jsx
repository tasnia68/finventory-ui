import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, Alert } from '../../components/common';

const Profile = () => {
    const { user, updateProfile } = useAuth();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess('');
        setError('');

        try {
            await updateProfile({
                firstName: formData.firstName,
                lastName: formData.lastName,
            });
            setSuccess('Profile updated successfully');
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-3xl mx-auto flex flex-col gap-8">

                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        My Profile
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage your personal information
                    </p>
                </div>

                <Card title="Personal Details">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {success && <Alert type="success" message={success} />}
                        {error && <Alert type="error" message={error} />}

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

                        <div className="flex justify-end">
                            <Button type="submit" loading={loading}>
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Card>

            </div>
        </div>
    );
};

export default Profile;
