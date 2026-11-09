import React from 'react';
import {
  Code2,
  MessageSquareText,
  ShieldCheck,
  Palette,
  History,
  Settings,
  Download,
  LayoutTemplate,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import { QuotaInfo } from '../types/index.ts';

interface HeaderProps {
  currentMode: 'build' | 'ask' | 'methodology';
  onSelectMode: (mode: 'build' | 'ask' | 'methodology') => void;
  quota: QuotaInfo | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenTemplates: () => void;
  onOpenHistory: () => void;
  onOpenBranding: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  projectName: string;
  onUpdateProjectName: (name: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  quota,
  theme,
  onToggleTheme,
  onOpenTemplates,
  onOpenHistory,
  onOpenBranding,
  onOpenSettings,
  onOpenExport,
  projectName,
  onUpdateProjectName,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-slate-100">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div
          onClick={() => onSelectMode('build')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <img
            src="/docs/genforge-logo.svg"
            alt="GenForge"
            className="w-8 h-8 rounded-lg shadow-md shadow-indigo-500/20 group-hover:scale-105 transition"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                GenForge
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                Studio
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Describe an app. Review the code before you trust it.
            </p>
          </div>
        </div>

        {/* Project Name Editable (in Build mode) */}
        {currentMode === 'build' && (
          <div className="hidden lg:flex items-center ml-4 pl-4 border-l border-slate-800">
            <input
              type="text"
              value={projectName}
              onChange={(e) => onUpdateProjectName(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none transition w-44 truncate"
              placeholder="Project Name..."
            />
          </div>
        )}
      </div>

      {/* Main Navigation Mode Tabs */}
      <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-medium">
        <button
          onClick={() => onSelectMode('build')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            currentMode === 'build'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Build Mode</span>
        </button>

        <button
          onClick={() => onSelectMode('ask')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            currentMode === 'ask'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquareText className="w-3.5 h-3.5" />
          <span>Ask Mode</span>
        </button>

        <button
          onClick={() => onSelectMode('methodology')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
            currentMode === 'methodology'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Methodology</span>
        </button>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-1.5">
        {currentMode === 'build' && (
          <>
            <button
              onClick={onOpenTemplates}
              title="Starter Templates Gallery"
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 transition"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Templates</span>
            </button>

            <button
              onClick={onOpenBranding}
              title="Branding Customizer"
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 transition"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Branding</span>
            </button>

            <button
              onClick={onOpenHistory}
              title="Version Checkpoints & History"
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 transition"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">History</span>
            </button>

            <button
              onClick={onOpenSettings}
              title="Run Settings"
              className="p-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 transition"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenExport}
              title="Export & Deploy"
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition shadow-sm shadow-indigo-600/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </>
        )}

        {/* Quota Capsule */}
        {quota && (
          <div
            title={`Quota: ${quota.remainingPerMinute} req/min remaining • ${quota.remainingGlobal} global daily pool`}
            className="hidden sm:flex items-center gap-1 text-[11px] font-mono px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-400"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{quota.remainingPerMinute}/m</span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
