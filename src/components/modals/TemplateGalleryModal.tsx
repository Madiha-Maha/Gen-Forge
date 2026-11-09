import React, { useState } from 'react';
import { X, LayoutTemplate, ShieldAlert, Check, Sparkles, Filter } from 'lucide-react';
import { TEMPLATES, TemplateProject } from '../../lib/templates.ts';
import { ProjectFile } from '../../types/index.ts';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TemplateProject) => void;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filteredTemplates = TEMPLATES.filter((t: TemplateProject) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'security') return t.isSecurityDemo;
    return t.category === selectedCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
              <LayoutTemplate className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Starter Template Gallery</h2>
              <p className="text-xs text-slate-400">
                8 Production-grade starters + 1 Security Scanner Demo Playground
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

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1 pl-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Templates' },
            { id: 'utility', label: 'Productivity & Utility' },
            { id: 'saas', label: 'SaaS & Dashboards' },
            { id: 'portfolio', label: 'Portfolios' },
            { id: 'ecommerce', label: 'E-Commerce' },
            { id: 'security', label: '⚠️ Security Scanner Demo' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto py-2 pr-1">
          {filteredTemplates.map((template: TemplateProject) => (
            <div
              key={template.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between transition ${
                template.isSecurityDemo
                  ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-500'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {template.isSecurityDemo ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300">
                      <ShieldAlert className="w-3 h-3" /> Scanner Demo
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {template.category}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-500">
                    {template.files.length} file(s)
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white">{template.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-1 pt-1">
                  {template.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    onSelectTemplate(template);
                    onClose();
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition ${
                    template.isSecurityDemo
                      ? 'bg-rose-700 hover:bg-rose-600 text-white shadow-md shadow-rose-900/40'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                  }`}
                >
                  Load in Studio Workspace →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
