import React from 'react';

const Button = ({
    children,
    variant = 'primary', // 'primary', 'secondary', 'danger', 'ghost'
    size = 'md', // 'sm', 'md', 'lg'
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    type = 'button',
    onClick,
    className = '',
    ...props
}) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        primary: 'bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/30',
        secondary: 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
        danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/30',
        ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
            {...props}
        >
            {loading && (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            )}
            {!loading && icon && iconPosition === 'left' && (
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
            )}
            {children}
            {!loading && icon && iconPosition === 'right' && (
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
            )}
        </button>
    );
};

export default Button;
