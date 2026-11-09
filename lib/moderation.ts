/**
 * GenForge Moderation & Safety Guardrails
 */

const HARMFUL_PATTERNS = [
  /\b(create|write|generate|build)\s+(a\s+)?(keylogger|ransomware|trojan|rootkit|botnet|exploit\s+payload|ddos\s+tool)\b/i,
  /\b(how\s+to\s+hack|steal\s+passwords|bypass\s+2fa|credit\s+card\s+skimmer)\b/i,
  /\b(bomb|weapon|explosive|poison|harm\s+myself|suicide)\b/i,
  /\b(phishing\s+template|fake\s+login\s+to\s+steal)\b/i,
];

export interface ModerationResult {
  flagged: boolean;
  reason?: string;
  category?: 'malware' | 'violence' | 'harm' | 'fraud';
}

export function moderatePrompt(text: string): ModerationResult {
  if (!text) return { flagged: false };

  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(text)) {
      return {
        flagged: true,
        reason: "I cannot fulfill requests that involve creating malware, exploiting systems, or facilitating unauthorized harm.",
        category: 'malware',
      };
    }
  }

  return { flagged: false };
}

export function checkSafetyDisclaimers(text: string): string | null {
  const medicalRegex = /\b(diagnos(is|e)|symptom|prescription|medication|dosage|cure|treatment\s+for)\b/i;
  const legalRegex = /\b(sue|lawsuit|attorney|legal\s+advice|court\s+filing|contract\s+breach)\b/i;
  const financialRegex = /\b(invest(ment)?\s+advice|stock\s+tip|buy\s+crypto|tax\s+evasion|portfolio\s+allocation)\b/i;

  if (medicalRegex.test(text)) {
    return "Disclaimer: This information is for general educational purposes only and is not medical advice. Always consult a qualified healthcare provider.";
  }
  if (legalRegex.test(text)) {
    return "Disclaimer: This response is for general information only and does not constitute formal legal counsel. Please consult a licensed attorney.";
  }
  if (financialRegex.test(text)) {
    return "Disclaimer: This response does not constitute financial or investment advice. Review financial decisions with a certified advisor.";
  }

  return null;
}
