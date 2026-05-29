import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Input, Modal, Select } from '../../components/common';
import { createStaff } from '../../services/userService';
import { getRoles } from '../../services/roleService';
import { getWarehouses } from '../../services/warehouseService';
import { useLanguage } from '../../contexts/LanguageContext';

const PASSWORD_MODE_AUTO = 'auto';
const PASSWORD_MODE_MANUAL = 'manual';

const extractList = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
};

const CreateStaff = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [department, setDepartment] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [roleName, setRoleName] = useState('');
    const [warehouseIds, setWarehouseIds] = useState([]);
    const [passwordMode, setPasswordMode] = useState(PASSWORD_MODE_AUTO);
    const [manualPassword, setManualPassword] = useState('');
    const [forcePasswordChange, setForcePasswordChange] = useState(true);

    const [roles, setRoles] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [loadingWarehouses, setLoadingWarehouses] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [generatedPassword, setGeneratedPassword] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getRoles();
                const list = extractList(data).map((r) => (typeof r === 'string' ? { name: r } : r));
                setRoles(list);
                if (list.length > 0) {
                    setRoleName(list[0].name);
                }
            } catch (err) {
                console.error('Failed to load roles:', err);
            } finally {
                setLoadingRoles(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getWarehouses();
                setWarehouses(extractList(data));
            } catch (err) {
                console.error('Failed to load warehouses:', err);
            } finally {
                setLoadingWarehouses(false);
            }
        };
        load();
    }, []);

    const toggleWarehouse = (id) => {
        setWarehouseIds((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));
    };

    const validate = () => {
        if (!firstName.trim()) return t('users.errors.firstNameRequired') || 'First name is required.';
        if (!lastName.trim()) return t('users.errors.lastNameRequired') || 'Last name is required.';
        if (!email.trim()) return t('users.errors.emailRequired') || 'Email is required.';
        if (!roleName) return t('users.errors.roleRequired') || 'Role is required.';
        if (passwordMode === PASSWORD_MODE_MANUAL) {
            if (!manualPassword || manualPassword.length < 8) {
                return t('users.errors.passwordTooShort') || 'Temporary password must be at least 8 characters.';
            }
        }
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        const payload = {
            email: email.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim() || undefined,
            department: department.trim() || undefined,
            jobTitle: jobTitle.trim() || undefined,
            roles: [roleName],
            warehouseIds,
            forcePasswordChange,
            generatePassword: passwordMode === PASSWORD_MODE_AUTO,
        };
        if (passwordMode === PASSWORD_MODE_MANUAL) {
            payload.password = manualPassword;
        }

        setSubmitting(true);
        try {
            const result = await createStaff(payload);
            if (result?.generatedPassword) {
                setGeneratedPassword(result.generatedPassword);
            } else {
                navigate('/users');
            }
        } catch (err) {
            setError(err.message || t('users.errors.createFailed') || 'Failed to create staff member.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard not available; ignore silently
        }
    };

    const handleClose = () => {
        setGeneratedPassword('');
        navigate('/users');
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
            <div className="max-w-3xl mx-auto flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {t('users.createStaff') || 'Create staff'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {t('users.createStaffSubtitle') || 'Provision a new staff account with role and warehouse access.'}
                        </p>
                    </div>
                    <Button variant="ghost" icon="arrow_back" onClick={() => navigate('/users')}>
                        {t('common.back') || 'Back'}
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}

                    <Card title={t('users.profile') || 'Profile'}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label={t('users.firstName') || 'First name'}
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                placeholder="Alice"
                            />
                            <Input
                                label={t('users.lastName') || 'Last name'}
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                placeholder="Singh"
                            />
                            <Input
                                label={t('users.email') || 'Email'}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="alice@example.com"
                                className="sm:col-span-2"
                            />
                            <Input
                                label={t('users.phone') || 'Phone'}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+8801XXXXXXXXX"
                            />
                            <Input
                                label={t('users.department') || 'Department'}
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                placeholder="Operations"
                            />
                            <Input
                                label={t('users.jobTitle') || 'Job title'}
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="Warehouse Manager"
                                className="sm:col-span-2"
                            />
                        </div>
                    </Card>

                    <Card title={t('users.accessControl') || 'Access control'}>
                        <div className="grid grid-cols-1 gap-5">
                            <Select
                                label={t('users.role') || 'Role'}
                                value={roleName}
                                onChange={(e) => setRoleName(e.target.value)}
                                required
                                disabled={loadingRoles}
                                options={roles.map((r) => ({
                                    value: r.name,
                                    label: r.name.replace('ROLE_', '').replace('_', ' '),
                                }))}
                                placeholder={loadingRoles ? (t('common.loading') || 'Loading...') : (t('users.selectRole') || 'Select a role')}
                            />

                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                                    {t('users.warehouses') || 'Warehouses'}
                                    <span className="ml-2 text-xs font-normal text-slate-400">
                                        {t('users.warehousesHint') || '(leave empty for tenant-wide access)'}
                                    </span>
                                </label>
                                {loadingWarehouses ? (
                                    <p className="text-sm text-slate-500">{t('common.loading') || 'Loading...'}</p>
                                ) : warehouses.length === 0 ? (
                                    <p className="text-sm text-slate-500">{t('users.noWarehouses') || 'No warehouses found.'}</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                                        {warehouses.map((w) => {
                                            const id = w.id || w.warehouseId;
                                            if (!id) return null;
                                            const checked = warehouseIds.includes(id);
                                            return (
                                                <label key={id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleWarehouse(id)}
                                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                    />
                                                    <span>{w.name || w.code || id}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card title={t('users.temporaryPassword') || 'Temporary password'}>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="passwordMode"
                                        value={PASSWORD_MODE_AUTO}
                                        checked={passwordMode === PASSWORD_MODE_AUTO}
                                        onChange={() => setPasswordMode(PASSWORD_MODE_AUTO)}
                                        className="mt-1 h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {t('users.passwordAuto') || 'Auto-generate temporary password'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {t('users.passwordAutoHint') || 'A secure password will be generated and shown once after creation.'}
                                        </p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="passwordMode"
                                        value={PASSWORD_MODE_MANUAL}
                                        checked={passwordMode === PASSWORD_MODE_MANUAL}
                                        onChange={() => setPasswordMode(PASSWORD_MODE_MANUAL)}
                                        className="mt-1 h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {t('users.passwordManual') || 'Set a temporary password manually'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {t('users.passwordManualHint') || 'Minimum 8 characters. Share it with the staff member out-of-band.'}
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {passwordMode === PASSWORD_MODE_MANUAL && (
                                <Input
                                    label={t('users.password') || 'Password'}
                                    type="password"
                                    value={manualPassword}
                                    onChange={(e) => setManualPassword(e.target.value)}
                                    placeholder={t('users.passwordPlaceholder') || 'At least 8 characters'}
                                    autoComplete="new-password"
                                />
                            )}

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={forcePasswordChange}
                                    onChange={(e) => setForcePasswordChange(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                    {t('users.forcePasswordChange') || 'Require password change on first login'}
                                </span>
                            </label>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => navigate('/users')} disabled={submitting}>
                            {t('common.cancel') || 'Cancel'}
                        </Button>
                        <Button type="submit" variant="primary" loading={submitting}>
                            {t('users.createStaff') || 'Create staff'}
                        </Button>
                    </div>
                </form>
            </div>

            <Modal
                isOpen={Boolean(generatedPassword)}
                onClose={handleClose}
                title={t('users.tempPasswordTitle') || 'Temporary password generated'}
                showCloseButton={false}
            >
                <div className="space-y-4">
                    <Alert
                        type="warning"
                        message={t('users.tempPasswordWarning') || 'Copy this password now — it will not be shown again. Share it with the staff member through a secure channel.'}
                        dismissible={false}
                    />
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3">
                        <code className="flex-1 font-mono text-base text-slate-900 dark:text-white break-all">
                            {generatedPassword}
                        </code>
                        <Button variant="secondary" size="sm" icon={copied ? 'check' : 'content_copy'} onClick={handleCopy}>
                            {copied ? (t('common.copied') || 'Copied') : (t('common.copy') || 'Copy')}
                        </Button>
                    </div>
                    <div className="flex justify-end">
                        <Button variant="primary" onClick={handleClose}>
                            {t('users.gotIt') || 'Got it'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CreateStaff;
