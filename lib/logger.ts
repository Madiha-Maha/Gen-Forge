/**
 * GenForge Structured Logger
 * Emits structured JSON logs: request ID, mode, latency, token counts, errors.
 * Never logs raw user prompts or sensitive text by default.
 */

export interface LogPayload {
  requestId: string;
  mode: 'ask' | 'build' | 'scan' | 'system';
  action: string;
  durationMs?: number;
  statusCode?: number;
  model?: string;
  tokenCounts?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;
  metadata?: Record<string, any>;
}

export const logger = {
  info: (payload: LogPayload) => {
    const output = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      ...payload,
    };
    console.log(JSON.stringify(output));
  },

  warn: (payload: LogPayload) => {
    const output = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      ...payload,
    };
    console.warn(JSON.stringify(output));
  },

  error: (payload: LogPayload) => {
    const output = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      ...payload,
    };
    console.error(JSON.stringify(output));
  },
};
