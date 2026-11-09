/**
 * GenForge Core TypeScript Definitions
 */

export interface ProjectFile {
  path: string;
  content: string;
}

export interface PatternFinding {
  rule: string;
  ruleId: string;
  line: number;
  column?: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
  snippet: string;
  recommendation: string;
}

export interface ModelPrediction {
  riskScore: number;
  label: 'potentially_vulnerable' | 'no_issue_detected';
  confidence: number;
  modelVersion: string;
  serviceStatus: 'online' | 'unavailable' | 'fallback_heuristic';
}

export interface FileScanReport {
  path: string;
  contentHash: string;
  modelPrediction: ModelPrediction;
  patternFindings: PatternFinding[];
}

export interface FullScanResult {
  status: 'ok' | 'partial' | 'scanner_offline';
  scannerServiceAvailable: boolean;
  modelNote: string;
  totalFindings: number;
  highestRisk: number;
  files: FileScanReport[];
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  prompt: string;
  files: ProjectFile[];
  summary: string;
  scan?: FullScanResult;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  disclaimer?: string;
  sources?: GroundingSource[];
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessageItem[];
  createdAt: number;
  updatedAt: number;
}

export interface BrandSettings {
  appName: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: 'Inter' | 'Space Grotesk' | 'Plus Jakarta Sans' | 'System';
  logoUrl?: string;
}

export interface RunSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemInstruction: string;
}

export interface QuotaInfo {
  perMinuteLimit: number;
  perDayLimit: number;
  globalLimit: number;
  remainingPerMinute: number;
  remainingPerDay: number;
  remainingGlobal: number;
  globalUsed: number;
}

export interface ConsoleEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'system';
  message: string;
  timestamp: string;
}
