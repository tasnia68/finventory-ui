import React, { useEffect, useState } from 'react';

const Alert = ({
    type = 'info', // 'success', 'error', 'warning', 'info'
    message,
    title,
    dismissible = true,
    onDismiss,
    autoClose = 0, // milliseconds, 0 = no auto close
    className = '',
}) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (autoClose > 0) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, autoClose);
            return () => clearTimeout(timer);
        }
    }, [autoClose]);

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss && onDismiss();
    };

    if (!isVisible) return null;

    const typeConfig = {
        success: {
            bg: 'bg-mint-50 dark:bg-mint-900/20',
            border: 'border-mint-200 dark:border-mint-800',
            text: 'text-mint-800 dark:text-mint-300',
            icon: 'check_circle',
            iconColor: 'text-mint-500',
        },
        error: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800',
            text: 'text-red-800 dark:text-red-300',
            icon: 'error',
            iconColor: 'text-red-500',
        },
        warning: {
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            border: 'border-orange-200 dark:border-orange-800',
            text: 'text-orange-800 dark:text-orange-300',
            icon: 'warning',
            iconColor: 'text-orange-500',
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            text: 'text-blue-800 dark:text-blue-300',
            icon: 'info',
            iconColor: 'text-blue-500',
        },
    };

    const config = typeConfig[type];

    return (
        <div
            className={`
        flex items-start gap-3 p-4 rounded-lg border
        ${config.bg} ${config.border} ${config.text}
        ${className}
      `}
        >
            <span className={`material-symbols-outlined ${config.iconColor} flex-shrink-0`}>
                {config.icon}
            </span>
            <div className="flex-1">
                {title && (
                    <p className="font-semibold mb-1">{title}</p>
                )}
                <p className="text-sm">{message}</p>
            </div>
            {dismissible && (
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            )}
        </div>
    );
};

export default Alert;
