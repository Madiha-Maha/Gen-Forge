/**
 * GenForge Main Application Shell
 * Coordinates Build Mode, Ask Mode, and Methodology Views.
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { BuildWorkspace } from './components/build/BuildWorkspace.tsx';
import { AskChat } from './components/ask/AskChat.tsx';
import { MethodologyView } from './components/MethodologyView.tsx';
import { BrandingCustomizerModal } from './components/modals/BrandingCustomizerModal.tsx';
import { TemplateGalleryModal } from './components/modals/TemplateGalleryModal.tsx';
import { HistoryModal } from './components/modals/HistoryModal.tsx';
import { ExportModal } from './components/modals/ExportModal.tsx';
import { RunSettingsDrawer } from './components/modals/RunSettingsDrawer.tsx';
import { LegalModal } from './components/modals/LegalModals.tsx';
import { TEMPLATES, TemplateProject } from './lib/templates.ts';
import {
  ProjectFile,
  FullScanResult,
  Checkpoint,
  RunSettings,
  BrandSettings,
  QuotaInfo,
} from './types/index.ts';

export default function App() {
  const [currentMode, setCurrentMode] = useState<'build' | 'ask' | 'methodology'>('build');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [projectName, setProjectName] = useState('Pomodoro FocusForge');

  // Active files in Build mode (initialized with starter pomodoro template)
  const [files, setFiles] = useState<ProjectFile[]>(() => {
    try {
      const saved = localStorage.getItem('gf_active_files');
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return TEMPLATES[0].files;
  });

  const [scanResult, setScanResult] = useState<FullScanResult | null>(null);

  // Checkpoints history
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(() => {
    try {
      const saved = localStorage.getItem('gf_checkpoints');
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    const initCheckpoint: Checkpoint = {
      id: `cp_${Date.now()}`,
      timestamp: Date.now(),
      prompt: 'Initial Pomodoro Starter',
      files: TEMPLATES[0].files,
      summary: 'Project initialized with Pomodoro starter files.',
    };
    return [initCheckpoint];
  });

  // Branding & Run settings
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(() => {
    try {
      const saved = localStorage.getItem('gf_brand_settings');
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return {
      appName: 'FocusForge',
      primaryColor: '#6366f1',
      accentColor: '#06b6d4',
      fontFamily: 'Inter',
    };
  });

  const [runSettings, setRunSettings] = useState<RunSettings>({
    model: 'gemini-3.8-flash',
    temperature: 0.7,
    maxTokens: 8192,
    systemInstruction: '',
  });

  // Quota
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  // Modals
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | 'about' | null>(null);

  // Fetch quota & initial scan on mount
  useEffect(() => {
    const fetchQuota = () => {
      fetch('/api/quota')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setQuota(data);
        })
        .catch(() => {});
    };

    fetchQuota();
    const interval = setInterval(fetchQuota, 30000);

    // Initial scan on first mount
    fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setScanResult(data);
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  // Save files to local storage
  useEffect(() => {
    try {
      localStorage.setItem('gf_active_files', JSON.stringify(files));
      localStorage.setItem('gf_checkpoints', JSON.stringify(checkpoints));
      localStorage.setItem('gf_brand_settings', JSON.stringify(brandSettings));
    } catch (_e) {}
  }, [files, checkpoints, brandSettings]);

  // Keyboard shortcut listener (Ctrl+S to save checkpoint)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleAddCheckpoint('Manual Snapshot', 'Manual user checkpoint', files, scanResult || undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, scanResult]);

  const handleAddCheckpoint = (
    prompt: string,
    summary: string,
    updatedFiles: ProjectFile[],
    scan?: FullScanResult
  ) => {
    const newCheckpoint: Checkpoint = {
      id: `cp_${Date.now()}`,
      timestamp: Date.now(),
      prompt,
      summary,
      files: updatedFiles,
      scan,
    };
    setCheckpoints((prev) => [newCheckpoint, ...prev.slice(0, 20)]);
  };

  const handleRestoreCheckpoint = (cp: Checkpoint) => {
    setFiles(cp.files);
    if (cp.scan) {
      setScanResult(cp.scan);
    }
  };

  const handleSelectTemplate = (template: TemplateProject) => {
    setFiles(template.files);
    setProjectName(template.title);
    handleAddCheckpoint(
      `Loaded template: ${template.title}`,
      template.description,
      template.files
    );
    // Scan newly loaded template
    fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: template.files }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setScanResult(data);
      })
      .catch(() => {});
  };

  const handleClearLocalData = () => {
    localStorage.removeItem('gf_active_files');
    localStorage.removeItem('gf_checkpoints');
    localStorage.removeItem('gf_ask_conversations');
    localStorage.removeItem('gf_brand_settings');
    setFiles(TEMPLATES[0].files);
    setCheckpoints([]);
  };

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'}`}>
      {/* Top Header */}
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        quota={quota}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenBranding={() => setIsBrandingOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        projectName={projectName}
        onUpdateProjectName={setProjectName}
      />

      {/* Main Mode Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentMode === 'build' && (
          <BuildWorkspace
            projectName={projectName}
            files={files}
            onUpdateFiles={setFiles}
            scanResult={scanResult}
            onUpdateScanResult={setScanResult}
            runSettings={runSettings}
            brandSettings={brandSettings}
            onAddCheckpoint={handleAddCheckpoint}
            onNavigateToMethodology={() => setCurrentMode('methodology')}
          />
        )}

        {currentMode === 'ask' && <AskChat />}

        {currentMode === 'methodology' && (
          <MethodologyView onBackToStudio={() => setCurrentMode('build')} />
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenLegal={(type) => setLegalModalType(type)}
        onNavigateToMethodology={() => setCurrentMode('methodology')}
      />

      {/* Modals & Drawers */}
      <BrandingCustomizerModal
        isOpen={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
        brandSettings={brandSettings}
        onUpdateBrandSettings={setBrandSettings}
      />

      <TemplateGalleryModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        checkpoints={checkpoints}
        onRestoreCheckpoint={handleRestoreCheckpoint}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectName={projectName}
        files={files}
      />

      <RunSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        runSettings={runSettings}
        onUpdateRunSettings={setRunSettings}
      />

      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
        onClearLocalData={handleClearLocalData}
      />
    </div>
  );
}
