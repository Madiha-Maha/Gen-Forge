/**
 * GenForge Code Security Scanner Client & Pattern Cross-Check
 * Evaluates files through:
 * 1. Fine-tuned CodeBERT model via SCANNER_URL (POST /scan)
 * 2. Deterministic AST/regex pattern cross-check
 * Results are cached by SHA-256 hash.
 */

import crypto from 'crypto';
import { config } from './config.ts';

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
  riskScore: number; // 0.0 - 1.0
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

// Memory cache by SHA-256
const scanCache = new Map<string, FileScanReport>();

// Security patterns for rule-based cross check
const PATTERNS_CATALOG = [
  {
    id: 'GF-PAT-001',
    name: 'Direct DOM HTML Injection (XSS)',
    regexes: [
      /innerHTML\s*=/g,
      /outerHTML\s*=/g,
      /document\.write\s*\(/g,
      /dangerouslySetInnerHTML/g,
    ],
    severity: 'high' as const,
    message: 'Raw HTML string interpolation into DOM creates Cross-Site Scripting (XSS) vectors.',
    recommendation: 'Use textContent, innerText, or parameterized React JSX elements instead.',
  },
  {
    id: 'GF-PAT-002',
    name: 'Dynamic Code Execution Primitives',
    regexes: [
      /\beval\s*\(/g,
      /new\s+Function\s*\(/g,
      /setTimeout\s*\(\s*['"`]/g,
      /setInterval\s*\(\s*['"`]/g,
    ],
    severity: 'high' as const,
    message: 'Dynamic string evaluation allows arbitrary JavaScript execution in the runtime context.',
    recommendation: 'Replace eval/new Function with strict parsing or structured dispatch maps.',
  },
  {
    id: 'GF-PAT-003',
    name: 'Hardcoded Secret / API Token',
    regexes: [
      /(api[_-]?key|secret|token|password|auth|bearer)\s*[:=]\s*["'][A-Za-z0-9_\-\.]{14,}["']/gi,
      /sk-[A-Za-z0-9]{20,}/g,
      /ghp_[A-Za-z0-9]{20,}/g,
      /AIzaSy[A-Za-z0-9_-]{33}/g,
    ],
    severity: 'high' as const,
    message: 'Hardcoded credential detected. Secrets in client bundles are visible to any user.',
    recommendation: 'Extract credential to server-side environment variables and proxy requests.',
  },
  {
    id: 'GF-PAT-004',
    name: 'Unsanitized Redirection / Javascript Scheme',
    regexes: [
      /window\.location\s*=\s*[^;\n]+/g,
      /location\.href\s*=\s*[^;\n]+/g,
      /href\s*=\s*["']javascript:/gi,
    ],
    severity: 'medium' as const,
    message: 'Unvalidated URL assignments or javascript: links can lead to open redirection or script execution.',
    recommendation: 'Validate target URL against an allowed origin whitelist or relative path format.',
  },
  {
    id: 'GF-PAT-005',
    name: 'Insecure Resource Transport (HTTP)',
    regexes: [
      /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[a-zA-Z0-9\.\-_]+/g,
    ],
    severity: 'low' as const,
    message: 'Unencrypted HTTP endpoint connection. Sensitive data can be intercepted.',
    recommendation: 'Always upgrade network protocols to HTTPS (TLS/SSL).',
  },
  {
    id: 'GF-PAT-006',
    name: 'Weak Pseudo-Random Number Generation',
    regexes: [
      /Math\.random\s*\(\s*\)/g,
    ],
    severity: 'low' as const,
    message: 'Math.random() is PRNG and predictable. Never use for UUIDs, session keys, or security tokens.',
    recommendation: 'Use window.crypto.getRandomValues() or crypto.randomUUID() for secure values.',
  },
];

export function runPatternCrossCheck(content: string): PatternFinding[] {
  const findings: PatternFinding[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Skip comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    for (const rule of PATTERNS_CATALOG) {
      for (const regex of rule.regexes) {
        // Reset regex state
        regex.lastIndex = 0;
        if (regex.test(line)) {
          findings.push({
            ruleId: rule.id,
            rule: `${rule.id}: ${rule.name}`,
            line: lineNum,
            severity: rule.severity,
            message: rule.message,
            snippet: trimmed.slice(0, 140),
            recommendation: rule.recommendation,
          });
          break; // Avoid duplicate alerts on the same line for same rule
        }
      }
    }
  });

  return findings;
}

export function computeHeuristicScore(content: string, patternCount: number): number {
  let score = 0.05;
  const lowered = content.toLowerCase();

  const riskTokens = ['eval', 'innerhtml', 'exec', 'secret', 'token', 'dangerouslysetinnerhtml', 'bypass', 'script'];
  for (const token of riskTokens) {
    if (lowered.includes(token)) score += 0.08;
  }

  score += patternCount * 0.16;
  if (lowered.includes('eval(') || lowered.includes('dangerouslysetinnerhtml')) {
    score += 0.32;
  }

  return Math.min(Math.max(parseFloat(score.toFixed(3)), 0.02), 0.98);
}

export async function scanFiles(files: { path: string; content: string }[]): Promise<FullScanResult> {
  let scannerOnline = false;
  const reports: FileScanReport[] = [];

  // Check if external FastAPI scanner is reachable
  let remoteResultsMap: Record<string, any> = {};
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${config.SCANNER_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      scannerOnline = true;
      if (Array.isArray(data.files)) {
        for (const item of data.files) {
          remoteResultsMap[item.path] = item;
        }
      }
    }
  } catch (_err) {
    scannerOnline = false;
  }

  let totalFindings = 0;
  let highestRisk = 0.0;

  for (const file of files) {
    const hash = crypto.createHash('sha256').update(file.content).digest('hex');

    // Run pattern check
    const patterns = runPatternCrossCheck(file.content);
    totalFindings += patterns.length;

    let modelPrediction: ModelPrediction;

    const remoteItem = remoteResultsMap[file.path];
    if (scannerOnline && remoteItem && remoteItem.model_prediction) {
      const p = remoteItem.model_prediction;
      modelPrediction = {
        riskScore: p.risk_score,
        label: p.label,
        confidence: p.confidence ?? 0.85,
        modelVersion: 'CodeBERT-Defect-v1 (FastAPI)',
        serviceStatus: 'online',
      };
    } else {
      // Offline fallback: provide heuristic score while clearly labeling service status
      const fallbackScore = computeHeuristicScore(file.content, patterns.length);
      modelPrediction = {
        riskScore: fallbackScore,
        label: fallbackScore >= 0.5 ? 'potentially_vulnerable' : 'no_issue_detected',
        confidence: parseFloat((Math.abs(fallbackScore - 0.5) * 2).toFixed(2)),
        modelVersion: 'CodeBERT-Defect-v1 (Service Unavailable / Heuristic Backup)',
        serviceStatus: 'unavailable',
      };
    }

    highestRisk = Math.max(highestRisk, modelPrediction.riskScore);

    const report: FileScanReport = {
      path: file.path,
      contentHash: hash,
      modelPrediction,
      patternFindings: patterns,
    };

    scanCache.set(hash, report);
    reports.push(report);
  }

  return {
    status: scannerOnline ? 'ok' : 'scanner_offline',
    scannerServiceAvailable: scannerOnline,
    modelNote:
      'The neural scanner model was trained on C functions from CodeXGLUE. JavaScript/HTML/Python results are heuristic approximations and are not certified.',
    totalFindings,
    highestRisk: parseFloat(highestRisk.toFixed(3)),
    files: reports,
  };
}
