import React from 'react';
import { X, Check, Sparkles, Upload } from 'lucide-react';
import { BrandSettings } from '../../types/index.ts';

interface BrandingCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandSettings: BrandSettings;
  onUpdateBrandSettings: (settings: BrandSettings) => void;
}

const PALETTE_PRESETS = [
  { name: 'Indigo / Cyber', primary: '#6366f1', accent: '#06b6d4' },
  { name: 'Emerald / Terminal', primary: '#10b981', accent: '#34d399' },
  { name: 'Amber / Solar', primary: '#f59e0b', accent: '#fbbf24' },
  { name: 'Rose / Crimson', primary: '#f43f5e', accent: '#fb7185' },
  { name: 'Violet / Nebula', primary: '#8b5cf6', accent: '#ec4899' },
  { name: 'Slate / Monochrome', primary: '#64748b', accent: '#94a3b8' },
];

export const BrandingCustomizerModal: React.FC<BrandingCustomizerModalProps> = ({
  isOpen,
  onClose,
  brandSettings,
  onUpdateBrandSettings,
}) => {
  if (!isOpen) return null;

  const handleColorPreset = (primary: string, accent: string) => {
    onUpdateBrandSettings({
      ...brandSettings,
      primaryColor: primary,
      accentColor: accent,
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateBrandSettings({
        ...brandSettings,
        logoUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Live Branding Customizer</h2>
              <p className="text-xs text-slate-400">
                Instantly adjust theme tokens in preview without code regeneration
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

        {/* App Title Prefix */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">App Name / Brand Prefix</label>
          <input
            type="text"
            value={brandSettings.appName}
            onChange={(e) =>
              onUpdateBrandSettings({ ...brandSettings, appName: e.target.value })
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            placeholder="e.g. ApexCore"
          />
        </div>

        {/* Palette Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Color Palette Preset</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PALETTE_PRESETS.map((preset) => {
              const isSelected =
                brandSettings.primaryColor.toLowerCase() === preset.primary.toLowerCase();
              return (
                <button
                  key={preset.name}
                  onClick={() => handleColorPreset(preset.primary, preset.accent)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition text-xs ${
                    isSelected
                      ? 'bg-slate-800 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span className="truncate text-[11px]">{preset.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Hex Picker */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Primary Color</label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
              <input
                type="color"
                value={brandSettings.primaryColor}
                onChange={(e) =>
                  onUpdateBrandSettings({ ...brandSettings, primaryColor: e.target.value })
                }
                className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-300">{brandSettings.primaryColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Accent Color</label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
              <input
                type="color"
                value={brandSettings.accentColor}
                onChange={(e) =>
                  onUpdateBrandSettings({ ...brandSettings, accentColor: e.target.value })
                }
                className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-300">{brandSettings.accentColor}</span>
            </div>
          </div>
        </div>

        {/* Font Pairing */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Typography Font Pairing</label>
          <select
            value={brandSettings.fontFamily}
            onChange={(e) =>
              onUpdateBrandSettings({
                ...brandSettings,
                fontFamily: e.target.value as any,
              })
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="Inter">Inter + JetBrains Mono (Default)</option>
            <option value="Space Grotesk">Space Grotesk + Fira Code</option>
            <option value="Plus Jakarta Sans">Plus Jakarta Sans + Roboto Mono</option>
            <option value="System">System Native UI</option>
          </select>
        </div>

        {/* Logo Upload */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Custom Logo (SVG or PNG)</label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-300 transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
              <input type="file" onChange={handleLogoUpload} accept="image/*" className="hidden" />
            </label>
            {brandSettings.logoUrl && (
              <span className="text-xs text-emerald-400 font-medium">Logo attached ✓</span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
