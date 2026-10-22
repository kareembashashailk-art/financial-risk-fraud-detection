import React from 'react';

export const LoadingSpinner = ({ size = 'md', text = 'Loading data...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
      <div
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full border-blue-500 border-t-transparent animate-spin`}
      />
      {text && <span className="text-sm font-medium">{text}</span>}
    </div>
  );
};
