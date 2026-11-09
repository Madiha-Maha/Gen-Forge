import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';

interface FooterProps {
  onOpenLegal: (type: 'terms' | 'privacy' | 'about') => void;
  onNavigateToMethodology: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenLegal,
  onNavigateToMethodology,
}) => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 px-4 py-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-400">GenForge</span>
        <span>•</span>
        <span>A second opinion, not a certificate of safety</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onNavigateToMethodology}
          className="hover:text-indigo-400 transition"
        >
          Methodology & Metrics
        </button>
        <button
          onClick={() => onOpenLegal('terms')}
          className="hover:text-indigo-400 transition"
        >
          Terms (Draft)
        </button>
        <button
          onClick={() => onOpenLegal('privacy')}
          className="hover:text-indigo-400 transition"
        >
          Privacy & Data
        </button>
        <button
          onClick={() => onOpenLegal('about')}
          className="hover:text-indigo-400 transition"
        >
          About
        </button>
        <span className="text-slate-600">|</span>
        <span>Built by <strong>Madiha Maha</strong></span>
      </div>
    </footer>
  );
};
