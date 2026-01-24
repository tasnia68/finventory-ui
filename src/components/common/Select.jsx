import React from 'react';

const Select = ({
    label,
    value,
    onChange,
    options, // [{ value, label }]
    error,
    disabled = false,
    required = false,
    placeholder = 'Select an option',
    name,
    id,
    className = '',
    ...props
}) => {
    const selectId = id || name;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label
                    htmlFor={selectId}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    id={selectId}
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    required={required}
                    className={`
            block w-full px-3 py-2.5 pr-10
            border rounded-lg 
            bg-white dark:bg-slate-800 
            text-slate-900 dark:text-white 
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary 
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            appearance-none
            ${error
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-slate-200 dark:border-slate-700'
                        }
          `}
                    {...props}
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">
                        expand_more
                    </span>
                </div>
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

export default Select;
