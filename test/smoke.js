/* Dependency-free smoke test:  npm test
 * Verifies: JSX compiles, offline engine output, server routes & security. */
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
let passed = 0;
const ok = (name, fn) => Promise.resolve().then(fn).then(() => { passed++; console.log('  ✓', name); })
  .catch((e) => { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; });

(async () => {
  console.log('\nResumeAI smoke tests');

  await ok('app.jsx compiles with Babel', () => {
    const Babel = require(path.join(root, 'vendor/babel.min.js'));
    const out = Babel.transform(fs.readFileSync(path.join(root, 'src/app.jsx'), 'utf8'), { presets: ['react'] }).code;
    assert(out.length > 1000);
  });

  // load engine in a sandbox with a fake window
  const sandbox = { window: {}, console, TextEncoder, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  sandbox.window = sandbox; vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/engine.js'), 'utf8'), sandbox);
  const E = sandbox.Engine;
  const resume = fs.readFileSync(path.join(root, 'samples/sample-resume.txt'), 'utf8');
  const jd = fs.readFileSync(path.join(root, 'samples/sample-job-description.txt'), 'utf8');

  await ok('offline analyzer finds matched / missing skills', () => {
    const r = E.localAnalyze(resume, jd);
    assert(r.ats_score > 20 && r.ats_score < 100, 'score ' + r.ats_score);
    assert(r.matched_skills.includes('React') && r.matched_skills.includes('MongoDB'));
    assert(r.missing_skills.includes('Docker') && r.missing_skills.includes('AWS'));
    assert(r.partial_skills.includes('TypeScript'), 'TypeScript should be partial (JavaScript present)');
    assert(r.suggestions.length === 4 && r.suggestions.every((s) => !s.resource_url || /^https:\/\//.test(s.resource_url)));
  });

  await ok('analyzer scores a tailored resume higher than an empty one', () => {
    const good = E.localAnalyze(resume, jd).ats_score;
    const bad = E.localAnalyze('I like cooking.', jd).ats_score;
    assert(good > bad + 20, `${good} vs ${bad}`);
  });

  await ok('offline builder parses experience and never invents facts', () => {
    const r = E.localBuild({
      contact: { name: 'Alex', email: 'a@b.co', phone: '', location: '', linkedin: '', github: '' },
      skills: ['JavaScript', 'React'], jobDesc: jd, template: 'classic',
      experience: 'Full-Stack Developer — BrightApps Inc. (Jun 2023 – Present)\nBuilt dashboards\nWrote tests',
      education: 'B.S. Computer Science, University of Texas, 2019–2023, GPA 3.7',
    });
    assert.strictEqual(r.experience[0].role, 'Full-Stack Developer');
    assert.strictEqual(r.experience[0].company, 'BrightApps Inc.');
    assert(/2023/.test(r.experience[0].dates) && r.experience[0].bullets.length === 2);
    assert.strictEqual(r.education[0].gpa, '3.7');
    assert(!JSON.stringify(r).includes('Tech Corp'));
    assert(E.resumeToText(r).includes('PROFESSIONAL SUMMARY'));
  });

  await ok('JSON extraction tolerates fences and chatter', () => {
    assert.strictEqual(JSON.stringify(E.extractJSON('Sure!\n```json\n{"a":1}\n```')), '{"a":1}');
    assert.strictEqual(E.extractJSON('no json'), null);
  });

  // server tests (force "no key" mode)
  process.env.ANTHROPIC_API_KEY = ''; process.env.PORT = '0';
  const get = (port, p, opts = {}) => new Promise((res, rej) => {
    const req = http.request({ port, path: p, method: opts.method || 'GET', headers: opts.headers }, (r) => {
      let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res({ status: r.statusCode, body: b }));
    }); req.on('error', rej); if (opts.body) req.write(opts.body); req.end();
  });
  const origListen = http.Server.prototype.listen; let server;
  http.Server.prototype.listen = function (...a) { server = this; return origListen.call(this, 0, () => {}); };
  delete require.cache[require.resolve('../server.js')];
  require('../server.js');
  await new Promise((r) => setTimeout(r, 300));
  const port = server.address().port;
  http.Server.prototype.listen = origListen;

  await ok('serves index.html and vendor files', async () => {
    assert.strictEqual((await get(port, '/')).status, 200);
    assert.strictEqual((await get(port, '/vendor/react.production.min.js')).status, 200);
    assert.strictEqual((await get(port, '/src/app.jsx')).status, 200);
  });
  await ok('does not expose server.js, .env or traversal paths', async () => {
    for (const p of ['/server.js', '/.env', '/package.json', '/../server.js', '/%2e%2e/server.js', '/src/../server.js'])
      assert.strictEqual((await get(port, p)).status, 404, p);
  });
  await ok('/api/status and /api/claude behave without a key', async () => {
    const s = JSON.parse((await get(port, '/api/status')).body);
    if (!process.env.ANTHROPIC_API_KEY) {
      assert.strictEqual(s.ai, false);
      const r = await get(port, '/api/claude', { method: 'POST', body: JSON.stringify({ message: 'hi' }), headers: { 'content-type': 'application/json' } });
      assert.strictEqual(r.status, 503);
    }
  });

  server.close();
  console.log(`\n${passed} checks passed${process.exitCode ? ' — with FAILURES' : ''}\n`);
})();
