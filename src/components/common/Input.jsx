import React from 'react';

const Input = ({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
    icon,
    disabled = false,
    required = false,
    name,
    id,
    className = '',
    ...props
}) => {
    const inputId = id || name;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">{icon}</span>
                    </div>
                )}
                <input
                    type={type}
                    id={inputId}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    className={`
            block w-full px-3 py-2.5 
            ${icon ? 'pl-10' : ''} 
            border rounded-lg leading-5 
            bg-white dark:bg-slate-800 
            text-slate-900 dark:text-white 
            placeholder-slate-400 dark:placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary 
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${error
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-slate-200 dark:border-slate-700'
                        }
          `}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {error}
                </p>
            )}
        </div>
    );
};

export default Input;
