import React, { useState, useContext } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { Button, Input, Alert, LanguageSwitcher } from '../../components/common';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

const FEATURE_KEYS = [
    { icon: 'inventory_2', key: 'catalog' },
    { icon: 'warehouse', key: 'oneWorkspace' },
    { icon: 'monitoring', key: 'fasterDecisions' },
];

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const { theme } = useContext(ThemeContext);
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || t('login.failedToSignIn'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* ── Left panel (desktop only) ── */}
            <div className="hidden lg:flex lg:w-[56%] relative flex-col overflow-hidden bg-slate-900">
                {/* Ambient glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_25%,_rgba(19,91,236,0.28),_transparent_55%),radial-gradient(ellipse_at_80%_75%,_rgba(249,115,22,0.15),_transparent_50%)]" />
                {/* Subtle grid overlay */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',backgroundSize:'40px 40px'}} />
                {/* Right edge separator */}
                <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-slate-700/60 to-transparent" />

                <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">
                    {/* Logo */}
                    <div>
                        <div className="inline-flex rounded-2xl border border-white/10 bg-white/8 p-3.5 backdrop-blur-sm">
                            <img src="/logistra-nightmode.svg" alt="Logistra" className="h-9 w-auto" />
                        </div>
                    </div>

                    {/* Headline + feature cards */}
                    <div>
                        <h1 className="text-4xl xl:text-[2.75rem] font-black tracking-tight text-white leading-[1.12]">
                            {t('login.heroTitle')}
                        </h1>
                        <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-slate-400">
                            {t('login.heroDescription')}
                        </p>

                        <div className="mt-10 grid grid-cols-3 gap-3">
                            {FEATURE_KEYS.map(({ icon, key }) => (
                                <div key={key} className="rounded-2xl border border-white/8 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:bg-white/8">
                                    <span className="material-symbols-outlined text-[22px] text-blue-400">{icon}</span>
                                    <div className="mt-3 text-sm font-bold text-white">{t(`login.features.${key}.label`)}</div>
                                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t(`login.features.${key}.desc`)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-xs text-slate-600">© 2026 Logistra. {t('common.allRightsReserved')}</p>
                </div>
            </div>

            {/* ── Right panel ── */}
            <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-16 dark:bg-slate-950">
                <div className="absolute right-6 top-6">
                    <LanguageSwitcher />
                </div>

                {/* Mobile logo */}
                <div className="mb-10 lg:hidden">
                    <img
                        src={theme === 'dark' ? '/logistra-nightmode.svg' : '/logistra.svg'}
                        alt="Logistra"
                        className="h-9 w-auto"
                    />
                </div>

                <div className="w-full max-w-[400px]">
                    {/* Form header */}
                    <div className="mb-8">
                        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-800/60">
                            <span className="material-symbols-outlined text-[13px] text-emerald-500">lock</span>
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('common.secureAccess')}</span>
                        </div>
                        <h2 className="text-[1.75rem] font-extrabold leading-tight text-slate-900 dark:text-white">
                            {t('login.signInTitle')}
                        </h2>
                        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                            {t('login.signInDescription')}
                        </p>
                    </div>

                    {/* Form */}
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <Alert type="error" message={error} onDismiss={() => setError('')} />
                        )}

                        <Input
                            label={t('login.emailAddress')}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder={t('login.emailPlaceholder')}
                            icon="mail"
                        />

                        <Input
                            label={t('login.password')}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder={t('login.passwordPlaceholder')}
                            icon="lock"
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-400">{t('common.rememberMe')}</span>
                            </label>
                            <a href="#" className="text-sm font-medium text-primary transition-colors hover:text-primary/80">
                                {t('common.forgotPassword')}
                            </a>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={loading}
                            size="lg"
                            className="!rounded-xl"
                        >
                            {t('common.signIn')}
                        </Button>
                    </form>

                    {/* Trust row */}
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="material-symbols-outlined text-[13px]">encrypted</span>
                            {t('login.trust.tls')}
                        </div>
                        <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="material-symbols-outlined text-[13px]">verified_user</span>
                            {t('login.trust.roles')}
                        </div>
                        <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="material-symbols-outlined text-[13px]">shield</span>
                            {t('login.trust.audit')}
                        </div>
                    </div>
                </div>

                {/* Mobile footer */}
                <p className="mt-10 text-xs text-slate-400 lg:hidden">© 2026 Logistra. {t('common.allRightsReserved')}</p>
            </div>
        </div>
    );
};

export default Login;
