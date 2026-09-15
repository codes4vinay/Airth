import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-4 rounded-lg border border-slate-200 bg-white flex items-center justify-between animate-pulse"
        >
          <div className="space-y-2 flex-1 max-w-md">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="flex gap-2 items-center">
              <div className="h-3 bg-slate-200 rounded w-20" />
              <div className="h-3 bg-slate-200 rounded w-24" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-20 bg-slate-200 rounded-full" />
            <div className="h-8 w-24 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
