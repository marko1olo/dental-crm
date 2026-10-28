export const REGISTRY_A4_HTML_STYLE = `
	@page { size: A4 landscape; margin: 10mm 10mm 12mm 10mm; }
	* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10px; line-height: 1.35; color: #111827; background: #ffffff; margin: 0; padding: 10px; }
	.header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 12px; }
	.clinic-info { max-width: 55%; }
	.clinic-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
	.clinic-details { font-size: 9px; color: #475569; }
	.insurer-info { max-width: 40%; text-align: right; }
	.insurer-title { font-size: 13px; font-weight: 700; color: #0f172a; }
	.document-title { text-align: center; margin: 12px 0 8px 0; }
	.document-title h1 { font-size: 16px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
	.document-title p { margin: 3px 0 0 0; font-size: 11px; color: #475569; }
	table.registry-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9px; }
	table.registry-table th, table.registry-table td { border: 1px solid #cbd5e1; padding: 4px 5px; }
	table.registry-table th { background-color: #f1f5f9; font-weight: 700; text-align: center; color: #1e293b; font-size: 8.5px; }
	table.registry-table tbody tr:nth-child(even) { background-color: #f8fafc; }
	.text-center { text-align: center; } .text-right { text-align: right; }
	.font-medium { font-weight: 600; } .font-bold { font-weight: 700; }
	.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
	.whitespace-nowrap { white-space: nowrap; } .text-xs { font-size: 8px; } .text-muted { color: #64748b; }
	.totals-box { margin-top: 14px; padding: 10px 14px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
	.totals-words { max-width: 60%; }
	.totals-words-label { font-size: 9px; color: #475569; text-transform: uppercase; font-weight: 600; }
	.totals-words-value { font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 2px; }
	.totals-numbers { text-align: right; }
	.totals-row { font-size: 10px; margin-bottom: 2px; }
	.totals-row.grand { font-size: 13px; font-weight: 800; color: #0f172a; border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 4px; }
	.signatures { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; }
	.signature-block { width: 45%; }
	.signature-line { border-bottom: 1px solid #111827; margin-top: 25px; display: flex; justify-content: space-between; font-size: 9px; color: #475569; padding-bottom: 2px; }
	.stamp-place { margin-top: 10px; font-size: 11px; font-weight: 700; color: #64748b; }
`;

export const ACT_A4_HTML_STYLE = `
	@page { size: A4 landscape; margin: 10mm; }
	* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 9.5px; line-height: 1.35; color: #0f172a; background: #fff; margin: 0; padding: 10px; }
	.act-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
	.party-box { max-width: 48%; font-size: 9px; color: #334155; }
	.party-title { font-weight: 700; font-size: 11px; color: #0f172a; margin-bottom: 3px; }
	.act-title { text-align: center; margin: 12px 0; }
	.act-title h1 { font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0; }
	.act-title p { margin: 4px 0 0 0; font-size: 10px; color: #475569; }
	.preamble { font-size: 9.5px; margin-bottom: 10px; line-height: 1.4; text-align: justify; }
	table.act-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9px; }
	table.act-table th, table.act-table td { border: 1px solid #94a3b8; padding: 4px 6px; }
	table.act-table th { background: #f1f5f9; font-weight: 700; text-align: center; }
	table.act-table tbody tr:nth-child(even) { background: #f8fafc; }
	.text-center { text-align: center; } .text-right { text-align: right; }
	.font-medium { font-weight: 600; } .font-bold { font-weight: 700; }
	.font-mono { font-family: ui-monospace, SFMono-Regular, monospace; }
	.whitespace-nowrap { white-space: nowrap; } .text-xs { font-size: 8px; } .text-muted { color: #64748b; }
	.legal-clauses { margin-top: 12px; font-size: 9.5px; line-height: 1.45; }
	.legal-clauses p { margin: 3px 0; }
	.totals-summary { margin-top: 10px; padding: 8px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
	.signatures { margin-top: 25px; display: flex; justify-content: space-between; page-break-inside: avoid; }
	.sign-col { width: 46%; border-top: 1px solid #0f172a; padding-top: 6px; font-size: 9.5px; }
	.sign-role { font-weight: 700; margin-bottom: 4px; }
	.stamp { margin-top: 10px; font-weight: 700; color: #475569; }
`;
