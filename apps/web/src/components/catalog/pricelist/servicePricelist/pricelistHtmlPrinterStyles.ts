export const PRICELIST_PRINT_CSS = `
@page { size: A4; margin: 15mm 12mm 15mm 12mm; }
body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
	color: #111827; background: #ffffff; margin: 0; padding: 0; font-size: 9.5pt; line-height: 1.35;
}
.header {
	border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px;
	display: flex; justify-content: space-between; align-items: flex-start;
}
.clinic-info h1 { margin: 0 0 4px 0; font-size: 14pt; color: #0f172a; font-weight: 800; text-transform: uppercase; }
.clinic-details { font-size: 8pt; color: #475569; }
.approval-block {
	text-align: right; font-size: 8pt; border: 1px dashed #94a3b8; padding: 6px 10px; border-radius: 4px;
}
.approval-block .title { font-weight: bold; text-transform: uppercase; }
.pricelist-title-banner { text-align: center; margin: 12px 0 16px 0; }
.pricelist-title-banner h2 { margin: 0; font-size: 12pt; font-weight: 800; color: #0f172a; }
.pricelist-title-banner .sub { font-size: 8pt; color: #64748b; margin-top: 2px; }
.category-heading {
	background: #f1f5f9; border-left: 4px solid #0284c7; padding: 4px 8px; margin: 14px 0 6px 0;
	font-size: 10pt; font-weight: 700; color: #0f172a; page-break-after: avoid;
}
.pricelist-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 8.5pt; page-break-inside: auto; }
.pricelist-table tr { page-break-inside: avoid; page-break-after: auto; }
.pricelist-table th {
	background: #f8fafc; border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 700; text-align: left;
	font-size: 8pt; color: #334155;
}
.pricelist-table td { border: 1px solid #e2e8f0; padding: 4px 6px; vertical-align: top; }
.col-num { width: 24px; text-align: center; color: #64748b; }
.col-code { width: 95px; font-weight: 600; }
.col-code code { font-family: monospace; font-size: 8pt; color: #0369a1; }
.col-name { width: auto; }
.commercial-title { font-weight: 600; color: #0f172a; }
.statutory-title { font-size: 7.5pt; color: #64748b; margin-top: 1px; }
.col-spec { width: 130px; font-size: 7.5pt; color: #475569; }
.col-price { width: 85px; text-align: right; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }
.footer-legal {
	margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 7.5pt; color: #64748b; page-break-inside: avoid;
}
.signatures {
	display: flex; justify-content: space-between; margin-top: 24px; padding-top: 12px; font-size: 8.5pt; page-break-inside: avoid;
}
.sign-line {
	border-top: 1px solid #000000; width: 200px; margin-top: 30px; text-align: center; font-size: 7.5pt; color: #64748b;
}
`.trim();
