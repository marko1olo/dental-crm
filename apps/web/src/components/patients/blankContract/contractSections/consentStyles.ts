export function getConsentPrintStyles(): string {
	return `@page { size: A4 portrait; margin: 10mm 12mm; }
* { box-sizing: border-box; }
body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	font-size: 8.5pt; line-height: 1.34; color: #0f172a; background: #ffffff; margin: 0; padding: 8px;
	-webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.no-print {
	background: #f0fdfa; border: 1px solid #0d9488; padding: 8px 12px; border-radius: 6px;
	margin-bottom: 12px; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: #134e4a;
}
.no-print-actions { display: flex; gap: 8px; align-items: center; }
.btn-print { padding: 6px 14px; background: #0d9488; color: #fff; border: none; border-radius: 5px; font-weight: 600; font-size: 12px; cursor: pointer; }
.btn-print:hover { background: #0f766e; }
.btn-close { padding: 6px 12px; background: #e2e8f0; color: #334155; border: none; border-radius: 5px; font-size: 12px; cursor: pointer; }
.btn-close:hover { background: #cbd5e1; }
.header-grid { width: 100%; border-collapse: collapse; margin-bottom: 6px; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; }
.header-grid td { vertical-align: top; padding: 2px 4px; }
.clinic-info { font-size: 7.8pt; line-height: 1.25; color: #334155; }
.clinic-title { font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
.legal-badge-cell { text-align: right; font-size: 7.5pt; color: #475569; line-height: 1.2; }
.legal-badge { display: inline-block; background: #f1f5f9; border: 1px solid #94a3b8; border-radius: 3px; padding: 2px 6px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
h1 { text-align: center; font-size: 10.5pt; font-weight: 800; margin: 6px 0 2px; text-transform: uppercase; letter-spacing: 0.3px; color: #0f172a; }
.subtitle { text-align: center; font-size: 8.5pt; color: #334155; margin-bottom: 6px; }
.doc-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 8.5pt; font-weight: 600; }
.preamble { text-align: justify; margin: 3px 0 5px; text-indent: 14px; }
.section-title { font-weight: 800; margin-top: 6px; margin-bottom: 2px; font-size: 8.5pt; text-transform: uppercase; color: #0f172a; border-bottom: 0.75px solid #cbd5e1; padding-bottom: 1px; }
p { margin: 2.5px 0; text-align: justify; }
.blank-line { display: inline-block; border-bottom: 1px solid #0f172a; min-width: 140px; padding: 0 4px; vertical-align: bottom; }
.signatures-row { display: flex; justify-content: space-between; margin-top: 14px; gap: 16px; }
.sign-box { flex: 1; border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px; font-size: 7.8pt; line-height: 1.35; }
.sign-line { border-bottom: 1px solid #0f172a; height: 20px; margin-top: 8px; }
.sign-hint { font-size: 7pt; color: #64748b; text-align: center; margin-top: 2px; }
@media print {
	body { padding: 0; }
	.no-print { display: none !important; }
	.signatures-row, .sign-box { page-break-inside: avoid !important; break-inside: avoid !important; }
	.section-title { page-break-after: avoid !important; break-after: avoid !important; }
}`;
}
