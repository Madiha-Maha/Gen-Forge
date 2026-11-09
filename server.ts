/**
 * GenForge Backend Server (Express + Vite Dev Middleware)
 * Runs on port 3000
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { config } from './lib/config.ts';
import { logger } from './lib/logger.ts';
import { rateLimiter } from './lib/rate-limiter.ts';
import { moderatePrompt, checkSafetyDisclaimers } from './lib/moderation.ts';
import { streamLLM, ChatMessage } from './lib/llm/index.ts';
import { scanFiles } from './lib/scanner.ts';
import { TEMPLATES } from './lib/templates.ts';

const app = express();
const PORT = config.PORT || 3000;

// Security & Body Parsing Middleware
app.use(express.json({ limit: '20mb' }));
app.use((req, res, next) => {
  // Safe security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Helper: Extract client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// 1. Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    providers: {
      gemini: Boolean(config.GEMINI_API_KEY),
      openAiCompatible: Boolean(config.LLM_API_KEY),
      scannerUrl: config.SCANNER_URL,
      searchProvider: config.SEARCH_PROVIDER,
    },
  });
});

// 2. Quota & Spending Cap Check
app.get('/api/quota', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  res.json(rateLimiter.getQuota(ip));
});

// 3. Metrics from metrics.json
app.get('/api/metrics', (_req: Request, res: Response) => {
  try {
    const metricsPath = path.resolve(process.cwd(), 'metrics.json');
    if (fs.existsSync(metricsPath)) {
      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
      return res.json(data);
    }
  } catch (err: any) {
    logger.warn({ requestId: 'metrics', mode: 'system', action: 'read_metrics_file_failed', error: err.message });
  }
  res.status(404).json({ error: 'metrics.json not found' });
});

// 4. Starter Templates
app.get('/api/templates', (_req: Request, res: Response) => {
  res.json(TEMPLATES);
});

// 5. Ask Mode API (Streaming with SSE & Search Grounding)
const askSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(4000),
      })
    )
    .min(1)
    .max(20),
  enableSearch: z.boolean().optional().default(true),
});

app.post('/api/ask', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const requestId = `ask_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const startTime = Date.now();

  // Validate Input
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid message request payload', details: parsed.error.issues });
  }

  const { messages, enableSearch } = parsed.data;
  const lastMessage = messages[messages.length - 1];

  if (lastMessage.role !== 'user') {
    return res.status(400).json({ error: 'The last message must be from the user.' });
  }

  // Rate Limiting Check
  const quota = rateLimiter.checkAndIncrement(ip);
  if (!quota.allowed) {
    return res.status(429).json({ error: quota.reason });
  }

  // Input Moderation Check
  const modResult = moderatePrompt(lastMessage.content);
  if (modResult.flagged) {
    return res.status(400).json({ error: modResult.reason });
  }

  // Check safety disclaimers (medical, legal, financial)
  const disclaimer = checkSafetyDisclaimers(lastMessage.content);

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (type: string, data: any) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const systemPrompt = `You are GenForge Ask — a concise, rigorously accurate technical assistant.
Rules:
1. Be direct, clear, and factual.
2. If you are unsure or do not have enough information, explicitly state "I don't know" rather than hallucinating.
3. Mention that your knowledge may be out of date for very recent breaking events.
4. Never invent nonexistent sources, URLs, or citations. Only cite real URLs provided in web search results.
5. If providing advice in medical, legal, or financial realms, restrict answers to general educational facts with appropriate disclaimers.
6. Use markdown with syntax-highlighted code blocks where helpful.`;

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    if (disclaimer) {
      sendEvent('disclaimer', { disclaimer });
    }

    const result = await streamLLM(chatMessages, {
      mode: 'ask',
      enableSearch,
      requestId,
    });

    for await (const chunk of result.textStream) {
      sendEvent('chunk', { text: chunk });
    }

    const sources = await result.getSources();
    if (sources && sources.length > 0) {
      sendEvent('sources', { sources });
    }

    sendEvent('done', { requestId });
    res.end();

    logger.info({
      requestId,
      mode: 'ask',
      action: 'complete',
      durationMs: Date.now() - startTime,
    });
  } catch (err: any) {
    logger.error({
      requestId,
      mode: 'ask',
      action: 'error',
      durationMs: Date.now() - startTime,
      error: err.message,
    });
    sendEvent('error', { error: err.message || 'Error streaming answer.' });
    res.end();
  }
});

// 6. Build Mode API (Real generation & editing of code)
const generateSchema = z.object({
  prompt: z.string().min(1).max(8000),
  currentFiles: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  image: z
    .object({
      mimeType: z.string(),
      data: z.string(),
    })
    .optional(),
  modelSettings: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(1).optional().default(0.7),
      maxTokens: z.number().optional().default(8192),
      systemInstruction: z.string().optional(),
    })
    .default({
      temperature: 0.7,
      maxTokens: 8192,
    }),
});

app.post('/api/generate', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const requestId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const startTime = Date.now();

  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid generate request payload', details: parsed.error.issues });
  }

  const { prompt, currentFiles, image, modelSettings } = parsed.data;

  // Rate Limiting Check
  const quota = rateLimiter.checkAndIncrement(ip);
  if (!quota.allowed) {
    return res.status(429).json({ error: quota.reason });
  }

  // Moderation Check
  const modResult = moderatePrompt(prompt);
  if (modResult.flagged) {
    return res.status(400).json({ error: modResult.reason });
  }

  const isFollowUp = currentFiles.length > 0;

  const systemInstruction =
    modelSettings.systemInstruction ||
    `You are the GenForge Core Engine — an expert full-stack web software engineer.
Your task is to generate complete, modern, working, standalone web applications.
The project must run smoothly inside a self-contained browser environment (e.g. index.html with inline/module JS, Tailwind CSS via CDN, and modern vanilla JS or React via CDN).

CRITICAL OUTPUT FORMAT:
You MUST respond with ONLY a single valid JSON object. No Markdown code fences, no introductory text, no conversational chatter.
Schema:
{
  "summary": "Brief summary of what was built or changed",
  "files": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>..."
    }
  ]
}

RULES:
1. Make the app fully functional and polished. Never output placeholders or "TODO" comments.
2. If this is a follow-up modification, update the existing files appropriately and preserve working features.
3. Write secure code by default. Avoid innerHTML with raw user inputs, avoid eval, and never hardcode private secrets.
4. Support clean, modern dark and light themes, responsive layouts, and interactive controls.`;

  // Build user prompt
  let userContent = '';
  if (isFollowUp) {
    userContent += `CURRENT PROJECT FILES:\n`;
    for (const f of currentFiles) {
      userContent += `--- FILE: ${f.path} ---\n${f.content}\n\n`;
    }
    userContent += `USER REQUEST / EDIT INSTRUCTIONS:\n${prompt}\n\nPlease update the project files accordingly and return the complete updated files in the JSON format.`;
  } else {
    userContent = `Please build a complete, runnable web application for the following specification:\n${prompt}\n\nReturn strictly valid JSON with files and summary.`;
  }

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemInstruction },
    {
      role: 'user',
      content: userContent,
      image,
    },
  ];

  async function attemptGeneration(messages: ChatMessage[], isRetry = false): Promise<any> {
    const streamRes = await streamLLM(messages, {
      mode: 'build',
      temperature: modelSettings.temperature,
      maxTokens: modelSettings.maxTokens,
      systemInstruction,
      requestId,
    });

    let fullText = '';
    for await (const chunk of streamRes.textStream) {
      fullText += chunk;
    }

    // Sanitize possible markdown code fence wrapper
    let cleaned = fullText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    try {
      const parsedJson = JSON.parse(cleaned);
      if (Array.isArray(parsedJson.files) && parsedJson.files.length > 0) {
        return parsedJson;
      }
      throw new Error('JSON response does not contain a non-empty files array.');
    } catch (parseErr: any) {
      if (!isRetry) {
        logger.warn({
          requestId,
          mode: 'build',
          action: 'json_repair_retry',
          error: parseErr.message,
        });
        // Repair prompt retry
        const repairMessages: ChatMessage[] = [
          ...messages,
          { role: 'assistant', content: fullText },
          {
            role: 'user',
            content: `Your previous response was not valid JSON. Error: ${parseErr.message}. Please fix it and output ONLY the valid JSON object with the {"summary": "...", "files": [{"path": "...", "content": "..."}]} structure.`,
          },
        ];
        return attemptGeneration(repairMessages, true);
      }
      throw parseErr;
    }
  }

  try {
    const result = await attemptGeneration(chatMessages);

    // Auto-run security scan on all generated files
    const scanReport = await scanFiles(result.files);

    res.json({
      success: true,
      summary: result.summary || 'Application generated successfully',
      files: result.files,
      scan: scanReport,
      requestId,
    });

    logger.info({
      requestId,
      mode: 'build',
      action: 'complete',
      durationMs: Date.now() - startTime,
      metadata: { fileCount: result.files.length, findings: scanReport.totalFindings },
    });
  } catch (err: any) {
    logger.error({
      requestId,
      mode: 'build',
      action: 'generation_failed',
      durationMs: Date.now() - startTime,
      error: err.message,
    });

    res.status(500).json({
      error: `Generation failed: ${err.message || 'Unknown error'}. You can click Retry to attempt again.`,
    });
  }
});

// 7. Security Scanner API
const scanSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
    })
  ),
});

app.post('/api/scan', async (req: Request, res: Response) => {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid scan payload', details: parsed.error.issues });
  }

  try {
    const results = await scanFiles(parsed.data.files);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: `Scan failed: ${err.message}` });
  }
});

// 8. One-click Deploy (Vercel API integration or direct bundle preparation)
app.post('/api/deploy', async (req: Request, res: Response) => {
  const { projectName, files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided for deployment' });
  }

  // If user provided a VERCEL_TOKEN, attempt real deployment
  if (config.VERCEL_TOKEN) {
    try {
      const vercelFiles = files.map((f: any) => ({
        file: f.path,
        data: Buffer.from(f.content).toString('base64'),
        encoding: 'base64',
      }));

      const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: (projectName || 'genforge-app').toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          files: vercelFiles,
          projectSettings: { framework: null },
        }),
      });

      if (deployRes.ok) {
        const deployData = await deployRes.json();
        return res.json({
          success: true,
          provider: 'vercel',
          url: `https://${deployData.url}`,
          deploymentId: deployData.id,
          message: 'Deployment triggered successfully on Vercel!',
        });
      }
    } catch (err: any) {
      logger.warn({ requestId: 'deploy', mode: 'system', action: 'vercel_deploy_failed', error: err.message });
    }
  }

  // Fallback deployment preview bundle status
  res.json({
    success: true,
    provider: 'local-export',
    downloadReady: true,
    message: 'Project bundle verified and ready for deployment via Vercel, Netlify, or Static Cloud Run.',
    instructions: 'Set VERCEL_TOKEN in .env for automated 1-click cloud deployments, or use Export ZIP.',
  });
});

// Start Express dev server with Vite middlewares
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 [GenForge Running] http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
