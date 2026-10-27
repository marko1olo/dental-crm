/**
 * payslipStyles.ts — A4 Print Stylesheet for Doctor Production Payslip (Mandate 8b, <= 120 lines).
 */

export const PAYSLIP_PRINT_STYLES = `
@page { size: A4 portrait; margin: 12mm; }
body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
	font-size: 11px;
	line-height: 1.4;
	color: #1e293b;
	margin: 0;
	padding: 0;
	background: #ffffff;
}
.payslip-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	border-bottom: 2px solid #0f172a;
	padding-bottom: 8px;
	margin-bottom: 12px;
}
.clinic-title { font-size: 15px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
.clinic-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
.okud-badge {
	text-align: right;
	font-size: 9px;
	color: #475569;
	border: 1px solid #cbd5e1;
	padding: 4px 8px;
	border-radius: 4px;
	line-height: 1.3;
}
.doc-title {
	text-align: center;
	font-size: 14px;
	font-weight: 900;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin: 10px 0 14px;
}
.meta-grid {
	display: grid;
	grid-template-columns: 2fr 1fr 1fr;
	gap: 8px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 6px;
	padding: 8px 12px;
	margin-bottom: 14px;
}
.meta-item { display: flex; flex-direction: column; }
.meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
.meta-value { font-size: 12px; font-weight: 700; color: #0f172a; }
table {
	width: 100%;
	border-collapse: collapse;
	margin-bottom: 14px;
	font-size: 10.5px;
}
th {
	background: #f1f5f9;
	color: #334155;
	font-weight: 700;
	text-align: left;
	padding: 5px 6px;
	border: 1px solid #cbd5e1;
	font-size: 9.5px;
	text-transform: uppercase;
}
td {
	padding: 5px 6px;
	border: 1px solid #cbd5e1;
	vertical-align: middle;
}
.section-title {
	font-size: 11px;
	font-weight: 800;
	text-transform: uppercase;
	color: #0f172a;
	margin: 12px 0 6px;
}
.total-banner {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: #f0fdf4;
	border: 2px solid #86efac;
	border-radius: 6px;
	padding: 10px 14px;
	margin: 14px 0;
}
.total-banner .lbl { font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; }
.total-banner .val { font-size: 18px; font-weight: 900; font-family: monospace; color: #14532d; }
.overhead-notice {
	background: #eff6ff;
	border: 1px dashed #93c5fd;
	border-radius: 6px;
	padding: 6px 10px;
	font-size: 10px;
	color: #1e40af;
	margin-bottom: 12px;
}
.signatures {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 16px;
	margin-top: 24px;
	padding-top: 14px;
	border-top: 1px solid #cbd5e1;
	font-size: 10px;
}
.sig-line { border-bottom: 1px solid #94a3b8; height: 24px; margin-bottom: 4px; }
`;
