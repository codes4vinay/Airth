import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              JQ
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 leading-none">
                Job Queue Dashboard
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Engineering Operations Console
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              System Ready
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Workspaces Initialized
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            NestJS Backend and React Vite Frontend configured successfully.
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
