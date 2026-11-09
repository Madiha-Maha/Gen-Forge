/**
 * GenForge Configuration Module
 * Validates and normalizes all environment variables at startup.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Helper to sanitize empty strings into undefined so defaults kick in
const emptyToUndefined = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return undefined;
  return val;
};

const envSchema = z.object({
  NODE_ENV: z.preprocess(emptyToUndefined, z.string().default('development')),
  PORT: z.preprocess((val) => {
    // In development or when not set, port must be 3000 for AI Studio iframe
    if (process.env.NODE_ENV !== 'production') return 3000;
    return val ? Number(val) : 3000;
  }, z.number().default(3000)),
  APP_URL: z.preprocess(emptyToUndefined, z.string().default('http://localhost:3000')),

  // Gemini API key (provided automatically by AI Studio)
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().default('')),

  // OpenAI-compatible LLM endpoint
  LLM_BASE_URL: z.preprocess(emptyToUndefined, z.string().default('https://api.openai.com/v1')),
  LLM_API_KEY: z.preprocess(emptyToUndefined, z.string().default('')),
  LLM_MODEL: z.preprocess(emptyToUndefined, z.string().default('gemini-3.8-flash')),
  LLM_MODEL_BUILD: z.preprocess(emptyToUndefined, z.string().optional()),
  LLM_MODEL_ASK: z.preprocess(emptyToUndefined, z.string().optional()),

  // Scanner service URL
  SCANNER_URL: z.preprocess(emptyToUndefined, z.string().default('http://localhost:8000')),

  // Search Provider (safe fallback to 'gemini')
  SEARCH_PROVIDER: z.preprocess((val) => {
    const s = String(val || '').toLowerCase().trim();
    if (s === 'serper' || s === 'tavily' || s === 'none') return s;
    return 'gemini';
  }, z.enum(['gemini', 'serper', 'tavily', 'none']).default('gemini')),
  SEARCH_API_KEY: z.preprocess(emptyToUndefined, z.string().default('')),

  // Rate Limiting & Spending Cap
  PER_IP_PER_MINUTE: z.preprocess((v) => (v ? Number(v) : 15), z.number().default(15)),
  PER_IP_PER_DAY: z.preprocess((v) => (v ? Number(v) : 150), z.number().default(150)),
  GLOBAL_PER_DAY: z.preprocess((v) => (v ? Number(v) : 2000), z.number().default(2000)),

  // Optional Deployment
  VERCEL_TOKEN: z.preprocess(emptyToUndefined, z.string().default('')),
});

const parseResult = envSchema.safeParse(process.env);

let parsedConfig: z.infer<typeof envSchema>;

if (parseResult.success) {
  parsedConfig = parseResult.data;
} else {
  // If parsing had any issue, safely fall back to all defaults
  parsedConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: 3000,
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    LLM_BASE_URL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    LLM_API_KEY: process.env.LLM_API_KEY || '',
    LLM_MODEL: process.env.LLM_MODEL || 'gemini-3.8-flash',
    LLM_MODEL_BUILD: process.env.LLM_MODEL_BUILD,
    LLM_MODEL_ASK: process.env.LLM_MODEL_ASK,
    SCANNER_URL: process.env.SCANNER_URL || 'http://localhost:8000',
    SEARCH_PROVIDER: 'gemini',
    SEARCH_API_KEY: process.env.SEARCH_API_KEY || '',
    PER_IP_PER_MINUTE: 15,
    PER_IP_PER_DAY: 150,
    GLOBAL_PER_DAY: 2000,
    VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
  };
}

// Log startup provider status cleanly (no secret values)
console.log('🛡️ [GenForge Config Loaded]');
console.log(`  - Port: ${parsedConfig.PORT}`);
console.log(`  - Gemini Key Present: ${Boolean(parsedConfig.GEMINI_API_KEY)}`);
console.log(`  - OpenAI Compatible Key: ${Boolean(parsedConfig.LLM_API_KEY)}`);
console.log(`  - Default Model: ${parsedConfig.LLM_MODEL}`);
console.log(`  - Scanner URL: ${parsedConfig.SCANNER_URL}`);
console.log(`  - Search Provider: ${parsedConfig.SEARCH_PROVIDER}`);

export const config = parsedConfig;
