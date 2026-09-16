import React from 'react';
import { RotateCw, Plus, Layers } from 'lucide-react';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="h-8 w-8 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4 text-slate-200" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight truncate">
              Job Queue Dashboard
            </h1>
          </div>
        </div>

        {/* Polling Indicator & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Polling indicator */}
          <div className="flex items-center text-xs text-slate-500 gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
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
              className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-slate-700' : ''}`}
            />
          </button>

          {/* Create Job Primary CTA */}
          <button
            type="button"
            onClick={onCreateClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors shrink-0 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>New Job</span>
          </button>
        </div>
      </div>
    </header>
  );
};
