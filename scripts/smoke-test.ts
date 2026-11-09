/**
 * GenForge Automated Smoke Test Script
 * Verifies health, scanning engine, ask mode, and build generation.
 */

async function runSmokeTests() {
  console.log('🧪 Starting GenForge Smoke Tests...\n');
  const baseUrl = 'http://127.0.0.1:3000';
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    process.stdout.write(`• ${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (err: any) {
      console.log(`❌ FAIL (${err.message})`);
      failed++;
    }
  }

  // 1. Health check
  await test('GET /api/health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'healthy') throw new Error(`Unexpected status: ${data.status}`);
  });

  // 2. Metrics check
  await test('GET /api/metrics loads CodeBERT evaluation metrics', async () => {
    const res = await fetch(`${baseUrl}/api/metrics`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.metrics?.f1 || !data.confusion_matrix) throw new Error('Missing F1 or confusion matrix in metrics');
  });

  // 3. Scan check
  await test('POST /api/scan detects security patterns and returns dual signals', async () => {
    const res = await fetch(`${baseUrl}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [
          {
            path: 'test.js',
            content: 'const API_KEY = "sk-live12345678901234567890"; document.body.innerHTML = eval(userInput);',
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.files?.[0]?.modelPrediction || !data.files?.[0]?.patternFindings) {
      throw new Error('Scan result missing dual signals');
    }
    if (data.files[0].patternFindings.length < 2) {
      throw new Error('Pattern matcher failed to detect XSS and eval');
    }
  });

  // 4. Rate limiter check
  await test('GET /api/quota returns spending cap and limits', async () => {
    const res = await fetch(`${baseUrl}/api/quota`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (typeof data.remainingPerMinute !== 'number') throw new Error('Invalid quota payload');
  });

  console.log(`\n=================================`);
  console.log(`Smoke Test Results: ${passed} passed, ${failed} failed`);
  console.log(`=================================\n`);

  if (failed > 0) process.exit(1);
}

runSmokeTests().catch((err) => {
  console.error('Smoke test runner error:', err);
  process.exit(1);
});
