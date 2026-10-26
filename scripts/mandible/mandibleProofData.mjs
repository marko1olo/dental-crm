/**
 * scripts/mandible/mandibleProofData.mjs
 * 16-Tooth clinical dataset & HTML template for Mandible screenshot proof.
 * Mandate 8b <= 120 lines.
 */

export const CLINICAL_MANDIBLE_DATA = [
	{ toothNumber: 48, state: "Missing" },
	{ toothNumber: 47, state: "Periodontitis" },
	{ toothNumber: 46, state: "Caries", surfaces: ["M", "O", "D"], clinicalData: { cariesDepth: "media" } },
	{ toothNumber: 45, state: "Crown" },
	{ toothNumber: 44, state: "Filled" },
	{ toothNumber: 43, state: "Healthy" },
	{ toothNumber: 42, state: "Calculus" },
	{ toothNumber: 41, state: "Healthy" },
	{ toothNumber: 31, state: "Healthy" },
	{ toothNumber: 32, state: "Caries", surfaces: ["M"], clinicalData: { cariesDepth: "media" } },
	{ toothNumber: 33, state: "Healthy" },
	{ toothNumber: 34, state: "Implant" },
	{ toothNumber: 35, state: "Crown" },
	{ toothNumber: 36, state: "Pulpitis" },
	{ toothNumber: 37, state: "Filled" },
	{ toothNumber: 38, state: "Healthy" },
];

export function buildMandibleProofHtml(content, isDark = false, subtitle = "") {
	return `<!DOCTYPE html>
<html class="${isDark ? "dark" : ""}" data-theme="${isDark ? "dark" : "light"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DENTE CRM — Mandible Full Arch Proof</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: { extend: { colors: { teal: { 500: '#14b8a6', 600: '#0d9488' } } } }
  };
</script>
<style>
:root { --paper: #ffffff; --paper-strong: #f8fafc; --ink: #0f172a; --line: #e2e8f0; }
:root.dark { --paper: #090d16; --paper-strong: #0f172a; --ink: #f8fafc; --line: #1e293b; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 20px; min-height: 100vh;
  background: var(--paper); color: var(--ink);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.proof-header {
  display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 16px; text-align: center;
}
.proof-pill {
  font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 4px 12px; border-radius: 9999px;
  background: rgba(20, 184, 166, 0.15); color: #0d9488; border: 1px solid rgba(20, 184, 166, 0.3);
}
.dark .proof-pill { color: #2dd4bf; border-color: rgba(45, 212, 191, 0.3); }
</style>
</head>
<body>
<div class="proof-header">
  <div class="proof-pill">DENTE Gate 0 · Анатомическая Нижняя Челюсть (Mandible)</div>
  <h1 style="margin:4px 0 0 0;font-size:18px;font-weight:900;">16 Зубов: 48..41 | 31..38 · Wheeler Сагиттальная Симметрия</h1>
  <div style="font-size:12px;opacity:0.75;">${subtitle}</div>
</div>
${content}
</body>
</html>`;
}
