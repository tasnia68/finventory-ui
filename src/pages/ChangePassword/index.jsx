import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button, Input, Alert, LanguageSwitcher } from '../../components/common';
import { changePassword } from '../../services/userService';

const LockIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
);

const ShieldIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 5 6v5c0 4.6 2.9 8.9 7 10 4.1-1.1 7-5.4 7-10V6l-7-3Z" />
        <path d="M12 8v8" />
        <path d="M9 11.5h6" />
    </svg>
);

const KeyIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="15" r="4" />
        <path d="M10.85 12.15 21 2" />
        <path d="m18 5 3 3" />
        <path d="m15 8 3 3" />
    </svg>
);

const ChangePassword = () => {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { clearMustChangePassword, logout } = useAuth();
    const { theme } = useContext(ThemeContext);
    const { t } = useLanguage();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!current || !next || !confirm) {
            setError(t('changePassword.errors.allRequired') || 'All fields are required.');
            return;
        }
        if (next.length < 8) {
            setError(t('changePassword.errors.tooShort') || 'New password must be at least 8 characters.');
            return;
        }
        if (next !== confirm) {
            setError(t('changePassword.errors.mismatch') || 'New password and confirmation do not match.');
            return;
        }
        if (next === current) {
            setError(t('changePassword.errors.sameAsOld') || 'New password must be different from current password.');
            return;
        }

        setLoading(true);
        try {
            await changePassword(current, next);
            clearMustChangePassword();
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.message || t('changePassword.errors.generic') || 'Failed to change password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* ── Left panel (desktop only) ── */}
            <div className="hidden lg:flex lg:w-[56%] relative flex-col overflow-hidden bg-slate-900">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_25%,_rgba(19,91,236,0.28),_transparent_55%),radial-gradient(ellipse_at_80%_75%,_rgba(249,115,22,0.15),_transparent_50%)]" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
                <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-slate-700/60 to-transparent" />

                <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">
                    <div>
                        <div className="inline-flex rounded-[50px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm xl:p-6">
                            <img src={`${import.meta.env.BASE_URL}logistra-nightmode.svg`} alt="Logistra" className="h-24 w-auto xl:h-40" />
                        </div>
                    </div>

                    <div>
                        <h1 className="text-4xl xl:text-[2.75rem] font-black tracking-tight text-white leading-[1.12]">
                            {t('changePassword.heroTitle') || 'Secure your account'}
                        </h1>
                        <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-slate-400">
                            {t('changePassword.heroDescription') || 'You are using a temporary password issued by your administrator. Choose a new password to continue.'}
                        </p>
                    </div>

                    <p className="text-xs text-slate-600">© 2026 Logistra. {t('common.allRightsReserved')}</p>
                </div>
            </div>

            {/* ── Right panel ── */}
            <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-16 dark:bg-slate-950">
                <div className="absolute right-6 top-6">
                    <LanguageSwitcher />
                </div>

                <div className="mb-10 lg:hidden">
                    <img
                        src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'logistra-nightmode.svg' : 'logistra.svg'}`}
                        alt="Logistra"
                        className="h-14 w-auto"
                    />
                </div>

                <div className="w-full max-w-[400px]">
                    <div className="mb-8">
                        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/60">
                            <span className="text-emerald-500 [&_svg]:h-[13px] [&_svg]:w-[13px]" aria-hidden="true"><ShieldIcon /></span>
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                {t('changePassword.badge') || 'Account Security'}
                            </span>
                        </div>
                        <h2 className="text-[1.75rem] font-extrabold leading-tight text-slate-900 dark:text-white">
                            {t('changePassword.title') || 'Set a new password'}
                        </h2>
                        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                            {t('changePassword.subtitle') || 'Your account is using a temporary password. Please set a new one to continue.'}
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <Alert type="error" message={error} onDismiss={() => setError('')} />
                        )}

                        <Input
                            label={t('changePassword.currentPassword') || 'Current password'}
                            type="password"
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                            required
                            autoComplete="current-password"
                            placeholder={t('changePassword.currentPasswordPlaceholder') || 'Temporary password'}
                            icon={<KeyIcon />}
                        />

                        <Input
                            label={t('changePassword.newPassword') || 'New password'}
                            type="password"
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            required
                            autoComplete="new-password"
                            placeholder={t('changePassword.newPasswordPlaceholder') || 'At least 8 characters'}
                            icon={<LockIcon />}
                            helperText={t('changePassword.newPasswordHint') || 'Use 8 or more characters with a mix of letters, numbers, and symbols.'}
                        />

                        <Input
                            label={t('changePassword.confirmPassword') || 'Confirm new password'}
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            autoComplete="new-password"
                            placeholder={t('changePassword.confirmPasswordPlaceholder') || 'Re-enter new password'}
                            icon={<LockIcon />}
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={loading}
                            size="lg"
                            className="!rounded-xl"
                        >
                            {t('changePassword.submit') || 'Update password'}
                        </Button>

                        <button
                            type="button"
                            onClick={logout}
                            className="block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        >
                            {t('changePassword.signOut') || 'Sign out instead'}
                        </button>
                    </form>
                </div>

                <p className="mt-10 text-xs text-slate-400 lg:hidden">© 2026 Logistra. {t('common.allRightsReserved')}</p>
            </div>
        </div>
    );
};

export default ChangePassword;
