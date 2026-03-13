import React, { useState, useContext } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { Button, Input, Alert, Card } from '../../components/common';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const { theme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            // Determine where to redirect
            // If the user has a specific role that can't access dashboard, logic would go here
            // For now, redirect to saved location or dashboard
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_32%),radial-gradient(circle_at_75%_20%,_rgba(249,115,22,0.16),_transparent_24%),linear-gradient(to_bottom,_transparent,_rgba(15,23,42,0.04))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_32%),radial-gradient(circle_at_75%_20%,_rgba(249,115,22,0.12),_transparent_24%),linear-gradient(to_bottom,_transparent,_rgba(15,23,42,0.18))]" />
            <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                <div className="flex flex-col justify-center gap-8">
                    <div className="max-w-xl">
                        <div className="mb-6 flex items-center gap-3">
                            <img 
                                src={theme === 'dark' ? '/logistra-nightmode.svg' : '/logistra.svg'} 
                                alt="Logistra" 
                                className="h-10"
                            />
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white dark:bg-white dark:text-slate-900">
                                Inventory Control
                            </span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                            The same operations theme now starts at sign-in.
                        </h1>
                        <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-400">
                            Catalog, inventory, and transactional workspaces now share one visual system so users do not context-switch every time they move between modules.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                            <div className="text-3xl font-black text-slate-900 dark:text-white">Phase 3</div>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Catalog screens now match the Phase 4 operations styling.</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                            <div className="text-3xl font-black text-slate-900 dark:text-white">1 Theme</div>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Shared visual language across login, navigation, and module workspaces.</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                            <div className="text-3xl font-black text-slate-900 dark:text-white">Clearer</div>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Stronger hierarchy for operators moving quickly across daily tasks.</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center">
                <Card className="w-full max-w-md px-4 py-8 sm:px-10">
                    <div className="mb-6">
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white dark:bg-white dark:text-slate-900">
                            Secure Access
                        </span>
                        <h2 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">
                            Sign in to your account
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Streamline your inventory management with Logistra.
                        </p>
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error ? <Alert type="error" message={error} onDismiss={() => setError('')} /> : null}

                        <Input
                            label="Email address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                            icon="mail"
                        />

                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            icon="lock"
                        />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900 dark:text-slate-300">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-primary hover:text-primary/80">
                                    Forgot your password?
                                </a>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={loading}
                            size="lg"
                        >
                            Sign in
                        </Button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-300 dark:border-slate-700" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-2 text-slate-500 dark:bg-slate-800">
                                    Protected by standard encryption
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>
                </div>
            </div>

            <p className="relative pb-6 text-center text-xs text-slate-500 dark:text-slate-400">
                © 2026 Logistra. All rights reserved.
            </p>
        </div>
    );
};

export default Login;
