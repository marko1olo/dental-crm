export const SANPIN_DOSSIER_PRINT_CSS = `
	@page { size: A4 landscape; margin: 10mm; }
	* { box-sizing: border-box; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 8.5pt; color: #0f172a; margin: 0; }
	.hdr { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px; }
	.title { font-size: 13pt; font-weight: 800; text-transform: uppercase; }
	.sub { font-size: 8.5pt; color: #475569; }
	table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8pt; }
	th, td { border: 1px solid #334155; padding: 4px 6px; text-align: left; vertical-align: middle; }
	th { background: #f1f5f9; font-weight: 700; text-align: center; }
	.norm { color: #059669; font-weight: 700; }
	.sec-title { font-size: 9.5pt; font-weight: 700; margin: 8px 0 4px 0; color: #0f172a; border-left: 3px solid #0d9488; padding-left: 6px; }
	.stamp { font-family: monospace; font-size: 7.5pt; color: #475569; }
	.footer { display: flex; justify-content: space-between; margin-top: 14px; font-size: 8.5pt; }
`;
