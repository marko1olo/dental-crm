/**
 * pediatricMemoStyles.ts — Стили для печати памятки родителям (A4).
 */

export const PEDIATRIC_MEMO_CSS = `
@page { size: A4; margin: 15mm; }
* { box-sizing: border-box; }
body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	font-size: 11pt; line-height: 1.45; color: #1e293b; background: #ffffff; margin: 0; padding: 12px;
}
.memo-header {
	border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 14px;
	display: flex; justify-content: space-between; align-items: flex-start;
}
.clinic-title { font-size: 13pt; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px; }
.doc-title { font-size: 15pt; font-weight: 800; color: #0f172a; margin: 4px 0 2px 0; }
.doc-subtitle { font-size: 10pt; color: #64748b; }
.date-badge { font-size: 9.5pt; color: #475569; text-align: right; }
.info-grid {
	display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #f8fafc;
	border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 10pt;
}
.info-item { display: flex; gap: 6px; }
.info-label { font-weight: 600; color: #64748b; white-space: nowrap; }
.info-val { font-weight: 700; color: #0f172a; }
.section-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; background: #fff; }
.section-title { font-size: 11pt; font-weight: 700; color: #0f766e; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
.alert-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 8px 12px; border-radius: 4px; margin: 8px 0; font-size: 10pt; color: #92400e; }
ul { margin: 6px 0; padding-left: 20px; }
li { margin-bottom: 4px; text-align: justify; }
.signatures-row {
	display: flex; justify-content: space-between; margin-top: 24px; padding-top: 14px;
	border-top: 1px dashed #cbd5e1; font-size: 10pt;
}
.sig-col { width: 48%; }
.sig-line { border-bottom: 1px solid #0f172a; margin-top: 28px; display: flex; justify-content: space-between; font-size: 8.5pt; color: #64748b; padding-top: 2px; }
@media print {
	body { padding: 0; }
	.no-print { display: none; }
}
`;
