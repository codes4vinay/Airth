import React, { useState } from 'react';
import { X, Loader2, PlusCircle } from 'lucide-react';
import { PRESET_JOB_TYPES } from '../constants/config';
import { CreateJobInput } from '../types/job';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateJobInput) => Promise<void>;
  isCreating: boolean;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isCreating,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedType = type.trim();

    if (!trimmedTitle) {
      setError('Job title is required');
      return;
    }

    if (!trimmedType) {
      setError('Job type is required');
      return;
    }

    try {
      await onSubmit({ title: trimmedTitle, type: trimmedType });
      setTitle('');
      setType('');
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to create job. Please retry.',
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-blue-600" />
            <h2 id="modal-title" className="text-base font-semibold text-slate-900">
              Create New Queue Job
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 text-xs rounded-md bg-rose-50 text-rose-800 border border-rose-200"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="job-title"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Job Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="job-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Export monthly analytics ledger"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="job-type"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Queue Worker Type <span className="text-rose-500">*</span>
            </label>
            <input
              id="job-type"
              type="text"
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. REPORT_GENERATION or DATA_SYNC"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={isCreating}
            />

            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-slate-400">Presets:</span>
              {PRESET_JOB_TYPES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setType(preset)}
                  className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isCreating ? 'Creating Job...' : 'Create Job'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
