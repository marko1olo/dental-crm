export const formPrintStyles = `
	@page { size: A4 landscape; margin: 12mm 10mm; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 15px; }
	.header-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
	.header-table td { vertical-align: top; padding: 2px; }
	.clinic-title { font-size: 13px; font-weight: bold; }
	.clinic-sub { font-size: 10px; color: #555; }
	.doc-title { text-align: center; margin: 10px 0 6px; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
	.doc-subtitle { text-align: center; font-size: 11px; color: #444; margin-bottom: 14px; }
	.main-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
	.main-table th, .main-table td { border: 1px solid #333; padding: 5px 6px; }
	.main-table th { background: #f0f3f6; font-weight: bold; text-align: center; font-size: 10px; }
	.text-center { text-align: center; }
	.font-bold { font-weight: bold; }
	.font-semibold { font-weight: 600; }
	.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 9.5px; }
	.subtext { font-size: 9.5px; color: #555; margin-top: 1px; }
	.stamp-hash { font-size: 8.5px; color: #0b57d0; margin-top: 2px; }
	.badge-success { color: #00701a; font-weight: bold; }
	.badge-danger { color: #d32f2f; font-weight: bold; }
	.footer-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
	.footer-table td { padding: 4px; font-size: 11px; }
	.sig-line { border-bottom: 1px solid #111; display: inline-block; width: 160px; margin: 0 4px; }
`;
