# ResumeAI Studio 🚀

AI-powered **resume builder + ATS analyzer**. React 18 front-end, tiny zero-dependency Node server, optional live Claude AI, and a built-in **offline engine** so the app (and your demo) always works.

## Run it (30 seconds)

```bash
cd resumeai
node server.js          # or: npm start
# open http://localhost:8080
```

Needs only **Node 18+**. No `npm install` or build step. React/Babel are vendored locally. PDF/DOCX/image extraction loads PDF.js, Mammoth and Tesseract.js from CDNs, so those upload formats require an internet connection.

### Enable live Claude AI (optional)
```bash
cp .env.example .env     # then put your key in ANTHROPIC_API_KEY=sk-ant-...
node server.js
```
The key stays on the server (browser → `/api/claude` → Anthropic). The top bar shows **● Claude AI live** or **● Offline engine**.

## Features
| Area | What it does |
|---|---|
| **Auth** | Sign up / sign in (hashed passwords, stored in the browser) + one-click Demo User |
| **Builder** | 4-step wizard → contact, skills + job description, 10 templates, generated resume |
| **Truthful AI** | Prompt forbids inventing employers, dates, degrees or metrics; uses only what you enter |
| **Analyzer** | ATS score, keyword match, formatting score, matched / partial / missing skills, strengths, improvements, 4 learning resources, downloadable report; accepts PDF, DOCX, TXT/MD and PNG/JPG/JPEG |
| **Offline engine** | 45-skill knowledge base, alias matching, related-skill partial credit, rule-based scoring and resume parsing |
| **Export** | Print / Save as PDF, plain-text ATS download, live template switching, up to 3 AI optimization passes before download |
| **Profile** | Saved resumes (view / delete), preferences, activity stats — all persisted per user |

## Project structure
```
resumeai/
├── server.js            # static server + /api/claude proxy + /api/status
├── index.html           # entry point
├── src/
│   ├── app.jsx          # React UI (Auth, Dashboard, Builder, Analyzer, Profile)
│   ├── engine.js        # API helper, storage, skills DB, offline analyzer/builder
│   └── styles.css       # design system
├── vendor/              # React, ReactDOM, Babel (local copies)
├── samples/             # sample resume + job description for demos / testing
├── test/smoke.js        # npm test — dependency-free checks
├── .env.example
└── package.json
```

## 5-minute demo script
1. **Landing** – mention the architecture (React + Node proxy, key never in browser). Click **Continue as Demo User**.
2. **Builder** – *Fill demo data* → Next → Next → pick **Modern** → *Generate*. Point out: no invented facts, ATS-safe single column.
3. Switch the template dropdown live → **Save to Profile** → **Download .txt** / **Print → Save as PDF**.
4. **Analyzer** – *Load sample* → *Analyze*. Walk through score ring, matched/partial/missing (TypeScript is *partial* because JavaScript is present), and the learning links.
5. **Profile** – saved resume, stats, view/delete. Mention data persists across reloads.
6. Tech talking points: offline fallback engine, JSON normalisation of AI output, path-traversal-safe static server, hashed passwords.

## Tests
```bash
npm test      # compiles JSX, checks analyzer/builder logic, server routes & security
```

## Notes & limitations
- Auth is **demo-grade** (client-side, per browser). For production add a real backend + database and server-side sessions.
- PDF export uses the browser print dialog (choose "Save as PDF"). Allow pop-ups.
- Analyzer accepts PDF (including scanned PDFs via OCR), DOCX, TXT/MD, PNG, JPG and JPEG. Legacy binary `.doc` is not supported; save it as `.docx` first. Extraction libraries load from CDNs and require internet access.
- The AI optimization agent performs up to three review passes and retains the best score measured by the built-in heuristic. It requires a configured Anthropic API key for AI rewriting. Scores are estimates, not guarantees of a higher result in a real ATS; it must never add skills or achievements you do not have.
- The interface now uses a light visual theme. Templates include Classic, Minimal, Modern, Executive, Creative, Technical, Harvard Classic, ATS Modern, Swiss Minimal and Compact One-Page.
- Offline scoring is a heuristic estimate, not a real ATS result.

MIT License
