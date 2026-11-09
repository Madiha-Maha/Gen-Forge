/**
 * GenForge Example Starter Templates
 * 8 Production-grade templates + 1 intentionally vulnerable security demo template.
 */

export interface ProjectFile {
  path: string;
  content: string;
}

export interface TemplateProject {
  id: string;
  title: string;
  description: string;
  category: 'saas' | 'portfolio' | 'utility' | 'ecommerce' | 'security-demo';
  tags: string[];
  isSecurityDemo?: boolean;
  files: ProjectFile[];
}

export const TEMPLATES: TemplateProject[] = [
  {
    id: 'pomodoro-timer',
    title: 'Pomodoro Focus Timer & Audio Alert',
    description: 'Clean productivity timer with work/break cycles, task list, audio chime, and local stats.',
    category: 'utility',
    tags: ['Timer', 'Audio Alert', 'Productivity'],
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FocusForge Pomodoro</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center p-4">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></span>
        <h1 class="font-bold text-lg tracking-tight">FocusForge</h1>
      </div>
      <div class="flex gap-1 bg-slate-800 p-1 rounded-lg text-xs font-semibold">
        <button id="mode-work" class="px-3 py-1.5 rounded-md bg-indigo-600 text-white transition">Focus (25m)</button>
        <button id="mode-break" class="px-3 py-1.5 rounded-md text-slate-400 hover:text-white transition">Break (5m)</button>
      </div>
    </div>

    <!-- Timer Ring Display -->
    <div class="flex flex-col items-center justify-center my-8">
      <div class="text-6xl font-extrabold mono tracking-tighter text-indigo-400" id="timer-display">25:00</div>
      <p class="text-xs uppercase tracking-widest text-slate-400 mt-2" id="status-label">Ready to focus</p>
    </div>

    <!-- Controls -->
    <div class="flex gap-3 justify-center mb-6">
      <button id="btn-start" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-lg shadow-indigo-600/30">Start</button>
      <button id="btn-pause" class="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition" disabled>Pause</button>
      <button id="btn-reset" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">Reset</button>
    </div>

    <!-- Today's Session Counter -->
    <div class="border-t border-slate-800 pt-4 flex justify-between text-xs text-slate-400">
      <span>Completed Sessions: <strong class="text-indigo-400 font-bold" id="completed-count">0</strong></span>
      <span id="sound-status">Sound alert: Active</span>
    </div>
  </div>

  <script>
    let timeLeft = 25 * 60;
    let timerId = null;
    let isWorking = true;
    let completed = 0;

    const display = document.getElementById('timer-display');
    const statusLabel = document.getElementById('status-label');
    const startBtn = document.getElementById('btn-start');
    const pauseBtn = document.getElementById('btn-pause');
    const resetBtn = document.getElementById('btn-reset');
    const completedEl = document.getElementById('completed-count');

    function playBeep() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch (e) {
        console.warn('AudioContext not allowed yet:', e);
      }
    }

    function updateDisplay() {
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      display.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    function tick() {
      if (timeLeft > 0) {
        timeLeft--;
        updateDisplay();
      } else {
        clearInterval(timerId);
        timerId = null;
        playBeep();
        if (isWorking) {
          completed++;
          completedEl.textContent = completed;
          isWorking = false;
          timeLeft = 5 * 60;
          statusLabel.textContent = 'Break Time! Take 5 minutes.';
          display.classList.remove('text-indigo-400');
          display.classList.add('text-emerald-400');
        } else {
          isWorking = true;
          timeLeft = 25 * 60;
          statusLabel.textContent = 'Ready for next sprint';
          display.classList.remove('text-emerald-400');
          display.classList.add('text-indigo-400');
        }
        updateDisplay();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
      }
    }

    startBtn.addEventListener('click', () => {
      if (!timerId) {
        timerId = setInterval(tick, 1000);
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        statusLabel.textContent = isWorking ? 'Focusing...' : 'Resting...';
      }
    });

    pauseBtn.addEventListener('click', () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        statusLabel.textContent = 'Paused';
      }
    });

    resetBtn.addEventListener('click', () => {
      if (timerId) clearInterval(timerId);
      timerId = null;
      timeLeft = isWorking ? 25 * 60 : 5 * 60;
      updateDisplay();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      statusLabel.textContent = 'Reset';
    });

    document.getElementById('mode-work').addEventListener('click', () => {
      if (timerId) clearInterval(timerId);
      timerId = null;
      isWorking = true;
      timeLeft = 25 * 60;
      updateDisplay();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      statusLabel.textContent = 'Focus mode ready';
    });

    document.getElementById('mode-break').addEventListener('click', () => {
      if (timerId) clearInterval(timerId);
      timerId = null;
      isWorking = false;
      timeLeft = 5 * 60;
      updateDisplay();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      statusLabel.textContent = 'Break mode ready';
    });

    updateDisplay();
  </script>
</body>
</html>`
      }
    ]
  },
  {
    id: 'saas-landing',
    title: 'Modern SaaS Landing Page',
    description: 'High-converting hero, interactive pricing toggle, testimonial grid, and feature showcases.',
    category: 'saas',
    tags: ['Marketing', 'Landing Page', 'Pricing'],
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PulseCore — Observability for Modern APIs</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
  <!-- Navbar -->
  <header class="border-b border-slate-800/80 sticky top-0 bg-slate-950/80 backdrop-blur z-50">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-black text-white text-sm">P</div>
        <span class="font-bold tracking-tight text-lg">PulseCore</span>
      </div>
      <nav class="hidden md:flex items-center gap-8 text-sm text-slate-400">
        <a href="#features" class="hover:text-white transition">Features</a>
        <a href="#pricing" class="hover:text-white transition">Pricing</a>
        <a href="#testimonials" class="hover:text-white transition">Testimonials</a>
      </nav>
      <div class="flex items-center gap-3">
        <button class="text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5">Sign In</button>
        <button class="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition shadow-lg shadow-indigo-500/20">Get Started</button>
      </div>
    </div>
  </header>

  <!-- Hero -->
  <section class="py-24 px-6 text-center max-w-4xl mx-auto">
    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-400 text-xs font-semibold mb-6">
      <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> PulseCore 3.0 is live
    </span>
    <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
      Zero-latency distributed tracing for <span class="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">hyper-scale APIs</span>
    </h1>
    <p class="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
      Pinpoint bottlenecks, correlate microservice traces, and eliminate downtime before your customers notice.
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <button class="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-xl shadow-indigo-600/30">Start Free Trial</button>
      <button class="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold rounded-xl transition">Book a Demo</button>
    </div>
  </section>

  <!-- Pricing -->
  <section id="pricing" class="py-20 border-t border-slate-900 bg-slate-950/50 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-bold mb-3">Transparent, developer-first pricing</h2>
        <p class="text-slate-400 text-sm">Scale as your event volumes grow. Cancel any time.</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-lg mb-1">Starter</h3>
            <p class="text-xs text-slate-400 mb-4">For solo builders and prototypes.</p>
            <div class="text-3xl font-extrabold mb-6">$0 <span class="text-xs text-slate-400 font-normal">/ mo</span></div>
            <ul class="text-sm space-y-3 text-slate-300 mb-8">
              <li>✓ 100K spans / month</li>
              <li>✓ 3-day data retention</li>
              <li>✓ Community Discord</li>
            </ul>
          </div>
          <button class="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-sm font-semibold">Get Started</button>
        </div>
        <div class="p-6 bg-gradient-to-b from-indigo-950/60 to-slate-900/80 border-2 border-indigo-500 rounded-2xl flex flex-col justify-between relative shadow-2xl shadow-indigo-500/10">
          <span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full text-white">Most Popular</span>
          <div>
            <h3 class="font-bold text-lg mb-1">Growth</h3>
            <p class="text-xs text-slate-400 mb-4">For scaling startups and production apps.</p>
            <div class="text-3xl font-extrabold mb-6">$49 <span class="text-xs text-slate-400 font-normal">/ mo</span></div>
            <ul class="text-sm space-y-3 text-slate-200 mb-8">
              <li>✓ 5M spans / month</li>
              <li>✓ 30-day data retention</li>
              <li>✓ Anomaly alerts via Slack/PagerDuty</li>
              <li>✓ Priority support</li>
            </ul>
          </div>
          <button class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30">Start Trial</button>
        </div>
        <div class="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-lg mb-1">Enterprise</h3>
            <p class="text-xs text-slate-400 mb-4">Dedicated clusters and SOC-2 compliance.</p>
            <div class="text-3xl font-extrabold mb-6">Custom</div>
            <ul class="text-sm space-y-3 text-slate-300 mb-8">
              <li>✓ Unlimited ingestion</li>
              <li>✓ Custom retention policies</li>
              <li>✓ Dedicated VPC peering</li>
              <li>✓ 99.99% uptime SLA</li>
            </ul>
          </div>
          <button class="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-sm font-semibold">Contact Sales</button>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`
      }
    ]
  },
  {
    id: 'developer-portfolio',
    title: 'Developer Portfolio & Showcase',
    description: 'Clean personal developer portfolio with filterable project showcase, tech stack pills, and contact modal.',
    category: 'portfolio',
    tags: ['Portfolio', 'Developer', 'Showcase'],
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alex Rivera — Full-Stack Engineer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-neutral-950 text-neutral-100 min-h-screen">
  <main class="max-w-4xl mx-auto px-6 py-16">
    <header class="mb-16">
      <div class="inline-block p-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 mb-4">
        ● Available for freelance & contracting
      </div>
      <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-4">Alex Rivera</h1>
      <p class="text-neutral-400 text-lg leading-relaxed max-w-2xl">
        Systems & full-stack engineer building distributed runtimes, high-throughput pipelines, and developer tooling.
      </p>
    </header>

    <!-- Projects Section -->
    <section class="mb-16">
      <h2 class="text-xl font-bold tracking-tight mb-6 pb-2 border-b border-neutral-800">Featured Systems</h2>
      <div class="grid md:grid-cols-2 gap-6">
        <div class="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition">
          <div class="text-xs mono text-emerald-400 mb-2">RUST / WEBASSEMBLY</div>
          <h3 class="text-lg font-bold mb-2">Kroma Engine</h3>
          <p class="text-neutral-400 text-sm mb-4">Sub-millisecond geospatial spatial index engine capable of 1M queries per second.</p>
          <div class="flex gap-2 text-xs">
            <span class="px-2 py-1 bg-neutral-800 rounded text-neutral-300">Wasm</span>
            <span class="px-2 py-1 bg-neutral-800 rounded text-neutral-300">SIMD</span>
          </div>
        </div>

        <div class="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition">
          <div class="text-xs mono text-cyan-400 mb-2">TYPESCRIPT / NEXT.JS</div>
          <h3 class="text-lg font-bold mb-2">AuditVault</h3>
          <p class="text-neutral-400 text-sm mb-4">Automated SOC-2 compliance evidence aggregator for cloud infrastructure.</p>
          <div class="flex gap-2 text-xs">
            <span class="px-2 py-1 bg-neutral-800 rounded text-neutral-300">Next.js</span>
            <span class="px-2 py-1 bg-neutral-800 rounded text-neutral-300">PostgreSQL</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`
      }
    ]
  },
  {
    id: 'analytics-dashboard',
    title: 'Executive Analytics Dashboard',
    description: 'KPI metrics cards, sparkline charts, tabular data with pagination, and date range filters.',
    category: 'saas',
    tags: ['Dashboard', 'Charts', 'Analytics'],
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apex Analytics Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div class="flex">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-slate-800 min-h-screen p-6 hidden md:block">
      <div class="font-bold text-lg mb-8 flex items-center gap-2">
        <div class="w-6 h-6 rounded bg-indigo-600"></div>
        ApexMetric
      </div>
      <nav class="space-y-1 text-sm font-medium">
        <a class="block px-3 py-2 rounded-lg bg-indigo-600 text-white">Overview</a>
        <a class="block px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition">Realtime Traffic</a>
        <a class="block px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition">Conversions</a>
        <a class="block px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition">Settings</a>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold">Performance Overview</h1>
          <p class="text-xs text-slate-400">Past 30 days vs previous period</p>
        </div>
        <button class="text-xs font-semibold px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800">Export CSV</button>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div class="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <p class="text-xs text-slate-400 font-medium mb-1">Total Ingested Events</p>
          <h3 class="text-3xl font-extrabold text-white">14.8M</h3>
          <span class="text-xs text-emerald-400 font-semibold mt-2 inline-block">↑ 24.3% vs last month</span>
        </div>
        <div class="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <p class="text-xs text-slate-400 font-medium mb-1">Avg Request Latency</p>
          <h3 class="text-3xl font-extrabold text-white">18.4ms</h3>
          <span class="text-xs text-emerald-400 font-semibold mt-2 inline-block">↓ 4.1ms improvement</span>
        </div>
        <div class="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <p class="text-xs text-slate-400 font-medium mb-1">Active User Sessions</p>
          <h3 class="text-3xl font-extrabold text-white">42,910</h3>
          <span class="text-xs text-indigo-400 font-semibold mt-2 inline-block">↑ 12.8% expansion</span>
        </div>
      </div>

      <!-- Chart -->
      <div class="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <h3 class="text-sm font-semibold mb-4">Weekly Ingestion Volume (Millions)</h3>
        <div class="h-64">
          <canvas id="trafficChart"></canvas>
        </div>
      </div>
    </main>
  </div>

  <script>
    const ctx = document.getElementById('trafficChart');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Requests (M)',
          data: [1.8, 2.4, 2.9, 3.2, 3.8, 2.1, 1.9],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.35,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  </script>
</body>
</html>`
      }
    ]
  },
  {
    id: 'kanban-todo',
    title: 'Kanban Task Board',
    description: 'Draggable task cards across Backlog, In Progress, and Completed with local persistence.',
    category: 'utility',
    tags: ['Kanban', 'Tasks', 'Drag and Drop'],
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlowBoard — Minimal Task Board</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6">
  <div class="max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
      <div>
        <h1 class="text-2xl font-bold">Project FlowBoard</h1>
        <p class="text-xs text-slate-400">Sprint 14 • 8 tasks remaining</p>
      </div>
      <button id="add-task-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition">+ New Task</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="columns-container">
      <!-- Todo Column -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
          <span>Backlog</span> <span class="bg-slate-800 px-2 py-0.5 rounded text-white text-[10px]" id="count-todo">2</span>
        </h3>
        <div class="space-y-3" id="col-todo">
          <div class="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow text-sm">
            <h4 class="font-semibold text-white mb-1">Set up OAuth client</h4>
            <p class="text-xs text-slate-400">Configure redirect URI and scopes.</p>
          </div>
          <div class="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow text-sm">
            <h4 class="font-semibold text-white mb-1">Document API schema</h4>
            <p class="text-xs text-slate-400">Export OpenAPI 3.1 specification.</p>
          </div>
        </div>
      </div>

      <!-- In Progress Column -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <h3 class="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4 flex items-center justify-between">
          <span>In Progress</span> <span class="bg-slate-800 px-2 py-0.5 rounded text-white text-[10px]">1</span>
        </h3>
        <div class="space-y-3" id="col-progress">
          <div class="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow text-sm">
            <h4 class="font-semibold text-white mb-1">CodeBERT model fine-tuning</h4>
            <p class="text-xs text-slate-400">Run 5 epochs on Devign dataset.</p>
          </div>
        </div>
      </div>

      <!-- Done Column -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <h3 class="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center justify-between">
          <span>Done</span> <span class="bg-slate-800 px-2 py-0.5 rounded text-white text-[10px]">3</span>
        </h3>
        <div class="space-y-3" id="col-done">
          <div class="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow text-sm opacity-75">
            <h4 class="font-semibold line-through text-slate-300 mb-1">Setup Vite dev server</h4>
            <p class="text-xs text-slate-500">Completed in initial commit.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('add-task-btn').addEventListener('click', () => {
      const title = prompt('Enter task title:');
      if (!title) return;
      const card = document.createElement('div');
      card.className = 'p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow text-sm animate-fade';
      const h4 = document.createElement('h4');
      h4.className = 'font-semibold text-white mb-1';
      h4.textContent = title;
      const p = document.createElement('p');
      p.className = 'text-xs text-slate-400';
      p.textContent = 'Created just now';
      card.appendChild(h4);
      card.appendChild(p);
      document.getElementById('col-todo').prepend(card);
    });
  </script>
</body>
</html>`
      }
    ]
  },
  {
    id: 'notes-instant-search',
    title: 'Notes with Instant Real-Time Search',
    description: 'Markdown scratchpad with tag filtering, live search indexing, and auto-save in localStorage.',
    category: 'utility',
    tags: ['Notes', 'Instant Search', 'Markdown'],
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickPad — Instant Notes</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6">
  <div class="max-w-4xl mx-auto flex flex-col h-[90vh]">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">QuickPad Notes</h1>
      <button id="new-note" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold">+ New Note</button>
    </div>

    <div class="mb-4">
      <input type="text" id="search-input" placeholder="Search notes by keyword or tag..." class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500">
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
      <div class="overflow-y-auto space-y-2 pr-2" id="notes-list"></div>
      <div class="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
        <input id="note-title" class="bg-transparent text-xl font-bold border-b border-slate-800 pb-3 mb-4 focus:outline-none" placeholder="Note Title...">
        <textarea id="note-body" class="bg-transparent flex-1 resize-none text-slate-300 text-sm focus:outline-none leading-relaxed" placeholder="Write markdown or thoughts here..."></textarea>
      </div>
    </div>
  </div>

  <script>
    let notes = [
      { id: '1', title: 'CodeBERT Scan Thresholds', body: 'Set default classification threshold to 0.50. Cross-reference with pattern check results for dual-signal verification.', date: 'Today' },
      { id: '2', title: 'Vite Sandbox Constraints', body: 'Use strict sandbox attribute with allow-scripts. Never grant same-origin permissions to user-generated iframes.', date: 'Yesterday' }
    ];
    let activeId = '1';

    const listEl = document.getElementById('notes-list');
    const searchEl = document.getElementById('search-input');
    const titleEl = document.getElementById('note-title');
    const bodyEl = document.getElementById('note-body');

    function renderList(query = '') {
      listEl.innerHTML = '';
      const filtered = notes.filter(n => n.title.toLowerCase().includes(query.toLowerCase()) || n.body.toLowerCase().includes(query.toLowerCase()));
      filtered.forEach(note => {
        const item = document.createElement('div');
        item.className = 'p-3 rounded-xl border cursor-pointer transition ' + (note.id === activeId ? 'bg-indigo-950/60 border-indigo-600' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700');
        const h4 = document.createElement('h4');
        h4.className = 'text-sm font-semibold text-white truncate';
        h4.textContent = note.title;
        const p = document.createElement('p');
        p.className = 'text-xs text-slate-400 truncate mt-1';
        p.textContent = note.body;
        item.appendChild(h4);
        item.appendChild(p);
        item.addEventListener('click', () => {
          activeId = note.id;
          loadActive();
          renderList(searchEl.value);
        });
        listEl.appendChild(item);
      });
    }

    function loadActive() {
      const active = notes.find(n => n.id === activeId);
      if (active) {
        titleEl.value = active.title;
        bodyEl.value = active.body;
      }
    }

    titleEl.addEventListener('input', () => {
      const active = notes.find(n => n.id === activeId);
      if (active) {
        active.title = titleEl.value;
        renderList(searchEl.value);
      }
    });

    bodyEl.addEventListener('input', () => {
      const active = notes.find(n => n.id === activeId);
      if (active) {
        active.body = bodyEl.value;
        renderList(searchEl.value);
      }
    });

    document.getElementById('new-note').addEventListener('click', () => {
      const newNote = { id: String(Date.now()), title: 'Untitled Note', body: '', date: 'Just now' };
      notes.unshift(newNote);
      activeId = newNote.id;
      loadActive();
      renderList();
    });

    searchEl.addEventListener('input', (e) => renderList(e.target.value));

    loadActive();
    renderList();
  </script>
</body>
</html>`
      }
    ]
  },
  {
    id: 'shop-checkout',
    title: 'E-commerce Checkout & Cart',
    description: 'Clean cart summary with promo code discount calculator, shipping step toggle, and order validation.',
    category: 'ecommerce',
    tags: ['E-Commerce', 'Cart', 'Checkout'],
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KiteGoods — Secure Checkout</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6">
  <div class="max-w-4xl mx-auto py-8">
    <h1 class="text-2xl font-bold mb-8">Secure Checkout</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="md:col-span-2 space-y-6">
        <div class="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h2 class="font-semibold text-lg mb-4">1. Shipping Information</h2>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label class="block text-xs text-slate-400 mb-1">First Name</label>
              <input type="text" value="Jane" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5">
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Last Name</label>
              <input type="text" value="Doe" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5">
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-slate-400 mb-1">Street Address</label>
              <input type="text" value="742 Evergreen Terrace" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5">
            </div>
          </div>
        </div>

        <div class="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h2 class="font-semibold text-lg mb-4">2. Payment Method</h2>
          <p class="text-xs text-slate-400 mb-4">Mock test gateway (Sandbox mode enabled)</p>
          <button class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white transition">Place Order ($189.00)</button>
        </div>
      </div>

      <!-- Order Summary -->
      <div class="p-6 bg-slate-900 border border-slate-800 rounded-2xl h-fit">
        <h3 class="font-bold text-sm mb-4">Order Summary</h3>
        <div class="space-y-3 text-sm pb-4 border-b border-slate-800">
          <div class="flex justify-between">
            <span>Titanium Keychron Keyboard</span>
            <span class="font-semibold">$149.00</span>
          </div>
          <div class="flex justify-between">
            <span>Desk Mat (Midnight)</span>
            <span class="font-semibold">$40.00</span>
          </div>
        </div>
        <div class="pt-4 flex justify-between font-bold text-base">
          <span>Total:</span>
          <span class="text-indigo-400">$189.00</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
      }
    ]
  },
  {
    id: 'minimal-blog',
    title: 'Minimalist Engineering Blog',
    description: 'Editorial article layout with reading time, code blocks, dark/light reading mode, and author bio.',
    category: 'saas',
    tags: ['Blog', 'Markdown', 'Editorial'],
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Engineering Blog — Formal Verification of Sandboxed Runtimes</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen py-16 px-6">
  <article class="max-w-2xl mx-auto">
    <div class="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">Systems & Security</div>
    <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 leading-tight">Formal Verification of Sandboxed WebAssembly Runtimes</h1>
    <div class="flex items-center gap-3 text-xs text-slate-400 mb-8 pb-6 border-b border-slate-800">
      <span>By Madiha Maha</span>
      <span>•</span>
      <span>6 min read</span>
      <span>•</span>
      <span>Nov 2026</span>
    </div>
    <div class="prose prose-invert text-slate-300 space-y-4 text-base leading-relaxed">
      <p>
        When generating and executing untrusted code on behalf of users, boundary isolation is the only defense in depth that holds against novel vectors.
      </p>
      <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-300">
        <code>const sandbox = new Worker('worker.js', { credentials: 'omit' });</code>
      </div>
      <p>
        In this deep dive, we explore how memory bounds checking and static pattern analysis combine to provide both heuristic risk estimation and determinism.
      </p>
    </div>
  </article>
</body>
</html>`
      }
    ]
  },
  {
    id: 'intentionally-unsafe-sample',
    title: '⚠️ Security Demo: Vulnerability Playground',
    description: 'Intentionally vulnerable playground with DOM XSS, raw eval(), and hardcoded API tokens. Use this to demonstrate the CodeBERT scanner and pattern cross-check.',
    category: 'security-demo',
    isSecurityDemo: true,
    tags: ['Scanner Demo', 'Vulnerable Code', 'XSS', 'Eval'],
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Intentionally Insecure Demo Playground</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-red-950/40 text-slate-100 min-h-screen p-8">
  <div class="max-w-xl mx-auto bg-slate-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl">
    <div class="flex items-center gap-2 mb-4 text-red-400 font-bold">
      <span class="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
      Security Demo Playground (Intentionally Vulnerable)
    </div>
    <p class="text-xs text-slate-400 mb-6">
      This sample contains deliberate anti-patterns (DOM XSS, eval, hardcoded token) so you can test GenForge's CodeBERT scanner and pattern cross-check.
    </p>

    <div class="space-y-4 text-sm">
      <div>
        <label class="block text-xs text-slate-400 mb-1">Unsanitized Input:</label>
        <input id="user-input" class="w-full bg-slate-950 border border-slate-800 rounded p-2" value="<img src=x onerror=alert(1)>">
      </div>
      <button id="render-btn" class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-semibold text-white">Inject via innerHTML</button>
      <div id="output-box" class="p-3 bg-slate-950 rounded border border-slate-800 min-h-[60px]"></div>
    </div>
  </div>

  <script>
    // ⚠️ INTENTIONAL SECURITY FLAW 1: Hardcoded sensitive secret
    const API_KEY = "sk-live_948204918239019238491823901";

    // ⚠️ INTENTIONAL SECURITY FLAW 2: Direct DOM innerHTML injection
    document.getElementById('render-btn').addEventListener('click', () => {
      const input = document.getElementById('user-input').value;
      document.getElementById('output-box').innerHTML = input; // High-severity XSS
    });

    // ⚠️ INTENTIONAL SECURITY FLAW 3: Dynamic code execution via eval
    function calculateFormula(formula) {
      return eval(formula); // High-severity arbitrary execution
    }

    // ⚠️ INTENTIONAL SECURITY FLAW 4: Insecure HTTP transport
    fetch("http://insecure-analytics.example.com/log?user=admin");
  </script>
</body>
</html>`
      }
    ]
  }
];
