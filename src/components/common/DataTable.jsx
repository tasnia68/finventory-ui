import React from 'react';

const DataTable = ({
    columns, // [{ key, header, render?, className? }]
    data,
    loading = false,
    emptyMessage = 'No data available',
    onRowClick,
    className = '',
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
                    progress_activity
                </span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-[48px] mb-2">inbox</span>
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={`
                  px-6 py-3 text-left text-xs font-semibold 
                  text-slate-500 dark:text-slate-400 
                  uppercase tracking-wider
                  ${column.className || ''}
                `}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {data.map((row, rowIndex) => (
                        <tr
                            key={row.id || rowIndex}
                            onClick={() => onRowClick && onRowClick(row)}
                            className={`
                ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}
                transition-colors
              `}
                        >
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={`
                    px-6 py-4 whitespace-nowrap text-sm 
                    text-slate-900 dark:text-white
                    ${column.className || ''}
                  `}
                                >
                                    {column.render
                                        ? column.render(row[column.key], row)
                                        : row[column.key]
                                    }
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;
