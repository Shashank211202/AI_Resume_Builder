/* ResumeAI Studio — tiny zero-dependency server
 *  - serves the static app
 *  - POST /api/claude  → proxies to Anthropic (API key stays on the server)
 *  - GET  /api/status  → tells the UI whether live AI is available
 * Run:  node server.js     (Node 18+)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── load .env (no dotenv dependency) ─────────────────────
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch { /* .env is optional */ }

const PORT = Number(process.env.PORT) || 8080;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const hasKey = () => API_KEY.startsWith('sk-ant-');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};
const PUBLIC = new Set(['index.html', 'src', 'vendor', 'samples']);

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > limit) { reject(new Error('Payload too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleClaude(req, res) {
  if (!hasKey()) return send(res, 503, { error: 'NO_API_KEY' });
  try {
    const { system = '', message = '', max_tokens = 2500 } = JSON.parse(await readBody(req));
    if (!message) return send(res, 400, { error: 'message required' });
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: Math.min(Number(max_tokens) || 2500, 4000),
        system,
        messages: [{ role: 'user', content: message }],
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      console.error('Anthropic error:', upstream.status, data?.error?.message);
      return send(res, 502, { error: data?.error?.message || 'Upstream error' });
    }
    const text = (data.content || []).map((c) => c.text || '').join('');
    send(res, 200, { text });
  } catch (e) {
    console.error('Proxy error:', e.message);
    send(res, 500, { error: e.message });
  }
}

function serveStatic(req, res) {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel === '/') rel = '/index.html';
  const clean = path.normalize(rel).replace(/^([/\\])+/, '');
  const top = clean.split(/[/\\]/)[0];
  const full = path.join(__dirname, clean);
  if (!PUBLIC.has(top) || !full.startsWith(__dirname)) return send(res, 404, 'Not found', 'text/plain');
  fs.readFile(full, (err, buf) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, buf, MIME[path.extname(full).toLowerCase()] || 'application/octet-stream');
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x').pathname;
  if (req.method === 'GET' && url === '/api/status') return send(res, 200, { ai: hasKey(), model: MODEL });
  if (req.method === 'POST' && url === '/api/claude') return handleClaude(req, res);
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
  send(res, 405, { error: 'Method not allowed' });
}).listen(PORT, () => {
  console.log(`\n  ResumeAI Studio running →  http://localhost:${PORT}`);
  console.log(hasKey()
    ? `  Live AI: ON  (model: ${MODEL})\n`
    : '  Live AI: OFF — add ANTHROPIC_API_KEY to .env to enable. Smart offline engine will be used.\n');
});
