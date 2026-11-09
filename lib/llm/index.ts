/**
 * GenForge Unified LLM Provider Interface
 * Supports:
 * 1. Google GenAI (@google/genai) via GEMINI_API_KEY with native search grounding and multimodal inputs
 * 2. OpenAI-compatible chat-completions endpoint via LLM_BASE_URL & LLM_API_KEY
 * 3. Mode model overrides (LLM_MODEL_BUILD, LLM_MODEL_ASK)
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../config.ts';
import { logger } from '../logger.ts';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: {
    mimeType: string;
    data: string; // base64
  };
}

export interface StreamOptions {
  mode: 'ask' | 'build';
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  enableSearch?: boolean;
  requestId?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface StreamResult {
  textStream: AsyncIterable<string>;
  getSources: () => Promise<GroundingSource[]>;
}

// Initialize Gemini SDK if API key is present
let geminiClient: GoogleGenAI | null = null;
if (config.GEMINI_API_KEY) {
  geminiClient = new GoogleGenAI({
    apiKey: config.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Get active model for the given mode
 */
export function getModelForMode(mode: 'ask' | 'build'): string {
  if (mode === 'build' && config.LLM_MODEL_BUILD) return config.LLM_MODEL_BUILD;
  if (mode === 'ask' && config.LLM_MODEL_ASK) return config.LLM_MODEL_ASK;
  return config.LLM_MODEL || 'gemini-3.8-flash';
}

/**
 * Primary stream generator function
 */
export async function streamLLM(
  messages: ChatMessage[],
  options: StreamOptions
): Promise<StreamResult> {
  const requestId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const modelName = getModelForMode(options.mode);
  const startTime = Date.now();

  let sources: GroundingSource[] = [];
  let sourcesResolved = false;

  // Decision: Prefer Gemini client if GEMINI_API_KEY exists or if model is gemini-*
  const useGemini = Boolean(geminiClient) && (!config.LLM_API_KEY || modelName.startsWith('gemini'));

  if (useGemini && geminiClient) {
    try {
      // Build contents for @google/genai
      const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => {
          const parts: any[] = [];
          if (m.image) {
            parts.push({
              inlineData: {
                mimeType: m.image.mimeType,
                data: m.image.data,
              },
            });
          }
          parts.push({ text: m.content });
          return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts,
          };
        });

      // System instruction
      const systemMsg = messages.find((m) => m.role === 'system');
      const systemInstruction = options.systemInstruction || systemMsg?.content;

      // Tools config for search grounding if enabled
      const tools: any[] = [];
      let searchNotice = '';
      if (options.enableSearch && options.mode === 'ask') {
        tools.push({ googleSearch: {} });
      }

      let responseStream: any;
      try {
        responseStream = await geminiClient.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction: systemInstruction || undefined,
            tools: tools.length > 0 ? tools : undefined,
          },
        });
      } catch (streamInitErr: any) {
        // If error was caused by search grounding tool, fallback to standard stream
        if (tools.length > 0) {
          logger.warn({
            requestId,
            mode: options.mode,
            action: 'search_grounding_failed_retrying_without_tools',
            error: streamInitErr.message,
          });
          searchNotice = '*(Web search grounding was temporarily unavailable; answering from model knowledge.)*\n\n';
          responseStream = await geminiClient.models.generateContentStream({
            model: modelName,
            contents,
            config: {
              systemInstruction: systemInstruction || undefined,
            },
          });
        } else {
          throw streamInitErr;
        }
      }

      async function* streamGenerator() {
        let chunkCount = 0;
        try {
          if (searchNotice) {
            yield searchNotice;
          }
          for await (const chunk of responseStream) {
            chunkCount++;
            // Check for grounding metadata in candidates
            if (!sourcesResolved && chunk.candidates?.[0]?.groundingMetadata) {
              const meta = chunk.candidates[0].groundingMetadata;
              const webChunks = (meta as any).groundingChunks || [];
              for (const ch of webChunks) {
                if (ch.web?.uri && ch.web?.title) {
                  if (!sources.some((s) => s.url === ch.web.uri)) {
                    sources.push({
                      title: ch.web.title,
                      url: ch.web.uri,
                    });
                  }
                }
              }
            }

            const text = chunk.text;
            if (text) {
              yield text;
            }
          }
          sourcesResolved = true;

          logger.info({
            requestId,
            mode: options.mode,
            action: 'gemini_stream_complete',
            durationMs: Date.now() - startTime,
            model: modelName,
            metadata: { chunkCount, sourceCount: sources.length },
          });
        } catch (err: any) {
          let readable = err.message || 'Stream error';
          if (readable.includes('429') || readable.includes('RESOURCE_EXHAUSTED')) {
            readable = 'API rate limit or quota exceeded (429). Please wait a moment and click Retry.';
          } else if (readable.includes('403') || readable.includes('PERMISSION_DENIED')) {
            readable = 'API key permission denied (403). Please verify API key permissions in Settings > Secrets.';
          }
          logger.error({
            requestId,
            mode: options.mode,
            action: 'gemini_stream_error',
            durationMs: Date.now() - startTime,
            error: readable,
          });
          throw new Error(readable);
        }
      }

      return {
        textStream: streamGenerator(),
        getSources: async () => sources,
      };
    } catch (err: any) {
      logger.error({
        requestId,
        mode: options.mode,
        action: 'gemini_init_failed_falling_back',
        error: err.message,
      });
      // Fall through to OpenAI-compatible endpoint if configured
      if (!config.LLM_API_KEY) throw err;
    }
  }

  // Fallback to OpenAI-compatible endpoint
  if (!config.LLM_API_KEY && !geminiClient) {
    throw new Error(
      'No LLM provider configured. Please provide GEMINI_API_KEY or LLM_API_KEY in your environment.'
    );
  }

  // OpenAI-compatible Chat Completions
  const openAiMessages = messages.map((m) => {
    if (m.image) {
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          {
            type: 'image_url',
            image_url: { url: `data:${m.image.mimeType};base64,${m.image.data}` },
          },
        ],
      };
    }
    return {
      role: m.role,
      content: m.content,
    };
  });

  if (options.systemInstruction && !messages.some((m) => m.role === 'system')) {
    openAiMessages.unshift({
      role: 'system',
      content: options.systemInstruction,
    });
  }

  const endpoint = `${config.LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: openAiMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`LLM provider error (${res.status}): ${errorText.slice(0, 300)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Failed to obtain readable stream from LLM provider.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  async function* openAiStreamGenerator() {
    try {
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') return;
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) yield delta;
            } catch (_e) {
              // Ignore partial JSON chunk
            }
          }
        }
      }
    } finally {
      reader?.releaseLock();
    }
  }

  return {
    textStream: openAiStreamGenerator(),
    getSources: async () => [],
  };
}
