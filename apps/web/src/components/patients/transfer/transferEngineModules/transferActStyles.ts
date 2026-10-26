/**
 * transferActStyles.ts — CSS стили печатной формы передаточного акта.
 * Лимит <= 120 строк по Мандату 8b.
 */

export const TRANSFER_ACT_CSS = `
@page { size: A4; margin: 15mm; }
body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	font-size: 11pt; line-height: 1.45; color: #0f172a; margin: 0; padding: 20px; background: #ffffff;
}
.act-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
.act-title { font-size: 15pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.act-subtitle { font-size: 10pt; color: #475569; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 10pt; }
.section-title { font-size: 11pt; font-weight: 700; background: #f1f5f9; padding: 6px 10px; border-left: 4px solid #2563eb; margin-top: 14px; margin-bottom: 8px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10pt; }
th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
th { background: #f8fafc; font-weight: 600; }
.badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
.badge-success { background: #dcfce7; color: #166534; }
.badge-blue { background: #dbeafe; color: #1e40af; }
.badge-warn { background: #fef3c7; color: #92400e; }
.qr-box { display: flex; align-items: center; justify-content: space-between; border: 1px dashed #94a3b8; border-radius: 8px; padding: 12px; margin-top: 16px; background: #fafafa; }
.qr-text { font-size: 9.5pt; color: #334155; max-width: 68%; }
.signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; page-break-inside: avoid; }
.sign-col { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 9.5pt; }
.sign-line { margin-top: 30px; border-bottom: 1px solid #0f172a; width: 80%; }
`;
