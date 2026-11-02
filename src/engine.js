/* ResumeAI Studio — engine (plain JS, loaded before app.jsx)
 * Contains: API helper, JSON utils, localStorage helpers, auth hashing,
 * a skills knowledge-base, and an OFFLINE analyzer/builder that runs when
 * live AI is unavailable (so the app always works and demos never break).
 */
(function (global) {
  'use strict';

  // ═════════════ API ═════════════
  const API = {
    async status() {
      try {
        const r = await fetch('/api/status');
        if (!r.ok) return { ai: false };
        return await r.json();
      } catch { return { ai: false }; }
    },
    // returns text, or null if AI is unavailable / failed
    async ask(system, message, maxTokens = 2500) {
      try {
        const r = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system, message, max_tokens: maxTokens }),
        });
        if (!r.ok) return null;
        const d = await r.json();
        return d.text || null;
      } catch (e) { console.warn('AI request failed:', e); return null; }
    },
  };

  function extractJSON(text) {
    if (!text) return null;
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s === -1 || e <= s) return null;
    try { return JSON.parse(text.slice(s, e + 1)); } catch { return null; }
  }

  // ═════════════ STORAGE ═════════════
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota / private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  async function hashPassword(email, pw) {
    const input = `resumeai::${email.toLowerCase()}::${pw}`;
    try {
      if (global.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch { /* fall through */ }
    let h = 5381; for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
    return 'x' + (h >>> 0).toString(16);
  }

  // ═════════════ SKILLS KNOWLEDGE BASE ═════════════
  // [name, aliases, resource title, resource url, related skills (partial credit)]
  const SK = [
    ['JavaScript', ['javascript', 'js', 'es6', 'ecmascript'], 'JavaScript Guide (MDN)', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', ['TypeScript']],
    ['TypeScript', ['typescript', 'ts'], 'TypeScript Handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html', ['JavaScript']],
    ['React', ['react', 'reactjs', 'react.js'], 'React Docs — Learn', 'https://react.dev/learn', ['Next.js', 'Redux']],
    ['Next.js', ['next.js', 'nextjs', 'next js'], 'Next.js Learn Course', 'https://nextjs.org/learn', ['React']],
    ['Redux', ['redux', 'redux toolkit', 'zustand'], 'Redux Essentials Tutorial', 'https://redux.js.org/tutorials/essentials/part-1-overview-concepts', ['React']],
    ['Vue', ['vue', 'vuejs', 'vue.js'], 'Vue.js Guide', 'https://vuejs.org/guide/introduction.html', ['React']],
    ['Angular', ['angular', 'angularjs'], 'Angular Docs', 'https://angular.dev/overview', ['TypeScript']],
    ['Node.js', ['node.js', 'nodejs', 'node js', 'node'], 'Node.js Learn', 'https://nodejs.org/en/learn', ['Express', 'JavaScript']],
    ['Express', ['express', 'express.js', 'expressjs'], 'Express.js Guide', 'https://expressjs.com/en/starter/installing.html', ['Node.js']],
    ['MongoDB', ['mongodb', 'mongo', 'mongoose'], 'MongoDB University', 'https://learn.mongodb.com/', ['SQL']],
    ['SQL', ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'sql server', 'oracle db'], 'PostgreSQL Tutorial', 'https://www.postgresql.org/docs/current/tutorial.html', ['MongoDB']],
    ['Redis', ['redis'], 'Redis Docs', 'https://redis.io/docs/latest/', ['MongoDB']],
    ['GraphQL', ['graphql', 'apollo'], 'Introduction to GraphQL', 'https://graphql.org/learn/', ['REST APIs']],
    ['REST APIs', ['rest api', 'rest apis', 'restful', 'rest', 'api development', 'web services'], 'RESTful API Tutorial', 'https://restfulapi.net/', ['GraphQL', 'Express']],
    ['HTML/CSS', ['html', 'html5', 'css', 'css3', 'sass', 'scss'], 'MDN Learn Web Development', 'https://developer.mozilla.org/en-US/docs/Learn_web_development', []],
    ['Tailwind CSS', ['tailwind', 'tailwindcss', 'tailwind css'], 'Tailwind CSS Docs', 'https://tailwindcss.com/docs', ['HTML/CSS']],
    ['Python', ['python', 'django', 'flask', 'fastapi'], 'The Python Tutorial', 'https://docs.python.org/3/tutorial/', []],
    ['Java', ['java', 'spring', 'spring boot'], 'Dev.java Learn', 'https://dev.java/learn/', []],
    ['C++', ['c++', 'cpp'], 'Learn C++', 'https://www.learncpp.com/', []],
    ['Go', ['golang', 'go lang'], 'A Tour of Go', 'https://go.dev/tour/', []],
    ['Git', ['git', 'github', 'gitlab', 'version control', 'bitbucket'], 'Pro Git Book', 'https://git-scm.com/book/en/v2', []],
    ['Docker', ['docker', 'containers', 'containerization', 'containerisation'], 'Docker Get Started', 'https://docs.docker.com/get-started/', ['Kubernetes']],
    ['Kubernetes', ['kubernetes', 'k8s'], 'Kubernetes Basics Tutorial', 'https://kubernetes.io/docs/tutorials/kubernetes-basics/', ['Docker']],
    ['CI/CD', ['ci/cd', 'ci cd', 'cicd', 'github actions', 'jenkins', 'continuous integration', 'continuous delivery', 'continuous deployment', 'gitlab ci'], 'GitHub Actions Docs', 'https://docs.github.com/en/actions', ['Git']],
    ['AWS', ['aws', 'amazon web services', 'ec2', 's3', 'lambda'], 'AWS Cloud Practitioner Path', 'https://aws.amazon.com/certification/certified-cloud-practitioner/', ['Azure', 'GCP']],
    ['Azure', ['azure'], 'Microsoft Azure Training', 'https://learn.microsoft.com/en-us/training/azure/', ['AWS', 'GCP']],
    ['GCP', ['gcp', 'google cloud'], 'Google Cloud Training', 'https://cloud.google.com/learn/training', ['AWS', 'Azure']],
    ['Testing', ['jest', 'cypress', 'unit testing', 'unit tests', 'testing', 'tdd', 'mocha', 'playwright', 'selenium'], 'Jest Getting Started', 'https://jestjs.io/docs/getting-started', []],
    ['Agile/Scrum', ['agile', 'scrum', 'kanban', 'sprint', 'sprints'], 'Atlassian Agile Coach', 'https://www.atlassian.com/agile', []],
    ['Machine Learning', ['machine learning', 'ml', 'deep learning', 'scikit-learn', 'sklearn'], 'Machine Learning Specialization', 'https://www.coursera.org/specializations/machine-learning-introduction', ['Python']],
    ['TensorFlow', ['tensorflow', 'pytorch', 'keras'], 'TensorFlow Tutorials', 'https://www.tensorflow.org/tutorials', ['Machine Learning']],
    ['Data Analysis', ['data analysis', 'pandas', 'numpy', 'data analytics', 'analytics'], 'pandas Getting Started', 'https://pandas.pydata.org/docs/getting_started/index.html', ['Python', 'SQL']],
    ['Power BI', ['power bi', 'powerbi', 'tableau'], 'Microsoft Power BI Training', 'https://learn.microsoft.com/en-us/training/powerbi/', ['Excel']],
    ['Excel', ['excel', 'spreadsheets', 'google sheets'], 'Excel Help & Learning', 'https://support.microsoft.com/en-us/excel', []],
    ['Figma', ['figma', 'ui/ux', 'ux design', 'wireframing', 'prototyping'], 'Figma Learn', 'https://help.figma.com/hc/en-us/categories/360002051613', []],
    ['Linux', ['linux', 'bash', 'shell scripting', 'unix'], 'Linux Journey', 'https://linuxjourney.com/', []],
    ['Microservices', ['microservices', 'micro-services', 'distributed systems'], 'Microservices Guide (microservices.io)', 'https://microservices.io/patterns/microservices.html', ['Docker', 'REST APIs']],
    ['System Design', ['system design', 'scalability', 'design patterns'], 'System Design Primer', 'https://github.com/donnemartin/system-design-primer', ['Microservices']],
    ['Data Structures & Algorithms', ['data structures', 'algorithms', 'dsa', 'leetcode'], 'NeetCode Roadmap', 'https://neetcode.io/roadmap', []],
    ['Communication', ['communication', 'collaboration', 'teamwork', 'stakeholder', 'cross-functional'], '', '', []],
    ['Problem Solving', ['problem solving', 'problem-solving', 'analytical', 'debugging'], '', '', []],
    ['Leadership', ['leadership', 'mentoring', 'mentored', 'team lead', 'led a team'], '', '', []],
    ['Project Management', ['project management', 'pmp', 'jira', 'roadmap'], 'Atlassian Project Management Guide', 'https://www.atlassian.com/agile/project-management', ['Agile/Scrum']],
  ];

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const SKILL_RX = SK.map(([name, aliases]) => ({
    name,
    rx: new RegExp('(?<![a-z0-9+#])(?:' + aliases.map(esc).join('|') + ')(?![a-z0-9+#])', 'i'),
  }));
  const SKILL_INFO = Object.fromEntries(SK.map(([name, , rn, ru, rel]) => [name, { rn, ru, rel }]));

  const canon = (s) => {
    const t = s.trim().toLowerCase();
    for (const [name, aliases] of SK) if (name.toLowerCase() === t || aliases.includes(t)) return name;
    return s.trim();
  };

  function findSkills(text) {
    const out = [];
    for (const { name, rx } of SKILL_RX) if (rx.test(text)) out.push(name);
    return out;
  }

  const STOP = new Set(('the and for with you your our are will have has that this from they their who what when where which while into out over under more most such than then them these those able also any can may must should would about across between including etc use using used work working team teams role looking join company candidate candidates experience years year strong good great excellent ability skills skill knowledge understanding required preferred plus bonus responsibilities requirements qualifications job position opportunity environment based make build building develop development developer engineer software'.split(' ')));

  function topKeywords(jd, n = 20) {
    const freq = {};
    (jd.toLowerCase().match(/[a-z][a-z0-9+#.]{2,}/g) || []).forEach((w) => {
      w = w.replace(/\.+$/, '');
      if (w.length < 3 || STOP.has(w)) return;
      freq[w] = (freq[w] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, n).map(([w]) => w);
  }

  // ═════════════ OFFLINE ANALYZER ═════════════
  const ACTION_VERBS = /\b(led|built|developed|designed|implemented|created|improved|reduced|increased|optimized|optimised|launched|managed|delivered|automated|architected|integrated|deployed|migrated|mentored|collaborated|engineered|streamlined|achieved|drove|shipped|refactored)\b/gi;

  function localAnalyze(resume, jd) {
    const rLow = resume.toLowerCase();
    const jdSkills = findSkills(jd);
    const resSkills = new Set(findSkills(resume));

    let required = jdSkills;
    if (required.length < 3) {
      const kws = topKeywords(jd, 8).map((k) => k.charAt(0).toUpperCase() + k.slice(1));
      required = [...new Set([...jdSkills, ...kws])].slice(0, 12);
    }
    const matched = [], partial = [], missing = [];
    required.forEach((s) => {
      const present = resSkills.has(s) || (!SKILL_INFO[s] && rLow.includes(s.toLowerCase()));
      if (present) matched.push(s);
      else if ((SKILL_INFO[s]?.rel || []).some((r) => resSkills.has(r))) partial.push(s);
      else missing.push(s);
    });

    const total = Math.max(required.length, 1);
    const coverage = ((matched.length + partial.length * 0.5) / total) * 100;

    const kws = topKeywords(jd, 20);
    const kwHit = kws.filter((k) => rLow.includes(k)).length;
    const keyword_density = kws.length ? Math.round((kwHit / kws.length) * 100) : 0;

    // formatting / structure checks
    const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(resume);
    const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(resume);
    const sections = {
      experience: /\b(experience|employment|internship|work history)\b/i.test(resume),
      education: /\b(education|b\.?tech|b\.?sc|m\.?c\.?a|bachelor|master|university|college)\b/i.test(resume),
      skills: /\b(skills|technologies|tech stack)\b/i.test(resume),
      projects: /\b(projects?|portfolio)\b/i.test(resume),
    };
    const bullets = (resume.match(/^\s*[•\-*▪●–]\s+/gm) || []).length;
    const metrics = (resume.match(/\b\d+(\.\d+)?\s?(%|x|k|m|\+|users|requests|ms|hours|days|projects|clients)\b|\$\s?\d+/gi) || []).length;
    const verbs = (resume.match(ACTION_VERBS) || []).length;
    const words = resume.split(/\s+/).filter(Boolean).length;
    const hasLinks = /(linkedin\.com|github\.com)/i.test(resume);

    let fmt = (hasEmail ? 15 : 0) + (hasPhone ? 10 : 0)
      + Object.values(sections).filter(Boolean).length * 10
      + (bullets >= 3 ? 10 : bullets > 0 ? 5 : 0)
      + (metrics >= 3 ? 15 : metrics > 0 ? 8 : 0)
      + (words >= 250 && words <= 900 ? 10 : words >= 120 ? 5 : 0);
    const formatting_score = Math.min(100, fmt);

    const ats_score = Math.max(5, Math.min(98, Math.round(coverage * 0.55 + keyword_density * 0.25 + formatting_score * 0.2)));

    const strengths = [];
    if (matched.length) strengths.push(`Covers ${matched.length} of ${required.length} key requirements from the job description (${matched.slice(0, 4).join(', ')}${matched.length > 4 ? '…' : ''}).`);
    if (metrics >= 3) strengths.push(`Uses quantified results (${metrics} metrics found) — recruiters and ATS rank measurable impact higher.`);
    if (verbs >= 4) strengths.push(`Strong action-verb language (${verbs} verbs such as "built", "led", "improved") keeps bullets impact-focused.`);
    if (Object.values(sections).filter(Boolean).length >= 3) strengths.push('Standard section headings (Experience, Education, Skills) are present, so ATS parsers can classify content.');
    if (hasLinks) strengths.push('Includes LinkedIn/GitHub links, which supports credibility for technical roles.');
    if (hasEmail && hasPhone) strengths.push('Complete contact details (email and phone) are easy for ATS to extract.');
    while (strengths.length < 4) strengths.push(['Resume length is in a readable range for recruiters.', 'Clear, plain-text structure is ATS-friendly.', 'Relevant technical vocabulary appears throughout.', 'Content is organized for quick scanning.'][strengths.length % 4]);

    const improvements = [];
    if (missing.length) improvements.push(`Add evidence for missing requirements: ${missing.slice(0, 4).join(', ')} — only if you genuinely have the experience (projects count).`);
    if (partial.length) improvements.push(`Make related skills explicit: the JD asks for ${partial.slice(0, 3).join(', ')}; name them directly where you used something similar.`);
    if (metrics < 3) improvements.push('Quantify results: add numbers (%, users, time saved, scale) to at least 3–5 bullets.');
    if (verbs < 4) improvements.push('Start bullets with strong action verbs (Built, Reduced, Led, Automated) instead of "responsible for".');
    if (!sections.projects) improvements.push('Add a Projects section with tech stack and outcome — valuable for early-career profiles.');
    if (!sections.skills) improvements.push('Add a dedicated Skills section so ATS can match keywords quickly.');
    if (keyword_density < 50) improvements.push('Mirror more of the job description\'s exact terminology where it truthfully applies.');
    if (words > 900) improvements.push('Trim to 1–2 pages; very long resumes dilute keyword relevance.');
    if (!hasLinks) improvements.push('Add LinkedIn and GitHub links in the header.');
    while (improvements.length < 4) improvements.push('Tailor the summary line to the exact job title in the posting.');

    const suggestions = [];
    [...missing, ...partial].forEach((s) => {
      const info = SKILL_INFO[s];
      if (suggestions.length >= 4) return;
      if (info && info.ru) {
        suggestions.push({
          title: `Learn ${s}`,
          body: `${s} appears in the job description${partial.includes(s) ? ' and you have related experience to build on' : ' but not on your resume'}. Build one small project with it and list it under Projects with a measurable outcome.`,
          resource_name: info.rn, resource_url: info.ru,
        });
      }
    });
    if (suggestions.length < 4 && metrics < 3) suggestions.push({ title: 'Quantify your achievements', body: 'Rewrite your top bullets as "Action + what + measurable result" (for example: "Cut page load time by 40% by lazy-loading images").', resource_name: '', resource_url: '' });
    if (suggestions.length < 4) suggestions.push({ title: 'Practice interview fundamentals', body: 'Pair resume updates with data-structures practice and mock interviews so the keywords you add are backed by confident answers.', resource_name: 'NeetCode Roadmap', resource_url: 'https://neetcode.io/roadmap' });

    return {
      ats_score, matched_skills: matched, missing_skills: missing, partial_skills: partial,
      strengths: strengths.slice(0, 4), improvements: improvements.slice(0, 4),
      suggestions: suggestions.slice(0, 4), keyword_density, formatting_score, _source: 'offline',
    };
  }

  // ═════════════ OFFLINE BUILDER ═════════════
  const DATE_RX = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(19|20)\d{2}\s*(?:[-–—to]+\s*(?:present|current|now|((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(19|20)\d{2}))?/i;

  function guessTitle(jd, skills) {
    const first = (jd.split(/\r?\n/).find((l) => l.trim()) || '').trim();
    if (first && first.length <= 70 && /(developer|engineer|analyst|designer|manager|scientist|architect|intern|consultant|specialist|administrator)/i.test(first)) {
      return first.replace(/^(job title|position|role)\s*[:\-]\s*/i, '').replace(/\s*[\(\-–|].*$/, '').trim();
    }
    const m = jd.match(/((?:senior|junior|lead|staff|full[\s-]?stack|front[\s-]?end|back[\s-]?end|software|web|data|mern|react|node\.?js|python|java|devops|cloud|machine learning|ml|ai)\s+){0,3}(developer|engineer|analyst|designer|scientist|architect)/i);
    if (m) return m[0].replace(/\b\w/g, (c) => c.toUpperCase());
    if (skills.some((s) => /react|node|mongo|express/i.test(s))) return 'Full-Stack Developer';
    return 'Software Developer';
  }

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const stripBullet = (s) => s.replace(/^\s*[•\-*▪●–]+\s*/, '').trim();

  function parseExperience(text) {
    const blocks = text.split(/\n\s*\n/).map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean)).filter((b) => b.length);
    if (!blocks.length) return [];
    // single paragraph with no structure → one entry with sentence bullets
    if (blocks.length === 1 && blocks[0].length === 1 && !DATE_RX.test(blocks[0][0])) {
      const sents = blocks[0][0].split(/(?<=[.!?])\s+/).map(stripBullet).filter(Boolean);
      return [{ company: '', role: 'Professional Experience', dates: '', bullets: sents.map(cap) }];
    }
    return blocks.map((b) => {
      const head = b[0];
      const dm = head.match(DATE_RX);
      const dates = dm ? dm[0].trim() : '';
      let rest = dm ? head.replace(dm[0], '') : head;
      rest = rest.replace(/[()\[\]|,;]+\s*$/g, '').replace(/^\s*[()\[\]|,;]+/g, '').trim();
      let role = rest, company = '';
      const sp = rest.split(/\s+(?:—|–|\||@|at)\s+|\s+-\s+|,\s+/i);
      if (sp.length >= 2) { role = sp[0].trim(); company = sp.slice(1).join(', ').replace(/[()]+/g, '').trim(); }
      const bullets = b.slice(1).map(stripBullet).filter(Boolean).map(cap);
      return { company, role: role || 'Role', dates, bullets };
    });
  }

  function parseEducation(text) {
    return text.split(/\n|\s\|\s/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const dm = l.match(DATE_RX);
      const dates = dm ? dm[0].trim() : '';
      let rest = (dm ? l.replace(dm[0], '') : l).replace(/[()\[\]|,;—–-]+\s*$/g, '').trim();
      const gm = rest.match(/(?:cgpa|gpa)\s*[:\-]?\s*([\d.]+(?:\s*\/\s*[\d.]+)?)/i);
      let gpa = '';
      if (gm) { gpa = gm[1]; rest = rest.replace(gm[0], '').replace(/[,;(\s]+$/g, ''); }
      const sp = rest.split(/\s+(?:—|–|\|)\s+|,\s+|\s+-\s+/);
      return { degree: sp[0] || rest, institution: sp.slice(1).join(', '), dates, ...(gpa ? { gpa } : {}) };
    });
  }

  function localBuild({ contact, skills, experience, education, jobDesc, template }) {
    const jdSkills = findSkills(jobDesc);
    const ordered = [...skills].sort((a, b) => (jdSkills.includes(canon(b)) ? 1 : 0) - (jdSkills.includes(canon(a)) ? 1 : 0));
    const hit = ordered.filter((s) => jdSkills.includes(canon(s)));
    const title = guessTitle(jobDesc, skills);
    const lead = (hit.length ? hit : ordered).slice(0, 4);
    const joined = lead.length > 1 ? lead.slice(0, -1).join(', ') + ' and ' + lead[lead.length - 1] : lead[0] || 'modern web technologies';
    const summary = `${title} with hands-on experience in ${joined}. Focused on building reliable, maintainable software and delivering measurable results${hit.length ? `, with skills aligned to this role's core requirements (${hit.slice(0, 3).join(', ')})` : ''}.`;
    return {
      name: contact.name, title,
      contact: { email: contact.email, phone: contact.phone, location: contact.location, linkedin: contact.linkedin, github: contact.github },
      summary,
      experience: parseExperience(experience || ''),
      education: parseEducation(education || ''),
      skills: ordered, certifications: [], template, _source: 'offline',
    };
  }

  // ═════════════ RESULT NORMALIZERS (guard against malformed AI output) ═════════════
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined) : []);
  const num = (v, d = 0) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : d; };
  const strs = (v) => arr(v).map((x) => String(x)).filter(Boolean);

  function normalizeAnalysis(o) {
    if (!o || typeof o !== 'object') return null;
    return {
      ats_score: num(o.ats_score), keyword_density: num(o.keyword_density), formatting_score: num(o.formatting_score),
      matched_skills: strs(o.matched_skills), missing_skills: strs(o.missing_skills), partial_skills: strs(o.partial_skills),
      strengths: strs(o.strengths), improvements: strs(o.improvements),
      suggestions: arr(o.suggestions).map((s) => ({
        title: String(s?.title || 'Suggestion'), body: String(s?.body || ''),
        resource_name: String(s?.resource_name || ''),
        resource_url: /^https?:\/\//i.test(s?.resource_url || '') ? s.resource_url : '',
      })),
      _source: 'ai',
    };
  }

  function normalizeResume(o, fallbackContact, template) {
    if (!o || typeof o !== 'object' || !o.name) return null;
    return {
      name: String(o.name), title: String(o.title || ''),
      contact: { ...fallbackContact, ...(o.contact || {}) },
      summary: String(o.summary || ''),
      experience: arr(o.experience).map((e) => ({ company: String(e?.company || ''), role: String(e?.role || ''), dates: String(e?.dates || ''), location: String(e?.location || ''), bullets: strs(e?.bullets) })),
      education: arr(o.education).map((e) => ({ institution: String(e?.institution || ''), degree: String(e?.degree || ''), dates: String(e?.dates || ''), gpa: e?.gpa ? String(e.gpa) : '' })),
      skills: strs(o.skills), certifications: strs(o.certifications), template, _source: 'ai',
    };
  }

  // plain-text version of a resume (ATS-safe download)
  function resumeToText(r) {
    const L = [];
    L.push(r.name.toUpperCase());
    if (r.title) L.push(r.title);
    L.push([r.contact?.email, r.contact?.phone, r.contact?.location, r.contact?.linkedin, r.contact?.github].filter(Boolean).join(' | '));
    if (r.summary) L.push('', 'PROFESSIONAL SUMMARY', r.summary);
    if (r.experience?.length) {
      L.push('', 'WORK EXPERIENCE');
      r.experience.forEach((e) => {
        L.push([e.role, e.company].filter(Boolean).join(' — ') + (e.dates ? `  (${e.dates})` : ''));
        (e.bullets || []).forEach((b) => L.push('• ' + b));
        L.push('');
      });
    }
    if (r.education?.length) {
      L.push('EDUCATION');
      r.education.forEach((e) => L.push([e.degree, e.institution].filter(Boolean).join(', ') + (e.dates ? `  (${e.dates})` : '') + (e.gpa ? ` — GPA: ${e.gpa}` : '')));
      L.push('');
    }
    if (r.skills?.length) L.push('TECHNICAL SKILLS', r.skills.join(', '), '');
    if (r.certifications?.length) L.push('CERTIFICATIONS', ...r.certifications.map((c) => '• ' + c));
    return L.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  global.Engine = {
    API, store, hashPassword, extractJSON, findSkills, localAnalyze, localBuild,
    normalizeAnalysis, normalizeResume, resumeToText, QUICK_SKILLS_CANON: SK.map((s) => s[0]),
  };
})(window);
