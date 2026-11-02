/* ResumeAI Studio — Main Application (React + Babel, no build step) */
const { useState, useEffect, useRef, useCallback } = React;

// ═══════════════════════════════════════════════════════
// CONSTANTS & DATA
// ═══════════════════════════════════════════════════════

const TEMPLATES = [
  { id: 'classic',   label: 'Classic',   primary: '#4a6cf7', secondary: '#1a1a2e', accent: '#4a6cf7', bg: '#ffffff', sectionColor: '#4a6cf7', font: 'Georgia, serif' },
  { id: 'minimal',   label: 'Minimal',   primary: '#1a1a2e', secondary: '#333',    accent: '#444',    bg: '#fafafa', sectionColor: '#999',    font: "'DM Sans', sans-serif" },
  { id: 'modern',    label: 'Modern',    primary: '#6c3fc5', secondary: '#1a0a2e', accent: '#a855f7', bg: '#ffffff', sectionColor: '#a855f7', font: "'DM Sans', sans-serif" },
  { id: 'executive', label: 'Executive', primary: '#1e3a5f', secondary: '#c0a060', accent: '#1e3a5f', bg: '#fffff8', sectionColor: '#c0a060', font: 'Georgia, serif' },
  { id: 'creative',  label: 'Creative',  primary: '#e11d48', secondary: '#1a1a2e', accent: '#e11d48', bg: '#ffffff', sectionColor: '#e11d48', font: "'DM Sans', sans-serif" },
  { id: 'technical', label: 'Technical', primary: '#059669', secondary: '#022c22', accent: '#059669', bg: '#f8fffe', sectionColor: '#059669', font: "'DM Sans', sans-serif" },
  { id: 'harvard', label: 'Harvard Classic', primary: '#202020', secondary: '#202020', accent: '#333333', bg: '#ffffff', sectionColor: '#333333', font: "Arial, sans-serif" },
  { id: 'ats-modern', label: 'ATS Modern', primary: '#17365d', secondary: '#17365d', accent: '#2f5597', bg: '#ffffff', sectionColor: '#2f5597', font: "Arial, sans-serif" },
  { id: 'swiss', label: 'Swiss Minimal', primary: '#222222', secondary: '#222222', accent: '#555555', bg: '#ffffff', sectionColor: '#777777', font: "Arial, sans-serif" },
  { id: 'compact', label: 'Compact One-Page', primary: '#16324f', secondary: '#16324f', accent: '#286090', bg: '#ffffff', sectionColor: '#286090', font: "Arial, sans-serif" },
];

const QUICK_SKILLS = [
  'Python','JavaScript','TypeScript','React','Node.js','SQL','AWS',
  'Docker','Kubernetes','Machine Learning','Data Analysis','Figma',
  'Java','Go','REST APIs','GraphQL','TensorFlow','Agile/Scrum',
  'Git','CI/CD','Excel','Power BI','Project Management',
];

const { API, store, extractJSON, localAnalyze, localBuild, normalizeAnalysis, normalizeResume, resumeToText, hashPassword } = Engine;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const initialsOf = (name) => name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
const tmplLabel = (id) => TEMPLATES.find(t => t.id === id)?.label || 'Classic';

function downloadFile(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Opens a clean print window using the app stylesheet → "Save as PDF" in the print dialog
function printResume(resume) {
  const el = document.querySelector('.resume-doc');
  if (!el) return false;
  const win = window.open('', '_blank');
  if (!win) return false;
  const css = new URL('src/styles.css', document.baseURI).href;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${(resume?.name || 'Resume').replace(/[<>&]/g, '')} - Resume</title>
<link rel="stylesheet" href="${css}"/>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
</head><body class="print-page">${el.outerHTML}</body></html>`);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 300);
  setTimeout(() => { try { win.print(); } catch (e) {} }, 1500);
  return true;
}

// ── Demo data for quick presentations ──
const SAMPLE_BUILDER = {
  contact: { name: 'Alex Johnson', email: 'alex.johnson@email.com', phone: '+1 555-010-4477', location: 'Austin, TX', linkedin: 'linkedin.com/in/alexjohnson', github: 'github.com/alexjohnson' },
  experience: `Full-Stack Developer — BrightApps Inc. (Jun 2023 – Present)
Built React dashboards used by 3,000+ customers
Developed REST APIs with Node.js and Express backed by MongoDB
Reduced page load time by 35% through code splitting and caching

Software Intern — CloudNest (Jan 2023 – May 2023)
Wrote unit tests with Jest covering 80% of core modules
Collaborated in an Agile team using Git and GitHub pull requests`,
  education: 'B.S. Computer Science, University of Texas at Austin — 2019–2023, GPA 3.7',
  skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'REST APIs', 'Git'],
  jobDesc: `Full-Stack Developer
We are looking for a Full-Stack Developer to build scalable web applications.
Requirements:
- 2+ years with React, TypeScript and Node.js
- Experience designing REST APIs and working with MongoDB or SQL databases
- Familiarity with Docker and CI/CD pipelines (GitHub Actions)
- Experience with AWS and unit testing (Jest)
- Comfortable working in an Agile team with strong communication skills`,
};

const SAMPLE_RESUME = `Alex Johnson | alex.johnson@email.com | +1 555-010-4477 | Austin, TX
linkedin.com/in/alexjohnson | github.com/alexjohnson

SUMMARY
Full-stack developer with 2 years of experience building React and Node.js applications.

EXPERIENCE
Full-Stack Developer — BrightApps Inc. (Jun 2023 – Present)
• Built React dashboards used by 3,000+ customers
• Developed REST APIs with Node.js and Express backed by MongoDB
• Reduced page load time by 35% through code splitting and caching

Software Intern — CloudNest (Jan 2023 – May 2023)
• Wrote unit tests with Jest covering 80% of core modules
• Collaborated in an Agile team using Git and GitHub pull requests

PROJECTS
• Task Tracker — MERN app with JWT auth, 500+ active users

EDUCATION
B.S. Computer Science, University of Texas at Austin — 2019–2023

SKILLS
JavaScript, React, Node.js, Express, MongoDB, REST APIs, Git, Jest, Agile`;

// ═══════════════════════════════════════════════════════
// TOAST NOTIFICATION
// ═══════════════════════════════════════════════════════

function Toast({ message, icon = '✅', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="toast">
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TEMPLATE PREVIEW THUMBNAIL
// ═══════════════════════════════════════════════════════

function TemplateThumbnail({ t, selected, onClick }) {
  const c = t.accent;
  return (
    <div
      className={`template-thumb${selected ? ' selected' : ''}`}
      onClick={onClick}
      title={t.label}
    >
      <div className="tmpl-preview" style={{ background: t.bg }}>
        {/* header bar */}
        <div style={{ width: '100%', height: '20px', background: c, borderRadius: '2px', marginBottom: '6px' }} />
        {/* name line */}
        <div style={{ height: '4px', width: '55%', background: t.primary, borderRadius: '2px', marginBottom: '3px', opacity: .9 }} />
        <div style={{ height: '2px', width: '40%', background: c, borderRadius: '2px', marginBottom: '8px', opacity: .5 }} />
        {/* sections */}
        {[38, 28, 45, 33].map((w, i) => (
          <div key={i} style={{ marginBottom: '5px' }}>
            <div style={{ height: '2px', width: '25%', background: c, borderRadius: '1px', marginBottom: '3px', opacity: .8 }} />
            <div style={{ height: '2px', width: `${w}%`, background: t.primary, borderRadius: '1px', opacity: .25, marginBottom: '2px' }} />
            <div style={{ height: '2px', width: `${w + 10}%`, background: t.primary, borderRadius: '1px', opacity: .15 }} />
          </div>
        ))}
      </div>
      <div className="template-label">{t.label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════════════

function AuthScreen({ onLogin, theme, onToggleTheme }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    const email = form.email.trim().toLowerCase();
    if (!email || !form.password) { setErr('Please fill all required fields.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr('Please enter a valid email address.'); return; }
    if (tab === 'signup' && !form.name.trim()) { setErr('Please enter your full name.'); return; }
    if (tab === 'signup' && form.password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    setLoading(true); setErr('');
    await sleep(400);
    const users = store.get('ra_users', {});
    const hash = await hashPassword(email, form.password);
    if (tab === 'signup') {
      if (users[email]) { setErr('An account with this email already exists. Please sign in.'); setLoading(false); return; }
      users[email] = { name: form.name.trim(), hash };
      store.set('ra_users', users);
      onLogin({ name: form.name.trim(), email, initials: initialsOf(form.name) });
    } else {
      const u = users[email];
      if (!u) { setErr('No account found for this email. Create one first.'); setLoading(false); return; }
      if (u.hash !== hash) { setErr('Incorrect password.'); setLoading(false); return; }
      onLogin({ name: u.name, email, initials: initialsOf(u.name) });
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter') submit(); };
  const demo = () => onLogin({ name: 'Demo User', email: 'demo@resumeai.app', initials: 'DU' });

  return (
    <div className="auth-wrap">
      <button className="theme-toggle auth-theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
        <svg className="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.2 15.6A8.5 8.5 0 0 1 8.4 3.8 8.7 8.7 0 1 0 20.2 15.6Z" /></svg><span className="theme-toggle-text">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
      </button>
      <div className="auth-bg" />
      <div className="auth-card fade-in">
        <div className="auth-logo">Resume<span>AI</span></div>
        <div className="auth-tagline">
          Your intelligent career toolkit — build ATS-ready resumes<br/>and get AI-powered gap analysis in seconds.
        </div>
        <div className="auth-features">
          {['✨ AI Resume Builder', '🔍 Resume Analyzer', '📊 Gap Analysis', '🎨 10 Templates'].map(f => (
            <span key={f} className="auth-feature-chip">{f}</span>
          ))}
        </div>
        <div className="auth-tabs">
          <div className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setErr(''); }}>Sign In</div>
          <div className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => { setTab('signup'); setErr(''); }}>Create Account</div>
        </div>
        {tab === 'signup' && (
          <div className="field-group">
            <label className="field-label">Full Name</label>
            <input className="field-input" placeholder="Alex Johnson" value={form.name} onChange={f('name')} onKeyDown={handleKey} />
          </div>
        )}
        <div className="field-group">
          <label className="field-label">Email</label>
          <input className="field-input" placeholder="you@email.com" type="email" value={form.email} onChange={f('email')} onKeyDown={handleKey} />
        </div>
        <div className="field-group">
          <label className="field-label">Password</label>
          <input className="field-input" type="password" placeholder="••••••••" value={form.password} onChange={f('password')} onKeyDown={handleKey} />
        </div>
        {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: '1rem' }}>{err}</div>}
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Authenticating…' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>
        <button className="btn-ghost" style={{ width: '100%', marginTop: '.6rem' }} onClick={demo}>
          🚀 Continue as Demo User
        </button>
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 12, color: 'var(--text3)' }}>
          {tab === 'login'
            ? <span>No account? <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setTab('signup')}>Sign up free</span></span>
            : <span>Have an account? <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setTab('login')}>Sign in</span></span>
          }
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: 11, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          🔒 Accounts and resumes are stored only in this browser (passwords are hashed). Your API key never leaves the server.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RESUME DOCUMENT RENDERER
// ═══════════════════════════════════════════════════════

function ResumeDoc({ resume }) {
  if (!resume) return null;
  const tmpl = TEMPLATES.find(t => t.id === resume.template) || TEMPLATES[0];

  const sectionTitleStyle = {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.1em',
    borderBottom: `1.5px solid ${tmpl.sectionColor}`,
    paddingBottom: '3px',
    marginBottom: '7px',
    color: tmpl.primary,
    fontFamily: tmpl.font,
  };

  return (
    <div className="resume-doc" style={{ background: tmpl.bg }}>
      {/* Header */}
      <div className="resume-header" style={{ borderBottom: `3px solid ${tmpl.accent}`, paddingBottom: '10px', marginBottom: '12px' }}>
        <div className="resume-name" style={{ color: tmpl.primary, fontFamily: tmpl.font }}>{resume.name}</div>
        <div className="resume-title-line" style={{ color: tmpl.accent }}>{resume.title}</div>
        <div className="resume-contact-line" style={{ color: '#555' }}>
          {[resume.contact?.email, resume.contact?.phone, resume.contact?.location, resume.contact?.linkedin, resume.contact?.github]
            .filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Summary */}
      {resume.summary && (
        <div className="resume-section">
          <div className="resume-section-title" style={sectionTitleStyle}>Professional Summary</div>
          <div style={{ fontSize: 11, color: '#333', lineHeight: 1.65 }}>{resume.summary}</div>
        </div>
      )}

      {/* Experience */}
      {resume.experience?.length > 0 && (
        <div className="resume-section">
          <div className="resume-section-title" style={sectionTitleStyle}>Work Experience</div>
          {resume.experience.map((exp, i) => (
            <div key={i} className="resume-item">
              <div className="resume-item-header">
                <span className="resume-item-title" style={{ color: tmpl.primary }}>{exp.role}</span>
                <span className="resume-item-date">{exp.dates}</span>
              </div>
              {(exp.company || exp.location) && <div className="resume-item-sub">{[exp.company, exp.location].filter(Boolean).join(' · ')}</div>}
              {exp.bullets?.map((b, j) => <div key={j} className="resume-bullet">{b}</div>)}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {resume.education?.length > 0 && (
        <div className="resume-section">
          <div className="resume-section-title" style={sectionTitleStyle}>Education</div>
          {resume.education.map((edu, i) => (
            <div key={i} className="resume-item">
              <div className="resume-item-header">
                <span className="resume-item-title" style={{ color: tmpl.primary }}>{edu.degree}</span>
                <span className="resume-item-date">{edu.dates}</span>
              </div>
              {edu.institution && <div className="resume-item-sub">{edu.institution}</div>}
              {edu.gpa && <div style={{ fontSize: 10, color: '#666' }}>GPA: {edu.gpa}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {resume.skills?.length > 0 && (
        <div className="resume-section">
          <div className="resume-section-title" style={sectionTitleStyle}>Technical Skills</div>
          <div className="resume-skills-wrap">
            {resume.skills.map((s, i) => (
              <span key={i} className="resume-skill-chip" style={{ background: tmpl.accent + '18', color: tmpl.accent, border: `1px solid ${tmpl.accent}33` }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {resume.certifications?.filter(Boolean).length > 0 && (
        <div className="resume-section">
          <div className="resume-section-title" style={sectionTitleStyle}>Certifications</div>
          {resume.certifications.filter(Boolean).map((c, i) => (
            <div key={i} className="resume-bullet">{c}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RESUME BUILDER TAB
// ═══════════════════════════════════════════════════════

function BuilderTab({ user, onSave, onToast }) {
  const [step, setStep] = useState(1);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [contact, setContact] = useState({
    name: user.name, email: user.email, phone: '', location: '', linkedin: '', github: ''
  });
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [template, setTemplate] = useState('classic');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadMsg, setLoadMsg] = useState('');
  const [resume, setResume] = useState(null);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput('');
  };
  const removeSkill = (s) => setSkills(skills.filter(x => x !== s));

  const loadDemo = () => {
    setContact(SAMPLE_BUILDER.contact);
    setExperience(SAMPLE_BUILDER.experience);
    setEducation(SAMPLE_BUILDER.education);
    setSkills(SAMPLE_BUILDER.skills);
    setJobDesc(SAMPLE_BUILDER.jobDesc);
    onToast('Demo data loaded — continue through the steps', '🧪');
  };

  const generate = async () => {
    if (!jobDesc.trim() || skills.length < 1) {
      onToast('Add at least one skill and paste a job description first.', '⚠️');
      return;
    }
    setLoading(true); setProgress(10);
    setLoadMsg('Parsing job description…');
    await sleep(500);
    setProgress(35); setLoadMsg('Identifying ATS keywords…');
    await sleep(400);
    setProgress(60); setLoadMsg('Crafting your resume…');

    const contactOut = { email: contact.email, phone: contact.phone, location: contact.location, linkedin: contact.linkedin, github: contact.github };

    const systemPrompt = `You are an expert resume writer specializing in ATS-optimized resumes. Return ONLY valid JSON — no markdown, no code fences, no commentary — in exactly this structure:
{"name":"string","title":"string","contact":{"email":"","phone":"","location":"","linkedin":"","github":""},"summary":"2-3 sentence professional summary","experience":[{"company":"string","role":"string","dates":"string","location":"string","bullets":["string"]}],"education":[{"institution":"string","degree":"string","dates":"string","gpa":"string or empty"}],"skills":["string"],"certifications":["string"]}
STRICT TRUTHFULNESS RULES: Use ONLY facts the candidate provided. Never invent employers, job titles, dates, degrees, certifications, or numeric metrics. If a detail was not provided, leave it empty or omit it. You MAY rewrite the candidate's own statements with strong action verbs, reorder content, and weave in relevant keywords from the job description where they truthfully apply. Only include numbers the candidate supplied. Set "title" to the target role from the job description. Order skills so those matching the job description come first.`;

    const userMsg = `CANDIDATE
Name: ${contact.name}
Email: ${contact.email}
Phone: ${contact.phone}
Location: ${contact.location}
LinkedIn: ${contact.linkedin}
GitHub: ${contact.github}
Skills: ${skills.join(', ')}
Work experience (as provided by candidate):
${experience || '(none provided)'}
Education (as provided by candidate):
${education || '(none provided)'}

TARGET JOB DESCRIPTION:
${jobDesc.slice(0, 3500)}

Generate the ATS-optimized resume JSON now.`;

    const raw = await API.ask(systemPrompt, userMsg, 3500);
    let result = normalizeResume(extractJSON(raw), contactOut, template);
    const usedAI = !!result;
    if (result) {
      result.name = contact.name || result.name;
    } else {
      result = localBuild({ contact: { name: contact.name, ...contactOut }, skills, experience, education, jobDesc, template });
    }

    setProgress(95); setLoadMsg('Applying template…');
    await sleep(300);
    setProgress(100);
    setResume(result);
    setLoading(false);
    setStep(4);
    if (!usedAI) onToast('Built with the offline engine (live AI not configured)', 'ℹ️');
  };

  const [optimizing, setOptimizing] = useState(false);
  const [optimizationStatus, setOptimizationStatus] = useState('');
  const [optimizationScore, setOptimizationScore] = useState(null);

  const optimizeBeforeDownload = async () => {
    if (!resume) return;
    if (!jobDesc.trim()) { onToast('Add a target job description before ATS optimization.', '⚠️'); return; }
    setOptimizing(true);
    try {
      let best = resume;
      let bestScore = localAnalyze(resumeToText(resume), jobDesc).ats_score;
      setOptimizationStatus(`Initial ATS match: ${bestScore}/100`);
      for (let round = 1; round <= 3; round++) {
        setOptimizationStatus(`AI review ${round}/3 — improving keyword alignment and clarity…`);
        const system = `You are an ATS resume optimization agent. Return ONLY valid JSON matching this schema: {"name":"","title":"","contact":{"email":"","phone":"","location":"","linkedin":"","github":""},"summary":"","experience":[{"company":"","role":"","dates":"","location":"","bullets":[]}],"education":[{"institution":"","degree":"","dates":"","gpa":""}],"skills":[],"certifications":[]}. Preserve every factual detail. Never invent or infer employers, dates, degrees, certifications, tools, achievements, numbers or responsibilities. Improve section labels, clarity, concise action-led bullets, and truthful keyword alignment to the job description. Keep a simple single-column ATS-friendly structure.`;
        const raw = await API.ask(system, `CURRENT RESUME:\n${resumeToText(best)}\n\nTARGET JOB:\n${jobDesc.slice(0,3500)}\n\nImprove this resume without adding facts. Return JSON only.`, 3500);
        const candidate = normalizeResume(extractJSON(raw), { email: best.contact?.email || '', phone: best.contact?.phone || '', location: best.contact?.location || '', linkedin: best.contact?.linkedin || '', github: best.contact?.github || '' }, best.template || template);
        if (!candidate) {
          if (round === 1) setOptimizationStatus('Live AI is not configured; keeping your current resume and showing its offline ATS score.');
          break;
        }
        candidate.name = best.name;
        candidate.template = best.template || template;
        const score = localAnalyze(resumeToText(candidate), jobDesc).ats_score;
        if (score > bestScore) { best = candidate; bestScore = score; }
        setOptimizationStatus(`Pass ${round}/3 complete — best ATS match: ${bestScore}/100`);
      }
      setResume(best);
      setOptimizationScore(bestScore);
      setOptimizationStatus(`Finished. Best measured match: ${bestScore}/100`);
      onToast('Final ATS review complete. Best version retained.', '✨');
    } catch (err) {
      setOptimizationStatus('Optimization could not complete. Your original resume is unchanged.');
      onToast('AI optimization failed; original resume preserved.', '⚠️');
    } finally { setOptimizing(false); }
  };

  const handleSave = () => {
    onSave({ ...resume, savedAt: new Date().toLocaleDateString() });
    onToast('Resume saved to your profile!');
  };

  const handlePrint = () => {
    if (!printResume(resume)) onToast('Allow pop-ups to print or export PDF.', '⚠️');
  };

  const handleTxt = () => {
    downloadFile(`${(resume.name || 'resume').replace(/\s+/g, '_')}_resume.txt`, resumeToText(resume));
    onToast('Plain-text (ATS-safe) resume downloaded!', '📥');
  };

  return (
    <div className="fade-in">
      <div className="page-title">Resume Builder</div>
      <div className="page-sub">Create an ATS-optimized resume tailored to your exact target role</div>

      {/* Steps */}
      <div className="steps">
        {['Your Info', 'Skills & JD', 'Template', 'Result'].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`step${step === i + 1 ? ' active' : step > i + 1 ? ' done' : ''}`} style={{ cursor: step > i + 1 ? 'pointer' : 'default' }} onClick={() => { if (step > i + 1) setStep(i + 1); }}>
              <div className="step-num">{step > i + 1 ? '✓' : i + 1}</div>
              <span style={{ fontSize: 12 }}>{s}</span>
            </div>
            {i < 3 && <div className="step-line" />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1: Contact Info */}
      {step === 1 && (
        <div className="panel fade-in" style={{ maxWidth: 640 }}>
          <div className="panel-title">📋 Contact Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            {[
              ['name', 'Full Name', 'Alex Johnson'],
              ['email', 'Email', 'alex@email.com'],
              ['phone', 'Phone', '+1 555-000-1234'],
              ['location', 'Location', 'City, State'],
              ['linkedin', 'LinkedIn URL', 'linkedin.com/in/yourname'],
              ['github', 'GitHub (optional)', 'github.com/yourhandle'],
            ].map(([k, label, ph]) => (
              <div key={k} className="field-group" style={{ margin: 0 }}>
                <label className="field-label">{label}</label>
                <input className="field-input" placeholder={ph} value={contact[k]} onChange={e => setContact({ ...contact, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="field-group" style={{ marginTop: '.75rem' }}>
            <label className="field-label">Work Experience Summary</label>
            <textarea className="field-textarea" rows={3} placeholder="Describe your work history, key roles, and notable achievements. The AI will use this to generate realistic experience bullets…" value={experience} onChange={e => setExperience(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Education</label>
            <textarea className="field-textarea" rows={2} placeholder="e.g. B.S. Computer Science, MIT — 2018–2022 | M.S. Data Science, Stanford — 2022–2024" value={education} onChange={e => setEducation(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
            <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setStep(2)} disabled={!contact.name.trim()}>
              Next: Skills & Job Description →
            </button>
            <button className="btn-ghost" onClick={loadDemo}>🧪 Fill demo data</button>
          </div>
        </div>
      )}

      {/* STEP 2: Skills & JD */}
      {step === 2 && (
        <div className="builder-layout fade-in">
          <div>
            <div className="panel" style={{ marginBottom: '1rem' }}>
              <div className="panel-title">⚡ Your Skills</div>
              <div className="skills-wrap">
                {skills.map(s => (
                  <span key={s} className="skill-tag">
                    {s}
                    <button className="skill-tag-remove" onClick={() => removeSkill(s)}>×</button>
                  </span>
                ))}
                {skills.length === 0 && <span style={{ color: 'var(--text3)', fontSize: 12, padding: '4px' }}>Add your skills below…</span>}
              </div>
              <div className="skill-input-row">
                <input
                  className="field-input" style={{ flex: 1 }}
                  placeholder="Type a skill and press Enter or Add…"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSkill()}
                />
                <button className="btn-accent-outline" onClick={addSkill}>Add</button>
              </div>
              <div style={{ marginTop: '.75rem' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: '.4rem' }}>Quick add popular skills:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                  {QUICK_SKILLS.map(s => (
                    <span key={s} className="quick-chip" onClick={() => { if (!skills.includes(s)) setSkills([...skills, s]); }}>
                      {skills.includes(s) ? '✓ ' : '+ '}{s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-accent-outline" onClick={() => setStep(3)} disabled={skills.length === 0 || !jobDesc.trim()}>Next: Choose Template →</button>
            </div>
            {(skills.length === 0 || !jobDesc.trim()) && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: '.5rem' }}>Add skills and paste a job description to continue.</div>}
          </div>

          <div className="panel">
            <div className="panel-title">🎯 Target Job Description</div>
            <textarea
              className="field-textarea" rows={15}
              placeholder="Paste the full job description here. Our AI analyzes every requirement, extracts keywords, and tailors your resume for maximum ATS compatibility and recruiter impact…"
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
            />
            {jobDesc.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: '.35rem' }}>
                {jobDesc.length} chars · ~{jobDesc.split(/\s+/).filter(Boolean).length} words
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Template */}
      {step === 3 && (
        <div className="fade-in" style={{ maxWidth: 700 }}>
          <div className="panel">
            <div className="panel-title">🎨 Choose Your Template</div>
            <div className="template-grid">
              {TEMPLATES.map(t => (
                <TemplateThumbnail key={t.id} t={t} selected={template === t.id} onClick={() => setTemplate(t.id)} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '1.25rem' }}>
              Selected: <strong style={{ color: 'var(--text)' }}>{TEMPLATES.find(t => t.id === template)?.label}</strong>
              {template === 'technical' && ' — Monospaced, great for engineering roles'}
              {template === 'executive' && ' — Traditional serif, ideal for leadership roles'}
              {template === 'creative' && ' — Bold accent, perfect for design/marketing'}
              {template === 'modern' && ' — Purple palette, modern tech companies'}
            </div>
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-primary" style={{ width: 'auto' }} onClick={generate} disabled={loading}>
                {loading ? 'Generating…' : '✨ Generate My Resume →'}
              </button>
            </div>
          </div>
          {loading && (
            <div className="loading-wrap" style={{ marginTop: '1.5rem' }}>
              <div className="spinner" />
              <div className="loading-text">
                {loadMsg}
                <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
              </div>
              <div className="progress-bar" style={{ marginTop: '.5rem' }}>
                <div className="progress-fill" style={{ width: progress + '%' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Result */}
      {step === 4 && resume && (
        <div className="fade-in">
          <div className="result-wrap">
            <div className="section-title">
              ✅ Your ATS-Optimized Resume
              <span className="badge badge-green" style={{ marginLeft: '.5rem' }}>Ready to Download</span>
              <span className="badge badge-blue" style={{ marginLeft: '.35rem' }}>{tmplLabel(resume.template)} Template</span>
              <span className="badge badge-purple" style={{ marginLeft: '.35rem' }}>{resume._source === 'ai' ? 'Written by Claude' : 'Offline engine'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '1rem' }}>
              💡 Single-column, ATS-friendly layout with keywords from the job description. Review every line before sending — make sure all details are accurate.
            </div>
            <ResumeDoc resume={resume} />
            {optimizationStatus && <div className="panel" style={{ margin: '1rem 0', padding: '1rem' }}><strong>ATS Optimization Agent</strong><div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{optimizationStatus}{optimizationScore !== null ? ` · Best score ${optimizationScore}/100` : ''}</div></div>}
            <div className="output-actions">
              <button className="btn-primary" style={{ width: 'auto' }} onClick={optimizeBeforeDownload} disabled={optimizing}>{optimizing ? '⏳ AI reviewing…' : '✨ AI ATS Optimize (up to 3 passes)'}</button>
              <button className="btn-primary" style={{ width: 'auto' }} onClick={handleSave}>💾 Save to Profile</button>
              <button className="btn-accent-outline" onClick={handlePrint}>🖨️ Print / Export PDF</button>
              <button className="btn-accent-outline" onClick={handleTxt}>⬇ Download .txt</button>
              <select className="field-input" style={{ width: 'auto' }} value={resume.template} onChange={e => { setTemplate(e.target.value); setResume({ ...resume, template: e.target.value }); }} aria-label="Switch template">
                {TEMPLATES.map(t => <option key={t.id} value={t.id}>🎨 {t.label}</option>)}
              </select>
              <button className="btn-ghost" onClick={() => { setStep(1); setResume(null); setSkills([]); setJobDesc(''); setExperience(''); setEducation(''); }}>✨ Build Another</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RESUME ANALYZER TAB
// ═══════════════════════════════════════════════════════

function AnalyzerTab({ onToast, onDone }) {
  const [resumeText, setResumeText] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadMsg, setLoadMsg] = useState('');
  const [result, setResult] = useState(null);

  const loadSample = () => {
    setResumeText(SAMPLE_RESUME);
    setJobDesc(SAMPLE_BUILDER.jobDesc);
    onToast('Sample resume and job description loaded', '🧪');
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt','md','text','pdf','docx','png','jpg','jpeg'].includes(ext)) {
      onToast('Supported formats: PDF, DOCX, TXT, PNG, JPG and JPEG.', '⚠️'); return;
    }
    setLoadMsg(`Extracting text from ${file.name}…`); setLoading(true);
    try {
      let text = '';
      if (['txt','md','text'].includes(ext)) text = await file.text();
      else if (ext === 'pdf') {
        if (!window.pdfjsLib) throw new Error('PDF reader failed to load. Check your internet connection.');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const pages = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const content = await page.getTextContent();
          pages.push(content.items.map(x => x.str).join(' '));
        }
        text = pages.join('\n\n');
        if (!text.trim()) {
          if (!window.Tesseract) throw new Error('This scanned PDF needs OCR. Upload a PNG/JPG or enable the OCR library.');
          const ocrPages = [];
          for (let n = 1; n <= pdf.numPages; n++) {
            setLoadMsg(`OCR on scanned PDF page ${n}/${pdf.numPages}…`);
            const page = await pdf.getPage(n);
            const viewport = page.getViewport({ scale: 1.7 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width; canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const result = await window.Tesseract.recognize(canvas, 'eng');
            ocrPages.push(result.data.text || '');
          }
          text = ocrPages.join('\n\n');
        }
      } else if (ext === 'docx') {
        if (!window.mammoth) throw new Error('DOCX reader failed to load. Check your internet connection.');
        text = (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value || '';
      } else {
        if (!window.Tesseract) throw new Error('OCR failed to load. Check your internet connection.');
        const result = await window.Tesseract.recognize(file, 'eng', { logger: m => {
          if (m.status === 'recognizing text') setLoadMsg(`Reading image… ${Math.round((m.progress || 0) * 100)}%`);
        }});
        text = result.data.text || '';
      }
      if (!text.trim()) throw new Error('No readable text was found in this file.');
      setResumeText(text); setResult(null); onToast(`Extracted text from ${file.name}`, '📄');
    } catch (err) { onToast(err.message || 'Could not read this file.', '⚠️'); }
    finally { setLoading(false); setLoadMsg(''); }
  };

  const analyze = async () => {
    if (!resumeText.trim() || !jobDesc.trim()) {
      onToast('Please provide both your resume text and the job description.', '⚠️');
      return;
    }
    setLoading(true); setResult(null); setProgress(10);
    setLoadMsg('Extracting job requirements…');
    await sleep(500);
    setProgress(40); setLoadMsg('Scanning your resume…');
    await sleep(400);
    setProgress(70); setLoadMsg('Identifying skill gaps…');

    const systemPrompt = `You are an expert ATS resume analyst and career coach. Analyze the resume against the job description. Return ONLY valid JSON with no markdown, no code fences, no preamble:
{"ats_score":0-100,"matched_skills":["skill"],"missing_skills":["skill"],"partial_skills":["skill"],"strengths":["..."],"improvements":["..."],"suggestions":[{"title":"string","body":"2-3 sentences","resource_name":"string","resource_url":"https://..."}],"keyword_density":0-100,"formatting_score":0-100}
Rules: base every finding on the actual resume text; do not invent skills the resume lacks. For resource_url use only well-known official documentation or course pages you are certain exist (e.g. official docs sites); if unsure, leave resource_url empty.`;

    const userMsg = `RESUME:\n${resumeText.slice(0, 6000)}\n\nJOB DESCRIPTION:\n${jobDesc.slice(0, 3500)}\n\nProvide: 5-8 matched skills, up to 7 missing skills, up to 3 partial skills, exactly 4 strengths, exactly 4 improvements, and exactly 4 learning suggestions.`;

    const raw = await API.ask(systemPrompt, userMsg, 3000);
    let parsed = normalizeAnalysis(extractJSON(raw));
    const usedAI = !!(parsed && parsed.suggestions.length);
    if (!usedAI) {
      parsed = localAnalyze(resumeText, jobDesc);
      onToast('Analyzed with the offline engine (live AI not configured)', 'ℹ️');
    }

    setProgress(100);
    setResult(parsed);
    setLoading(false);
    onDone && onDone();
  };

  const scoreColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)';
  const scoreLabel = (s) => s >= 80 ? 'Excellent Match' : s >= 65 ? 'Good Match — Some Gaps' : s >= 50 ? 'Moderate Match — Key Skills Missing' : 'Low Match — Significant Gaps';

  const downloadReport = () => {
    const txt = `RESUMEAI — ATS ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}
${'='.repeat(50)}

ATS COMPATIBILITY SCORE: ${result.ats_score}/100 — ${scoreLabel(result.ats_score)}
Keyword Density: ${result.keyword_density}%
Formatting Score: ${result.formatting_score}%

${'─'.repeat(50)}
MATCHED SKILLS (${result.matched_skills?.length})
${'─'.repeat(50)}
${result.matched_skills?.join(', ')}

${'─'.repeat(50)}
MISSING SKILLS (${result.missing_skills?.length})
${'─'.repeat(50)}
${result.missing_skills?.join(', ')}

${'─'.repeat(50)}
STRENGTHS
${'─'.repeat(50)}
${result.strengths?.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${'─'.repeat(50)}
IMPROVEMENT AREAS
${'─'.repeat(50)}
${result.improvements?.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${'─'.repeat(50)}
LEARNING RECOMMENDATIONS
${'─'.repeat(50)}
${result.suggestions?.map((s, i) => `${i + 1}. ${s.title}\n   ${s.body}\n   Resource: ${s.resource_url}`).join('\n\n')}
`;
    const blob = new Blob([txt], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'resume-analysis-report.txt';
    a.click();
    onToast('Report downloaded!', '📥');
  };

  return (
    <div className="fade-in">
      <div className="page-title">Resume Analyzer</div>
      <div className="page-sub">Compare your resume against any job description and get detailed AI-powered feedback</div>

      {!result ? (
        <div className="builder-layout">
          <div className="panel">
            <div className="panel-title">📄 Your Current Resume</div>
            <textarea
              className="field-textarea" rows={17}
              placeholder={`Paste your resume as plain text here…

Example format:
─────────────────────────────
Jane Smith | jane@email.com | (555) 123-4567 | San Francisco, CA
linkedin.com/in/janesmith | github.com/janesmith

EXPERIENCE
Senior Software Engineer — Acme Corp (2021–Present)
• Built microservices architecture handling 2M+ daily requests
• Reduced API response time by 40% via caching strategies
…`}
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
              <label className="btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                📎 Upload Resume
                <input type="file" accept=".pdf,.docx,.txt,.md,.text,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg" onChange={onFile} style={{ display: 'none' }} />
              </label>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>PDF · DOCX · TXT · PNG · JPG</span>
              <button className="btn-ghost btn-sm" onClick={loadSample}>🧪 Load sample</button>
              {resumeText.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                  ~{resumeText.split(/\s+/).filter(Boolean).length} words detected
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="panel" style={{ marginBottom: '1rem' }}>
              <div className="panel-title">🎯 Target Job Description</div>
              <textarea
                className="field-textarea" rows={12}
                placeholder="Paste the full job description you're targeting…"
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
              />
            </div>
            {loading ? (
              <div className="loading-wrap">
                <div className="spinner" />
                <div className="loading-text">
                  {loadMsg}
                  <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
                </div>
                <div className="progress-bar" style={{ marginTop: '.5rem' }}>
                  <div className="progress-fill" style={{ width: progress + '%' }} />
                </div>
              </div>
            ) : (
              <button className="btn-primary" onClick={analyze}>
                🔍 Analyze My Resume →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="fade-in">
          <div style={{ marginBottom: '1rem' }}>
            <span className={`badge ${result._source === 'ai' ? 'badge-purple' : 'badge-blue'}`}>
              {result._source === 'ai' ? 'Analyzed by Claude' : 'Analyzed by offline engine'}
            </span>
          </div>
          {/* Score Cards */}
          <div className="analysis-grid">
            <div className="panel">
              <div className="panel-title">ATS Compatibility</div>
              <div className="match-ring">
                <div style={{ position: 'relative', width: 130, height: 130, marginBottom: '.75rem' }}>
                  <svg width="130" height="130" viewBox="0 0 130 130">
                    <circle cx="65" cy="65" r="55" fill="none" stroke="var(--border)" strokeWidth="10" />
                    <circle cx="65" cy="65" r="55" fill="none"
                      stroke={scoreColor(result.ats_score)} strokeWidth="10"
                      strokeDasharray={`${2 * Math.PI * 55}`}
                      strokeDashoffset={`${2 * Math.PI * 55 * (1 - result.ats_score / 100)}`}
                      strokeLinecap="round" transform="rotate(-90 65 65)"
                      style={{ transition: 'stroke-dashoffset .8s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: 700, color: scoreColor(result.ats_score), lineHeight: 1 }}>{result.ats_score}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>/100</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', textAlign: 'center', fontWeight: 600 }}>
                  {scoreLabel(result.ats_score)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginTop: '.5rem' }}>
                {[['Keyword Match', result.keyword_density], ['Formatting', result.formatting_score]].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: '.2rem' }}>
                      <span style={{ color: 'var(--text2)' }}>{l}</span>
                      <span style={{ color: scoreColor(v), fontWeight: 600 }}>{v}%</span>
                    </div>
                    <div className="score-meter">
                      <div className="score-fill" style={{ width: v + '%', background: scoreColor(v) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Skill Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                {[
                  ['Matched', result.matched_skills?.length || 0, 'var(--green)'],
                  ['Missing', result.missing_skills?.length || 0, 'var(--red)'],
                  ['Partial', result.partial_skills?.length || 0, 'var(--amber)'],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '.75rem .5rem' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: '.15rem' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                {result.matched_skills?.map(s => (
                  <div key={s} className="skill-row">
                    <span className="skill-name">{s}</span>
                    <span className="skill-status skill-present">✓ Present</span>
                  </div>
                ))}
                {result.partial_skills?.map(s => (
                  <div key={s} className="skill-row">
                    <span className="skill-name">{s}</span>
                    <span className="skill-status skill-partial">~ Partial</span>
                  </div>
                ))}
                {result.missing_skills?.map(s => (
                  <div key={s} className="skill-row">
                    <span className="skill-name">{s}</span>
                    <span className="skill-status skill-missing">✗ Missing</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="panel">
              <div className="panel-title" style={{ color: 'var(--green)' }}>💪 Strengths</div>
              {result.strengths?.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', marginBottom: '.65rem' }}>
                  <span style={{ color: 'var(--green)', fontSize: 14, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
            <div className="panel">
              <div className="panel-title" style={{ color: 'var(--amber)' }}>⚡ Improvement Areas</div>
              {result.improvements?.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', marginBottom: '.65rem' }}>
                  <span style={{ color: 'var(--amber)', fontSize: 14, flexShrink: 0 }}>→</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Recommendations */}
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-title">📚 Personalized Learning Recommendations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {result.suggestions?.map((s, i) => (
                <div key={i} className="suggestion-card">
                  <div className="suggestion-icon">{['🚀', '🐳', '☁️', '⚙️', '📊', '🔧'][i] || '💡'}</div>
                  <div>
                    <div className="suggestion-title">{s.title}</div>
                    <div className="suggestion-body">{s.body}</div>
                    {s.resource_url && (
                      <a href={s.resource_url} target="_blank" rel="noopener noreferrer" className="resource-link">
                        📎 {s.resource_name || 'View Resource'} ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setResult(null)}>🔍 Analyze Another</button>
            <button className="btn-accent-outline" onClick={downloadReport}>⬇ Download Report</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PROFILE TAB
// ═══════════════════════════════════════════════════════

const DEFAULT_PREFS = { role: 'Software Engineer', industry: 'Technology', experience: '0–2 years', remote: true, hybrid: false };
const DEFAULT_DATA = { resumes: [], analyses: 0, prefs: DEFAULT_PREFS };

function ProfileTab({ user, data, onSavePrefs, onDelete, onToast }) {
  const [prefs, setPrefs] = useState(data.prefs);
  const [viewing, setViewing] = useState(null);
  const savedResumes = data.resumes;
  const skillCount = new Set(savedResumes.flatMap(r => r.skills || [])).size;

  return (
    <div className="fade-in">
      <div className="page-title">My Profile</div>
      <div className="page-sub">Manage your career preferences and saved resumes</div>
      <div className="profile-grid">
        <div className="profile-sidebar">
          <div className="panel" style={{ textAlign: 'center' }}>
            <div className="avatar-large">{user.initials}</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: '.25rem' }}>{user.email}</div>
            <div className="badge badge-green" style={{ marginTop: '.75rem', display: 'inline-flex' }}>Active Account</div>
          </div>

          <div className="panel">
            <div className="panel-title">🎯 Job Preferences</div>
            {[
              ['Target Role', 'role', 'e.g. Full-Stack Developer'],
              ['Industry', 'industry', 'e.g. FinTech, Healthcare'],
              ['Experience Level', 'experience', 'e.g. 0–2 years'],
            ].map(([l, k, ph]) => (
              <div key={k} className="field-group">
                <label className="field-label">{l}</label>
                <input className="field-input" value={prefs[k]} onChange={e => setPrefs({ ...prefs, [k]: e.target.value })} placeholder={ph} />
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1rem' }}>
              {[['remote', 'Open to Remote'], ['hybrid', 'Open to Hybrid']].map(([k, l]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={prefs[k]} onChange={e => setPrefs({ ...prefs, [k]: e.target.checked })} />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{l}</span>
                </label>
              ))}
            </div>
            <button className="btn-primary" onClick={() => { onSavePrefs(prefs); onToast('Preferences saved!'); }}>Save Preferences</button>
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: '1rem' }}>
            <div className="section-title">📄 Saved Resumes ({savedResumes.length})</div>
            {savedResumes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <div className="empty-text">No resumes saved yet</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Build a resume and save it from the Builder tab</div>
              </div>
            ) : savedResumes.map((r) => (
              <div key={r.id} className="saved-resume-row">
                <div>
                  <div className="saved-resume-name">{r.name} — {r.title}</div>
                  <div className="saved-resume-meta">Saved {r.savedAt} · {tmplLabel(r.template)} template</div>
                </div>
                <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                  <button className="btn-ghost btn-sm" onClick={() => setViewing(r)}>View</button>
                  <button className="btn-ghost btn-sm" onClick={() => { onDelete(r.id); onToast('Resume deleted', '🗑️'); }}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="section-title">📊 Activity Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              {[
                ['Resumes Built', savedResumes.length, 'var(--accent)'],
                ['Templates Used', new Set(savedResumes.map(r => r.template)).size, 'var(--purple)'],
                ['Skills Tracked', skillCount, 'var(--teal)'],
                ['Analyses Run', data.analyses, 'var(--green)'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: '.2rem' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewing && (
        <div className="modal-back" onClick={() => setViewing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <ResumeDoc resume={viewing} />
            <div className="output-actions">
              <button className="btn-accent-outline" onClick={() => printResume(viewing) || onToast('Allow pop-ups to print.', '⚠️')}>🖨️ Print / PDF</button>
              <button className="btn-accent-outline" onClick={() => downloadFile(`${viewing.name.replace(/\s+/g, '_')}_resume.txt`, resumeToText(viewing))}>⬇ .txt</button>
              <button className="btn-ghost" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════

function Dashboard({ user, data, setPage }) {
  const savedResumes = data.resumes;
  const firstName = user.name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <div className="page-title">{greeting}, {firstName} 👋</div>
        <div className="page-sub">Your AI-powered career toolkit is ready — what would you like to do today?</div>
      </div>

      <div className="dash-grid">
        {[
          ['📄', savedResumes.length, 'Resumes Built', 'var(--accent)'],
          ['🔍', data.analyses, 'Analyses Run', 'var(--purple)'],
          ['⚡', savedResumes.length > 0 ? 'Optimized' : 'Ready', 'ATS Status', 'var(--green)'],
        ].map(([icon, val, label, color]) => (
          <div key={label} className="stat-card">
            <div className="stat-icon">{icon}</div>
            <div className="stat-val" style={{ color }}>{val}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="quick-actions" style={{ marginBottom: '1.5rem' }}>
        <div className="action-card" onClick={() => setPage('builder')}>
          <div className="action-icon">✨</div>
          <div className="action-title">Build a New Resume</div>
          <div className="action-desc">Enter your skills and paste a job description. Our AI generates a tailored, ATS-optimized resume with the right keywords in seconds.</div>
        </div>
        <div className="action-card" onClick={() => setPage('analyzer')}>
          <div className="action-icon">🔍</div>
          <div className="action-title">Analyze My Resume</div>
          <div className="action-desc">Paste your resume and a job description to get a full gap analysis — matched skills, missing skills, and personalized learning resources.</div>
        </div>
      </div>

      {savedResumes.length > 0 && (
        <div className="recent-card">
          <div className="section-title">📌 Recent Resumes</div>
          {savedResumes.slice(-3).reverse().map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.6rem 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{r.title} · Saved {r.savedAt}</div>
              </div>
              <span className="badge badge-blue">{tmplLabel(r.template)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="panel" style={{ marginTop: '1.5rem', background: 'linear-gradient(135deg, rgba(108,142,255,0.05), rgba(192,132,252,0.05))', border: '1px solid rgba(108,142,255,0.2)' }}>
        <div className="section-title">🚀 ATS Tips for Better Results</div>
        <div className="tips-grid">
          {[
            ['Use keywords from the JD', 'Mirror the exact language used in the job description to pass automated screening.'],
            ['Quantify achievements', "Replace 'improved performance' with 'reduced load time by 40%' — metrics matter."],
            ['Keep formatting simple', 'Avoid tables, graphics, and columns — ATS systems parse simple linear text best.'],
            ['Customize for each role', 'A tailored resume consistently outperforms a generic one in screening.'],
          ].map(([t, d]) => (
            <div key={t} style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>→</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: '.2rem' }}>{t}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════

function App() {
  const [user, setUser] = useState(() => store.get('ra_session', null));
  const [page, setPage] = useState('dashboard');
  const [data, setData] = useState(DEFAULT_DATA);
  const [ready, setReady] = useState(false);
  const [ai, setAi] = useState(null);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('ra_theme') || 'light'; } catch (e) { return 'light'; } });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('ra_theme', theme); } catch (e) {}
  }, [theme]);
  const toggleTheme = () => setTheme(current => current === 'light' ? 'dark' : 'light');

  useEffect(() => { API.status().then(s => setAi(!!s.ai)); }, []);

  // load per-user data after login / on reload
  useEffect(() => {
    if (!user) { setReady(false); return; }
    setData({ ...DEFAULT_DATA, ...store.get('ra_data_' + user.email, {}) });
    setReady(true);
  }, [user]);

  // persist per-user data
  useEffect(() => {
    if (user && ready) store.set('ra_data_' + user.email, data);
  }, [data, user, ready]);

  const showToast = (message, icon = '✅') => setToast({ message, icon, key: Date.now() });

  const login = (u) => { store.set('ra_session', u); setUser(u); setPage('dashboard'); };
  const logout = () => { store.del('ra_session'); setUser(null); };

  const saveResume = (r) => setData(d => ({ ...d, resumes: [...d.resumes, { ...r, id: Date.now() }] }));
  const deleteResume = (id) => setData(d => ({ ...d, resumes: d.resumes.filter(r => r.id !== id) }));
  const countAnalysis = () => setData(d => ({ ...d, analyses: d.analyses + 1 }));
  const savePrefs = (prefs) => setData(d => ({ ...d, prefs }));

  if (!user) return <AuthScreen onLogin={login} theme={theme} onToggleTheme={toggleTheme} />;

  const navItems = [
    { id: 'dashboard', label: '🏠 Home' },
    { id: 'builder', label: '✨ Builder' },
    { id: 'analyzer', label: '🔍 Analyzer' },
    { id: 'profile', label: '👤 Profile' },
  ];

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-logo">Resume<span>AI</span></div>
        <div className="topbar-nav">
          {navItems.map(({ id, label }) => (
            <button key={id} className={`nav-btn${page === id ? ' active' : ''}`} onClick={() => setPage(id)}>{label}</button>
          ))}
        </div>
        <div className="topbar-user">
          <div className={`ai-badge ${ai ? 'on' : 'off'}`} title={ai ? 'Connected to Claude via the server' : 'No API key on the server — using the built-in offline engine'}>
            {ai === null ? '…' : ai ? '● Claude AI live' : '● Offline engine'}
          </div>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
            <svg className="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.2 15.6A8.5 8.5 0 0 1 8.4 3.8 8.7 8.7 0 1 0 20.2 15.6Z" /></svg><span className="theme-toggle-label">{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
          <div className="user-name">{user.name.split(' ')[0]}</div>
          <div className="avatar">{user.initials}</div>
          <button className="btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
      </div>

      <div className="mobile-nav">
        {navItems.map(({ id, label }) => (
          <button key={id} className={`nav-btn${page === id ? ' active' : ''}`} style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }} onClick={() => setPage(id)}>{label}</button>
        ))}
      </div>

      <div className="main">
        {page === 'dashboard' && <Dashboard user={user} data={data} setPage={setPage} />}
        {/* Builder & Analyzer stay mounted so in-progress work isn't lost when switching tabs */}
        <div style={{ display: page === 'builder' ? 'block' : 'none' }}>
          <BuilderTab user={user} onSave={saveResume} onToast={showToast} />
        </div>
        <div style={{ display: page === 'analyzer' ? 'block' : 'none' }}>
          <AnalyzerTab onToast={showToast} onDone={countAnalysis} />
        </div>
        {page === 'profile' && <ProfileTab key={user.email} user={user} data={data} onSavePrefs={savePrefs} onDelete={deleteResume} onToast={showToast} />}
      </div>

      {toast && <Toast key={toast.key} message={toast.message} icon={toast.icon} onClose={() => setToast(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
