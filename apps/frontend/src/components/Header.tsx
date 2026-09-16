import React from 'react';
import { RotateCw, Plus, Activity } from 'lucide-react';

interface HeaderProps {
  lastUpdated: Date | null;
  isFetching: boolean;
  onRefresh: () => void;
  onCreateClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  isFetching,
  onRefresh,
  onCreateClick,
}) => {
  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Connecting...';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <Activity className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
                Job Queue Operations
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Polling Indicator & Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Subtle Polling & Refresh status */}
          <div className="flex items-center text-xs text-slate-500 gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden md:inline">Auto-refresh (10s) •</span>
            <span className="font-mono text-[11px] text-slate-600">
              {formattedTime}
            </span>
          </div>

          {/* Manual Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            title="Refresh now"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
            aria-label="Refresh job queue"
          >
            <RotateCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin text-blue-600' : ''}`}
            />
          </button>

          {/* Create Job Primary CTA */}
          <button
            type="button"
            onClick={onCreateClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Job</span>
          </button>
        </div>
      </div>
    </header>
  );
};
