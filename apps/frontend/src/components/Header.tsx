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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-semibold text-slate-900 tracking-tight truncate">
                Job Queue<span className="hidden sm:inline"> Management Dashboard</span>
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Polling Indicator & Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Subtle Polling & Refresh status */}
          <div className="flex items-center text-xs text-slate-500 gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden lg:inline text-slate-400 text-xs">Auto-refresh (10s) •</span>
            <span className="hidden sm:inline font-mono text-[11px] text-slate-500">
              {formattedTime}
            </span>
          </div>

          {/* Manual Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            title="Refresh now"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 shrink-0"
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
            className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>New Job</span>
          </button>
        </div>
      </div>
    </header>
  );
};
