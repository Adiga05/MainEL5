import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading geospatial data...' }) => (
  <div className="flex flex-col items-center justify-center p-12 space-y-3">
    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-xs text-slate-500 font-medium">{message}</p>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ title, description, actionText, onAction }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-md mx-auto my-6">
    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
      📁
    </div>
    <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
      >
        {actionText}
      </button>
    )}
  </div>
);

