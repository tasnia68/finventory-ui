import React from 'react';

const Card = ({
    children,
    title,
    subtitle,
    action,
    padding = 'md', // 'none', 'sm', 'md', 'lg'
    className = '',
    ...props
}) => {
    const paddingClasses = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    return (
        <div
            className={`
        bg-white dark:bg-slate-800 
        rounded-xl 
        border border-slate-200 dark:border-slate-700 
        shadow-sm
        ${paddingClasses[padding]}
        ${className}
      `}
            {...props}
        >
            {(title || action) && (
                <div className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${padding !== 'none' ? '' : 'px-6 pt-6'}`}>
                    <div>
                        {title && (
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
