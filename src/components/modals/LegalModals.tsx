import React from 'react';
import { X, FileText, Lock, Info, Trash2, Heart } from 'lucide-react';

interface LegalModalProps {
  type: 'terms' | 'privacy' | 'about' | null;
  onClose: () => void;
  onClearLocalData: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  type,
  onClose,
  onClearLocalData,
}) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col max-h-[85vh] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {type === 'terms' && <FileText className="w-5 h-5 text-indigo-400" />}
            {type === 'privacy' && <Lock className="w-5 h-5 text-emerald-400" />}
            {type === 'about' && <Info className="w-5 h-5 text-cyan-400" />}
            <h2 className="text-base font-bold text-white capitalize">
              {type === 'terms'
                ? 'Terms of Service (Draft Preview)'
                : type === 'privacy'
                ? 'Privacy Policy & Local Data Control'
                : 'About GenForge'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 text-xs text-slate-300 space-y-3 leading-relaxed">
          {type === 'terms' && (
            <>
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 font-semibold text-[11px]">
                ⚠️ DRAFT NOTICE: This document is a template draft subject to review and formal legal counsel prior to commercial deployment.
              </div>
              <h3 className="font-bold text-slate-100 text-sm">1. Acceptance of Terms</h3>
              <p>
                By accessing GenForge ("the Service"), you agree to utilize generated code and question-answering outputs responsibly. The service is provided "as is" without warranties of merchantability or fitness for a particular purpose.
              </p>
              <h3 className="font-bold text-slate-100 text-sm">2. Second Opinion Security Disclaimer</h3>
              <p>
                The security scanner leverages a fine-tuned CodeBERT model alongside pattern matching heuristics. <strong>The scanner is a second opinion, not a certificate of safety.</strong> It does not replace professional human code audit or penetration testing.
              </p>
              <h3 className="font-bold text-slate-100 text-sm">3. Prohibited Usage</h3>
              <p>
                Users agree not to use GenForge to generate malicious software, exploit payloads, automated scraping tools, or attack vectors against computer systems.
              </p>
            </>
          )}

          {type === 'privacy' && (
            <>
              <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 font-semibold text-[11px]">
                Privacy First: Client conversations and project checkpoints are stored in your local browser sandbox.
              </div>
              <h3 className="font-bold text-slate-100 text-sm">1. Data Storage & Telemetry</h3>
              <p>
                GenForge does not log or persist user prompt contents on our centralized servers. Structured server logs contain only request IDs, latency, and token metrics.
              </p>
              <h3 className="font-bold text-slate-100 text-sm">2. Local Storage Control</h3>
              <p>
                Your conversations, project file checkpoints, and brand configurations are saved in your browser's <code className="text-indigo-400">localStorage</code>.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all locally stored chats and checkpoints?')) {
                      onClearLocalData();
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete My Local Data & Reset State</span>
                </button>
              </div>
            </>
          )}

          {type === 'about' && (
            <>
              <h3 className="font-bold text-slate-100 text-sm">What is GenForge?</h3>
              <p>
                GenForge is an open-source AI app builder and technical question-answering studio built around an honest core tenet: <em>"Describe an app. Review the code before you trust it."</em>
              </p>
              <p>
                While commercial code generators produce code blindly, GenForge couples real-time generation with a fine-tuned CodeBERT defect classifier and a pattern-based cross-check, presenting findings as two decoupled signals before you deploy.
              </p>
              <div className="pt-3 border-t border-slate-800 space-y-1">
                <div className="font-bold text-slate-200">Author</div>
                <p className="text-slate-400">
                  Built by <strong>Madiha Maha</strong>, B.Tech Computer Science and Engineering student.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
