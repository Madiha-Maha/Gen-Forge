import React from 'react';
import { X, History, RotateCcw, Clock, FileCode, Check } from 'lucide-react';
import { Checkpoint, ProjectFile } from '../../types/index.ts';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoints: Checkpoint[];
  activeCheckpointId?: string;
  onRestoreCheckpoint: (checkpoint: Checkpoint) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  checkpoints,
  activeCheckpointId,
  onRestoreCheckpoint,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Version Checkpoint History</h2>
              <p className="text-xs text-slate-400">
                Restore previous code states, undo prompt edits, or branch changes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {checkpoints.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No checkpoints recorded yet. Generate or edit code to establish checkpoints.
            </div>
          ) : (
            checkpoints.map((cp, idx) => {
              const isCurrent = cp.id === activeCheckpointId || idx === 0;
              return (
                <div
                  key={cp.id}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                    isCurrent
                      ? 'bg-indigo-950/40 border-indigo-600/70'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 truncate pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        Version #{checkpoints.length - idx}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.2 rounded-full bg-indigo-900 text-indigo-300">
                          Active State
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 truncate">
                      "{cp.prompt || cp.summary}"
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(cp.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCode className="w-3 h-3" />
                        {cp.files.length} files
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onRestoreCheckpoint(cp);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex-shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
