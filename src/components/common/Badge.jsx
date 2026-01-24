import React from 'react';

const Badge = ({
    children,
    variant = 'default', // 'default', 'success', 'warning', 'danger', 'info'
    size = 'md', // 'sm', 'md'
    className = '',
    ...props
}) => {
    const variantClasses = {
        default: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
        success: 'bg-mint-100 dark:bg-mint-900/30 text-mint-700 dark:text-mint-400',
        warning: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
        danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        primary: 'bg-primary/10 text-primary',
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
    };

    return (
        <span
            className={`
        inline-flex items-center 
        rounded-full 
        font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
            {...props}
        >
            {children}
        </span>
    );
};

export default Badge;
