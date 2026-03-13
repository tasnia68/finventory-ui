import React from 'react';

const sizeClasses = {
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
};

const CatalogPageFrame = ({ children, size = '2xl' }) => {
    return (
        <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
            <div className={`mx-auto flex ${sizeClasses[size] || sizeClasses['2xl']} flex-col gap-8`}>
                {children}
            </div>
        </div>
    );
};

export default CatalogPageFrame;