const fs = require('fs');
const path = 'C:\\Clinic_MVP\\dental-crm\\apps\\web\\src\\styles\\main.css';
let content = fs.readFileSync(path, 'utf8');

const premiumVars = `
  /* PREMIUM AESTHETICS OVERRIDE */
  --paper: #ffffff;
  --paper-strong: #fafcfa;
  --paper-soft: #f4f7f6;
  --ink: #1a1e20;
  --muted: #6b7280;
  --line: rgba(15, 118, 110, 0.12);
  --line-strong: rgba(15, 118, 110, 0.25);
  
  /* Vibrant Colors */
  --teal: #0d9488;
  --teal-dark: #115e59;
  --teal-soft: #ccfbf1;
  --teal-glow: rgba(13, 148, 136, 0.35);
  --teal-surface: rgba(204, 251, 241, 0.4);
  
  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(255, 255, 255, 0.4);
  --glass-blur: blur(12px);
  --shadow-premium: 0 10px 40px -10px rgba(15, 118, 110, 0.15), 0 1px 3px rgba(15, 118, 110, 0.05);
  
  /* Smooth transitions */
  --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-smooth: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

content = content.replace(/:root\s*{([^}]*)}/, (match, p1) => {
  return ':root {\n' + p1 + '\n' + premiumVars + '\n}';
});

const premiumStyles = `

/* PREMIUM ANIMATIONS & LAYOUT REFINEMENTS */
body {
  background-color: var(--paper-soft);
  color: var(--ink);
}

/* Sidebar Glassmorphism */
.sidebar {
  background: linear-gradient(180deg, rgba(20, 27, 24, 0.95), rgba(15, 20, 18, 0.98));
  backdrop-filter: blur(10px);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  border-right: 1px solid rgba(255,255,255,0.05);
}

.sidebar .nav-item {
  transition: all var(--transition-fast);
  border-radius: 8px;
  margin: 0 8px;
}
.sidebar .nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}
.sidebar .nav-item.active {
  background: linear-gradient(90deg, rgba(13, 148, 136, 0.85), rgba(13, 148, 136, 0.4));
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
}

/* Topbar & Header Enhancements */
.topbar {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

.topbar h1 {
  background: linear-gradient(135deg, var(--teal-dark), var(--teal));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  letter-spacing: -0.5px;
}

/* Clean Panels with Soft Shadows */
.panel {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow-premium);
  transition: transform var(--transition-smooth), box-shadow var(--transition-smooth);
}
.panel:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 48px -12px rgba(15, 118, 110, 0.2);
}

/* Buttons with Micro-animations */
.primary-button {
  background: linear-gradient(135deg, var(--teal), var(--teal-dark));
  border: none;
  box-shadow: 0 4px 12px var(--teal-glow);
  transition: all var(--transition-fast);
  font-weight: 600;
}
.primary-button:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 16px var(--teal-glow);
  filter: brightness(1.1);
}
.primary-button:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.secondary-button {
  background: var(--paper);
  border: 1px solid var(--line-strong);
  transition: all var(--transition-fast);
  font-weight: 500;
}
.secondary-button:hover:not(:disabled) {
  background: var(--teal-soft);
  border-color: var(--teal);
  color: var(--teal-dark);
  transform: translateY(-1px);
}

/* Visit View Declutter */
.visit-focus-bar, .specialty-focus-bar, .visit-next-step, .dictation-box {
  background: var(--paper-strong);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.visit-next-step-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.visit-next-step-main h3 {
  font-size: 24px;
  color: var(--teal-dark);
}
.visit-primary-action {
  font-size: 18px;
  padding: 16px 32px;
  border-radius: 12px;
}

/* Visit Progress Strip */
.visit-progress-strip {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed var(--line-strong);
}
.visit-progress-step {
  flex: 1;
  background: var(--paper-soft);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  transition: all var(--transition-smooth);
}
.visit-progress-step.step-completed {
  background: var(--teal-surface);
  border-color: var(--teal);
}
.visit-progress-step.step-completed span {
  background: var(--teal);
  color: white;
}

/* Smooth Inputs */
input, select, textarea {
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
input:focus, select:focus, textarea:focus {
  border-color: var(--teal);
  box-shadow: 0 0 0 3px var(--teal-glow);
}
`;

fs.writeFileSync(path, content + '\n' + premiumStyles);
console.log('Premium styles injected.');
