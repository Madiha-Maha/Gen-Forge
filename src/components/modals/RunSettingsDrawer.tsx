import React from 'react';
import { X, Settings, Sliders, Cpu, Save } from 'lucide-react';
import { RunSettings } from '../../types/index.ts';

interface RunSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  runSettings: RunSettings;
  onUpdateRunSettings: (settings: RunSettings) => void;
}

export const RunSettingsDrawer: React.FC<RunSettingsDrawerProps> = ({
  isOpen,
  onClose,
  runSettings,
  onUpdateRunSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl p-6 text-slate-100 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
                <Settings className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-white">Inference & Run Settings</h2>
                <p className="text-xs text-slate-400">Configure parameters for generation requests</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target Model</span>
            </label>
            <select
              value={runSettings.model}
              onChange={(e) =>
                onUpdateRunSettings({ ...runSettings, model: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended Default)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Fast)</option>
              <option value="gpt-4o">gpt-4o (OpenAI Compatible Endpoint)</option>
              <option value="claude-3-5-sonnet">claude-3-5-sonnet (Via Proxy)</option>
            </select>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Temperature (Sampling Creativity)</span>
              </span>
              <span className="font-mono text-indigo-400">{runSettings.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={runSettings.temperature}
              onChange={(e) =>
                onUpdateRunSettings({
                  ...runSettings,
                  temperature: parseFloat(e.target.value),
                })
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0.0 (Deterministic / Exact)</span>
              <span>1.0 (Creative Exploratory)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Max Completion Tokens</label>
            <input
              type="number"
              value={runSettings.maxTokens}
              onChange={(e) =>
                onUpdateRunSettings({
                  ...runSettings,
                  maxTokens: parseInt(e.target.value, 10) || 4096,
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* System Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Custom Engine System Instructions
            </label>
            <textarea
              rows={6}
              value={runSettings.systemInstruction}
              onChange={(e) =>
                onUpdateRunSettings({
                  ...runSettings,
                  systemInstruction: e.target.value,
                })
              }
              placeholder="Custom instructions passed to the LLM for every generation turn..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none leading-relaxed font-mono"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-md shadow-indigo-600/30"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save & Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
